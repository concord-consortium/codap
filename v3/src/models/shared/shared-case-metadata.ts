import { observable } from "mobx"
import { getSnapshot, getType, Instance, ISerializedActionCall, onAction, types } from "mobx-state-tree"
import { CategorySet, createProvisionalCategorySet, ICategorySet } from "../data/category-set"
import { DataSet, IDataSet } from "../data/data-set"
import { ISharedModel, SharedModel } from "./shared-model"
import { applyUndoableAction } from "../history/apply-undoable-action"

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
    // key is attribute id
    categories: types.map(CategorySet),
    // key is attribute id; value is true (false values are deleted)
    hidden: types.map(types.boolean),
    caseTableTileId: types.maybe(types.string),
    caseCardTileId: types.maybe(types.string)
  })
  .volatile(self => ({
    // CategorySets are generated whenever CODAP needs to treat an attribute categorically.
    // CategorySets only need to be saved, however, when they contain user modifications, e.g.
    // reordering categories or assigning colors to categories. Therefore, CategorySets
    // created automatically before any user modifications are treated as "provisional"
    // categories, which are then elevated to normal categories when they are modified by
    // the user. This also keeps them from cluttering up the undo history.
    provisionalCategories: observable.map<string, ICategorySet>()
  }))
  .views(self => ({
    // true if passed the id of a parent/pseudo-case whose child cases have been collapsed, false otherwise
    isCollapsed(caseId: string) {
      const { collectionId, valuesJson } = self.data?.pseudoCaseMap.get(caseId) || {}
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
    setCaseTableTileId(tileId?: string) {
      self.caseTableTileId = tileId
    },
    setCaseCardTileId(tileId?: string) {
      self.caseCardTileId = tileId
    },
    setIsCollapsed(caseId: string, isCollapsed: boolean) {
      const { collectionId, valuesJson } = self.data?.pseudoCaseMap.get(caseId) || {}
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
      self.provisionalCategories.delete(attrId)
    }
  }))
  .actions(self => ({
    // moves a category set from the provisional map to the official one
    promoteProvisionalCategorySet(categorySet: ICategorySet) {
      const attrId = categorySet.attribute.id
      // add category set to official map
      self.categories.set(attrId, CategorySet.create(getSnapshot(categorySet)))
      // remove category set from provisional categories map
      self.provisionalCategories.delete(attrId)
      // remove category sets from map when attribute references are invalidated
      categorySet.onAttributeInvalidated(function(invalidAttrId: string) {
        self.removeCategorySet(invalidAttrId)
      })
    }
  }))
  .views(self => ({
    // returns an existing category set (if available) or creates a new provisional one (for valid attributes)
    getCategorySet(attrId: string) {
      let categorySet = self.categories.get(attrId) ?? self.provisionalCategories.get(attrId)
      if (!categorySet && self.data?.attrFromID(attrId)) {
        categorySet = createProvisionalCategorySet(self.data, attrId)

        self.provisionalCategories.set(attrId, categorySet)
        // remove category sets from map when attribute references are invalidated
        categorySet.onAttributeInvalidated(function(invalidAttrId: string) {
          self.removeCategorySet(invalidAttrId)
        })
        const userActionNames = categorySet.userActionNames
        onAction(categorySet, action => {
          // when a category set is changed by the user, it is promoted to a regular CategorySet
          if (categorySet && userActionNames.includes(action.name)) {
            self.promoteProvisionalCategorySet(categorySet)
          }
        }, true)
      }
      return categorySet
    }
  }))
  .actions(applyUndoableAction)

export interface ISharedCaseMetadata extends Instance<typeof SharedCaseMetadata> {}

export function isSharedCaseMetadata(model?: ISharedModel): model is ISharedCaseMetadata {
  return model ? getType(model) === SharedCaseMetadata : false
}

export interface SetIsCollapsedAction extends ISerializedActionCall {
  name: "setIsCollapsed"
  args: [string, boolean] // [caseId, isCollapsed]
}

export function isSetIsCollapsedAction(action: ISerializedActionCall): action is SetIsCollapsedAction {
  return action.name === "setIsCollapsed"
}
