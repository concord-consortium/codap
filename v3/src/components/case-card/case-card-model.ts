import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { IAttribute } from "../../models/data/attribute"
import { ICollectionModel } from "../../models/data/collection"
import { ICaseCreation } from "../../models/data/data-set-types"
import { getTileCaseMetadata, getTileDataSet } from "../../models/shared/shared-data-tile-utils"
import { ISharedModel } from "../../models/shared/shared-model"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { getNumFormatterForAttribute } from "../case-tile-common/attribute-format-utils"
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
    animationTimeout: undefined as ReturnType<typeof setTimeout> | undefined
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
      const collections = self.data?.collections ?? []

      const collectionIdsToSummarize = new Set<string>()

      if (items && selectedItems?.size !== 1) {
        collections.forEach((collection, index) => {
          if (index < collections.length - 1) {
            const cases = self.data?.getCasesForCollection(collection.id) ?? []
            const collectionSelectedCaseIds = self.data?.partiallySelectedCaseIdsByCollection[index]
            if (cases.length > 1 && collectionSelectedCaseIds?.size !== 1) {
              collectionIdsToSummarize.add(collection.id)
            }
          } else {
            // always summarize the last collection
            collectionIdsToSummarize.add(collection.id)
          }
        })
      }

      return collectionIdsToSummarize
    }
  }))
  .views(self => ({
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
        const formatter = getNumFormatterForAttribute(attr)
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
    setAnimationTimeout(timeout: ReturnType<typeof setTimeout>) {
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
      const selectedParentCaseIds = self.data?.partiallySelectedCaseIdsByCollection[level - 1]
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
