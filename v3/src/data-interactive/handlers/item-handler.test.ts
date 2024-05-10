import { IAttribute } from "../../models/data/attribute"
import { CollectionModel, ICollectionModel } from "../../models/data/collection"
import { DataSet, IDataSet, toCanonical } from "../../models/data/data-set"
import { DIItem, DISuccessResult } from "../data-interactive-types"
import { diItemHandler } from "./item-handler"


describe("DataInteractive CaseHandler", () => {
  const handler = diItemHandler

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

  it("create works as expected", () => {
    setupDataset()

    expect(handler.create?.({}).success).toBe(false)

    const resources = { dataContext: dataset }
    expect(handler.create?.(resources).success).toBe(false)

    const result1 = handler.create?.(resources, { a1: "d", a2: "w", a3: 7 } as DIItem) as DISuccessResult
    expect(result1?.success).toBe(true)
    expect(result1?.itemIDs?.length).toBe(1)
    expect(result1?.itemIDs?.[0]).toBe(dataset?.cases[6].__id__)

    const result2 = handler.create?.(resources, [
      { a1: "e", a2: "v", a3: 8 },
      { a1: "f", a2: "u", a3: 9 }
    ] as DIItem[]) as DISuccessResult
    expect(result2?.success).toBe(true)
    expect(result2?.itemIDs?.length).toBe(2)
    expect(result2?.itemIDs?.[0]).toBe(dataset?.cases[7].__id__)
    expect(result2?.itemIDs?.[1]).toBe(dataset?.cases[8].__id__)
  })
})