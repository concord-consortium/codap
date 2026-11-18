import { getSnapshot } from "mobx-state-tree"
import "../components/case-card/case-card-registration"
import "../components/case-table/case-table-registration"
import { kCaseTableDefaultHeight } from "../components/case-table/case-table-types"
import "../components/text/text-registration"
import "../components/web-view/web-view-registration"
import { kTitleBarHeight } from "../components/constants"
import { appState } from "../models/app-state"
import { getTileInfo } from "../models/document/tile-utils"
import { ITileModel } from "../models/tiles/tile-model"
import { setupTestDataset } from "../test/dataset-test-utils"
import { toV2Id } from "../utilities/codap-utils"
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

  async function createComponent(values: any) {
    const result = await processAction({ action: "create", resource: "component", values } as any)
    expect(result.success).toBe(true)
    const id = String((result.values as any).id)
    return Array.from(content!.tileMap.values()).find(_tile => _tile.id.endsWith(id))!
  }

  it("create component takes dimensions as the whole tile, title bar included, as in v2", async () => {
    const tile = await createWebView({ dimensions: { width: 400, height: 300 } })
    expect(tileSize(tile)).toEqual({ width: 400, height: 300 })

    const text = await createComponent({ type: "text", dimensions: { width: 250, height: 100 } })
    expect(tileSize(text)).toEqual({ width: 250, height: 100 })
  })

  it("create component takes contentDimensions as the content size, ahead of dimensions side by side", async () => {
    const tile = await createWebView({
      dimensions: { width: 400, height: 300 }, contentDimensions: { width: 500, height: 250 }
    })
    expect(tileSize(tile)).toEqual({ width: 500, height: 250 + kTitleBarHeight })

    const tile2 = await createWebView({ dimensions: { width: 400, height: 300 }, contentDimensions: { width: 500 } })
    expect(tileSize(tile2)).toEqual({ width: 500, height: 300 })
  })

  it("create component uses text that converts to a positive number, and ignores other values", async () => {
    const defaultSize = tileSize(await createWebView({}))
    const tile = await createWebView({ dimensions: { width: "450", height: -1 } })
    expect(tileSize(tile)).toEqual({ width: 450, height: defaultSize?.height })
  })

  describe("create component for a case table or case card", () => {
    let dataContext: string
    let dataContextCount = 0

    beforeEach(() => {
      dataContext = `sizes${++dataContextCount}`
      content!.createDataSet(getSnapshot(setupTestDataset({ datasetName: dataContext }).dataset))
    })

    it("takes dimensions as the whole tile when the data context has neither", async () => {
      const table = await createComponent({ type: "caseTable", dataContext, dimensions: { width: 400, height: 300 } })
      expect(tileSize(table)).toEqual({ width: 400, height: 300 })

      dataContext = `sizes${++dataContextCount}`
      content!.createDataSet(getSnapshot(setupTestDataset({ datasetName: dataContext }).dataset))
      const card = await createComponent({ type: "caseCard", dataContext, dimensions: { width: 400, height: 300 } })
      expect(tileSize(card)).toEqual({ width: 400, height: 300 })
    })

    it("gives a new table the default height, title bar included, when no height is given", async () => {
      const table = await createComponent({ type: "caseTable", dataContext, dimensions: { width: 400 } })
      expect(tileSize(table)).toEqual({ width: 400, height: kCaseTableDefaultHeight + kTitleBarHeight })
    })

    it("takes dimensions as the whole tile when it switches between table and card", async () => {
      await createComponent({ type: "caseTable", dataContext })
      const card = await createComponent({ type: "caseCard", dataContext, dimensions: { width: 400, height: 300 } })
      expect(tileSize(card)).toEqual({ width: 400, height: 300 })
    })

    it("takes contentDimensions as the content size", async () => {
      const table = await createComponent({
        type: "caseTable", dataContext, contentDimensions: { width: 400, height: 300 }
      })
      expect(tileSize(table)).toEqual({ width: 400, height: 300 + kTitleBarHeight })
    })
  })

  describe("update component", () => {
    it("takes dimensions as the whole tile, and keeps the current value of an unusable side", async () => {
      const tile = await createWebView({ dimensions: { width: 300, height: 200 } })
      const update = async (values: any) => {
        const resource = `component[${toV2Id(tile.id)}]`
        const result = await processAction({ action: "update", resource, values } as any)
        expect(result.success).toBe(true)
      }
      await update({ dimensions: { width: 400, height: 300 } })
      expect(tileSize(tile)).toEqual({ width: 400, height: 300 })
      await update({ dimensions: { width: -1, height: 0 } })
      expect(tileSize(tile)).toEqual({ width: 400, height: 300 })
      await update({ dimensions: { width: "450", height: null } })
      expect(tileSize(tile)).toEqual({ width: 450, height: 300 })
    })
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
      await update({ dimensions: { width: 0 } })
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

      // a tile shorter than the title bar has no content height, not a negative one
      await update({ dimensions: { height: 20 } })
      const result2 = await processAction({ action: "get", resource: "interactiveFrame" }, { tile })
      expect(result2.values).toMatchObject({ contentDimensions: { width: 400, height: 0 } })
    })
  })
})
