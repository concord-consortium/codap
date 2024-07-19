import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { ITileLikeModel, registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { toV3Id } from "../../utilities/codap-utils"
import { registerV2TileImporter, V2TileImportArgs } from "../../v2/codap-v2-tile-importers"
import { isV2WebViewComponent, isV2GameViewComponent } from "../../v2/codap-v2-types"
import { kWebViewTileType } from "./web-view-defs"
import { IWebViewSnapshot, WebViewModel } from "./web-view-model"
import { WebViewComponent } from "./web-view"
import { WebViewInspector } from "./web-view-inspector"
import { WebViewTitleBar } from "./web-view-title-bar"
import { processPluginUrl } from "./web-view-utils"
import { t } from "../../utilities/translation/translate"

export const kWebViewIdPrefix = "WEBV"

registerTileContentInfo({
  type: kWebViewTileType,
  prefix: kWebViewIdPrefix,
  modelClass: WebViewModel,
  defaultContent: () => ({ type: kWebViewTileType }),
  getTitle: (tile: ITileLikeModel) => tile?.title || t("DG.WebView.defaultTitle")
})

registerTileComponentInfo({
  type: "CodapWebView",
  TitleBar: WebViewTitleBar,
  Component: WebViewComponent,
  InspectorPanel: WebViewInspector,
  tileEltClass: "codap-web-view",
  defaultWidth: 600,
  defaultHeight: 400
})

function addWebViewSnapshot(args: V2TileImportArgs, guid: number, url?: string, state?: unknown) {
  const { v2Component, insertTile } = args
  const { title, userSetTitle } = v2Component.componentStorage

  const content: IWebViewSnapshot = {
    type: kWebViewTileType,
    state,
    url
  }
  const webViewTileSnap: ITileModelSnapshotIn = {
    id: toV3Id(kWebViewIdPrefix, guid),
    title: (userSetTitle && title) || undefined,
    content
  }
  const webViewTile = insertTile(webViewTileSnap)

  return webViewTile
}
function importWebView(args: V2TileImportArgs) {
  const { v2Component } = args
  if (!isV2WebViewComponent(v2Component)) return

  // parse the v2 content
  const { guid, componentStorage: { URL } } = v2Component

  // create webView model
  return addWebViewSnapshot(args, guid, URL)
}
registerV2TileImporter("DG.WebView", importWebView)

function importGameView(args: V2TileImportArgs) {
  const { v2Component } = args
  if (!isV2GameViewComponent(v2Component)) return

  // parse the v2 content
  const { guid, componentStorage: { currentGameUrl, savedGameState} } = v2Component

  // create webView model
  return addWebViewSnapshot(args, guid, processPluginUrl(currentGameUrl), savedGameState)
}
registerV2TileImporter("DG.GameView", importGameView)
