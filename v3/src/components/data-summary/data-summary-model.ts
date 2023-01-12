import { types } from "mobx-state-tree"
import { TileContentModel } from "../../models/tiles/tile-content"
import { kDataSummaryTileType } from "./data-summary-defs"

export const DataSummaryModel = TileContentModel
  .named("DataSummaryModel")
  .props({
    type: types.optional(types.literal(kDataSummaryTileType), kDataSummaryTileType)
  })
