import { Instance, types } from "mobx-state-tree"
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
    scrollLeft: 0,
    collectionTableModels: new Map<string, CollectionTableModel>()
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
    setScrollLeft(scrollLeft: number) {
      self.scrollLeft = scrollLeft
    },
    // will create a new model if necessary
    getCollectionTableModel(collectionId: string) {
      let collectionTableModel = self.collectionTableModels.get(collectionId)
      if (!collectionTableModel) {
        collectionTableModel = new CollectionTableModel(collectionId)
        self.collectionTableModels.set(collectionId, collectionTableModel)
      }
      return collectionTableModel
    }
  }))
export interface ICaseTableModel extends Instance<typeof CaseTableModel> {}

export function isCaseTableModel(model?: ITileContentModel): model is ICaseTableModel {
  return model?.type === kCaseTableTileType
}
