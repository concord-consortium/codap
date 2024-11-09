import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { getTileCaseMetadata, getTileDataSet } from "../../models/shared/shared-data-utils"
import { ISharedModel } from "../../models/shared/shared-model"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { kCaseTableTileType } from "./case-table-defs"
import { CollectionTableModel } from "./collection-table-model"

export const CaseTableModel = TileContentModel
  .named("CaseTableModel")
  .props({
    type: types.optional(types.literal(kCaseTableTileType), kCaseTableTileType),
    // key is attribute id; value is width
    columnWidths: types.map(types.number),
    // Only used for serialization; volatile property used during run time
    horizontalScrollOffset: 0
  })
  .volatile(self => ({
    // entire hierarchical table scrolls as a unit horizontally
    _horizontalScrollOffset: 0
  }))
  .actions(self => ({
    afterCreate() {
      self._horizontalScrollOffset = self.horizontalScrollOffset
    },
    prepareSnapshot() {
      self.horizontalScrollOffset = self._horizontalScrollOffset
    }
  }))
  .views(self => ({
    get data() {
      return getTileDataSet(self)
    },
    get metadata() {
      return getTileCaseMetadata(self)
    },
    columnWidth(attrId: string) {
      return self.columnWidths.get(attrId)
    },
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
    setColumnWidth(attrId: string, width?: number) {
      if (width) {
        self.columnWidths.set(attrId, width)
      }
      else {
        self.columnWidths.delete(attrId)
      }
    },
    setColumnWidths(columnWidths: Map<string, number>) {
      self.columnWidths.replace(columnWidths)
    },
    updateAfterSharedModelChanges(sharedModel?: ISharedModel) {
      // TODO
    },
    setHorizontalScrollOffset(horizontalScrollOffset: number) {
      self._horizontalScrollOffset = horizontalScrollOffset
    }
  }))
export interface ICaseTableModel extends Instance<typeof CaseTableModel> {}
export interface ICaseTableSnapshot extends SnapshotIn<typeof CaseTableModel> {}

export function isCaseTableModel(model?: ITileContentModel): model is ICaseTableModel {
  return model?.type === kCaseTableTileType
}
