import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { applyUndoableAction } from "../../models/history/apply-undoable-action"
import { getTileCaseMetadata, getTileDataSet } from "../../models/shared/shared-data-utils"
import { ISharedModel } from "../../models/shared/shared-model"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { kCaseCardTileType } from "./case-card-defs"
import { CollectionCardModel } from "./collection-card-model"

export const CaseCardModel = TileContentModel
  .named("CaseCardModel")
  .props({
    type: types.optional(types.literal(kCaseCardTileType), kCaseCardTileType),
    // key is collection id; value is width
    attributeColumnWidths: types.map(types.number),
  })
  .views(self => ({
    get data() {
      return getTileDataSet(self)
    },
    get metadata() {
      return getTileCaseMetadata(self)
    },
    attributeColumnWidth(collectionId: string) {
      return self.attributeColumnWidths.get(collectionId)
    },
  }))
  .views(self => {
    const collectionCardModels = new Map<string, CollectionCardModel>()

    return {
      getCollectionCardModel(collectionId: string) {
        let collectionCardModel = collectionCardModels.get(collectionId)
        if (!collectionCardModel) {
          collectionCardModel = new CollectionCardModel(collectionId)
          collectionCardModels.set(collectionId, collectionCardModel)
        }
        return collectionCardModel
      }
    }
  })
  .actions(self => ({
    setAttributeColumnWidth(collectionId: string, width?: number) {
      if (width) {
        self.attributeColumnWidths.set(collectionId, width)
      }
      else {
        self.attributeColumnWidths.delete(collectionId)
      }
    },
    updateAfterSharedModelChanges(sharedModel?: ISharedModel) {
      // TODO
    },
  }))
  .actions(applyUndoableAction)
export interface ICaseCardModel extends Instance<typeof CaseCardModel> {}
export interface ICaseCardSnapshot extends SnapshotIn<typeof CaseCardModel> {}

export function isCaseCardModel(model?: ITileContentModel): model is ICaseCardModel {
  return model?.type === kCaseCardTileType
}
