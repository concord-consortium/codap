import { Instance, types } from "mobx-state-tree"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { kCaseTableTileType } from "./case-table-defs"

export const CaseTableModel = TileContentModel
  .named("CaseTableModel")
  .props({
    type: types.optional(types.literal(kCaseTableTileType), kCaseTableTileType)
    // column widths, hidden columns(?), etc.
  })
export interface ICaseTableModel extends Instance<typeof CaseTableModel> {}

export function isCaseTableModel(model?: ITileContentModel): model is ICaseTableModel {
  return model?.type === kCaseTableTileType
}
