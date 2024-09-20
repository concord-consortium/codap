import { logMessageWithReplacement } from "../../lib/log-message"
import { IDocumentContentModel } from "../../models/document/document-content"
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
