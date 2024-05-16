import { getSnapshot } from "mobx-state-tree"
import { kWebViewTileType } from "../components/web-view/web-view-defs"
import "../components/web-view/web-view-registration"
import { appState } from "../models/app-state"
import { getGlobalValueManager, getSharedModelManager } from "../models/tiles/tile-environment"
import { toV2Id } from "../utilities/codap-utils"
import { setupTestDataset } from "./handlers/handler-test-utils"
import { resolveResources } from "./resource-parser"

describe("DataInteractive ResourceParser", () => {
  const { dataset } = setupTestDataset()
  const { content } = appState.document
  content?.createDataSet(getSnapshot(dataset))
  const tile = content!.createOrShowTile!(kWebViewTileType)!
  const resolve = (resource: string) => resolveResources(resource, "get", tile)
  
  it("resourceParser finds dataContext properly", () => {
    expect(resolve("").dataContext?.id).toBe(dataset.id)
    expect(resolve("dataContext[data]").dataContext?.id).toBe(dataset.id)
    expect(resolve(`dataContext[${toV2Id(dataset.id)}]`).dataContext?.id).toBe(dataset.id)
    expect(resolve("dataContext[unknown]").dataContext).toBeUndefined()
  })

  it("resourceParser finds components properly", () => {
    expect(resolve(`component[${toV2Id(tile.id)}]`).component?.id).toBe(tile.id)
    expect(resolve("component[unknown]").component).toBeUndefined()
  })

  it("resourceParser finds globals properly", () => {
    const globalManager = getGlobalValueManager(getSharedModelManager(appState.document))
    const globalSnapshot = { name: "global1", value: 0 }
    const global = globalManager?.addValueSnapshot(globalSnapshot)!

    expect(resolve(`global[${toV2Id(global.id)}]`).global?.id).toBe(global.id)
    expect(resolve(`global[${global.name}]`).global?.id).toBe(global.id)
    expect(resolve("global[unknown]").global).toBeUndefined()
  })

  it("resourceParser finds dataContextList properly", () => {
    const { dataContextList } = resolve("dataContextList")
    expect(dataContextList?.length).toBe(1)
    expect(dataContextList?.[0].id).toBe(dataset.id)
  })

  // TODO Add tests for collection

  // TODO Add tests for attribute

  it("resourceParser finds attributeList properly", () => {
    const resources = resolve("dataContext[data].collection[collection1].attributeList")
    expect(resources.attributeList?.length).toBe(1)
    expect(resources.attributeList?.[0].name).toBe("a1")
  })
})
