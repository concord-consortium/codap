import { observable, reaction, comparer } from "mobx"
import {
  addDisposer, getEnv, getSnapshot, getType, hasEnv, IAnyStateTreeNode, Instance, ISerializedActionCall,
  resolveIdentifier, types
} from "mobx-state-tree"
import { onAnyAction } from "../../utilities/mst-utils"
import { CategorySet, createProvisionalCategorySet, ICategorySet, ICategorySetSnapshot } from "../data/category-set"
import { DataSet, IDataSet } from "../data/data-set"
import { applyModelChange } from "../history/apply-model-change"
import { kDefaultHighAttributeColor, kDefaultLowAttributeColor } from "./shared-case-metadata-constants"
import { ISharedModel, SharedModel } from "./shared-model"

export const kSharedCaseMetadataType = "SharedCaseMetadata"

interface IProvisionalEnvironment {
  provisionalDataSet?: IDataSet
}

export function getProvisionalDataSet(node: IAnyStateTreeNode | null) {
  const env = node && hasEnv(node) ? getEnv<IProvisionalEnvironment>(node) : {}
  return env.provisionalDataSet
}

// Creates a SharedCaseMetadata instance that can access its DataSet before being added to the document.
export function createSharedCaseMetadata(data: IDataSet) {
  return SharedCaseMetadata.create({ data: data.id }, { provisionalDataSet: data })
}

export const CollectionMetadata = types.model("CollectionMetadata", {
  // key is case id; value is true (false values are deleted)
  collapsed: types.map(types.boolean)
})

const ColorRangeModel = types.model("ColorRangeModel", {
  lowColor: kDefaultLowAttributeColor,
  highColor: kDefaultHighAttributeColor
})
.actions(self => ({
  setLowColor(color: string) {
    self.lowColor = color
  },
  setHighColor(color: string) {
    self.highColor = color
  }
}))

export const AttributeBinningTypes = ["quantize", "quantile"] as const
export type IAttributeBinningType = typeof AttributeBinningTypes[number]

// This is an object so it can be expanded in the future to store
// things like:
// - number of bins, or size of each bin
// - scale to be used for bins or axis (linear, log, square...)
// It is currently only used by the numeric legend to determine how to
// construct the choropleth scale
const AttributeScale = types.model("AttributeScale", {
  binningType: types.maybe(types.enumeration(AttributeBinningTypes))
})

