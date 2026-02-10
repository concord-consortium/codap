import { kDefaultWebViewHeight, kDefaultWebViewWidth } from "../../components/web-view/web-view-registration"
import { kWebViewTileType } from "../../components/web-view/web-view-defs"
import {
  IWebViewModel, kDefaultAllowEmptyAttributeDeletion, kDefaultPreventAttributeDeletion,
  kDefaultPreventBringToFront, kDefaultPreventDataContextReorg, kDefaultPreventTopLevelReorg,
  kDefaultRespectEditableItemAttribute, kDefaultWebViewVersion
} from "../../components/web-view/web-view-model"
import { appState } from "../../models/app-state"
import { uiState } from "../../models/ui-state"
import { toV2Id } from "../../utilities/codap-utils"
import { DIInteractiveFrame } from "../data-interactive-types"
import { diInteractiveFrameHandler } from "./interactive-frame-handler"

describe("DataInteractive InteractiveFrameHandler", () => {
  const handler = diInteractiveFrameHandler
  it("get works", () => {
    expect(handler.get?.({}).success).toBe(false)

    const interactiveFrame = appState.document.content!.createOrShowTile(kWebViewTileType)!
    const webView = interactiveFrame.content as IWebViewModel
    const result = handler.get!({ interactiveFrame })
    expect(result.success).toBe(true)
    const {
      allowEmptyAttributeDeletion, dimensions, id, name, preventAttributeDeletion, preventBringToFront,
      preventDataContextReorg, preventTopLevelReorg, respectEditableItemAttribute, savedState, title, version
    } = result.values as DIInteractiveFrame
    expect(allowEmptyAttributeDeletion).toBe(kDefaultAllowEmptyAttributeDeletion)
    expect(dimensions?.height).toBe(kDefaultWebViewHeight)
    expect(dimensions?.width).toBe(kDefaultWebViewWidth)
    expect(id).toBe(toV2Id(interactiveFrame.id))
    expect(name).toBe(interactiveFrame.title)
    expect(preventAttributeDeletion).toBe(webView.preventAttributeDeletion)
    expect(preventBringToFront).toBe(webView.preventBringToFront)
    expect(preventDataContextReorg).toBe(webView.preventDataContextReorg)
    expect(preventTopLevelReorg).toBe(webView.preventTopLevelReorg)
    expect(respectEditableItemAttribute).toBe(webView.respectEditableItemAttribute)
    expect(savedState).toBe(webView.state)
    expect(title).toBe(interactiveFrame.title)
    expect(version).toBe(webView.version)
  })

  it("update works", () => {
    const tile = appState.document.content!.createOrShowTile(kWebViewTileType)!
    const webViewContent = tile.content as IWebViewModel

    const allowEmptyAttributeDeletion = !kDefaultAllowEmptyAttributeDeletion
    const cannotClose = true
    const dimensions = { height: 10, width: 20 }
    const name = "New name"
    const preventAttributeDeletion = !kDefaultPreventAttributeDeletion
    const preventBringToFront = !kDefaultPreventBringToFront
    const preventDataContextReorg = !kDefaultPreventDataContextReorg
    const preventTopLevelReorg = !kDefaultPreventTopLevelReorg
    const respectEditableItemAttribute = !kDefaultRespectEditableItemAttribute
    const version = "v2.0"
    const values = {
      allowEmptyAttributeDeletion, cannotClose, dimensions, name, preventAttributeDeletion, preventBringToFront,
      preventDataContextReorg, preventTopLevelReorg, respectEditableItemAttribute, version
    }

    expect(handler.update?.({}, values).success).toBe(false)

    expect(webViewContent.allowEmptyAttributeDeletion).toBe(kDefaultAllowEmptyAttributeDeletion)
    expect(tile.cannotClose).toBeUndefined()
    expect(webViewContent.preventAttributeDeletion).toBe(kDefaultPreventAttributeDeletion)
    expect(webViewContent.preventBringToFront).toBe(kDefaultPreventBringToFront)
    expect(webViewContent.preventDataContextReorg).toBe(kDefaultPreventDataContextReorg)
    expect(webViewContent.preventTopLevelReorg).toBe(kDefaultPreventTopLevelReorg)
    expect(webViewContent.respectEditableItemAttribute).toBe(kDefaultRespectEditableItemAttribute)
    expect(webViewContent.version).toBe(kDefaultWebViewVersion)
    expect(handler.update?.({ interactiveFrame: tile }, values).success).toBe(true)
    expect(webViewContent.allowEmptyAttributeDeletion).toBe(allowEmptyAttributeDeletion)
    expect(tile.cannotClose).toBe(cannotClose)
    const newDimensions =
      appState.document.content?.getTileDimensions(tile.id) as unknown as { height: number, width: number }
    expect(newDimensions.height).toBe(10)
    expect(newDimensions.width).toBe(20)
    expect(webViewContent.preventAttributeDeletion).toBe(preventAttributeDeletion)
    expect(webViewContent.preventBringToFront).toBe(preventBringToFront)
    expect(webViewContent.preventDataContextReorg).toBe(preventDataContextReorg)
    expect(webViewContent.preventTopLevelReorg).toBe(preventTopLevelReorg)
    expect(webViewContent.respectEditableItemAttribute).toBe(respectEditableItemAttribute)
    expect(tile.title).toBe(name)
    expect(webViewContent.version).toBe(version)
  })

  it("update respects userSetTitle flag when updating title", () => {
    const tile = appState.document.content!.createOrShowTile(kWebViewTileType)!
    tile.setUserTitle("Custom Title")
    expect(tile.title).toBe("Custom Title")
    expect(tile.userSetTitle).toBe(true)

    const result = handler.update?.({ interactiveFrame: tile }, {
      name: "Plugin Default Name",
      title: "Plugin Default Title"
    })

    expect(result?.success).toBe(true)
    expect(tile.title).toBe("Custom Title")
    expect(tile.userSetTitle).toBe(true)
  })

  it("update allows title change when userSetTitle is false", () => {
    const tile = appState.document.content!.createOrShowTile(kWebViewTileType)!
    expect(tile.userSetTitle).toBeUndefined()

    const result = handler.update?.({ interactiveFrame: tile }, {
      name: "Plugin Name",
      title: "Plugin Title"
    })

    expect(result?.success).toBe(true)
    expect(tile.title).toBe("Plugin Title")
  })

  describe("notify", () => {
    afterEach(() => {
      uiState.setBusy(false)
    })

    it("returns error when interactiveFrame is missing", () => {
      const result = handler.notify?.({}, { request: "indicateBusy" })
      expect(result?.success).toBe(false)
    })

    it("returns error when values are missing", () => {
      const tile = appState.document.content!.createOrShowTile(kWebViewTileType)!
      const result = handler.notify?.({ interactiveFrame: tile })
      expect(result?.success).toBe(false)
    })

    it("indicateBusy sets busy state", () => {
      const tile = appState.document.content!.createOrShowTile(kWebViewTileType)!
      expect(uiState.isBusy).toBe(false)
      const result = handler.notify?.({ interactiveFrame: tile }, { request: "indicateBusy" })
      expect(result?.success).toBe(true)
      expect(uiState.isBusy).toBe(true)
      expect(uiState.busyCursorMode).toBe(false)
    })

    it("indicateBusy with cursorMode sets cursorMode", () => {
      const tile = appState.document.content!.createOrShowTile(kWebViewTileType)!
      const result = handler.notify?.({ interactiveFrame: tile }, { request: "indicateBusy", cursorMode: true })
      expect(result?.success).toBe(true)
      expect(uiState.isBusy).toBe(true)
      expect(uiState.busyCursorMode).toBe(true)
    })

    it("indicateBusy with string cursorMode sets cursorMode", () => {
      const tile = appState.document.content!.createOrShowTile(kWebViewTileType)!
      const result = handler.notify?.({ interactiveFrame: tile }, { request: "indicateBusy", cursorMode: "true" })
      expect(result?.success).toBe(true)
      expect(uiState.isBusy).toBe(true)
      expect(uiState.busyCursorMode).toBe(true)
    })

    it("indicateIdle clears busy state", () => {
      uiState.setBusy(true, true)
      expect(uiState.isBusy).toBe(true)
      const tile = appState.document.content!.createOrShowTile(kWebViewTileType)!
      const result = handler.notify?.({ interactiveFrame: tile }, { request: "indicateIdle" })
      expect(result?.success).toBe(true)
      expect(uiState.isBusy).toBe(false)
    })

    // Unrecognized requests return success to avoid breaking plugins.
    it("returns success for unrecognized requests", () => {
      const tile = appState.document.content!.createOrShowTile(kWebViewTileType)!
      const result = handler.notify?.({ interactiveFrame: tile }, { request: "unknownRequest" })
      expect(result?.success).toBe(true)
    })
  })
})
