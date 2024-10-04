import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { getTileCaseMetadata, getTileDataSet } from "../../models/shared/shared-data-utils"
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
    get summarizedCollections() {
      const selectedItems = self.data?.selection
      const items = self.data?.items
      const collections = self.data?.collections

      if (!collections || !items || selectedItems?.size === 1) {
        return []
      } else if (!selectedItems || selectedItems.size === 0 || selectedItems.size === items.length) {
        return collections?.map(c => c.id) ?? []
      } else {
        const collectionIdsToSummarize: string[] = []
        const summarizeCollectionsRecursively = (index = 0) => {
          if (index >= collections.length - 1) return
          const collection = collections[index]
          const collectionCases = collection.cases
          const selectedChildrenPerCase = collectionCases.map(collectionCase => {
            const caseGroup = self.data?.caseInfoMap.get(collectionCase.__id__)
            if (!caseGroup?.childCaseIds) return 0
            return caseGroup.childCaseIds.filter(childCaseId => self.data?.isCaseSelected(childCaseId)).length
          })
          if (selectedChildrenPerCase.filter(v => v > 0).length > 1) {
            collectionIdsToSummarize.push(collection.id)
          }
          summarizeCollectionsRecursively(index + 1)
        }

        summarizeCollectionsRecursively()
        // always summarize the last collection
        collectionIdsToSummarize.push(collections[collections.length - 1].id)
        return collectionIdsToSummarize
      }
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
    setAttributeColumnWidth(collectionId: string, width?: number) {
      if (width) {
        self.attributeColumnWidths.set(collectionId, width)
      }
      else {
        self.attributeColumnWidths.delete(collectionId)
      }
    },
    addNewCase() {
      const newCase: ICaseCreation = {}
      const selectedCases = self.data?.selection

      function findCommonCases(lineages: (readonly string[])[]) {
        if (lineages.length === 0) return []
        if (lineages.length === 1) return lineages[0].slice(0, -1)
        let commonValues = lineages[0]
        for (let i = 1; i < lineages.length; i++) {
          commonValues = commonValues.filter(value => lineages[i].includes(value))
          if (commonValues.length === 0) {
            return []
          }
        }
        return commonValues
      }

      if (selectedCases) {
        const caseLineages = Array.from(selectedCases).map(caseId => self.caseLineage(caseId) || [])
        const commonCaseIds = findCommonCases(caseLineages)
        if (commonCaseIds.length > 0) {
          commonCaseIds.forEach(caseId => {
            const caseCollection = self.data?.getCollectionForCase(caseId)
            caseCollection?.attributes.forEach(attr => {
              const attrId = attr?.id
              if (!attrId) return
              const caseValue = self.data?.getValue(caseId, attr.id)
              newCase[attrId] = caseValue
            })
          })
        }
      }

      const [newCaseId] = self.data?.addCases([newCase]) ?? []

      // TODO: Figure out why this call to validateCases is necessary. The Cypress test for adding a case
      // fails if it isn't here, though adding a case seems to work fine when tested manually.
      self.data?.validateCases()

      return newCaseId
    }
  }))
export interface ICaseCardModel extends Instance<typeof CaseCardModel> { }
export interface ICaseCardSnapshot extends SnapshotIn<typeof CaseCardModel> { }

export function isCaseCardModel(model?: ITileContentModel): model is ICaseCardModel {
  return model?.type === kCaseCardTileType
}
