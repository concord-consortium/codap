import { observable } from "mobx"
import { Instance, types } from "mobx-state-tree"
import { getTileCaseMetadata, getTileDataSet } from "../../models/shared/shared-data-utils"
import { ISharedModel } from "../../models/shared/shared-model"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { kCaseTableTileType } from "./case-table-defs"

export const CaseTableModel = TileContentModel
  .named("CaseTableModel")
  .props({
    type: types.optional(types.literal(kCaseTableTileType), kCaseTableTileType)
  })
  .volatile(self => ({
    // map from collection IDs to scrollTops
    scrollTopMap: observable.map<string, number>(),
  }))
  .views(self => ({
    get data() {
      return getTileDataSet(self)
    },
    get metadata() {
      return getTileCaseMetadata(self)
    }
  }))
  .actions(self => ({
    updateAfterSharedModelChanges(sharedModel?: ISharedModel) {
      // TODO
    },
    setScrollTopMap(collectionId: string, topLocation: number) {
      self.scrollTopMap.set(collectionId, topLocation)
    },
    removeFromScrollTopMap(collectionId: string) {
      self.scrollTopMap.delete(collectionId)
    }
  }))
export interface ICaseTableModel extends Instance<typeof CaseTableModel> {}

export function isCaseTableModel(model?: ITileContentModel): model is ICaseTableModel {
  return model?.type === kCaseTableTileType
}
