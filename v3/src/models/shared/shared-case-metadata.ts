import { getType, Instance, types } from "mobx-state-tree"
import { CategorySet, ICategorySet } from "../data/category-set"
import { DataSet, IDataSet } from "../data/data-set"
import { ISharedModel, SharedModel } from "./shared-model"

export const kSharedCaseMetadataType = "SharedCaseMetadata"

export const CollectionTableMetadata = types.model("CollectionTable", {
  // key is valueJson; value is true (false values are deleted)
  collapsed: types.map(types.boolean)
})

// utility function for retrieving a category set, creating it if it doesn't already exist
export function getCategorySet(metadata: ISharedCaseMetadata, attrId: string): ICategorySet | undefined {
  return metadata.categories.get(attrId) ?? metadata.addCategorySet(attrId)
}

export const SharedCaseMetadata = SharedModel
  .named(kSharedCaseMetadataType)
  .props({
    type: types.optional(types.literal(kSharedCaseMetadataType), kSharedCaseMetadataType),
    title: types.maybe(types.string),
    data: types.safeReference(DataSet),
    // key is collection id
    collections: types.map(CollectionTableMetadata),
    // key is attribute id
    categories: types.map(CategorySet),
    // key is attribute id; value is width
    columnWidths: types.map(types.number),
    // key is attribute id; value is true (false values are deleted)
    hidden: types.map(types.boolean)
  })
  .views(self => ({
    categorySet(attrId: string) {
      return self.categories.get(attrId)
    },
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
    setData(data?: IDataSet) {
      self.data = data
    },
    setTitle(title: string) {
      self.title = title
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
  .actions(self => ({
    removeCategorySet(attrId: string) {
      self.categories.delete(attrId)
    }
  }))
  .actions(self => ({
    addCategorySet(attrId: string): ICategorySet | undefined {
      let categorySet = self.categories.get(attrId)
      if (!categorySet && self.data?.attrFromID(attrId)) {
        // add category set to map
        self.categories.set(attrId, { attribute: attrId })
        categorySet = self.categories.get(attrId)
        // remove category sets from map when attribute references are invalidated
        categorySet?.onAttributeInvalidated(function(invalidAttrId: string) {
          self.removeCategorySet(invalidAttrId)
        })
      }
      return categorySet
    }
  }))
export interface ISharedCaseMetadata extends Instance<typeof SharedCaseMetadata> {}

export function isSharedCaseMetadata(model?: ISharedModel): model is ISharedCaseMetadata {
  return model ? getType(model) === SharedCaseMetadata : false
}
