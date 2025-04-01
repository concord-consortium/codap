import { SetRequired } from "type-fest"
import { V2Game, V2Guide, V2WebView } from "../../data-interactive/data-interactive-component-types"
import { DIComponentHandler, registerComponentHandler } from "../../data-interactive/handlers/component-handler"
import { IFreeTileLayout } from "../../models/document/free-tile-row"
import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { toV3Id } from "../../utilities/codap-utils"
import { t } from "../../utilities/translation/translate"
import { registerV2TileImporter, V2TileImportArgs } from "../../v2/codap-v2-tile-importers"
import { registerV2TileExporter, V2ExportedComponent, V2TileExportFn } from "../../v2/codap-v2-tile-exporters"
import {
  ICodapV2GameViewComponent, ICodapV2GuideViewComponent, ICodapV2WebViewComponent,
  isV2GameViewComponent, isV2GuideViewComponent, isV2ImageViewComponent, isV2WebViewComponent
} from "../../v2/codap-v2-types"
import { kV2GameType, kV2GuideViewType, kV2ImageComponentViewType, kV2WebViewType, kWebViewTileType,
          WebViewSubType } from "./web-view-defs"
import { isWebViewModel, IWebViewSnapshot, WebViewModel } from "./web-view-model"
import { WebViewComponent } from "./web-view"
import { WebViewInspector } from "./web-view-inspector"
import { WebViewTitleBar } from "./web-view-title-bar"
import { processWebViewUrl } from "./web-view-utils"

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
  defaultHeight: kDefaultWebViewHeight,
  // plugins must still be able to communicate when hidden
  renderWhenHidden: true
})

const exportFn: V2TileExportFn = ({ tile, row }) => {
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
  } else if (webViewContent?.isGuide) {
    const { pageIndex, pages } = webViewContent
    const tileLayout = row?.getTileLayout(tile.id) as Maybe<IFreeTileLayout>
    const v2GuideView: V2ExportedComponent<ICodapV2GuideViewComponent> = {
      type: "DG.GuideView",
      componentStorage: {
        items: pages.map((p) => ({
          itemTitle: p.title ?? null,
          url: p.url ?? null
        })),
        currentItemIndex: pages.length > 0 ? pageIndex : null,
        isVisible: tileLayout ? !tileLayout.isHidden : true
      }
    }
    return v2GuideView
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

function addWebViewSnapshot(args: V2TileImportArgs, name?: string, _content?: Partial<IWebViewSnapshot>) {
  const { v2Component, insertTile } = args
  const { guid } = v2Component
  const { title, userSetTitle, cannotClose } = v2Component.componentStorage || {}
  const subTypeMap: Record<string, WebViewSubType> = {
    "DG.GameView": "plugin",
    "DG.GuideView": "guide",
    "DG.ImageComponentView": "image"
  }

  const content: IWebViewSnapshot = {
    type: kWebViewTileType,
    subType: subTypeMap[v2Component.type],
    ..._content
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
    content,
    cannotClose
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
  return addWebViewSnapshot(args, name, { url: URL })
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
  return addWebViewSnapshot(args, currentGameName, { state: savedGameState, url: processWebViewUrl(currentGameUrl) })
}
registerV2TileImporter("DG.GameView", importGameView)

function importGuideView(args: V2TileImportArgs) {
  const { v2Component } = args
  if (!isV2GuideViewComponent(v2Component)) return

  // parse the v2 content
  const {componentStorage: {title, items, currentItemIndex, currentItemTitle, currentURL}} = v2Component
  // create webView model
  const pages = items?.map((i) => ({
    title: i.itemTitle ?? undefined,
    url: i.url ? processWebViewUrl(i.url) : undefined
  })) ?? []
  let pageIndex = currentItemIndex
  // older versions saved currentURL and currentItemTitle instead of currentItemIndex
  if (pageIndex == null && currentURL != null) {
    pageIndex = items.findIndex((i) => i.url === currentURL)
  }
  if (pageIndex == null && currentItemTitle != null) {
    pageIndex = items.findIndex((i) => i.itemTitle === currentItemTitle)
  }
  if (pageIndex == null) {
    pageIndex = 0 // fallback to first page
  }
  return addWebViewSnapshot(args, title, { url: processWebViewUrl(pages[pageIndex]?.url ?? ""), pageIndex, pages })
}
registerV2TileImporter("DG.GuideView", importGuideView)


function importImageComponentView(args: V2TileImportArgs) {
  const { v2Component } = args
  if (!isV2ImageViewComponent(v2Component)) return
  // parse the v2 content
  const { componentStorage: { name, URL } } = v2Component
console.log("importImageComponentView", JSON.parse(JSON.stringify(v2Component)))
  // create webView model
  // The componentStorage.name is set to the title when original image component was created,
  // Only the componentStorage.title is updated when user renames the image component.
  return addWebViewSnapshot(args, name, { url: URL.includes("data:image") ? URL : processWebViewUrl(URL) })
}
registerV2TileImporter("DG.ImageComponentView", importImageComponentView)

const webViewComponentHandler: DIComponentHandler = {
  create({ values }) {
    const { URL } = values as V2WebView
    return { content: { type: kWebViewTileType, url: URL } as SetRequired<IWebViewSnapshot, "type"> }
  },

  get(content) {
    if (isWebViewModel(content)) {
      const subTypeToV2TypeMap: Record<WebViewSubType, string> = {
        guide: kV2GuideViewType,
        image: kV2ImageComponentViewType,
        plugin: kV2GameType
      }
      const type =  (content.subType && subTypeToV2TypeMap[content.subType]) ?? kV2WebViewType
      return { type, URL: content.url } as V2Game | V2Guide | V2WebView
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
registerComponentHandler(kV2GuideViewType, webViewComponentHandler)
registerComponentHandler(kV2ImageComponentViewType, webViewComponentHandler)
registerComponentHandler(kV2WebViewType, webViewComponentHandler)
