import "../components/text/text-registration"
import "../components/web-view/web-view-registration"
import { kTitleBarHeight } from "../components/constants"
import { appState } from "../models/app-state"
import { getTileInfo } from "../models/document/tile-utils"
import { ITileModel } from "../models/tiles/tile-model"
import { processAction } from "./data-interactive-request-processor"

describe("the size of a plugin's tile", () => {
  const { content } = appState.document

  async function createWebView(values: any) {
    const result = await processAction({ action: "create", resource: "component",
      values: { type: "game", URL: "https://example.com", ...values } } as any)
    expect(result.success).toBe(true)
    const id = String((result.values as any).id)
    return Array.from(content!.tileMap.values()).find(tile => tile.id.endsWith(id))!
  }

  const tileSize = (tile: ITileModel) => getTileInfo(tile.id).dimensions

  it("create component takes dimensions as the content size and adds the title bar, as in v2", async () => {
    const tile = await createWebView({ dimensions: { width: 400, height: 300 } })
    expect(tileSize(tile)).toEqual({ width: 400, height: 300 + kTitleBarHeight })
  })

  it("create component takes contentDimensions too, ahead of dimensions side by side", async () => {
    const tile = await createWebView({
      dimensions: { width: 400, height: 300 }, contentDimensions: { width: 500, height: 250 }
    })
    expect(tileSize(tile)).toEqual({ width: 500, height: 250 + kTitleBarHeight })

    const tile2 = await createWebView({ dimensions: { width: 400, height: 300 }, contentDimensions: { width: 500 } })
    expect(tileSize(tile2)).toEqual({ width: 500, height: 300 + kTitleBarHeight })
  })

  it("create component adds the title bar for other component types too", async () => {
    const result = await processAction({ action: "create", resource: "component",
      values: { type: "text", dimensions: { width: 250, height: 100 } } } as any)
    const id = String((result.values as any).id)
    const tile = Array.from(content!.tileMap.values()).find(_tile => _tile.id.endsWith(id))!
    expect(tileSize(tile)).toEqual({ width: 250, height: 100 + kTitleBarHeight })
  })

  describe("update interactiveFrame", () => {
    let tile: ITileModel

    beforeEach(async () => {
      tile = await createWebView({ dimensions: { width: 300, height: 200 } })
    })

    const update = async (values: any) => {
      const result = await processAction({ action: "update", resource: "interactiveFrame", values }, { tile })
      expect(result.success).toBe(true)
    }

    it("takes dimensions as the whole tile, title bar included, as in v2", async () => {
      await update({ dimensions: { width: 400, height: 300 } })
      expect(tileSize(tile)).toEqual({ width: 400, height: 300 })

      // a missing width or height leaves that side as it is, as in v2
      await update({ dimensions: { width: 500 } })
      expect(tileSize(tile)).toEqual({ width: 500, height: 300 })

      // so does one that is not a positive number; text that converts to one is used
      await update({ dimensions: { width: "450", height: null } })
      expect(tileSize(tile)).toEqual({ width: 450, height: 300 })
      await update({ dimensions: { width: -1, height: "tall" } })
      expect(tileSize(tile)).toEqual({ width: 450, height: 300 })
    })

    it("takes contentDimensions as the plugin's own area, ahead of dimensions", async () => {
      await update({ dimensions: { width: 400, height: 300 }, contentDimensions: { width: 680, height: 300 } })
      expect(tileSize(tile)).toEqual({ width: 680, height: 300 + kTitleBarHeight })

      // a missing width or height leaves that side as it is
      await update({ contentDimensions: { height: 100 } })
      expect(tileSize(tile)).toEqual({ width: 680, height: 100 + kTitleBarHeight })
    })

    it("reports both sizes from get", async () => {
      await update({ dimensions: { width: 400, height: 300 } })
      const result = await processAction({ action: "get", resource: "interactiveFrame" }, { tile })
      expect(result.values).toMatchObject({
        dimensions: { width: 400, height: 300 }, contentDimensions: { width: 400, height: 300 - kTitleBarHeight }
      })
    })
  })
})
