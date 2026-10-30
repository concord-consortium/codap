import { kCaseTableTileType } from "../../components/case-table/case-table-defs"
import { DataDisplayRenderState } from "../../components/data-display/models/data-display-render-state"
import { kGraphTileType, kV2GraphType } from "../../components/graph/graph-defs"
import "../../components/graph/graph-registration"
import { isGraphContentModel } from "../../components/graph/models/graph-content-model"
import { createDefaultTileOfType } from "../../models/codap/add-default-content"
import { ITileModel } from "../../models/tiles/tile-model"
import {
  DIDataDisplayHandler, diDataDisplayHandler, diDataDisplayHandlers, registerDataDisplayHandler
} from "./data-display-handler"

describe("DataInteractive DataDisplayHandler", () => {
  const handler = diDataDisplayHandler
  const graphTile = { content: { type: kGraphTileType } } as ITileModel
  const tableTile = { content: { type: kCaseTableTileType } } as ITileModel
  const registeredHandlers = new Map(diDataDisplayHandlers)

  function registerTestGraphHandler(get: DIDataDisplayHandler["get"]) {
    const testHandler = { get: jest.fn(get) }
    registerDataDisplayHandler(kV2GraphType, testHandler)
    return testHandler
  }

  afterEach(() => {
    diDataDisplayHandlers.clear()
    registeredHandlers.forEach((value, key) => diDataDisplayHandlers.set(key, value))
    jest.restoreAllMocks()
  })

  it("returns an error when the component is not found", async () => {
    const result = await handler.get?.({})
    expect(result).toEqual({ success: false, values: { error: "Component not found" } })
  })

  it("returns the exportDataUri when the display handler succeeds", async () => {
    const exportDataUri = "data:image/png;base64,abc"
    const testHandler = registerTestGraphHandler(async () => ({ exportDataUri, success: true }))
    const result = await handler.get?.({ component: graphTile })
    expect(result).toEqual({ success: true, values: { exportDataUri } })
    expect(testHandler.get).toHaveBeenCalledWith(graphTile.content)
  })

  it("returns an error when the component type has no display handler", async () => {
    const result = await handler.get?.({ component: tableTile })
    expect(result).toEqual({ success: false, values: { error: "DataDisplay not found" } })
  })

  it("returns an error when the display handler fails", async () => {
    const testHandler = registerTestGraphHandler(async () => ({ success: false }))
    const result = await handler.get?.({ component: graphTile })
    expect(result).toEqual({ success: false, values: { error: "DataDisplay not found" } })
    expect(testHandler.get).toHaveBeenCalledWith(graphTile.content)
  })

  it("returns an error when the display handler throws", async () => {
    jest.spyOn(console, "error").mockImplementation(() => null)
    registerTestGraphHandler(async () => { throw new Error("render failed") })
    const result = await handler.get?.({ component: graphTile })
    expect(result).toEqual({ success: false, values: { error: "DataDisplay not found" } })
    expect(console.error).toHaveBeenCalled()
  })

  describe("with a real graph and the registered graph handler", () => {
    // This test uses a real graph tile and the handler that graph-registration registers, so it fails
    // if the key the handler is registered under does not match a real graph tile's type.
    // It does not draw an image. The render state has no renderer, so updateSnapshot() returns early
    // and leaves the dataUri passed to the constructor unchanged.
    function createGraphTile() {
      const tile = createDefaultTileOfType(kGraphTileType)!
      const { content } = tile
      if (!isGraphContentModel(content)) throw new Error("expected graph content")
      return { tile, content }
    }

    it("returns the graph's image", async () => {
      const exportDataUri = "data:image/png;base64,abc"
      const { tile, content } = createGraphTile()
      content.setRenderState(new DataDisplayRenderState([], document.createElement("div"), exportDataUri))
      const result = await handler.get?.({ component: tile })
      expect(result).toEqual({ success: true, values: { exportDataUri } })
    })
  })
})
