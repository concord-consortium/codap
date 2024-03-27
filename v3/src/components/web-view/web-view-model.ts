import iframePhone from "iframe-phone"
import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { kWebViewTileType } from "./web-view-defs"

export const WebViewModel = TileContentModel
  .named("WebViewModel")
  .props({
    type: types.optional(types.literal(kWebViewTileType), kWebViewTileType),
    url: "",
    state: types.frozen<unknown>()
  })
  .volatile(self => ({
    dataInteractiveController: undefined as iframePhone.IframePhoneRpcEndpoint | undefined,
    isPlugin: false
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
