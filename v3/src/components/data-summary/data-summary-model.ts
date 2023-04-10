import { Instance, types } from "mobx-state-tree"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { kDataSummaryTileType } from "./data-summary-defs"

export const DataSummaryModel = TileContentModel
  .named("DataSummaryModel")
  .props({
    type: types.optional(types.literal(kDataSummaryTileType), kDataSummaryTileType),
    inspectedAttrId: ""
  })
  .actions(self => ({
    inspect(attrId: string) {
      self.inspectedAttrId = attrId
    }
  }))
export interface IDataSummaryModel extends Instance<typeof DataSummaryModel> {}

export function isDataSummaryModel(model?: ITileContentModel): model is IDataSummaryModel {
  return model?.type === kDataSummaryTileType
}
