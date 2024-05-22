import { getSnapshot } from "mobx-state-tree"
import { kWebViewTileType } from "../components/web-view/web-view-defs"
import "../components/web-view/web-view-registration"
import { appState } from "../models/app-state"
import { getGlobalValueManager, getSharedModelManager } from "../models/tiles/tile-environment"
import { toV2Id } from "../utilities/codap-utils"
import { setupTestDataset } from "./handlers/handler-test-utils"
import { resolveResources } from "./resource-parser"
import { SharedDataSet } from "../models/shared/shared-data-set"

describe("DataInteractive ResourceParser", () => {
  const { content } = appState.document
  content?.createDataSet(getSnapshot(setupTestDataset().dataset))
  const dataset = content?.getFirstSharedModelByType(SharedDataSet)?.dataSet!
  dataset.collectionGroups // set up the pseudoCases
  const tile = content!.createOrShowTile(kWebViewTileType)!
  const resolve = (resource: string) => resolveResources(resource, "get", tile)
  
  it("finds dataContext", () => {
    expect(resolve("").dataContext?.id).toBe(dataset.id)
    expect(resolve("dataContext[data]").dataContext?.id).toBe(dataset.id)
    expect(resolve(`dataContext[${toV2Id(dataset.id)}]`).dataContext?.id).toBe(dataset.id)
    expect(resolve("dataContext[unknown]").dataContext).toBeUndefined()
  })

  it("finds components", () => {
    expect(resolve(`component[${toV2Id(tile.id)}]`).component?.id).toBe(tile.id)
    expect(resolve("component[unknown]").component).toBeUndefined()
  })

  it("finds globals", () => {
    const globalManager = getGlobalValueManager(getSharedModelManager(appState.document))
    const globalSnapshot = { name: "global1", value: 0 }
    const global = globalManager!.addValueSnapshot(globalSnapshot)

    expect(resolve(`global[${toV2Id(global.id)}]`).global?.id).toBe(global.id)
    expect(resolve(`global[${global.name}]`).global?.id).toBe(global.id)
    expect(resolve("global[unknown]").global).toBeUndefined()
  })

  it("finds dataContextList", () => {
    const { dataContextList } = resolve("dataContextList")
    expect(dataContextList?.length).toBe(1)
    expect(dataContextList?.[0].id).toBe(dataset.id)
  })

  // TODO Add tests for collection

  // TODO Add tests for attribute

  it("finds attributeList", () => {
    const resources = resolve("dataContext[data].collection[collection1].attributeList")
    expect(resources.attributeList?.length).toBe(1)
    expect(resources.attributeList?.[0].name).toBe("a1")
  })

  it("finds caseByID", () => {
    expect(resolve(`dataContext[data].caseByID[unknown]`).caseByID).toBeUndefined()

    const itemId = dataset.getCaseAtIndex(0)!.__id__
    expect(resolve(`dataContext[data].caseByID[${toV2Id(itemId)}]`).caseByID?.__id__).toBe(itemId)

    const caseId = Array.from(dataset.pseudoCaseMap.values())[0].pseudoCase.__id__
    expect(resolve(`dataContext[data].caseByID[${toV2Id(caseId)}]`).caseByID?.__id__).toBe(caseId)
  })

  it("finds caseByIndex", () => {
    const collectionId = toV2Id(dataset.collections[0].id)
    expect(resolve(`dataContext[data].collection[${collectionId}].caseByIndex[-1]`).caseByIndex).toBeUndefined()
    expect(resolve(`dataContext[data].collection[unknown].caseByIndex[0]`).caseByIndex).toBeUndefined()

    const itemId = dataset.getCaseAtIndex(0)!.__id__
    const ungroupedId = toV2Id(dataset.ungrouped.id)
    expect(resolve(`dataContext[data].collection[${ungroupedId}].caseByIndex[0]`).caseByIndex?.__id__).toBe(itemId)

    const caseId = Array.from(dataset.pseudoCaseMap.values())[0].pseudoCase.__id__
    expect(resolve(`dataContext[data].collection[${collectionId}].caseByIndex[0]`).caseByIndex?.__id__).toBe(caseId)
  })
})
