import { SetRequired } from "type-fest"
import { V2Game, V2WebView } from "../../data-interactive/data-interactive-component-types"
import { DIComponentHandler, registerComponentHandler } from "../../data-interactive/handlers/component-handler"
import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { toV3Id } from "../../utilities/codap-utils"
import { t } from "../../utilities/translation/translate"
import { registerV2TileImporter, V2TileImportArgs } from "../../v2/codap-v2-tile-importers"
import { isV2WebViewComponent, isV2GameViewComponent } from "../../v2/codap-v2-types"
import { kV2GameType, kV2WebViewType, kWebViewTileType } from "./web-view-defs"
import { isWebViewModel, IWebViewSnapshot, WebViewModel } from "./web-view-model"
import { WebViewComponent } from "./web-view"
import { WebViewInspector } from "./web-view-inspector"
import { WebViewTitleBar } from "./web-view-title-bar"
import { processPluginUrl } from "./web-view-utils"

export const kWebViewIdPrefix = "WEBV"

export const kDefaultWebViewWidth = 600
export const kDefaultWebViewHeight = 400

registerTileContentInfo({
  type: kWebViewTileType,
  prefix: kWebViewIdPrefix,
  modelClass: WebViewModel,
  defaultContent: () => ({ type: kWebViewTileType }),
  defaultName: () => t("DG.WebView.defaultTitle"),
  getTitle: (tile) => tile.title || t("DG.WebView.defaultTitle"),
  getV2Type: (content) => isWebViewModel(content) && content.isPlugin ? kV2GameType : kV2WebViewType
})

registerTileComponentInfo({
  type: "CodapWebView",
  TitleBar: WebViewTitleBar,
  Component: WebViewComponent,
  InspectorPanel: WebViewInspector,
  tileEltClass: "codap-web-view",
  defaultWidth: kDefaultWebViewWidth,
  defaultHeight: kDefaultWebViewHeight
})

function addWebViewSnapshot(args: V2TileImportArgs, guid: number, url?: string, state?: unknown) {
  const { v2Component, insertTile } = args
  const { name, title, userSetTitle } = v2Component.componentStorage || {}

  const content: IWebViewSnapshot = {
    type: kWebViewTileType,
    state,
    url
  }
  const webViewTileSnap: ITileModelSnapshotIn = {
    id: toV3Id(kWebViewIdPrefix, guid),
    name,
    _title: (userSetTitle && title) || undefined,
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

const webViewComponentHandler: DIComponentHandler = {
  create({ values }) {
    const { URL } = values as V2WebView
    return { content: { type: kWebViewTileType, url: URL } as SetRequired<IWebViewSnapshot, "type"> }
  },

  get(content) {
    if (isWebViewModel(content)) {
      const type = content.isPlugin ? kV2GameType : kV2WebViewType
      return { type, URL: content.url } as V2Game | V2WebView
    }
  },

  update(content, values) {
    if (isWebViewModel(content)) {
      const { URL } = values as V2WebView
      if (URL) content.setUrl(URL)
    }

    return { success: true }
  }
}
registerComponentHandler(kV2GameType, webViewComponentHandler)
registerComponentHandler(kV2WebViewType, webViewComponentHandler)
