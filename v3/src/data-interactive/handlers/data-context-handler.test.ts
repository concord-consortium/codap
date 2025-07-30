
import { kWebViewTileType } from "../../components/web-view/web-view-defs"
import { appState } from "../../models/app-state"
import { createDefaultTileOfType } from "../../models/codap/add-default-content"
import { gDataBroker } from "../../models/data/data-broker"
import { getMetadataFromDataSet } from "../../models/shared/shared-data-utils"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { toV2Id } from "../../utilities/codap-utils"
import { ICodapV2DataContext } from "../../v2/codap-v2-data-context-types"
import { DIDataContext, DIUpdateDataContext } from "../data-interactive-data-set-types"
import { DIValues } from "../data-interactive-types"
import { diDataContextHandler } from "./data-context-handler"
import { setupTestDataset } from "../../test/dataset-test-utils"

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
    const source = "dataSet Source"
    const importDate = "2023-10-01T00:00:00Z"
    const singleCase = "case"
    const pluralCase = "cases"
    const result3 = handler.create?.({}, {
      metadata: { description, importDate, source },
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
    const metadata = getMetadataFromDataSet(dataset)
    expect(metadata).toBeDefined()
    expect(metadata?.description).toBe(description)
    expect(metadata?.source).toBe(source)
    expect(metadata?.importDate).toBe("9/30/2023, 5:00:00 PM")
    const collection1 = dataset.getCollectionByName("collection1")
    expect(collection1).toBeDefined()
    const collection1Metadata = metadata?.collections.get(collection1!.id)
    expect(collection1Metadata).toBeDefined()
    expect(collection1Metadata?.labels?.singleCase).toBe(singleCase)
    expect(collection1Metadata?.labels?.pluralCase).toBe(pluralCase)
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

    // Modern setAside
    const setAside = (caseIDs?: number[], operation?: string) => {
      const result = notify({ dataContext }, { request: "setAside", operation, caseIDs })
      dataContext.validateCases()
      return result
    }
    const case1Id = c1.caseIds[0]
    const case1V2Id = toV2Id(case1Id)
    const case2Id = c1.caseIds[1]
    const case2V2Id = toV2Id(case2Id)
    const neitherIsSetAside = () =>
      expect(dataContext.isCaseOrItemHidden(case1Id) || dataContext.isCaseOrItemHidden(case2Id)).toBe(false)
    const bothAreSetAside = () =>
      expect(dataContext.isCaseOrItemHidden(case1Id) && dataContext.isCaseOrItemHidden(case2Id)).toBe(true)

    neitherIsSetAside()
    expect(setAside([case1V2Id, case2V2Id]).success).toBe(true)
    bothAreSetAside()
    expect(setAside([case2V2Id], "restore").success).toBe(true)
    expect(dataContext.isCaseOrItemHidden(case1Id)).toBe(true)
    expect(dataContext.isCaseOrItemHidden(case2Id)).toBe(false)
    expect(setAside([case2V2Id], "replace").success).toBe(true)
    expect(dataContext.isCaseOrItemHidden(case1Id)).toBe(false)
    expect(dataContext.isCaseOrItemHidden(case2Id)).toBe(true)
    expect(setAside([case1V2Id]).success).toBe(true)
    bothAreSetAside()
    expect(setAside(undefined, "restore").success).toBe(true)
    neitherIsSetAside()

    // Deprecated setAside
    const caseId = c1.caseIds[0]
    expect(dataContext.isCaseOrItemHidden(caseId)).toBe(false)
    expect(setAside([toV2Id(caseId)]).success).toBe(true)
    expect(dataContext.isCaseOrItemHidden(caseId)).toBe(true)

    expect(notify({ dataContext }, { request: "restoreSetasides" }).success).toBe(true)
    dataContext.validateCases()
    expect(dataContext.isCaseOrItemHidden(caseId)).toBe(false)
  })

  it("update works", () => {
    const update = handler.update!
    const { dataset: dataContext } = setupTestDataset()
    const { content } = appState.document
    const tile = createDefaultTileOfType(kWebViewTileType)!
    content?.insertTileInDefaultRow(tile)

    const title = "New Title"
    const description = "New Description"
    const managingController = toV2Id(tile.id)
    const values = { title, managingController, metadata: { description } }

    expect(update({}, values).success).toBe(false)

    expect(dataContext.title === title).toBe(false)
    expect(dataContext.managingControllerId).toBe("")
    expect(update({ dataContext }, values).success).toBe(true)
    expect(dataContext.title).toEqual(title)
    expect(dataContext.managingControllerId).toBe(tile.id)

    expect(update({ dataContext }, { managingController: "__none__" }).success).toBe(true)
    expect(dataContext.managingControllerId).toBe("")

    // Sort works
    expect(update({ dataContext }, { sort: {} } as DIUpdateDataContext).success).toBe(false)
    expect(update({ dataContext }, { sort: { attr: "fake" } } as DIUpdateDataContext).success).toBe(false)
    expect(dataContext.attrFromName("a1")?.strValues[0]).toBe("a")
    expect(update({ dataContext }, { sort: { attr: "a1", isDescending: true } } as DIUpdateDataContext).success)
      .toBe(true)
    expect(dataContext.attrFromName("a1")?.strValues[0]).toBe("b")
    expect(update({ dataContext }, { sort: { attr: "a1" } } as DIUpdateDataContext).success).toBe(true)
    expect(dataContext.attrFromName("a1")?.strValues[0]).toBe("a")
  })
})
