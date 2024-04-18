import { appState } from "../../models/app-state"
import { CollectionModel, ICollectionModel } from "../../models/data/collection"
import { gDataBroker } from "../../models/data/data-broker"
import { DataSet, IDataSet, toCanonical } from "../../models/data/data-set"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { ICodapV2DataContext } from "../../v2/codap-v2-types"
import { diDataContextHandler } from "./data-context-handler"

describe("DataInteractive DataContextHandler", () => {
  const handler = diDataContextHandler

  let dataset: IDataSet | undefined
  let c1: ICollectionModel | undefined
  let c2: ICollectionModel | undefined
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
    dataset.addAttribute({ name: "a1" }, { collection: c1.id })
    dataset.addAttribute({ name: "a2" }, { collection: c2.id })
    dataset.addAttribute({ name: "a3" })
    dataset.addCases(toCanonical(dataset, cases))
  }

  it("create and delete work as expected", () => {
    gDataBroker.setSharedModelManager(getSharedModelManager(appState.document)!)
    const name = "dataSet"
    const title = "dataSet Title"
    const description = "dataSet Description"
    const dataSetInfo = { name, title, description }

    // Create works
    const result = handler.create?.({}, dataSetInfo)
    expect(result?.success).toBe(true)
    expect(gDataBroker.length).toBe(1)

    // Cannot create a dataset with a duplicate name
    const result2 = handler.create?.({}, dataSetInfo)
    expect(result2?.success).toBe(true)
    expect(gDataBroker.length).toBe(1)

    // Delete requires a dataContext
    expect(handler.delete?.({}).success).toBe(false)

    // Delete works
    expect(handler.delete?.({ dataContext: gDataBroker.getDataSetByName(name) }).success).toBe(true)
    expect(gDataBroker.length).toBe(0)
  })

  it("get works as expected", () => {
    setupDataset()

    expect(handler.get?.({}).success).toBe(false)

    const result = handler.get?.({ dataContext: dataset })
    expect(result?.success).toBe(true)
    const dataContext = result?.values as ICodapV2DataContext
    expect(dataContext?.name).toBe("data")
    expect(dataContext?.collections.length).toBe(3)
    expect(dataContext?.collections[0].attrs.length).toBe(1)
  })

  it("update works as expected", () => {
    setupDataset()

    const title = "New Title"
    const description = "New Description"
    const values = { title, metadata: { description } }

    expect(handler.update?.({}, values).success).toBe(false)

    expect(dataset?.title === title).toBe(false)
    expect(dataset?.description === description).toBe(false)
    expect(handler.update?.({ dataContext: dataset }, values).success).toBe(true)
    expect(dataset?.title).toEqual(title)
    expect(dataset?.description).toEqual(description)
  })
})
