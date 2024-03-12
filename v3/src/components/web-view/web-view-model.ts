import iframePhone from "iframe-phone"
import { Instance, types } from "mobx-state-tree"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { kWebViewTileType } from "./web-view-defs"

export const WebViewModel = TileContentModel
  .named("WebViewModel")
  .props({
    savedState: types.frozen(),
    type: types.optional(types.literal(kWebViewTileType), kWebViewTileType),
    url: ""
  })
  .volatile(self => ({
    dataInteractiveController: undefined as iframePhone.IframePhoneRpcEndpoint | undefined
  }))
  .actions(self => ({
    setDataInteractiveController(controller?: iframePhone.IframePhoneRpcEndpoint) {
      self.dataInteractiveController = controller
    },
    setSavedState(state: any) {
      self.savedState = state
    },
    setUrl(url: string) {
      self.url = url
    }
  }))
  .actions(self => ({
    async prepareSnapshot(resolve: (value: unknown) => void) {
      console.log(`ooo updating saved state`)
      if (self.dataInteractiveController) {
        console.log(` oo found data interactive controller`)
        return await self.dataInteractiveController.call({
          "action": "get",
          "resource": "interactiveState"
        } as any, result => {
          console.log(` oo got result`, result)
          if (result) {
            const state = result.values || result.state || result.status
            console.log(`  o state`, state)
            if (state) {
              self.setSavedState(state)
              resolve({ success: true })
            }
          }
          resolve({ success: false })
        })
      }
      resolve({ success: false })
    }
  }))
export interface IWebViewModel extends Instance<typeof WebViewModel> {}

export function isWebViewModel(model?: ITileContentModel): model is IWebViewModel {
  return model?.type === kWebViewTileType
}
