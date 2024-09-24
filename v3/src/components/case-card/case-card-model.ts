import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { getTileCaseMetadata, getTileDataSet } from "../../models/shared/shared-data-utils"
import { ISharedModel } from "../../models/shared/shared-model"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { kCaseCardTileType } from "./case-card-defs"
import { ICollectionModel } from "../../models/data/collection"
import { ICaseCreation, IGroupedCase } from "../../models/data/data-set-types"
import { IValueType } from "../../models/data/attribute"

export const CaseCardModel = TileContentModel
  .named("CaseCardModel")
  .props({
    type: types.optional(types.literal(kCaseCardTileType), kCaseCardTileType),
    // key is collection id; value is width
    attributeColumnWidths: types.map(types.number),
    summarizedCollections: types.optional(types.array(types.string), [])
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
    }
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
    },
    displayValues(collection: ICollectionModel, caseItem: IGroupedCase) {

      const getNumericSummary = (numericValues: number[], attrUnits: string): string => {
        const minValue = Math.min(...numericValues)
        const maxValue = Math.max(...numericValues)
        return minValue === maxValue
                 ? `${minValue}${attrUnits ? ` ${attrUnits}` : ""}`
                 : `${minValue}-${maxValue}${attrUnits ? ` ${attrUnits}` : ""}`
      }
    
      const getCategoricalSummary = (uniqueValues: Set<IValueType>): string => {
        const uniqueValuesArray = Array.from(uniqueValues)
        if (uniqueValuesArray.length === 1) {
          return `${uniqueValuesArray[0]}`
        } else if (uniqueValuesArray.length === 2) {
          return `${uniqueValuesArray[0]}, ${uniqueValuesArray[1]}`
        } else {
          return `${uniqueValuesArray.length} values`
        }
      }
    
      if (self.summarizedCollections.includes(collection.id)) {
        const summaryMap = collection?.attributes.reduce((acc: Record<string, string>, attr) => {
          if (!attr || !attr.id) return acc

          const selectedCases = self.data?.selection
          const casesToUse = selectedCases && selectedCases.size >= 1
                               ? Array.from(selectedCases).map((id) => ({ __id__: id }))
                               : collection.cases
          const allValues = casesToUse.map(c => self.data?.getValue(c.__id__, attr.id))
          const uniqueValues = new Set(allValues)
          const isNumeric = attr.numValues?.some((v, i) => attr.isNumeric(i))
          let summary = ""

          if (isNumeric) {
            const numericValues = attr.numValues?.filter((v, i) => attr.isNumeric(i))
            const attrUnits = attr.units ?? "" // self.data?.attrFromID(attr.id)?.units ?? ""
            summary = getNumericSummary(numericValues, attrUnits)
          } else {
            summary = getCategoricalSummary(uniqueValues)
          } 
          return { ...acc, [attr.id]: summary }
        }, {})
        return collection?.attributes.map(attr => attr?.id && summaryMap[attr.id]) ?? []
      } else {
        return collection?.attributes.map(attr => attr?.id && self.data?.getValue(caseItem?.__id__, attr.id)) ?? []
      }
    }
  }))
  .actions(self => ({
    setSummarizedCollections(collections: string[]) {
      self.summarizedCollections.replace(collections)
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

      // TODO: Figure out why this call to validateCases is necessary. The Cypress test for adding a case
      // fails if it isn't here, though adding a case seems to work fine when tested manually.
      self.data?.validateCases()
    
      return newCaseId
    },
    setShowSummary(show: boolean, collectionId?: string) {
      if (show) {
        self.data?.setSelectedCases([])
      }

      const updatedSummarizedCollections = show
                                             ? collectionId
                                               ? [...self.summarizedCollections, collectionId]
                                               : self.data?.collections.map(c => c.id) ?? []
                                             : collectionId
                                               ? self.summarizedCollections.filter(cid => cid !== collectionId)
                                               : []

      self.setSummarizedCollections(updatedSummarizedCollections)
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
