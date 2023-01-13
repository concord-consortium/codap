import { types } from "mobx-state-tree"
import { TileContentModel } from "../../models/tiles/tile-content"
import { kCaseTableTileType } from "./case-table-defs"

export const CaseTableModel = TileContentModel
  .named("CaseTableModel")
  .props({
    type: types.optional(types.literal(kCaseTableTileType), kCaseTableTileType)
    // column widths, hidden columns(?), etc.
  })
