import { Instance, types } from "mobx-state-tree"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { kPluginTileType } from "./plugin-defs"

export const PluginModel = TileContentModel
  .named("PluginModel")
  .props({
    type: types.optional(types.literal(kPluginTileType), kPluginTileType),
    url: ""
  })
  .actions(self => ({
    setUrl(url: string) {
      self.url = url
    }
  }))
export interface IPluginModel extends Instance<typeof PluginModel> {}

export function isPluginModel(model?: ITileContentModel): model is IPluginModel {
  return model?.type === kPluginTileType
}
