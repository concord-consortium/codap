import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { getTileCaseMetadata, getTileDataSet } from "../../models/shared/shared-data-utils"
import { ISharedModel } from "../../models/shared/shared-model"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { kCaseTableTileType } from "./case-table-defs"
import { CollectionTableModel } from "./collection-table-model"

export const CaseTableModel = TileContentModel
  .named("CaseTableModel")
  .props({
    type: types.optional(types.literal(kCaseTableTileType), kCaseTableTileType)
  })
  .volatile(self => ({
    // entire hierarchical table scrolls as a unit horizontally
    scrollLeft: 0
  }))
  .views(self => ({
    get data() {
      return getTileDataSet(self)
    },
    get metadata() {
      return getTileCaseMetadata(self)
    }
  }))
  .views(self => {
    const collectionTableModels = new Map<string, CollectionTableModel>()

    return {
      getCollectionTableModel(collectionId: string) {
        let collectionTableModel = collectionTableModels.get(collectionId)
        if (!collectionTableModel) {
          collectionTableModel = new CollectionTableModel(collectionId)
          collectionTableModels.set(collectionId, collectionTableModel)
        }
        return collectionTableModel
      }
    }
  })
  .actions(self => ({
    updateAfterSharedModelChanges(sharedModel?: ISharedModel) {
      // TODO
    },
    setScrollLeft(scrollLeft: number) {
      self.scrollLeft = scrollLeft
    }
  }))
export interface ICaseTableModel extends Instance<typeof CaseTableModel> {}
export interface ICaseTableSnapshot extends SnapshotIn<typeof CaseTableModel> {}

export function isCaseTableModel(model?: ITileContentModel): model is ICaseTableModel {
  return model?.type === kCaseTableTileType
}
