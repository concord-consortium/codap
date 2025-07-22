import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { IAttribute } from "../../models/data/attribute"
import { kDefaultNumPrecision } from "../../models/data/attribute-types"
import { ICollectionModel } from "../../models/data/collection"
import { ICaseCreation } from "../../models/data/data-set-types"
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
  .volatile(() => ({
    animationLevel: Infinity,
    animationDirection: "right" as "left" | "right",
    animationTimeout: undefined as NodeJS.Timeout | undefined
  }))
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
    get selectedCaseIds(): Set<string>[] {
      const { data } = self
      if (!data) return []

      const selectedCaseIds: Set<string>[] = []
      data.selection.forEach((itemId) => {
        const caseIds = data.getItemCaseIds(itemId)
        caseIds?.forEach((caseId, index) => {
          const collection = data.collections[index]
          if (!collection) return

          if (!selectedCaseIds[index]) {
            selectedCaseIds[index] = new Set<string>()
          }
          selectedCaseIds[index].add(caseId)
        })
      })

      return selectedCaseIds
    }
  }))
  .views(self => ({
    // The returned array includes arrays of the sorted indices of selected cases in each collection
    // So selectedCaseIndices[i] contains an array of the indices of the cases selected in data.collections[i]
    get selectedCaseIndices(): number[][] {
      const { selectedCaseIds } = self

      const selectedCaseIndices: number[][] = []
      selectedCaseIds.forEach((caseIds, index) => {
        const collection = self.data?.collections[index]
        if (!collection) return

        selectedCaseIndices[index] = Array.from(caseIds).map(caseId => collection.getCaseIndex(caseId))
          .filter(caseIndex => caseIndex != null).sort()
      })
      return selectedCaseIndices
    },
    groupChildCases(parentCaseId: string) {
      const parentCaseInfo = self.data?.caseInfoMap.get(parentCaseId)
      if (!parentCaseInfo?.childCaseIds) return undefined
      return parentCaseInfo.childCaseIds
        .map(childCaseId => self.data?.caseInfoMap.get(childCaseId)?.groupedCase)
        .filter(groupedCase => !!groupedCase)
    },
    summarizedValues(attr: IAttribute, collection: ICollectionModel) {
      // Returns a string summarizing the selected values of the attribute
      if (attr.isNumeric) {
        const numericValues = attr.numValues.filter((_v, i) => attr.isValueNumeric(i))
        const formatStr = `.${attr.numPrecision ?? kDefaultNumPrecision}~f`
        const formatter = getNumFormatter(formatStr)
        const minValue = Math.min(...numericValues)
        const maxValue = Math.max(...numericValues)
        const minValueStr = formatter?.(minValue) ?? minValue.toString()
        const maxValueStr = formatter?.(maxValue) ?? maxValue.toString()
        const valueString = minValueStr === maxValueStr ? minValueStr : `${minValueStr}-${maxValueStr}`
        const attrUnits = attr.units ? ` ${attr.units}` : ""
        return `${valueString}${attrUnits}`
      } else {
        const selectedCases = self.data?.selection
        const casesToUse = selectedCases && selectedCases.size >= 1
          ? Array.from(selectedCases).map((id) => ({ __id__: id }))
          : collection.cases
        const allValues = casesToUse.map(c => self.data?.getValue(c.__id__, attr.id))
        const uniqueValues = new Set(allValues)
        if (uniqueValues.size > 2) {
          return `${uniqueValues.size} values`
        } else {
          const uniqueValuesArray = Array.from(uniqueValues)
          if (uniqueValuesArray.length === 2) {
            return `${uniqueValuesArray[0]}, ${uniqueValuesArray[1]}`
          }
          return `${uniqueValuesArray[0]}`
        }
      }
    }
  }))
  .actions(self => ({
    setAnimationLevel(level: number) {
      self.animationLevel = level
    },
    setAnimationDirection(direction: "left" | "right") {
      self.animationDirection = direction
    },
    setAnimationTimeout(timeout: NodeJS.Timeout) {
      clearTimeout(self.animationTimeout)
      self.animationTimeout = timeout
    },
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
      const selectedParentCaseIds = self.selectedCaseIds[level - 1]
      const selectedParentCaseId = selectedParentCaseIds && selectedParentCaseIds.size === 1
        ? Array.from(selectedParentCaseIds)[0] : undefined
      const newCase: ICaseCreation = selectedParentCaseId != null ?
        self.data?.getParentValues(selectedParentCaseId) ?? {} : {}

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
