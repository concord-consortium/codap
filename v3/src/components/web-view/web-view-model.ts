import iframePhone from "iframe-phone"
import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { DIMessage } from "../../data-interactive/iframe-phone-types"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { withoutUndo } from "../../models/history/without-undo"
import { kWebViewTileType, WebViewSubType, webViewSubTypes } from "./web-view-defs"

export const kDefaultAllowEmptyAttributeDeletion = true
export const kDefaultBlockAPIRequestsWhileEditing = false
export const kDefaultPreventAttributeDeletion = false
export const kDefaultPreventBringToFront = false
export const kDefaultPreventDataContextReorg = false
export const kDefaultPreventTopLevelReorg = false
export const kDefaultRespectEditableItemAttribute = false
export const kDefaultWebViewVersion = ""

export const WebViewModel = TileContentModel
  .named("WebViewModel")
  .props({
    type: types.optional(types.literal(kWebViewTileType), kWebViewTileType),
    subType: types.maybe(types.enumeration(webViewSubTypes)),
    url: "",
    state: types.frozen<unknown>(),
    // fields controlled by plugins (like Collaborative) via interactiveFrame requests
    allowEmptyAttributeDeletion: kDefaultAllowEmptyAttributeDeletion,
    blockAPIRequestsWhileEditing: kDefaultBlockAPIRequestsWhileEditing,
    preventAttributeDeletion: kDefaultPreventAttributeDeletion,
    preventBringToFront: kDefaultPreventBringToFront,
    preventDataContextReorg: kDefaultPreventDataContextReorg,
    preventTopLevelReorg: kDefaultPreventTopLevelReorg,
    respectEditableItemAttribute: kDefaultRespectEditableItemAttribute
  })
  .volatile(self => ({
    dataInteractiveController: undefined as iframePhone.IframePhoneRpcEndpoint | undefined,
    version: kDefaultWebViewVersion
  }))
  .views(self => ({
    get allowBringToFront() {
      return !self.preventBringToFront
    },
    get isGuide() {
      return self.subType === "guide"
    },
    get isPlugin() {
      return self.subType === "plugin"
    }
  }))
  .actions(self => ({
    setDataInteractiveController(controller?: iframePhone.IframePhoneRpcEndpoint) {
      self.dataInteractiveController = controller
    },
    setSubType(subType: WebViewSubType) {
      withoutUndo()
      self.subType = subType
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
    setVersion(version: string) {
      self.version = version
    }
  }))
  .actions(self => ({
    prepareSnapshot() {
      return new Promise<void>((resolve) => {
        if (self.dataInteractiveController) {
          self.dataInteractiveController?.call({
            "action": "get",
            "resource": "interactiveState"
          } as any, (result) => {
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
    }
  }))
export interface IWebViewModel extends Instance<typeof WebViewModel> {}
export interface IWebViewSnapshot extends SnapshotIn<typeof WebViewModel> {}

export function isWebViewModel(model?: ITileContentModel): model is IWebViewModel {
  return model?.type === kWebViewTileType
}
