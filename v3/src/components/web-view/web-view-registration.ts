import { SetRequired } from "type-fest"
import { V2Game, V2WebView } from "../../data-interactive/data-interactive-component-types"
import { DIComponentHandler, registerComponentHandler } from "../../data-interactive/handlers/component-handler"
import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { toV3Id } from "../../utilities/codap-utils"
import { t } from "../../utilities/translation/translate"
import { registerV2TileImporter, V2TileImportArgs } from "../../v2/codap-v2-tile-importers"
import { registerV2TileExporter, V2ExportedComponent, V2TileExportFn } from "../../v2/codap-v2-tile-exporters"
import {
  isV2WebViewComponent, isV2GameViewComponent, ICodapV2WebViewComponent, ICodapV2GameViewComponent
} from "../../v2/codap-v2-types"
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

const exportFn: V2TileExportFn = ({ tile }) => {
  // This really should be a WebView Model. We shouldn't be called unless
  // the tile type is kWebViewTileType which is what isWebViewModel is using.
  const webViewContent = isWebViewModel(tile.content) ? tile.content : undefined
  const url = webViewContent?.url ?? ""
  if (webViewContent?.isPlugin) {
    const v2GameView: V2ExportedComponent<ICodapV2GameViewComponent> = {
      type: "DG.GameView",
      componentStorage: {
        currentGameUrl: url,
        currentGameName: tile.name,
        savedGameState: webViewContent?.state ?? undefined
        // TODO_V2_EXPORT add the rest of the game properties
      }
    }
    return v2GameView
  } else {
    const v2WebView: V2ExportedComponent<ICodapV2WebViewComponent> = {
      type: "DG.WebView",
      componentStorage: {
        URL: url
      }
    }
    return v2WebView
  }
}
exportFn.options = ({ tile }) => {
  const webViewContent = isWebViewModel(tile.content) ? tile.content : undefined
  // v2 doesn't write out a `name` property for game view components
  return { suppressName: webViewContent?.isPlugin }
}
registerV2TileExporter(kWebViewTileType, exportFn)

function addWebViewSnapshot(args: V2TileImportArgs, name?: string, url?: string, state?: unknown) {
  const { v2Component, insertTile } = args
  const { guid } = v2Component
  const { title, userSetTitle } = v2Component.componentStorage || {}

  const content: IWebViewSnapshot = {
    type: kWebViewTileType,
    state,
    url,
    isPlugin: isV2GameViewComponent(v2Component)
  }
  const webViewTileSnap: ITileModelSnapshotIn = {
    id: toV3Id(kWebViewIdPrefix, guid),
    name,
    // Note: when a game view is imported the userSetTitle is often
    // false, and often the title property is set to title which the plugin provided
    // to CODAPv2. This value is also set in componentStorage.currentGameName. This
    // currentGameName value is imported as the name field above.
    // If round tripping a v2 document through v3 the title will be lost because
    // of this. The name will be preserved though. Even when the name was not preserved
    // CODAPv2 seemed to handle this correctly and updated the the title when the document
    // is loaded.
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
  const { componentStorage: { name, URL } } = v2Component

  // create webView model
  // Note: a renamed WebView has the componentStorage.name set to the URL,
  // only the componentStorage.title is updated
  return addWebViewSnapshot(args, name, URL)
}
registerV2TileImporter("DG.WebView", importWebView)

function importGameView(args: V2TileImportArgs) {
  const { v2Component } = args
  if (!isV2GameViewComponent(v2Component)) return

  // parse the v2 content
  const { componentStorage: { currentGameUrl, currentGameName, savedGameState} } = v2Component

  // create webView model
  // Note: a renamed GameView has the componentStorage.currentGameName set to the value
  // provided by the plugin, only the componentStorage.title is updated
  return addWebViewSnapshot(args, currentGameName, processPluginUrl(currentGameUrl), savedGameState)
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
