import { Instance, types } from "mobx-state-tree"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { kHelloCodapTileType } from "./hello-defs"

export const HelloCodapModel = TileContentModel
  .named("HelloCodapModel")
  .props({
    type: types.optional(types.literal(kHelloCodapTileType), kHelloCodapTileType)
  })
export interface IHelloCodapModel extends Instance<typeof HelloCodapModel> {}

export function isHelloCodapModel(model?: ITileContentModel): model is IHelloCodapModel {
  return model?.type === kHelloCodapTileType
}
