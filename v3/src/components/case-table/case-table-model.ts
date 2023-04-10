import { Instance, types } from "mobx-state-tree"
import { IDataSet } from "../../models/data/data-set"
import { ISharedCaseMetadata, isSharedCaseMetadata } from "../../models/shared/shared-case-metadata"
import { isSharedDataSet } from "../../models/shared/shared-data-set"
import { ISharedModel } from "../../models/shared/shared-model"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { kCaseTableTileType } from "./case-table-defs"

export const CaseTableModel = TileContentModel
  .named("CaseTableModel")
  .props({
    type: types.optional(types.literal(kCaseTableTileType), kCaseTableTileType)
  })
  .views(self => ({
    get data(): IDataSet | undefined {
      const sharedModelManager = self.tileEnv?.sharedModelManager
      const sharedModel = sharedModelManager?.getTileSharedModels(self).find(m => isSharedDataSet(m))
      return isSharedDataSet(sharedModel) ? sharedModel.dataSet : undefined
    },
    get metadata(): ISharedCaseMetadata | undefined {
      const sharedModelManager = self.tileEnv?.sharedModelManager
      const sharedModel = sharedModelManager?.getTileSharedModels(self).find(m => isSharedCaseMetadata(m))
      return isSharedCaseMetadata(sharedModel) ? sharedModel : undefined
    }
  }))
  .actions(self => ({
    updateAfterSharedModelChanges(sharedModel?: ISharedModel) {
      // TODO
    }
  }))
export interface ICaseTableModel extends Instance<typeof CaseTableModel> {}

export function isCaseTableModel(model?: ITileContentModel): model is ICaseTableModel {
  return model?.type === kCaseTableTileType
}
