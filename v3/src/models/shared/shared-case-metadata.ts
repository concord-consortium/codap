import { observable, reaction, comparer } from "mobx"
import {
  addDisposer, applySnapshot, getEnv, getSnapshot, getType, hasEnv, IAnyStateTreeNode, Instance, ISerializedActionCall,
  resolveIdentifier, SnapshotIn, types
} from "mobx-state-tree"
import { onAnyAction, typeOptionalBoolean } from "../../utilities/mst-utils"
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
export type AttributeBinningType = typeof AttributeBinningTypes[number]

// This is an object so it can be expanded in the future to store
// things like:
// - number of bins, or size of each bin
// - scale to be used for bins or axis (linear, log, square...)
// It is currently only used by the numeric legend to determine how to
// construct the choropleth scale
const AttributeScale = types.model("AttributeScale", {
  binningType: types.maybe(types.enumeration(AttributeBinningTypes))
})

export const AttributeMetadata = types.model("AttributeMetadata", {
  // boolean properties
  hidden: types.maybe(types.boolean),
  deleteProtected: types.maybe(types.boolean),  // cannot be deleted
  renameProtected: types.maybe(types.boolean),  // cannot be renamed
  // model properties
  categories: types.maybe(CategorySet),
  colorRange: types.maybe(ColorRangeModel),
  scale: types.maybe(AttributeScale)
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
    // DataSet-wide metadata
    description: types.maybe(types.string),
    source: types.maybe(types.string),
    importDate: types.maybe(types.string),
    // indicates whether the attribute configuration has been changed in a way that affects plugins
    // corresponds to v2's `flexibleGroupingChangeFlag` property
    attrConfigChanged: typeOptionalBoolean(),
    // prevents reorganization of the dataset (e.g. moving attributes or collections)
    // corresponds to v2's `preventReorg` property
    attrConfigProtected: typeOptionalBoolean(),
    // Collection metadata (key is collection id)
    collections: types.map(CollectionMetadata),
    // Attribute metadata (key is attribute id)
    attributes: types.map(AttributeMetadata),
    // case table/card metadata
    caseTableTileId: types.maybe(types.string),
    caseCardTileId: types.maybe(types.string),
    lastShownTableOrCardTileId: types.maybe(types.string) // used to restore the last shown tile both have been hidden
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
    get hasDataContextMetadata() {
      return !!self.description || !!self.source || !!self.importDate
    },
    get isAttrConfigChanged() {
      return !!self.attrConfigProtected
    },
    get isAttrConfigProtected() {
      return !!self.attrConfigProtected
    },
    // true if passed the id of a parent/pseudo-case whose child cases have been collapsed, false otherwise
    isCollapsed(caseId: string) {
      const { collectionId } = self.data?.caseInfoMap.get(caseId) || {}
      const collection = collectionId ? self.collections.get(collectionId) : undefined
      return collection?.collapsed.get(caseId) ?? false
    },
    // true if passed the id of a hidden attribute, false otherwise
    isHidden(attrId: string) {
      return self.attributes.get(attrId)?.hidden ?? false
    },
    // true if the attribute is protected from deletion
    isDeleteProtected(attrId: string) {
      return self.attributes.get(attrId)?.deleteProtected ?? false
    },
    // true if the attribute is protected from renaming
    isRenameProtected(attrId: string) {
      return self.attributes.get(attrId)?.renameProtected ?? false
    },
    getAttributeColorRange(attrId: string) {
      const colorRange = self.attributes.get(attrId)?.colorRange
      return {
        low: colorRange?.lowColor ?? kDefaultLowAttributeColor,
        high: colorRange?.highColor ?? kDefaultHighAttributeColor
      }
    },
    getAttributeBinningType(attrId: string) {
      return self.attributes.get(attrId)?.scale?.binningType || "quantile"
    }
  }))
  .actions(self => ({
    setData(data?: IDataSet) {
      self.data = data
    },
    setDescription(description = "") {
      self.description = description
    },
    setSource(source = "") {
      self.source = source
    },
    setImportDate(date = "") {
      self.importDate = date
    },
    setIsAttrConfigChanged(isChanged?: boolean) {
      self.attrConfigChanged = isChanged || undefined
    },
    setIsAttrConfigProtected(isProtected?: boolean) {
      self.attrConfigProtected = isProtected || undefined
    },
    removeCollectionMetadata(collectionId: string) {
      self.collections.delete(collectionId)
    },
    removeAttributeMetadata(attrId: string) {
      self.attributes.delete(attrId)
      // also remove any provisional category set associated with this attribute
      self.provisionalCategories.delete(attrId)
    }
  }))
  .actions(self => ({
    requireCollectionMetadata(collectionId: string) {
      let collectionMetadata = self.collections.get(collectionId)
      if (!collectionMetadata) {
        collectionMetadata = CollectionMetadata.create({})
        self.collections.set(collectionId, collectionMetadata)
      }
      const collection = self.data?.getCollection(collectionId)
      if (collection) {
        // remove the metadata when the collection is removed from the dataset
        addDisposer(collection, () => self.removeCollectionMetadata(collectionId))
      }
      return collectionMetadata
    },
    requireAttributeMetadata(attrId: string) {
      let attrMetadata = self.attributes.get(attrId)
      if (!attrMetadata) {
        attrMetadata = AttributeMetadata.create({})
        self.attributes.set(attrId, attrMetadata)
      }
      const attribute = self.data?.getAttribute(attrId)
      if (attribute) {
        // remove the metadata when the attribute is removed from the dataset
        addDisposer(attribute, () => self.removeAttributeMetadata(attrId))
      }
      return attrMetadata
    },
    setCaseTableTileId(tileId?: string) {
      self.caseTableTileId = tileId
    },
    setCaseCardTileId(tileId?: string) {
      self.caseCardTileId = tileId
    },
    setLastShownTableOrCardTileId(tileId?: string) {
      self.lastShownTableOrCardTileId = tileId
    }
  }))
  .actions(self => ({
    setIsCollapsed(caseId: string, isCollapsed: boolean) {
      const { collectionId } = self.data?.caseInfoMap.get(caseId) || {}
      if (collectionId) {
        const collectionMetadata = self.requireCollectionMetadata(collectionId)
        if (isCollapsed) {
          collectionMetadata.collapsed.set(caseId, true)
        }
        else if (collectionMetadata) {
          collectionMetadata.collapsed.delete(caseId)
        }
      }
    },
    setIsHidden(attrId: string, isHidden?: boolean) {
      self.requireAttributeMetadata(attrId).hidden = isHidden || undefined
    },
    setIsDeleteProtected(attrId: string, isProtected?: boolean) {
      self.requireAttributeMetadata(attrId).deleteProtected = isProtected || undefined
    },
    setIsRenameProtected(attrId: string, isNameProtected?: boolean) {
      self.requireAttributeMetadata(attrId).renameProtected = isNameProtected || undefined
    },
    showAllAttributes() {
      self.attributes.forEach(attr => {
        attr.hidden = undefined
      })
    },
    setAttributeColor(attrId: string, color: string, selector: "low" | "high") {
      const attrMetadata = self.requireAttributeMetadata(attrId)
      let colorRange = attrMetadata.colorRange
      if (!colorRange) {
        colorRange = ColorRangeModel.create({})
        attrMetadata.colorRange = colorRange
      }
      if (selector === "high") {
        colorRange.setHighColor(color)
      } else {
        colorRange.setLowColor(color)
      }
    },
    setAttributeBinningType(attrId: string, binningType: AttributeBinningType) {
      const attrMetadata = self.requireAttributeMetadata(attrId)
      let scale = attrMetadata.scale
      if (!scale) {
        scale = AttributeScale.create({ binningType })
        attrMetadata.scale = scale
      } else {
        scale.binningType = binningType
      }
    }
  }))
  .actions(self => ({
    removeCategorySet(attrId: string) {
      const attrMetadata = self.attributes.get(attrId)
      if (attrMetadata) {
        attrMetadata.categories = undefined
      }
      self.provisionalCategories.delete(attrId)
    }
  }))
  .actions(self => ({
    setCategorySet(attrId: string, categorySet: ICategorySetSnapshot) {
      const attrMetadata = self.requireAttributeMetadata(attrId)
      if (attrMetadata.categories) {
        applySnapshot(attrMetadata.categories, categorySet)
      }
      else {
        attrMetadata.categories = CategorySet.create(categorySet)
      }
    }
  }))
  .actions(self => ({
    // moves a category set from the provisional map to the official one
    promoteProvisionalCategorySet(categorySet: ICategorySet) {
      const attrId = categorySet.attribute.id
      self.setCategorySet(attrId, getSnapshot(categorySet))
      // remove category set from provisional categories map
      self.provisionalCategories.delete(attrId)
    }
  }))
  .views(self => ({
    // returns an existing category set (if available) or creates a new provisional one (for valid attributes)
    getCategorySet(attrId: string) {
      let categorySet = self.attributes.get(attrId)?.categories ?? self.provisionalCategories.get(attrId)
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
      // if all attributes in a collection are hidden, show the remaining attributes
      addDisposer(self, reaction(
        () => self.data?.collections.map(collection => {
          return collection.attributes.map(attr => ({
            attrId: attr?.id,
            isHidden: attr?.id ? self.isHidden(attr.id) : false
          }))
        }) ?? [],
        (collections) => {
          collections.forEach(collection => {
            if (collection.length > 0 && collection.every(({ isHidden }) => isHidden)) {
              collection.forEach(({ attrId }) => attrId && self.setIsHidden(attrId, false))
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
export interface ISharedCaseMetadataSnapshot extends SnapshotIn<typeof SharedCaseMetadata> {}

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