export const SharedCaseMetadata = SharedModel
  .named(kSharedCaseMetadataType)
  .props({
    type: types.optional(types.literal(kSharedCaseMetadataType), kSharedCaseMetadataType),
    data: types.safeReference(DataSet, {
      get(identifier: string, parent: IAnyStateTreeNode | null): IDataSet {
        // support access to the DataSet before being added to the document if provisional environment was provided
        const provisionalDataSet = getProvisionalDataSet(parent)
        return provisionalDataSet ?? resolveIdentifier<typeof DataSet>(DataSet, parent, identifier) as IDataSet
      },
      set(data: IDataSet) {
        return data.id
      }
    }),
    // key is collection id
    collections: types.map(CollectionMetadata),
    // key is attribute id
    categories: types.map(CategorySet),
    // key is attribute id; value is true (false values are deleted)
    hidden: types.map(types.boolean),
    caseTableTileId: types.maybe(types.string),
    caseCardTileId: types.maybe(types.string),
    lastShownTableOrCardTileId: types.maybe(types.string), // used to restore the last shown tile both have been hidden
    // key is attribute id
    attributeColorRanges: types.map(ColorRangeModel),
    // key is attribute id
    attributeScales: types.map(AttributeScale)
  })
  .volatile(self => ({
    // CategorySets are generated whenever CODAP needs to treat an attribute categorically.
    // CategorySets only need to be saved, however, when they contain user modifications, e.g.
    // reordering categories or assigning colors to categories. Therefore, CategorySets
    // created automatically before any user modifications are treated as "provisional"
    // categories, which are then elevated to full-fledged categories when they are modified
    // by the user. This also keeps them from cluttering up the undo history.
    provisionalCategories: observable.map<string, ICategorySet>()
  }))
  .views(self => ({
    // true if passed the id of a parent/pseudo-case whose child cases have been collapsed, false otherwise
    isCollapsed(caseId: string) {
      const { collectionId } = self.data?.caseInfoMap.get(caseId) || {}
      return (collectionId && self.collections.get(collectionId)?.collapsed.get(caseId)) ?? false
    },
    // true if passed the id of a hidden attribute, false otherwise
    isHidden(attrId: string) {
      return self.hidden.get(attrId) ?? false
    },
    getAttributeColorRange(attrId: string) {
      return {
        low: self.attributeColorRanges.get(attrId)?.lowColor ?? kDefaultLowAttributeColor,
        high: self.attributeColorRanges.get(attrId)?.highColor ?? kDefaultHighAttributeColor
      }
    },
    getAttributeBinningType(attrId: string) {
      const scale = self.attributeScales.get(attrId)
      return scale?.binningType || "quantile"
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
    setLastShownTableOrCardTileId(tileId?: string) {
      self.lastShownTableOrCardTileId = tileId
    },
    setIsCollapsed(caseId: string, isCollapsed: boolean) {
      const { collectionId } = self.data?.caseInfoMap.get(caseId) || {}
      if (collectionId) {
        let collectionMetadata = self.collections.get(collectionId)
        if (isCollapsed) {
          if (!collectionMetadata) {
            collectionMetadata = CollectionMetadata.create()
            self.collections.set(collectionId, collectionMetadata)
          }
          collectionMetadata.collapsed.set(caseId, true)
        }
        else if (collectionMetadata) {
          collectionMetadata.collapsed.delete(caseId)
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
    },
    setAttributeColor(attrId: string, color: string, selector: "low" | "high") {
      let attributeColors = self.attributeColorRanges.get(attrId)
      if (!attributeColors) {
        attributeColors = ColorRangeModel.create()
        self.attributeColorRanges.set(attrId, attributeColors)
      }
      if (selector === "high") {
        attributeColors.setHighColor(color)
      } else {
        attributeColors.setLowColor(color)
      }
    },
    setAttributeBinningType(attrId: string, binningType: IAttributeBinningType) {
      let attributeScale = self.attributeScales.get(attrId)
      if (!attributeScale) {
        attributeScale = AttributeScale.create({binningType})
        self.attributeScales.set(attrId, attributeScale)
      } else {
        attributeScale.binningType = binningType
      }
    }
  }))
  .actions(self => ({
    setCategorySet(attrId: string, categorySet: ICategorySetSnapshot) {
      self.categories.set(attrId, categorySet)
    },
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
        onAnyAction(categorySet, action => {
          // when a category set is changed by the user, it is promoted to a regular CategorySet
          if (categorySet && userActionNames.includes(action.name)) {
            self.promoteProvisionalCategorySet(categorySet)
          }
        })
      }
      return categorySet
    }
  }))
  .actions(self => ({
    afterCreate() {
      // respond to change of collections by showing hidden attributes if all attributes are hidden
      addDisposer(self, reaction(
        () => {
          return {
            hiddenAttrs: Array.from(self.hidden.keys()),
            collections: self.data?.collections.map(collection => collection.attributes.map(attr => attr?.id)) || []
          }
        },
        ({hiddenAttrs}) => {
          self.data?.collections.forEach(collection => {
            const attrs = collection.attributes
            if (attrs && attrs.every(attr => attr && hiddenAttrs.includes(attr.id))) {
              attrs.forEach(attr => attr && self.setIsHidden(attr.id, false))
            }
          })
        },
        { name: "SharedCaseMetadata.afterCreate.reaction [show remaining hidden attributes in a collection]",
          fireImmediately: true,
          equals: comparer.structural
        }
      ))
    }
  }))
  .actions(applyModelChange)

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
