import { types } from "mobx-state-tree"
import { TileContentModel } from "../../models/tiles/tile-content"
import { kHelloCodapTileType } from "./hello-defs"

export const HelloCodapModel = TileContentModel
  .named("HelloCodapModel")
  .props({
    type: types.optional(types.literal(kHelloCodapTileType), kHelloCodapTileType)
  })
