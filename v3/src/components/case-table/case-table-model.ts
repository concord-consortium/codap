import { Instance, types } from "mobx-state-tree"
import { DataSet, IDataSet } from "../../models/data/data-set"
import { ISharedCaseMetadata, SharedCaseMetadata } from "../../models/shared/shared-case-metadata"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { kCaseTableTileType } from "./case-table-defs"

export const CaseTableModel = TileContentModel
  .named("CaseTableModel")
  .props({
    type: types.optional(types.literal(kCaseTableTileType), kCaseTableTileType),
    data: types.safeReference(DataSet),
    metadata: types.safeReference(SharedCaseMetadata)
  })
  .actions(self => ({
    setData(data?: IDataSet) {
      self.data = data
    },
    setMetadata(metadata?: ISharedCaseMetadata) {
      self.metadata = metadata
    }
  }))
export interface ICaseTableModel extends Instance<typeof CaseTableModel> {}

export function isCaseTableModel(model?: ITileContentModel): model is ICaseTableModel {
  return model?.type === kCaseTableTileType
}
