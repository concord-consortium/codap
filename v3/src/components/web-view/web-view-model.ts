import iframePhone from "iframe-phone"
import { reaction } from "mobx"
import { addDisposer, Instance, SnapshotIn, types } from "mobx-state-tree"
import { DIMessage } from "../../data-interactive/iframe-phone-types"
import { withoutUndo } from "../../models/history/without-undo"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { ITileModel } from "../../models/tiles/tile-model"
import { safeGetParent } from "../../utilities/mst-utils"
import { t } from "../../utilities/translation/translate"
import { getDataInteractiveUrl, getGuideIndex } from "../../utilities/url-params"
import { kWebViewTileType, WebViewSubType, webViewSubTypes } from "./web-view-defs"
import { getNameFromURL } from "./web-view-utils"

export const kDefaultAllowEmptyAttributeDeletion = true
export const kDefaultBlockAPIRequestsWhileEditing = false
export const kDefaultPreventAttributeDeletion = false
export const kDefaultPreventBringToFront = false
export const kDefaultPreventDataContextReorg = false
export const kDefaultPreventTopLevelReorg = false
export const kDefaultRespectEditableItemAttribute = false
export const kDefaultWebViewVersion = ""
export const kDefaultSubscribeToDocuments = false

export const WebPageModel = types.model("WebPageModel", {
  title: types.maybe(types.string),
  url: types.maybe(types.string)
})

