import { logMessageWithReplacement } from "../../lib/log-message"
import { IDocumentContentModel } from "../../models/document/document-content"
import { uiState } from "../../models/ui-state"
import { isFreeTileLayout } from "../../models/document/free-tile-row"
import { kWebViewTileType } from "../web-view/web-view-defs"
import { isWebViewModel } from "../web-view/web-view-model"

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

