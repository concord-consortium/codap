import { Instance, types } from "mobx-state-tree"
import { IDataSet } from "../../models/data/data-set"
import { getTileCaseMetadata, getTileDataSet, linkTileToDataSet } from "../../models/shared/shared-data-utils"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { kDataSummaryTileType } from "./data-summary-defs"

export const DataSummaryModel = TileContentModel
  .named("DataSummaryModel")
  .props({
    type: types.optional(types.literal(kDataSummaryTileType), kDataSummaryTileType),
    inspectedAttrId: ""
  })
  .views(self => ({
    get data() {
      return getTileDataSet(self)
    },
    get metadata() {
      return getTileCaseMetadata(self)
    }
  }))
  .actions(self => ({
    inspect(dataSet: IDataSet, attrId: string) {
      linkTileToDataSet(self, dataSet)
      self.inspectedAttrId = attrId
    }
  }))
export interface IDataSummaryModel extends Instance<typeof DataSummaryModel> {}

export function isDataSummaryModel(model?: ITileContentModel): model is IDataSummaryModel {
  return model?.type === kDataSummaryTileType
}
