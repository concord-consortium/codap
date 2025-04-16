import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { IValueType, kDefaultNumPrecision } from "../../models/data/attribute-types"
import { ICollectionModel } from "../../models/data/collection"
import { ICaseCreation, IGroupedCase } from "../../models/data/data-set-types"
import { getTileCaseMetadata, getTileDataSet } from "../../models/shared/shared-data-tile-utils"
import { ISharedModel } from "../../models/shared/shared-model"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { getNumFormatter } from "../case-tile-common/attribute-format-utils"
import { kCaseCardTileType } from "./case-card-defs"

export const CaseCardModel = TileContentModel
  .named("CaseCardModel")
  .props({
    type: types.optional(types.literal(kCaseCardTileType), kCaseCardTileType),
    // key is collection id; value is percentage width
    attributeColumnWidths: types.map(types.number),
  })
  .views(self => ({
    get data() {
      return getTileDataSet(self)
    },
    get metadata() {
      return getTileCaseMetadata(self)
    },
    // value is a percentage width
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
      }

      const collectionIdsToSummarize: string[] = []

      collections.forEach((collection, index) => {
        if (index < collections.length - 1) {
          const cases = self.data?.getCasesForCollection(collection.id) ?? []
          const anyChildSelectedCount = cases.reduce((count, { __id__ }) => {
            const caseInfo = self.data?.caseInfoMap.get(__id__)
            return caseInfo?.childItemIds.some(id => selectedItems?.has(id)) ? count + 1 : count
          }, 0)
          if (cases.length > 1 && anyChildSelectedCount !== 1) {
            collectionIdsToSummarize.push(collection.id)
          }
        } else {
          // always summarize the last collection
            collectionIdsToSummarize.push(collection.id)
        }
      })

      return collectionIdsToSummarize
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
      const getNumericSummary = (numericValues: number[], attrUnits: string, attrPrecision: number): string => {
        const formatStr = `.${attrPrecision}~f`
        const formatter = getNumFormatter(formatStr)
        const minValue = formatter ? formatter(Math.min(...numericValues)) : Math.min(...numericValues)
        const maxValue = formatter ? formatter(Math.max(...numericValues)) : Math.max(...numericValues)
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
            const attrPrecision = attr.numPrecision ?? kDefaultNumPrecision
            summary = getNumericSummary(numericValues, attrUnits, attrPrecision)
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
    updateAfterSharedModelChanges(sharedModel?: ISharedModel) {
      // TODO
    },
    setAttributeColumnWidth(collectionId: string, width?: number) {
      if (width) {
        self.attributeColumnWidths.set(collectionId, width)
      }
      else {
        self.attributeColumnWidths.delete(collectionId)
      }
    },
    addNewCase(level: number) {
      const newCase: ICaseCreation = {}
      const selectedItemIds = self.data?.selection
      const collections = self.data?.collections

      function findCommonCases(lineages: (readonly string[])[]) {
        if (!collections) return
        if (lineages.length === 0) return []
        if (lineages.length === 1) return lineages[0].slice(0, (level - collections.length))
        let commonValues = lineages[0].slice(0, level)
        for (let i = 1; i < lineages.length; i++) {
          commonValues = commonValues.filter(value => lineages[i].includes(value))
          if (commonValues.length === 0) {
            return []
          }
        }
        return commonValues
      }

      if (collections && selectedItemIds && level !== 0) {
        const caseLineages = Array.from(selectedItemIds).map(itemId => self.caseLineage(itemId) || [])
        const commonCaseIds = findCommonCases(caseLineages)
        if (commonCaseIds && commonCaseIds.length > 0) {
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
