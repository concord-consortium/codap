import { getType, Instance, types } from "mobx-state-tree"
import { DataSet, IDataSet } from "../data/data-set"
import { ISharedModel, SharedModel } from "./shared-model"

export const kSharedCaseMetadataType = "SharedCaseMetadata"

export const CollectionTableMetadata = types.model("CollectionTable", {
  // key is valueJson; value is true (false values are deleted)
  collapsed: types.map(types.boolean)
})

export const SharedCaseMetadata = SharedModel
  .named(kSharedCaseMetadataType)
  .props({
    type: types.optional(types.literal(kSharedCaseMetadataType), kSharedCaseMetadataType),
    data: types.safeReference(DataSet),
    // key is collection id
    collections: types.map(CollectionTableMetadata),
    // key is attribute id; value is width
    columnWidths: types.map(types.number),
    // key is attribute id; value is true (false values are deleted)
    hidden: types.map(types.boolean)
  })
  .views(self => ({
    columnWidth(attrId: string) {
      return self.columnWidths.get(attrId)
    },
    // true if passed the id of a parent/pseudo-case whose child cases have been collapsed, false otherwise
    isCollapsed(caseId: string) {
      const { collectionId, valuesJson } = self.data?.pseudoCaseMap[caseId] || {}
      return (collectionId && valuesJson && self.collections.get(collectionId)?.collapsed.get(valuesJson)) ?? false
    },
    // true if passed the id of a hidden attribute, false otherwise
    isHidden(attrId: string) {
      return self.hidden.get(attrId) ?? false
    }
  }))
  .actions(self => ({
    setData(data: IDataSet) {
      self.data = data
    },
    setColumnWidth(attrId: string, width?: number) {
      if (width) {
        self.columnWidths.set(attrId, width)
      }
      else {
        self.columnWidths.delete(attrId)
      }
    },
    setIsCollapsed(caseId: string, isCollapsed: boolean) {
      const { collectionId, valuesJson } = self.data?.pseudoCaseMap[caseId] || {}
      if (collectionId && valuesJson) {
        let tableCollection = self.collections.get(collectionId)
        if (isCollapsed) {
          if (!tableCollection) {
            tableCollection = CollectionTableMetadata.create()
            self.collections.set(collectionId, tableCollection)
          }
          tableCollection.collapsed.set(valuesJson, true)
        }
        else if (tableCollection) {
          tableCollection.collapsed.delete(valuesJson)
        }
      }
    },
    setIsHidden(attrId: string, hidden: boolean) {
      if (hidden) {
        self.hidden.set(attrId, true)
      }
      else {
        self.hidden.delete(attrId)
      }
    },
    showAllAttributes() {
      self.hidden.clear()
    }
  }))
export interface ISharedCaseMetadata extends Instance<typeof SharedCaseMetadata> {}

export function isSharedCaseMetadata(model?: ISharedModel): model is ISharedCaseMetadata {
  return model ? getType(model) === SharedCaseMetadata : false
}
