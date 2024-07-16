import "../../components/web-view/web-view-registration"
import { kDefaultWebViewWidth } from "../../components/web-view/web-view-registration"
import { kWebViewTileType } from "../../components/web-view/web-view-defs"
import {
  IWebViewModel, kDefaultExternalUndoAvailable, kDefaultPreventAttributeDeletion,
  kDefaultPreventDataContextReorg, kDefaultRespectEditableItemAttribute, kDefaultStandaloneUndoModeAvailable,
  kDefaultWebViewVersion
} from "../../components/web-view/web-view-model"
import { appState } from "../../models/app-state"
import { kDefaultPreventBringToFront } from "../../models/tiles/tile-model"
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
      dimensions, externalUndoAvailable, id, name, preventAttributeDeletion, preventBringToFront,
      preventDataContextReorg, respectEditableItemAttribute, savedState, standaloneUndoModeAvailable,
      title, version
    } = result.values as DIInteractiveFrame
    expect(dimensions?.height).toBe(425) // Seems like this should be kDefaultWebViewHeight, but it's not
    expect(dimensions?.width).toBe(kDefaultWebViewWidth)
    expect(externalUndoAvailable).toBe(webView.externalUndoAvailable)
    expect(id).toBe(toV2Id(interactiveFrame.id))
    expect(name).toBe(interactiveFrame.title)
    expect(preventAttributeDeletion).toBe(webView.preventAttributeDeletion)
    expect(preventBringToFront).toBe(interactiveFrame.preventBringToFront)
    expect(preventDataContextReorg).toBe(webView.preventDataContextReorg)
    expect(respectEditableItemAttribute).toBe(webView.respectEditableItemAttribute)
    expect(savedState).toBe(webView.state)
    expect(standaloneUndoModeAvailable).toBe(webView.standaloneUndoModeAvailable)
    expect(title).toBe(interactiveFrame.title)
    expect(version).toBe(webView.version)
  })

  it("update works", () => {
    const tile = appState.document.content!.createOrShowTile(kWebViewTileType)!
    const webViewContent = tile.content as IWebViewModel

    const cannotClose = true
    const dimensions = { height: 10, width: 10 }
    const externalUndoAvailable = !kDefaultExternalUndoAvailable
    const name = "New name"
    const preventAttributeDeletion = !kDefaultPreventAttributeDeletion
    const preventBringToFront = !kDefaultPreventBringToFront
    const preventDataContextReorg = !kDefaultPreventDataContextReorg
    const respectEditableItemAttribute = !kDefaultRespectEditableItemAttribute
    const standaloneUndoModeAvailable = !kDefaultStandaloneUndoModeAvailable
    const version = "v2.0"
    const values = {
      cannotClose, dimensions, externalUndoAvailable, name, preventAttributeDeletion, preventBringToFront,
      preventDataContextReorg, respectEditableItemAttribute, standaloneUndoModeAvailable, version
    }

    expect(handler.update?.({}, values).success).toBe(false)

    expect(tile.cannotClose).toBe(false)
    expect(webViewContent.externalUndoAvailable).toBe(kDefaultExternalUndoAvailable)
    expect(webViewContent.preventAttributeDeletion).toBe(kDefaultPreventAttributeDeletion)
    expect(tile.preventBringToFront).toBe(kDefaultPreventBringToFront)
    expect(webViewContent.preventDataContextReorg).toBe(kDefaultPreventDataContextReorg)
    expect(webViewContent.respectEditableItemAttribute).toBe(kDefaultRespectEditableItemAttribute)
    expect(webViewContent.standaloneUndoModeAvailable).toBe(kDefaultStandaloneUndoModeAvailable)
    expect(webViewContent.version).toBe(kDefaultWebViewVersion)
    expect(handler.update?.({ interactiveFrame: tile }, values).success).toBe(true)
    expect(tile.cannotClose).toBe(cannotClose)
    const newDimensions =
      appState.document.content?.getTileDimensions(tile.id) as unknown as { height: number, width: number }
    expect(newDimensions.height).toBe(10)
    expect(newDimensions.width).toBe(10)
    expect(webViewContent.externalUndoAvailable).toBe(externalUndoAvailable)
    expect(webViewContent.preventAttributeDeletion).toBe(preventAttributeDeletion)
    expect(tile.preventBringToFront).toBe(preventBringToFront)
    expect(webViewContent.preventDataContextReorg).toBe(preventDataContextReorg)
    expect(webViewContent.respectEditableItemAttribute).toBe(respectEditableItemAttribute)
    expect(webViewContent.standaloneUndoModeAvailable).toBe(standaloneUndoModeAvailable)
    expect(tile.title).toBe(name)
    expect(webViewContent.version).toBe(version)
  })
})
