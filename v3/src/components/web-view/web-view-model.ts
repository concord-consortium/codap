import iframePhone from "iframe-phone"
import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { DIMessage } from "../../data-interactive/iframe-phone-types"
import { ITileContentModel, kDefaultPreventBringToFront, TileContentModel } from "../../models/tiles/tile-content"
import { kWebViewTileType } from "./web-view-defs"

export const kDefaultAllowEmptyAttributeDeletion = true
export const kDefaultPreventAttributeDeletion = false
export const kDefaultPreventDataContextReorg = false
export const kDefaultRespectEditableItemAttribute = false
export const kDefaultWebViewVersion = "v0.1"

export const WebViewModel = TileContentModel
  .named("WebViewModel")
  .props({
    type: types.optional(types.literal(kWebViewTileType), kWebViewTileType),
    url: "",
    state: types.frozen<unknown>(),
    // fields used by the Collaborative plugin
    allowEmptyAttributeDeletion: kDefaultAllowEmptyAttributeDeletion,
    preventAttributeDeletion: kDefaultPreventAttributeDeletion,
    respectEditableItemAttribute: kDefaultRespectEditableItemAttribute,
    // fields controlled by plugins via interactiveFrame requests
    preventBringToFront: kDefaultPreventBringToFront,
    preventDataContextReorg: kDefaultPreventDataContextReorg
  })
  .volatile(self => ({
    dataInteractiveController: undefined as iframePhone.IframePhoneRpcEndpoint | undefined,
    isPlugin: false,
    version: kDefaultWebViewVersion
  }))
  .views(self => ({
    get getPreventBringToFront() {
      return !self.preventBringToFront
    }
  }))
  .actions(self => ({
    setDataInteractiveController(controller?: iframePhone.IframePhoneRpcEndpoint) {
      self.dataInteractiveController = controller
    },
    setIsPlugin(isPlugin: boolean) {
      self.isPlugin = isPlugin
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
