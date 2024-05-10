import { getSnapshot } from "mobx-state-tree"
import { appState } from "../../models/app-state"
import { IAttribute } from "../../models/data/attribute"
import { CollectionModel, ICollectionModel } from "../../models/data/collection"
import { DataSet, IDataSet, toCanonical } from "../../models/data/data-set"
import { ITileModel } from "../../models/tiles/tile-model"
import { ICodapV2Attribute } from "../../v2/codap-v2-types"
import { parseResourceSelector, resolveResources } from "../resource-parser"
import { diAttributeListHandler } from "./attribute-list-handler"


describe("DataInteractive CaseHandler", () => {
  const handler = diAttributeListHandler

  let dataset: IDataSet | undefined
  let c1: ICollectionModel | undefined
  let c2: ICollectionModel | undefined
  let a1: IAttribute | undefined
  let a2: IAttribute | undefined
  let a3: IAttribute | undefined
  const cases = [
    { a1: "a", a2: "x", a3: 1 },
    { a1: "b", a2: "y", a3: 2 },
    { a1: "a", a2: "z", a3: 3 },
    { a1: "b", a2: "z", a3: 4 },
    { a1: "a", a2: "x", a3: 5 },
    { a1: "b", a2: "y", a3: 6 },
  ]
  const setupDataset = () => {
    dataset = DataSet.create({ name: "data" })
    c1 = CollectionModel.create({ name: "collection1" })
    c2 = CollectionModel.create({ name: "collection2" })
    dataset.addCollection(c1)
    dataset.addCollection(c2)
    a1 = dataset.addAttribute({ name: "a1" }, { collection: c1.id })
    a2 = dataset.addAttribute({ name: "a2" }, { collection: c2.id })
    a3 = dataset.addAttribute({ name: "a3" })
    dataset.addCases(toCanonical(dataset, cases))
  }

  it("resourceParser finds attributeList properly", () => {
    setupDataset()
    appState.document.content?.createDataSet(getSnapshot(dataset!))

    const resourceString = "dataContext[data].collection[collection1].attributeList"
    const resources = resolveResources(parseResourceSelector(resourceString), "get", {} as ITileModel)
    expect(resources.attributeList?.length).toBe(1)
    expect(resources.attributeList?.[0].name).toBe("a1")
  })

  it("get works as expected", () => {
    setupDataset()

    expect(handler.get?.({})?.success).toBe(false)

    const result = handler.get?.({ attributeList: [a1!, a2!] })
    expect(result?.success).toBe(true)
    const attributeList = result?.values as Partial<ICodapV2Attribute>[]
    expect(attributeList.length).toBe(2)
    const attr1 = attributeList[0]
    expect(attr1?.name).toBe(a1!.name)
    expect(attr1?.title).toBe(a1!.title)
    expect(attr1?.id).toBe(a1!.id)
    const attr2 = attributeList[1]
    expect(attr2?.name).toBe(a2!.name)
    expect(attr2?.title).toBe(a2!.title)
    expect(attr2?.id).toBe(a2!.id)
  })
})
