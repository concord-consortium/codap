import { DataSet } from "../models/data/data-set"
import { toV2Id } from "../utilities/codap-utils"
import { convertDataSetToV2 } from "./data-interactive-type-utils"

describe("DataInteractiveTypeUtils", () => {
  it("can convert a hierarchical DataSet to v2", () => {
    const data = DataSet.create({
      id: "DATA2",
      name: "Data",
      collections: [
        { id: "COLL3", name: "Parents" },
        { id: "COLL4", name: "Children" }
      ]
    })
    const parentAttr = data.addAttribute({ id: "ATTR5", name: "Parent" }, { collection: "COLL3" })
    const childAttr = data.addAttribute({ id: "ATTR6", name: "Child" }, { collection: "COLL4" })
    data.addCases([
      { __id__: "ITEM11", [parentAttr.id]: "p1", [childAttr.id]: "c1" },
      { __id__: "ITEM12", [parentAttr.id]: "p1", [childAttr.id]: "c2" },
      { __id__: "ITEM13", [parentAttr.id]: "p2", [childAttr.id]: "c3" },
      { __id__: "ITEM14", [parentAttr.id]: "p2", [childAttr.id]: "c4" }
    ])
    data.validateCases()

    const p1Id = toV2Id(data.collections[0].cases[0].__id__)
    const p2Id = toV2Id(data.collections[0].cases[1].__id__)
    const c1Id = toV2Id(data.collections[1].cases[0].__id__)
    const c2Id = toV2Id(data.collections[1].cases[1].__id__)
    const c3Id = toV2Id(data.collections[1].cases[2].__id__)
    const c4Id = toV2Id(data.collections[1].cases[3].__id__)

    const dataExport = convertDataSetToV2(data, true)
    expect(dataExport).toEqual({
      document: 1,
      guid: 2,
      id: 2,
      name: "Data",
      title: "Data",
      type: "DG.DataContext",
      contextStorage: {},
      setAsideItems: [],
      collections: [
        {
          type: "DG.Collection",
          guid: 3,
          id: 3,
          name: "Parents",
          title: "Parents",
          attrs: [{
            cid: parentAttr.id,
            "colormap": {},
            deleteable: true,
            editable: true,
            guid: 5,
            id: 5,
            hidden: false,
            name: "Parent",
            title: "Parent",
            renameable: true,
            type: "categorical"
          }],
          cases: [
            { guid: p1Id, id: p1Id, values: { Parent: "p1" } },
            { guid: p2Id, id: p2Id, values: { Parent: "p2" } }
          ]
        },
        {
          type: "DG.Collection",
          guid: 4,
          id: 4,
          name: "Children",
          title: "Children",
          parent: 3,
          attrs: [{
            cid: childAttr.id,
            colormap: {},
            deleteable: true,
            editable: true,
            guid: 6,
            id: 6,
            hidden: false,
            name: "Child",
            title: "Child",
            renameable: true,
            type: "categorical"
          }],
          cases: [
            { guid: c1Id, id: c1Id, parent: p1Id, values: { Child: "c1" } },
            { guid: c2Id, id: c2Id, parent: p1Id, values: { Child: "c2" } },
            { guid: c3Id, id: c3Id, parent: p2Id, values: { Child: "c3" } },
            { guid: c4Id, id: c4Id, parent: p2Id, values: { Child: "c4" } }
          ]
        }
      ]
    })
  })
})
