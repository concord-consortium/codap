import { SetRequired } from "type-fest"
import WebPageIcon from "../../assets/icons/web-page-icon.svg"
import { V2Game, V2Guide, V2WebView } from "../../data-interactive/data-interactive-component-types"
import { DIComponentHandler, registerComponentHandler } from "../../data-interactive/handlers/component-handler"
import { IFreeTileLayout } from "../../models/document/free-tile-row"
import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { ITileModel, ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { toV2Id, toV3DataSetId, toV3Id } from "../../utilities/codap-utils"
import { t } from "../../utilities/translation/translate"
import { isCodapV2GameContext } from "../../v2/codap-v2-data-context-types"
import { registerV2TileImporter, V2TileImportArgs } from "../../v2/codap-v2-tile-importers"
import { registerV2TileExporter, V2ExportedComponent, V2TileExportFn } from "../../v2/codap-v2-tile-exporters"
import {
  guidLink, ICodapV2GameViewComponent, ICodapV2GuideViewComponent, ICodapV2ImageViewComponent,
  ICodapV2WebViewComponent, isV2GameViewComponent, isV2GuideViewComponent, isV2ImageViewComponent,
  isV2WebViewComponent
} from "../../v2/codap-v2-types"
import {
  kImporterPluginHeight, kV2GameType, kV2GuideViewType, kV2ImageComponentViewType, kV2WebViewType,
  kWebViewTileType, WebViewSubType
} from "./web-view-defs"
import { isWebViewModel, IWebViewSnapshot, WebViewModel } from "./web-view-model"
import { WebViewComponent } from "./web-view"
import { WebViewInspector } from "./web-view-inspector"
import { WebViewTitleBar } from "./web-view-title-bar"
import { processWebViewUrl } from "./web-view-utils"

function isInspectorHidden(tile: ITileModel): boolean {
  if (!isWebViewModel(tile.content)) return false
  const { subType, isPluginCandidate } = tile.content

  if (subType === "plugin") return true

  if (subType === "guide" || subType === "image") return false

  // For web views without subType, use isPluginCandidate flag:
  // - true = plugin candidate (hide inspector)
  // - false = regular web view (show inspector)
  return isPluginCandidate
}

export const kWebViewIdPrefix = "WEBV"

export const kDefaultWebViewWidth = 600
export const kDefaultWebViewHeight = 400

registerTileContentInfo({
  type: kWebViewTileType,
  prefix: kWebViewIdPrefix,
  modelClass: WebViewModel,
  hideOnClose: (content) => isWebViewModel(content) && content.isGuide,
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
  hideInspector: isInspectorHidden,
  tileEltClass: "codap-web-view",
  constrainApiDimensions: (tile, dimensions) => {
    if (isWebViewModel(tile.content)) {
      // constrain height of Importer plugin to address plugin misbehavior
      if (/\/Importer(\/|$)/.test(tile.content.url)) {
        return {
          ...dimensions,
          ...(dimensions.height ? { height: Math.min(dimensions.height, kImporterPluginHeight) } : {})
        }
      }
    }
    return dimensions
  },
  defaultWidth: kDefaultWebViewWidth,
  defaultHeight: kDefaultWebViewHeight,
  // plugins must still be able to communicate when hidden
  renderWhenHidden: true,
  Icon: WebPageIcon,
  shelf: {
    position: 7,
    labelKey: "V3.ToolButtonData.webPageButton.title",
    hintKey: "V3.ToolButtonData.webPageButton.toolTip",
    undoStringKey: "V3.Undo.webPage.create",
    redoStringKey: "V3.Redo.webPage.create",
    afterCreate: tileContent => {
      if (isWebViewModel(tileContent)) {
        tileContent.setAutoOpenUrlDialog(true)
      }
    }
  }
})

const exportFn: V2TileExportFn = ({ tile, row, gameContextMetadataMap }) => {
  const webViewContent = isWebViewModel(tile.content) ? tile.content : undefined
  const url = webViewContent?.url ?? ""
  if (webViewContent?.isPlugin) {
    const { allowEmptyAttributeDeletion, preventAttributeDeletion, preventBringToFront,
            preventDataContextReorg, preventTopLevelReorg, state } = webViewContent
    const _links_ = webViewContent.dataContextId
      ? { _links_: { context: guidLink("DG.DataContextRecord", toV2Id(webViewContent.dataContextId)) } }
      : undefined
    if (gameContextMetadataMap && webViewContent.hasV2GameContext && webViewContent.dataContextId) {
      gameContextMetadataMap[webViewContent.dataContextId] = {
        gameName: tile.name || undefined,
        gameUrl: url || undefined,
        gameState: state ?? undefined
      }
    }
    const v2GameView: V2ExportedComponent<ICodapV2GameViewComponent> = {
      type: "DG.GameView",
      componentStorage: {
        currentGameUrl: url,
        currentGameName: tile.name,
        savedGameState: state ?? undefined,
        ...(allowEmptyAttributeDeletion === false ? { allowEmptyAttributeDeletion: false } : {}),
        allowInitGameOverride: true, // unused by v2, but exported for compatibility
        ...(preventAttributeDeletion ? { preventAttributeDeletion } : {}),
        preventBringToFront,
        ...(preventDataContextReorg ? { preventDataContextReorg } : {}),
        ...(preventTopLevelReorg ? { preventTopLevelReorg } : {}),
        ..._links_
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
  } else if (webViewContent?.isImage) {
    const v2ImageView: V2ExportedComponent<ICodapV2ImageViewComponent> = {
      type: "DG.ImageComponentView",
      componentStorage: {
        name: tile.name,
        title: tile._title || "",
        URL: url
      }
    }
    return v2ImageView
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
    _title: title,
    userSetTitle,
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
  const { v2Component, v2Document } = args
  if (!isV2GameViewComponent(v2Component)) return

  // parse the v2 content
  const { componentStorage: {
    _links_, currentGameUrl, currentGameName, allowEmptyAttributeDeletion, preventAttributeDeletion,
    preventBringToFront, preventDataContextReorg, preventTopLevelReorg, savedGameState
  } } = v2Component
  const linkedDataContextId = _links_?.context?.id
  const linkedDataContext = linkedDataContextId ? v2Document.getV2DataContext(linkedDataContextId) : undefined
  const linkedGameContext = isCodapV2GameContext(linkedDataContext) ? linkedDataContext : undefined

  const gameName = currentGameName ?? linkedGameContext?.contextStorage?.gameName ?? undefined
  const gameUrl = currentGameUrl ?? linkedGameContext?.contextStorage?.gameUrl ?? undefined
  const gameState = savedGameState ?? linkedGameContext?.contextStorage?.gameState ?? undefined

  // create webView model
  // Note: a renamed GameView has the componentStorage.currentGameName set to the value
  // provided by the plugin, only the componentStorage.title is updated
  return addWebViewSnapshot(args, gameName, {
    url: processWebViewUrl(gameUrl),
    dataContextId: linkedDataContextId ? toV3DataSetId(linkedDataContextId) : undefined,
    state: gameState,
    allowEmptyAttributeDeletion,
    preventAttributeDeletion,
    preventBringToFront,
    preventDataContextReorg,
    preventTopLevelReorg,
    hasV2GameContext: linkedGameContext ? true : undefined
  })
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
      const type = (content.subType && subTypeToV2TypeMap[content.subType]) ?? kV2WebViewType

      // Return guide-specific properties
      if (content.isGuide) {
        const items = content.pages.map(page => ({
          itemTitle: page.title ?? "",
          url: page.url ?? ""
        }))
        return {
          currentItemIndex: content.pageIndex,
          items,
          type,
          URL: content.url,
        } as V2Guide
      }

      return { type, URL: content.url } as V2Game | V2Guide | V2WebView
    }
  },

  // Note: currentGameName (V2 alias for name) is handled by the common component handler
  update(content, values) {
    if (isWebViewModel(content)) {
      const { URL, currentGameUrl } = values as V2Game

      // Support both URL and currentGameUrl (V2 alias)
      const url = URL ?? currentGameUrl
      if (url != null) content.setUrl(url)

      // Handle guide-specific properties
      if (content.isGuide) {
        const { items, currentItemIndex } = values as V2Guide

        if (items != null) {
          // Convert V2 items format to V3 pages format
          const pages = items.map(item => ({
            title: item.itemTitle,
            url: item.url
          }))
          content.setGuidePages(pages)
        }

        if (currentItemIndex != null) {
          content.setGuidePageIndex(currentItemIndex)
        }
      }
    }

    return { success: true }
  }
}
registerComponentHandler(kV2GameType, webViewComponentHandler)
registerComponentHandler(kV2GuideViewType, webViewComponentHandler)
registerComponentHandler(kV2ImageComponentViewType, webViewComponentHandler)
registerComponentHandler(kV2WebViewType, webViewComponentHandler)
