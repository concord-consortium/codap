import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { getTileCaseMetadata, getTileDataSet } from "../../models/shared/shared-data-utils"
import { ISharedModel } from "../../models/shared/shared-model"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { kCaseCardTileType } from "./case-card-defs"
import { ICollectionModel } from "../../models/data/collection"
import { ICaseCreation, IGroupedCase } from "../../models/data/data-set-types"

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
  .views(self => ({
    caseLineage(itemId?: string) {
      if (!itemId) return undefined
      return self.data?.getItemCaseIds(itemId)
    },
    groupChildCases(parentCaseId: string) {
      const parentCaseInfo = self.data?.caseInfoMap.get(parentCaseId)
      if (!parentCaseInfo?.childCaseIds) return undefined
      return parentCaseInfo.childCaseIds
              .map(childCaseId => self.data?.caseInfoMap.get(childCaseId)?.groupedCase)
              .filter(groupedCase => !!groupedCase)
    }
  }))
  .actions(self => ({
    setAttributeColumnWidth(collectionId: string, width?: number) {
      if (width) {
        self.attributeColumnWidths.set(collectionId, width)
      }
      else {
        self.attributeColumnWidths.delete(collectionId)
      }
    },
    addNewCase(cases: IGroupedCase[], collection: ICollectionModel, displayedCaseId: string) {
      const newCase: ICaseCreation = {}

      collection.allParentDataAttrs.forEach(attr => {
        if (attr?.id) {
          const value = self.data?.getValue(displayedCaseId, attr.id)
          newCase[attr.id] = value
        }
      })

      const [newCaseId] = self.data?.addCases([newCase]) ?? []
      self.data?.validateCases()
    
      return newCaseId
    },
    updateAfterSharedModelChanges(sharedModel?: ISharedModel) {
      // TODO
    },
  }))
export interface ICaseCardModel extends Instance<typeof CaseCardModel> {}
export interface ICaseCardSnapshot extends SnapshotIn<typeof CaseCardModel> {}

export function isCaseCardModel(model?: ITileContentModel): model is ICaseCardModel {
  return model?.type === kCaseCardTileType
}
