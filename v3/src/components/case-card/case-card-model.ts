import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { getTileCaseMetadata, getTileDataSet } from "../../models/shared/shared-data-utils"
import { ISharedModel } from "../../models/shared/shared-model"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { kCaseCardTileType } from "./case-card-defs"
import { ICollectionModel } from "../../models/data/collection"
import { ICase, IGroupedCase } from "../../models/data/data-set-types"

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
    groupChildCases(collection: ICollectionModel, parentCaseId: string) {
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
      const newCase = {} as ICase

      // This function gets values for the given ancestor or descendant collection's attributes, and
      // sets them on the new case
      const setHierarchyValues = (relativeCollection: ICollectionModel, alreadyProcessed = new Set<string>()) => {
        if (alreadyProcessed.has(relativeCollection.id)) return

        alreadyProcessed.add(relativeCollection.id)
        relativeCollection.attributes.forEach(attr => {
          if (attr?.id) {
            const value = self.data?.getValue(displayedCaseId, attr.id)
            newCase[attr.id] = value
          }
        })

        // Recursively set any parent or child collection attribute values on the new case
        relativeCollection.parent && setHierarchyValues(relativeCollection.parent, alreadyProcessed)
        relativeCollection.child && setHierarchyValues(relativeCollection.child, alreadyProcessed)
      }

      // Set any parent and child collection attribute values on the new case
      collection.parent && setHierarchyValues(collection.parent)
      collection.child && setHierarchyValues(collection.child)

      // Add empty values for the current collection's attributes since these are what the user will want to customize.
      // Not setting them to "" results in "undefined" being displayed in the case card UI's input fields.
      collection?.attributes.forEach(attr => {
        if (attr?.id) {
          newCase[attr.id] = ""
        }
      })

      const newCases = [newCase]
      const lastExistingCaseId = cases[cases.length - 1].__id__
      const newCaseId = self.data?.addCases(newCases, {after: lastExistingCaseId})[0]
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
