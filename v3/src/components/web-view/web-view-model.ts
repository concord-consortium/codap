import iframePhone from "iframe-phone"
import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { DIMessage } from "../../data-interactive/iframe-phone-types"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { kWebViewTileType } from "./web-view-defs"

export const kDefaultExternalUndoAvailable = true
export const kDefaultPreventAttributeDeletion = false
export const kDefaultPreventBringToFront = false
export const kDefaultPreventDataContextReorg = false
export const kDefaultRespectEditableItemAttribute = false
export const kDefaultStandaloneUndoModeAvailable = false
export const kDefaultWebViewVersion = "v0.1"

export const WebViewModel = TileContentModel
  .named("WebViewModel")
  .props({
    type: types.optional(types.literal(kWebViewTileType), kWebViewTileType),
    url: "",
    state: types.frozen<unknown>()
  })
  .volatile(self => ({
    dataInteractiveController: undefined as iframePhone.IframePhoneRpcEndpoint | undefined,
    isPlugin: false,
    // fields used by the Collaborative plugin
    preventAttributeDeletion: kDefaultPreventAttributeDeletion,
    respectEditableItemAttribute: kDefaultRespectEditableItemAttribute,
    // fields controlled by plugins via interactiveFrame requests
    externalUndoAvailable: kDefaultExternalUndoAvailable,
    preventBringToFront: kDefaultPreventBringToFront,
    preventDataContextReorg: kDefaultPreventDataContextReorg,
    standaloneUndoModeAvailable: kDefaultStandaloneUndoModeAvailable,
    version: kDefaultWebViewVersion,
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
    setPreventAttributeDeletion(value: boolean) {
      self.preventAttributeDeletion = value
    },
    setRespectEditableItemAttribute(value: boolean) {
      self.respectEditableItemAttribute = value
    },
    setExternalUndoAvailable(value: boolean) {
      self.externalUndoAvailable = value
    },
    setPreventBringToFront(value: boolean) {
      self.preventBringToFront = value
    },
    setPreventDataContextReorg(value: boolean) {
      self.preventDataContextReorg = value
    },
    setStandaloneUndoModeAvailable(value: boolean) {
      self.standaloneUndoModeAvailable = value
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
