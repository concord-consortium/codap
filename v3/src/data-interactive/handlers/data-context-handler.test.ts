import { appState } from "../../models/app-state"
import { gDataBroker } from "../../models/data/data-broker"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { ICodapV2DataContext } from "../../v2/codap-v2-types"
import { DIDataContext, DIValues } from "../data-interactive-types"
import { diDataContextHandler } from "./data-context-handler"
import { setupTestDataset } from "./handler-test-utils"

describe("DataInteractive DataContextHandler", () => {
  const handler = diDataContextHandler

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

    // Can create a more complex dataset
    const result3 = handler.create?.({}, {
      collections: [
        {
          name: "collection1",
          attrs: [{ name: "attr1" }, { name: "attr2" }]
        },
        {
          name: "collection2",
          attrs: [{ name: "attr3" }, { name: "attr4" }]
        }
      ]
    } as DIValues)
    expect(result3?.success).toBe(true)
    expect(gDataBroker.length).toBe(1)
    const defaultName = "Data_Set_1"
    expect((result3?.values as DIDataContext)?.name).toBe(defaultName)
    const dataset = gDataBroker.getDataSetByName(defaultName)
    expect(dataset?.collections.length).toBe(2)
    expect(dataset?.attributes.length).toBe(4)
  })

  it("get works as expected", () => {
    const { dataset } = setupTestDataset()

    expect(handler.get?.({}).success).toBe(false)

    const result = handler.get?.({ dataContext: dataset })
    expect(result?.success).toBe(true)
    const dataContext = result?.values as ICodapV2DataContext
    expect(dataContext?.name).toBe("data")
    expect(dataContext?.collections.length).toBe(3)
    expect(dataContext?.collections[0].attrs.length).toBe(1)
  })

  it("update works as expected", () => {
    const { dataset } = setupTestDataset()

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