export const WebViewModel = TileContentModel
  .named("WebViewModel")
  .props({
    type: types.optional(types.literal(kWebViewTileType), kWebViewTileType),
    subType: types.maybe(types.enumeration(webViewSubTypes)),
    url: "",
    // for guides
    pageIndex: 0,
    pages: types.array(WebPageModel),
    // for games/plugins
    // TODO: should this be a safeReference instead?
    dataContextId: types.maybe(types.string),
    state: types.frozen<unknown>(),
    // fields controlled by plugins (like Collaborative) via interactiveFrame requests
    // allows the user to delete empty attributes, even if preventAttributeDeletion is true
    allowEmptyAttributeDeletion: kDefaultAllowEmptyAttributeDeletion,
    blockAPIRequestsWhileEditing: kDefaultBlockAPIRequestsWhileEditing,
    // prevent the user from deleting attributes (see exception for empty attributes above)
    preventAttributeDeletion: kDefaultPreventAttributeDeletion,
    preventBringToFront: kDefaultPreventBringToFront,
    preventDataContextReorg: kDefaultPreventDataContextReorg,
    preventTopLevelReorg: kDefaultPreventTopLevelReorg,
    // this property is referenced in the v2 code but does not appear to ever be set
    respectEditableItemAttribute: kDefaultRespectEditableItemAttribute,
    // whether this web view should subscribe to notifications that pass the document to the plugin
    subscribeToDocuments: kDefaultSubscribeToDocuments,
    // whether this web view was imported (in part) from a v2 DG.GameContext
    hasV2GameContext: types.maybe(types.literal(true))
  })
  .volatile(self => ({
    dataInteractiveController: undefined as iframePhone.IframePhoneRpcEndpoint | undefined,
    version: kDefaultWebViewVersion,
    autoOpenUrlDialog: false,
    isPluginCandidate: false,
    isPluginCommunicating: false
  }))
  .preProcessSnapshot(snap => {
    let newSnap = snap
    const { url, ...others } = snap
    // support url param processing for urls in saved documents
    const processedUrl = url ? getDataInteractiveUrl(url) : undefined
    if (processedUrl && url !== processedUrl) {
      newSnap = { ...others, url: processedUrl }
    }
    const guideIndex = getGuideIndex()
    if (guideIndex != null && (newSnap.subType === "guide" && newSnap.pageIndex !== guideIndex)) {
      const maxPageIndex = Math.max(0, (newSnap.pages?.length ?? 1) - 1)
      const pageIndex = Math.max(0, Math.min(guideIndex, maxPageIndex))
      const _url = newSnap.pages?.[pageIndex]?.url ? newSnap.pages[pageIndex].url : newSnap.url
      newSnap = { ...newSnap, pageIndex, url: _url }
    }
    return newSnap
  })
  .views(self => ({
    get allowBringToFront() {
      return !self.preventBringToFront
    },
    get isGuide() {
      return self.subType === "guide"
    },
    get isPlugin() {
      return self.subType === "plugin"
    },
    get isImage() {
      return self.subType === "image"
    }
  }))
  .actions(self => ({
    setAutoOpenUrlDialog(autoOpen: boolean) {
      self.autoOpenUrlDialog = autoOpen
    },
    setDataInteractiveController(controller?: iframePhone.IframePhoneRpcEndpoint) {
      self.dataInteractiveController = controller
    },
    setSubType(subType?: WebViewSubType) {
      self.subType = subType
      if (subType) {
        self.isPluginCandidate = false
      }
    },
    setPluginIsCommunicating() {
      self.isPluginCommunicating = true
      if (!self.isPlugin) {
        withoutUndo()
        this.setSubType("plugin")
      }
    },
    setSavedState(state: unknown) {
      self.state = state
    },
    setUrl(url: string) {
      self.url = url
    },
    broadcastMessage(message: DIMessage, callback: iframePhone.ListenerCallback) {
      self.dataInteractiveController?.call(message, callback)
    },
    setAllowEmptyAttributeDeletion(value: boolean) {
      self.allowEmptyAttributeDeletion = value
    },
    setBlockAPIRequestsWhileEditing(value: boolean) {
      self.blockAPIRequestsWhileEditing = value
    },
    setPreventAttributeDeletion(value: boolean) {
      self.preventAttributeDeletion = value
    },
    setPreventBringToFront(value: boolean) {
      self.preventBringToFront = value
    },
    setRespectEditableItemAttribute(value: boolean) {
      self.respectEditableItemAttribute = value
    },
    setPreventDataContextReorg(value: boolean) {
      self.preventDataContextReorg = value
    },
    setPreventTopLevelReorg(value: boolean) {
      self.preventTopLevelReorg = value
    },
    setSubscribeToDocuments(value: boolean) {
      self.subscribeToDocuments = value
    },
    setVersion(version: string) {
      self.version = version
    },
    setGuidePageIndex(index: number) {
      if (self.subType === "guide") {
        const maxIndex = Math.max(0, self.pages.length - 1)
        self.pageIndex = Math.max(0, Math.min(index, maxIndex))
        if (self.pages[self.pageIndex]?.url) {
          self.url = self.pages[self.pageIndex].url || ""
        }
      }
    },
    setPluginCandidate(isPlugin: boolean) {
      self.isPluginCandidate = isPlugin
    }
  }))
  .actions(self => ({
    afterCreate() {
      // If the tile has no name, set it from the URL when the URL changes
      addDisposer(self, reaction(
        () => self.url,
        (url: string) => {
          const defaultTileName = t("DG.WebView.defaultTitle")
          const tileModel = safeGetParent<ITileModel>(self)
          if (tileModel && (!tileModel.name || tileModel.name === defaultTileName) && url) {
            const name = getNameFromURL(url)
            if (name) tileModel.setName(name)
          }
        }, { name: "WebViewModel.afterCreate [setNameFromURL]", fireImmediately: true }
      ))
    },
    prepareSnapshot() {
      return new Promise<void>((resolve) => {
        if (self.dataInteractiveController) {
          self.dataInteractiveController?.call({
            "action": "get",
            "resource": "interactiveState"
          }, (result) => {
            if (result) {
              const state = result.values || result.state
              if (state) {
                self.setSavedState(state)
              }
            }
            resolve()
          })
        }
        else {
          resolve()
        }
      })
    },
    afterApplySnapshot() {
      // TODO: we probably need to send the state to the plugin. Otherwise plugins
      // won't update after snapshots are applied.
    }
  }))
export interface IWebViewModel extends Instance<typeof WebViewModel> {}
export interface IWebViewSnapshot extends SnapshotIn<typeof WebViewModel> {}

export function isWebViewModel(model?: ITileContentModel): model is IWebViewModel {
  return model?.type === kWebViewTileType
}
