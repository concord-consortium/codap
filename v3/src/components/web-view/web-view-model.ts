import { Instance, types } from "mobx-state-tree"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { kWebViewTileType } from "./web-view-defs"

export const WebViewModel = TileContentModel
  .named("WebViewModel")
  .props({
    type: types.optional(types.literal(kWebViewTileType), kWebViewTileType),
    url: ""
  })
  .actions(self => ({
    setUrl(url: string) {
      self.url = url
    }
  }))
export interface IWebViewModel extends Instance<typeof WebViewModel> {}

export function isWebViewModel(model?: ITileContentModel): model is IWebViewModel {
  return model?.type === kWebViewTileType
}
