
import { kWebViewTileType } from "../../components/web-view/web-view-defs"
import { appState } from "../../models/app-state"
import { createDefaultTileOfType } from "../../models/codap/add-default-content"
import { gDataBroker } from "../../models/data/data-broker"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { toV2Id } from "../../utilities/codap-utils"
import { ICodapV2DataContext } from "../../v2/codap-v2-types"
import { DIDataContext, DIValues } from "../data-interactive-types"
import { diDataContextHandler } from "./data-context-handler"
import { setupTestDataset } from "./handler-test-utils"
import "../../components/web-view/web-view-registration"

describe("DataInteractive DataContextHandler", () => {
  const handler = diDataContextHandler

  it("create and delete work", () => {
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
    const singleCase = "case"
    const pluralCase = "cases"
    const result3 = handler.create?.({}, {
      collections: [
        {
          name: "collection1",
          attrs: [{ name: "attr1" }, { name: "attr2" }],
          labels: { singleCase, pluralCase }
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
    const dataset = gDataBroker.getDataSetByName(defaultName)!
    expect(dataset.collections.length).toBe(2)
    const collection1 = dataset.getCollectionByName("collection1")
    expect(collection1?.labels?.singleCase).toBe(singleCase)
    expect(collection1?.labels?.pluralCase).toBe(pluralCase)
    expect(dataset.attributes.length).toBe(4)
  })

  it("get works", () => {
    const { dataset } = setupTestDataset()

    expect(handler.get?.({}).success).toBe(false)

    const result = handler.get?.({ dataContext: dataset })
    expect(result?.success).toBe(true)
    const dataContext = result?.values as ICodapV2DataContext
    expect(dataContext?.name).toBe("data")
    expect(dataContext?.collections.length).toBe(3)
    expect(dataContext?.collections[0].attrs.length).toBe(1)
  })

  it("notify works", () => {
    const { c1, dataset: dataContext } = setupTestDataset()
    const notify = handler.notify!

    expect(notify({}).success).toBe(false)
    expect(notify({ dataContext }).success).toBe(false)
    expect(notify({ dataContext }, {}).success).toBe(false)
    expect(notify({ dataContext }, { request: "badRequest" }).success).toBe(false)
    expect(notify({ dataContext }, { request: "setAside" }).success).toBe(false)

    const caseId = c1.caseIds[0]
    expect(dataContext.isCaseOrItemHidden(caseId)).toBe(false)
    const caseIDs = [toV2Id(caseId)]
    expect(notify({ dataContext }, { request: "setAside", caseIDs }).success).toBe(true)
    expect(dataContext.isCaseOrItemHidden(caseId)).toBe(true)

    expect(notify({ dataContext }, { request: "restoreSetasides" }).success).toBe(true)
    expect(dataContext.isCaseOrItemHidden(caseId)).toBe(false)
  })

  it("update works", () => {
    const { dataset } = setupTestDataset()
    const { content } = appState.document
    const tile = createDefaultTileOfType(kWebViewTileType)!
    content?.insertTileInDefaultRow(tile)

    const title = "New Title"
    const description = "New Description"
    const managingController = toV2Id(tile.id)
    const values = { title, managingController, metadata: { description } }

    expect(handler.update?.({}, values).success).toBe(false)

    expect(dataset.title === title).toBe(false)
    expect(dataset.description === description).toBe(false)
    expect(dataset.managingControllerId).toBe("")
    expect(handler.update?.({ dataContext: dataset }, values).success).toBe(true)
    expect(dataset.title).toEqual(title)
    expect(dataset.description).toEqual(description)
    expect(dataset.managingControllerId).toBe(tile.id)

    expect(handler.update?.({ dataContext: dataset }, { managingController: "__none__" }).success).toBe(true)
    expect(dataset.managingControllerId).toBe("")
  })
})
