import {
  kComponentTypeV3ToV2Map, kV2DITypeToLifecycleNameMap
} from "../../data-interactive/data-interactive-component-types"
import { logMessageWithReplacement } from "../../lib/log-message"
import { IDocumentContentModel } from "../../models/document/document-content"
import { getTileComponentInfo } from "../../models/tiles/tile-component-info"
import { getTileContentInfo } from "../../models/tiles/tile-content-info"
import { uiState } from "../../models/ui-state"
import { isFreeTileLayout } from "../../models/document/free-tile-row"
import { kWebViewTileType } from "../web-view/web-view-defs"
import { isWebViewModel } from "../web-view/web-view-model"

export interface ICreateTileHistoryOptions {
  // set when creating the tile toggles a singleton's visibility instead
  showHide?: "show" | "hide"
  undoStringKey: string
  redoStringKey: string
  log: ReturnType<typeof logMessageWithReplacement> | string
}

// The undo strings and log message for creating a tile of the given type from the toolbar
export function getCreateTileHistoryOptions(tileType: string, documentContent?: IDocumentContentModel) {
  const tileInfo = getTileComponentInfo(tileType)
  const isSingleton = !!getTileContentInfo(tileType)?.isSingleton
  const diType = kComponentTypeV3ToV2Map[tileType]

  // Compute the V2-compat singleton path's preconditions and resulting state up front.
  // We take the singleton path only when ALL of these hold:
  //   - tile is a singleton (`isSingleton`)
  //   - there's a V2 type mapping (`diType`) — otherwise undo keys + notification
  //     `type`/`diType` would be undefined
  //   - the toggle will actually change visibility — `toggleSingletonTileVisibility`
  //     gates `setHidden` on `isFreeTileLayout` (document-content.ts:225), so in
  //     mosaic/legacy layouts the click is a no-op visually. Emitting V2 hide/show in
  //     that case would lie about what happened.
  // When any precondition fails we fall back to the generic create path.
  let showHide: Maybe<"show" | "hide">
  if (isSingleton && diType) {
    const existingTiles = documentContent?.getTilesOfType(tileType) ?? []
    if (existingTiles.length > 0) {
      const existingLayout = documentContent?.getTileLayoutById(existingTiles[0].id)
      // Non-free layout — toggleSingletonTileVisibility won't toggle visibility.
      if (isFreeTileLayout(existingLayout)) {
        showHide = existingLayout.isHidden ? "show" : "hide"
      }
    } else {
      // No existing tile — `createTile` runs and the singleton appears.
      showHide = "show"
    }
  }

  // For singletons with a V2 mapping in a hideable layout, V2 emits `hide`/`show`
  // rather than `create` (the op reflects the resulting visible state). Use V2's
  // matching add/delete undo strings — `DG.{Undo,Redo}.toggleComponent.{add,delete}.
  // {lifecycleName}` per document_controller.js:1644-1666. lifecycleName comes from
  // the V2 lifecycle-name override (calculator → 'calcView') with DI-name fallback.
  if (showHide) {
    const lifecycleName = kV2DITypeToLifecycleNameMap[diType] ?? diType
    const action = showHide === "hide" ? "delete" : "add"
    return {
      showHide,
      undoStringKey: `DG.Undo.toggleComponent.${action}.${lifecycleName}`,
      redoStringKey: `DG.Redo.toggleComponent.${action}.${lifecycleName}`,
      log: action === "add" ? `Add toggle component: ${lifecycleName}` : `Remove toggle component: ${lifecycleName}`
    } satisfies ICreateTileHistoryOptions
  }

  return {
    undoStringKey: tileInfo?.shelf?.undoStringKey ?? "",
    redoStringKey: tileInfo?.shelf?.redoStringKey ?? "",
    log: logMessageWithReplacement("Create component: %@", {tileType}, "component")
  } satisfies ICreateTileHistoryOptions
}

export const showWebView = (url: string, documentContent?: IDocumentContentModel) => {
  if (!url.startsWith("https://") && !url.startsWith("http://")) {
    url = `https://${url}`
  }
  documentContent?.applyModelChange(() => {
    const tile = documentContent?.createOrShowTile?.(kWebViewTileType)
    isWebViewModel(tile?.content) && tile?.content.setUrl(`${url}`)
  }, {
    undoStringKey: "V3.Undo.webView.show",
    redoStringKey: "V3.Redo.webView.show",
    log: logMessageWithReplacement("Show web view: %@", {url}, "document")
  })
}

export const handleSelectTile = (tileId: string, documentContent?: IDocumentContentModel) => {
  uiState.setFocusedTile(tileId)
  const tileRow = documentContent?.findRowContainingTile(tileId)
  const tileLayout = tileRow?.getTileLayout(tileId)
  if (isFreeTileLayout(tileLayout) && (tileLayout.isHidden || tileLayout.isMinimized)) {
    const type = documentContent?.getTile(tileId)?.content.type || "tile"
    documentContent?.applyModelChange(() => {
      tileLayout.setHidden(false)
      tileLayout.setMinimized(false)
    }, {
      undoStringKey: "V3.Undo.tile.show",
      redoStringKey: "V3.Redo.tile.show",
      log: logMessageWithReplacement("Show %@", {type}, "document")
    })
  }
}

