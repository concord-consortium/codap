import { DataSet } from "../models/data/data-set"
import { toV2Id } from "../utilities/codap-utils"
import { convertDataSetToV2, convertValuesToAttributeSnapshot } from "./data-interactive-type-utils"

describe("DataInteractiveTypeUtils", () => {

  describe("convertValuesToAttributeSnapshot", () => {
    it("returns undefined for values without name", () => {
      expect(convertValuesToAttributeSnapshot({})).toBeUndefined()
      expect(convertValuesToAttributeSnapshot({ precision: 2 })).toBeUndefined()
    })

    it("handles valid numeric precision values", () => {
      const result = convertValuesToAttributeSnapshot({ name: "test", precision: 2 })
      expect(result?.precision).toBe(2)

      const result2 = convertValuesToAttributeSnapshot({ name: "test", precision: "3" })
      expect(result2?.precision).toBe(3)

      const result3 = convertValuesToAttributeSnapshot({ name: "test", precision: 0 })
      expect(result3?.precision).toBe(0)
    })

    it("converts null or empty precision to undefined for non-numeric types", () => {
      const result = convertValuesToAttributeSnapshot({ name: "test", precision: null })
      expect(result?.precision).toBeUndefined()

      const result2 = convertValuesToAttributeSnapshot({ name: "test", precision: "" })
      expect(result2?.precision).toBeUndefined()

      const result3 = convertValuesToAttributeSnapshot({ name: "test" })
      expect(result3?.precision).toBeUndefined()
    })

    it("defaults precision to 2 for numeric type when precision not specified", () => {
      const result = convertValuesToAttributeSnapshot({ name: "test", type: "numeric" })
      expect(result?.precision).toBe(2)

      const result2 = convertValuesToAttributeSnapshot({ name: "test", type: "numeric", precision: null })
      expect(result2?.precision).toBe(2)

      const result3 = convertValuesToAttributeSnapshot({ name: "test", type: "numeric", precision: "" })
      expect(result3?.precision).toBe(2)
    })

    it("does not override explicit precision for numeric type", () => {
      const result = convertValuesToAttributeSnapshot({ name: "test", type: "numeric", precision: 5 })
      expect(result?.precision).toBe(5)

      const result2 = convertValuesToAttributeSnapshot({ name: "test", type: "numeric", precision: 0 })
      expect(result2?.precision).toBe(0)
    })

    it("converts invalid precision values to undefined instead of NaN", () => {
      // Invalid string that would produce NaN when converted with +
      const result = convertValuesToAttributeSnapshot({ name: "test", precision: "invalid" })
      expect(result?.precision).toBeUndefined()

      const result2 = convertValuesToAttributeSnapshot({ name: "test", precision: "foo" })
      expect(result2?.precision).toBeUndefined()

      // NaN itself should become undefined
      const result3 = convertValuesToAttributeSnapshot({ name: "test", precision: NaN })
      expect(result3?.precision).toBeUndefined()

      // Infinity should become undefined (not a finite number)
      const result4 = convertValuesToAttributeSnapshot({ name: "test", precision: Infinity })
      expect(result4?.precision).toBeUndefined()
    })
  })

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

    const dataExport = convertDataSetToV2(data, { exportCases: true })
    expect(dataExport).toEqual({
      document: 1,
      guid: 2,
      id: 2,
      name: "Data",
      type: "DG.DataContext",
      contextStorage: {
        _links_: {
          selectedCases: []
        }
      },
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
