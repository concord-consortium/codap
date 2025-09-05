import { kTitleBarHeight } from "../constants"
import { V2Game, V2WebView } from "../../data-interactive/data-interactive-component-types"
import { DIComponentInfo } from "../../data-interactive/data-interactive-types"
import { diComponentHandler } from "../../data-interactive/handlers/component-handler"
import { testGetComponent } from "../../data-interactive/handlers/component-handler-test-utils"
import { appState } from "../../models/app-state"
import { isFreeTileRow } from "../../models/document/free-tile-row"
import { getTileComponentInfo } from "../../models/tiles/tile-component-info"
import { toV3Id } from "../../utilities/codap-utils"
import { kV2GameType } from "./web-view-defs"
import { IWebViewModel, isWebViewModel } from "./web-view-model"
import {
  kDefaultWebViewHeight, kDefaultWebViewWidth, kWebViewIdPrefix
} from "./web-view-registration"

describe("DataInteractive ComponentHandler WebView and Game", () => {
  const handler = diComponentHandler
  const documentContent = appState.document.content!

  it("create, get, and update webView and game work", () => {
    // Create a blank webView
    expect(documentContent.tileMap.size).toBe(0)
    const result = handler.create!({}, { type: "webView" })
    expect(result.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    const resultValues = result.values as DIComponentInfo
    const tile = documentContent.tileMap.get(toV3Id(kWebViewIdPrefix, resultValues.id!))!
    expect(tile).toBeDefined()
    expect(isWebViewModel(tile.content)).toBe(true)

    // Delete webView tile
    const deleteResult = handler.delete?.({ component: tile })
    expect(deleteResult?.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(0)

    // Create webView with url
    const wikipediaUrl = "https://wikipedia.org"
    const result2 = handler.create!({}, { type: "webView", URL: wikipediaUrl })
    expect(result2.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    const result2Values = result2.values as DIComponentInfo
    const tile2 = documentContent.tileMap.get(toV3Id(kWebViewIdPrefix, result2Values.id!))!
    expect(tile2).toBeDefined()
    expect(isWebViewModel(tile2.content)).toBe(true)
    expect((tile2.content as IWebViewModel).url).toBe(wikipediaUrl)

    // Get webView
    testGetComponent(tile2, handler, (webViewTile, values) => {
      const { URL } = values as V2WebView
      expect(URL).toBe((webViewTile.content as IWebViewModel).url)
    })

    // Update webView
    expect(tile2.cannotClose).toBeUndefined()
    expect(tile2.title).toBe("Web Page")
    const row = appState.document.content?.findRowContainingTile(tile2.id)
    const freeTileRow = row && isFreeTileRow(row) ? row : undefined
    const tileLayout = freeTileRow?.getNode(tile2.id)
    expect(tileLayout?.x).toBe(100)
    expect(tileLayout?.y).toBe(100)
    expect(tileLayout?.height).toBe(kDefaultWebViewHeight + kTitleBarHeight)
    expect(tileLayout?.width).toBe(kDefaultWebViewWidth)
    const newValue = 50
    const title = "New Title"
    expect(handler.update?.({ component: tile2 }, {
      cannotClose: true,
      dimensions: { height: newValue, width: newValue },
      position: { left: newValue, top: newValue },
      title
    }).success).toBe(true)
    expect(tile2.cannotClose).toBe(true)
    expect(tile2.title).toBe(title)
    expect(tileLayout?.x).toBe(newValue)
    expect(tileLayout?.y).toBe(newValue)
    expect(tileLayout?.height).toBe(newValue)
    expect(tileLayout?.width).toBe(newValue)

    // Create game with url
    const multiDataUrl = "https://codap.concord.org/multidata-plugin/"
    const result3 = handler.create!({}, { type: "game", URL: multiDataUrl })
    expect(result3.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(2)
    const result3Values = result3.values as DIComponentInfo
    const tile3 = documentContent.tileMap.get(toV3Id(kWebViewIdPrefix, result3Values.id!))!
    expect(tile3).toBeDefined()
    expect(isWebViewModel(tile3.content)).toBe(true)
    const gameModel = tile3.content as IWebViewModel
    expect(gameModel.url).toBe(multiDataUrl)

    // Get game
    gameModel.setSubType("plugin") // This would normally be set automatically when the plugin connects to codap
    testGetComponent(tile3, handler, (gameTile, values) => {
      const { URL } = values as V2Game
      expect(URL).toBe((gameTile.content as IWebViewModel).url)
      expect((gameTile.content as IWebViewModel).subType).toBe("plugin")
      // plugins should not show inspector
      expect(getTileComponentInfo(gameTile.content.type)?.hideInspector?.(gameTile)).toBe(true)
    }, { type: kV2GameType })
  })
})
