import { comparer, observable, reaction, when } from "mobx"
import {
  addDisposer, applySnapshot, getEnv, getSnapshot, getType, hasEnv, IAnyStateTreeNode, Instance,
  ISerializedActionCall, resolveIdentifier, SnapshotIn, types
} from "mobx-state-tree"
import { kellyColors, lowColorFromBase } from "../../utilities/color-utils"
import { hashStringSet } from "../../utilities/js-utils"
import { typeOptionalBoolean } from "../../utilities/mst-utils"
import { IAttribute } from "../data/attribute"
import { CategorySet, createProvisionalCategorySet, ICategorySet, ICategorySetSnapshot } from "../data/category-set"
import { DataSet, IDataSet } from "../data/data-set"
import { CaseInfo } from "../data/data-set-types"
import { applyModelChange } from "../history/apply-model-change"
import { kDefaultHighAttributeColor, kDefaultLowAttributeColor } from "./data-set-metadata-constants"
import { ISharedModel, ISharedModelSnapshot, SharedModel } from "./shared-model"

export const kDataSetMetadataType = "SharedCaseMetadata"

interface IProvisionalEnvironment {
  provisionalDataSet?: IDataSet
}

export function getProvisionalDataSet(node: IAnyStateTreeNode | null) {
  const env = node && hasEnv(node) ? getEnv<IProvisionalEnvironment>(node) : {}
  return env.provisionalDataSet
}

// Creates a DataSetMetadata instance that can access its DataSet before being added to the document.
export function createDataSetMetadata(data: IDataSet) {
  return DataSetMetadata.create({ data: data.id }, { provisionalDataSet: data })
}

export const CollectionLabels = types.model("CollectionLabels", {
  singleCase: types.maybe(types.string),
  pluralCase: types.maybe(types.string),
  singleCaseWithArticle: types.maybe(types.string),
  setOfCases: types.maybe(types.string),
  setOfCasesWithArticle: types.maybe(types.string)
})
.views(self => ({
  get isEmpty() {
    return !self.singleCase && !self.pluralCase && !self.singleCaseWithArticle &&
            !self.setOfCases && !self.setOfCasesWithArticle
  },
  get isNonEmpty() {
    return !this.isEmpty
  }
}))
export interface ICollectionLabels extends Instance<typeof CollectionLabels> {}
export interface ICollectionLabelsSnapshot extends SnapshotIn<typeof CollectionLabels> {}

export function isNonEmptyCollectionLabels(labels?: ICollectionLabelsSnapshot): labels is ICollectionLabelsSnapshot {
  return !!(labels?.singleCase || labels?.pluralCase || labels?.singleCaseWithArticle ||
    labels?.setOfCases || labels?.setOfCasesWithArticle)
}

/**
 * V2 collections can have a "defaults" property, typically added by a plugin such as Markov. We need to store this
 * so it can be exported to V2 and can be queried during V2 export to determine whether the type of the data context
 * to which the collection belongs should be "DG.GameContext" or "DG.DataContext".
 */
export const V2CollectionDefaults = types.model("V2CollectionDefaults", {
  xAttr: types.maybe(types.string),
  yAttr: types.maybe(types.string),
  legendAttr: types.maybe(types.string)
})
.views(self => ({
  get isEmpty() {
    return !self.xAttr && !self.yAttr && !self.legendAttr
  },
  get isNonEmpty() {
    return !this.isEmpty
  }
}))
export interface IV2CollectionDefaults extends Instance<typeof V2CollectionDefaults> {}
export interface IV2CollectionDefaultsSnapshot extends SnapshotIn<typeof V2CollectionDefaults> {}

export const CollectionMetadata = types.model("CollectionMetadata", {
  labels: types.maybe(CollectionLabels),
  defaults: types.maybe(V2CollectionDefaults),
  // key is case id; value is true (false values are deleted)
  collapsed: types.map(types.literal(true))
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
  hidden: typeOptionalBoolean(),
  deleteProtected: typeOptionalBoolean(), // cannot be deleted
  editProtected: typeOptionalBoolean(),   // cannot be edited
  renameProtected: typeOptionalBoolean(), // cannot be renamed
  // model properties
  categories: types.maybe(CategorySet),
  color: types.maybe(types.string),
  colorRange: types.maybe(ColorRangeModel),
  defaultMin: types.maybe(types.number),
  defaultMax: types.maybe(types.number),
  deletedFormula: types.maybe(types.string),
  scale: types.maybe(AttributeScale)
})

export const DataSetMetadata = SharedModel
  .named(kDataSetMetadataType)
  .props({
    type: types.optional(types.literal(kDataSetMetadataType), kDataSetMetadataType),
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
    getAttribute(attrId: string): Maybe<IAttribute> {
      return self.data?.getAttribute(attrId)
    }
  }))
  .views(self => ({
    get hasDataContextMetadata() {
      return !!self.description || !!self.source || !!self.importDate
    },
    get isAttrConfigChanged() {
      return !!self.attrConfigChanged
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
    get collapsedCaseIdsHash() {
      const caseIds: string[] = Array.from(self.collections.values()).reduce((ids, collection) => {
        return ids.concat(Array.from(collection.collapsed.keys()))
      }, [] as string[])
      return hashStringSet(caseIds)
    },
    getCollapsedAncestor(caseId: Maybe<string>) {
      let collapsedAncestorId: Maybe<string>
      while (caseId && (caseId = self.data?.getParentCaseId(caseId))) {
        if (this.isCollapsed(caseId)) collapsedAncestorId = caseId
      }
      return collapsedAncestorId
    },
    isCaseOrAncestorCollapsed(caseId: string) {
      return this.isCollapsed(caseId) || !!this.getCollapsedAncestor(caseId)
    },
    isFirstCaseOfAncestor(caseId: string, ancestorCaseId: string) {
      let _caseId: Maybe<string> = caseId
      let parentCaseInfo: Maybe<CaseInfo>
      while (_caseId && (parentCaseInfo = self.data?.getParentCaseInfo(_caseId))) {
        if (parentCaseInfo.childCaseIds?.[0] !== _caseId) return false
        _caseId = parentCaseInfo.groupedCase.__id__
        if (_caseId === ancestorCaseId) return true
      }
      return false
    },
    // given an ancestorCaseId, returns the set of collapsed case ids (if any)
    // at the same collection level as the provided descendant case id
    getDescendantCaseIds(ancestorCaseId: string, descendantCaseId: string): string[] {
      self.data?.validateCases()
      const ancestorCollectionId = self.data?.caseInfoMap.get(ancestorCaseId)?.collectionId
      const descendantCollectionId = self.data?.caseInfoMap.get(descendantCaseId)?.collectionId
      if (!ancestorCollectionId || !descendantCollectionId) return []
      let caseIds = [ancestorCaseId]
      let parentCollectionId: Maybe<string> = ancestorCollectionId
      while (parentCollectionId) {
        // replace case ids with child case ids
        caseIds = caseIds.reduce((ids, caseId) => {
          const caseInfo = self.data?.caseInfoMap.get(caseId)
          if (caseInfo?.childCaseIds?.length) {
            ids.push(...caseInfo.childCaseIds)
          }
          return ids
        }, [] as string[])

        // if this is the correct descendant collection, return the case ids
        const childCollectionId: Maybe<string> = self.data?.getChildCollection(parentCollectionId)?.id
        if (childCollectionId === descendantCollectionId) {
          return caseIds
        }
        // otherwise, advance to the next child collection
        parentCollectionId = childCollectionId
      }
      return []
    },
    isEditable(attrId: string) {
      return !self.attributes.get(attrId)?.editProtected && !self.getAttribute(attrId)?.hasFormula
    },
    // true if passed the id of a hidden attribute, false otherwise
    isHidden(attrId: string) {
      return self.attributes.get(attrId)?.hidden ?? false
    },
    // true if the attribute is protected from deletion
    isDeleteProtected(attrId: string) {
      return self.attributes.get(attrId)?.deleteProtected ?? false
    },
    // true if the attribute is protected from deletion
    isEditProtected(attrId: string) {
      return self.attributes.get(attrId)?.editProtected ?? false
    },
    // true if the attribute is protected from renaming
    isRenameProtected(attrId: string) {
      return self.attributes.get(attrId)?.renameProtected ?? false
    },
    getAttributeColor(attrId: string) {
      return self.attributes.get(attrId)?.color
    },
    getAttributeColorRange(attrId: string) {
      const colorRange = self.attributes.get(attrId)?.colorRange
      return {
        low: colorRange?.lowColor ?? kDefaultLowAttributeColor,
        high: colorRange?.highColor ?? kDefaultHighAttributeColor
      }
    },
    getAttributeDefaultRange(attrId: string) {
      const attrMetadata = self.attributes.get(attrId)
      return attrMetadata?.defaultMin != null || attrMetadata?.defaultMax != null
              ? [attrMetadata?.defaultMin, attrMetadata?.defaultMax]
              : undefined
    },
    getAttributeBinningType(attrId: string) {
      return self.attributes.get(attrId)?.scale?.binningType || "quantile"
    },
    getAttributeDeletedFormula(attrId: string) {
      return self.attributes.get(attrId)?.deletedFormula
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
    setCollectionDefaults(collectionId: string, defaults: IV2CollectionDefaultsSnapshot) {
      const metadata = self.requireCollectionMetadata(collectionId)
      metadata.defaults = V2CollectionDefaults.create(defaults)
    },
    setSingleCase(collectionId: string, singleCase: string) {
      const metadata = self.requireCollectionMetadata(collectionId)
      if (metadata.labels) {
        metadata.labels.singleCase = singleCase
      } else {
        metadata.labels = CollectionLabels.create({ singleCase })
      }
    },
    setPluralCase(collectionId: string, pluralCase: string) {
      const metadata = self.requireCollectionMetadata(collectionId)
      if (metadata.labels) {
        metadata.labels.pluralCase = pluralCase
      } else {
        metadata.labels = CollectionLabels.create({ pluralCase })
      }
    },
    setSingleCaseWithArticle(collectionId: string, singleCaseWithArticle: string) {
      const metadata = self.requireCollectionMetadata(collectionId)
      if (metadata.labels) {
        metadata.labels.singleCaseWithArticle = singleCaseWithArticle
      } else {
        metadata.labels = CollectionLabels.create({ singleCaseWithArticle })
      }
    },
    setSetOfCases(collectionId: string, setOfCases: string) {
      const metadata = self.requireCollectionMetadata(collectionId)
      if (metadata.labels) {
        metadata.labels.setOfCases = setOfCases
      } else {
        metadata.labels = CollectionLabels.create({ setOfCases })
      }
    },
    setSetOfCasesWithArticle(collectionId: string, setOfCasesWithArticle: string) {
      const metadata = self.requireCollectionMetadata(collectionId)
      if (metadata.labels) {
        metadata.labels.setOfCasesWithArticle = setOfCasesWithArticle
      } else {
        metadata.labels = CollectionLabels.create({ setOfCasesWithArticle })
      }
    },
    setIsCollapsed(caseId: string, isCollapsed: boolean) {
      self.data?.validateCases()
      let { collectionId } = self.data?.caseInfoMap.get(caseId) || {}
      if (!collectionId) return
      if (isCollapsed) {
        const collectionMetadata = self.requireCollectionMetadata(collectionId)
        collectionMetadata.collapsed.set(caseId, true)
      }
      else {
        // expanding a child case requires expanding all of its ancestors
        for (let _caseId: Maybe<string> = caseId; _caseId; _caseId = self.data?.getParentCaseId(_caseId)) {
          collectionId = self.data?.caseInfoMap.get(_caseId)?.collectionId
          if (collectionId) {
            const collectionMetadata = self.collections.get(collectionId)
            if (collectionMetadata?.collapsed.has(_caseId)) {
              collectionMetadata?.collapsed.delete(_caseId)
            }
          }
        }
      }
    },
    setIsHidden(attrId: string, isHidden?: boolean) {
      self.requireAttributeMetadata(attrId).hidden = isHidden || undefined
    },
    setIsDeleteProtected(attrId: string, isProtected?: boolean) {
      self.requireAttributeMetadata(attrId).deleteProtected = isProtected || undefined
    },
    setIsEditProtected(attrId: string, isProtected?: boolean) {
      self.requireAttributeMetadata(attrId).editProtected = isProtected || undefined
    },
    setIsRenameProtected(attrId: string, isNameProtected?: boolean) {
      self.requireAttributeMetadata(attrId).renameProtected = isNameProtected || undefined
    },
    showAllAttributes() {
      self.attributes.forEach(attr => {
        attr.hidden = undefined
      })
    },
    setAttributeDefaultRange(attrId: string, min?: number, max?: number) {
      const attrMetadata = self.requireAttributeMetadata(attrId)
      if (min != null) {
        attrMetadata.defaultMin = min
      }
      if (max != null) {
        attrMetadata.defaultMax = max
      }
    },
    setAttributeColor(attrId: string, color: string, selector: "base" | "low" | "high") {
      const attrMetadata = self.requireAttributeMetadata(attrId)
      if (selector === "base") {
        attrMetadata.color = color
        return
      }
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
    },
    setDeletedFormula(attrId: string, formula: Maybe<string>) {
      const attrMetadata = self.requireAttributeMetadata(attrId)
      attrMetadata.deletedFormula = formula || undefined
    }
  }))
  .actions(self => ({
    deleteAttributeFormula(attrId: string) {
      const attribute = self.getAttribute(attrId)
      self.setDeletedFormula(attrId, attribute?.formula?.display)
      attribute?.clearFormula()
    },
    recoverAttributeFormula(attrId: string) {
      const formula = self.getAttributeDeletedFormula(attrId)
      if (!formula) {
        console.warn(`Deleted formula not found for attributeId: ${attrId}`)
        return
      }
      self.getAttribute(attrId)?.setDisplayExpression(formula)
    },
    removeCollectionLabels(collId: string) {
      const collMetadata = self.collections.get(collId)
      if (collMetadata) {
        collMetadata.labels = undefined
      }
    },
    setCollectionLabels(collId: string, labels: Partial<ICollectionLabelsSnapshot>) {
      if (labels.singleCase != null) self.setSingleCase(collId, labels.singleCase)
      if (labels.pluralCase != null) self.setPluralCase(collId, labels.pluralCase)
      if (labels.singleCaseWithArticle != null) self.setSingleCaseWithArticle(collId, labels.singleCaseWithArticle)
      if (labels.setOfCases != null) self.setSetOfCases(collId, labels.setOfCases)
      if (labels.setOfCasesWithArticle != null) self.setSetOfCasesWithArticle(collId, labels.setOfCasesWithArticle)
    },
    removeCategorySet(attrId: string) {
      const attrMetadata = self.attributes.get(attrId)
      if (attrMetadata) {
        attrMetadata.categories = undefined
      }
      self.provisionalCategories.delete(attrId)
    },
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
    getCategorySet(attrId: string, createIfMissing = true): Maybe<ICategorySet> {
      let categorySet = self.attributes.get(attrId)?.categories ?? self.provisionalCategories.get(attrId)
      if (!categorySet && self.data?.attrFromID(attrId)) {
        categorySet = createProvisionalCategorySet(self.data, attrId)

        self.provisionalCategories.set(attrId, categorySet)
        // remove category sets from map when attribute references are invalidated
        categorySet.onAttributeInvalidated(function(invalidAttrId: string) {
          self.removeCategorySet(invalidAttrId)
        })
        // promote provisional category sets when they are modified by the user
        when(
          () => !!categorySet?.moves.length || !!categorySet?.colors.size,
          () => {
            if (categorySet && self.provisionalCategories.has(attrId)) {
              self.promoteProvisionalCategorySet(categorySet)
            }
          }
        )
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
        }, {
          name: "DataSetMetadata.afterCreate.reaction [show remaining hidden attributes in a collection]",
          fireImmediately: true,
          equals: comparer.structural
        }
      ))
      // Assign base colors and color ranges to attributes that don't have one yet, based on position in collection
      addDisposer(self, reaction(
        () => self.data?.collections.map(coll =>
          coll.attributes.map(a => a?.id)
        ) ?? [],
        (collectionsAttrIds) => {
          collectionsAttrIds.forEach(attrIds => {
            attrIds.forEach((attrId, indexInCollection) => {
              if (!attrId) return
              const meta = self.attributes.get(attrId)
              if (!meta?.color) {
                const color = kellyColors[indexInCollection % kellyColors.length]
                self.setAttributeColor(attrId, color, "base")
              }
              if (!meta?.colorRange) {
                const baseColor = self.getAttributeColor(attrId) || kDefaultHighAttributeColor
                const lowColor = lowColorFromBase(baseColor)
                const highColor = self.getAttributeColor(attrId) ||
                  kellyColors[indexInCollection % kellyColors.length]
                self.setAttributeColor(attrId, lowColor, "low")
                self.setAttributeColor(attrId, highColor, "high")
              }
            })
          })
        }, {
          name: "DataSetMetadata.afterCreate.reaction [assign default attribute colors]",
          fireImmediately: true,
          equals: comparer.structural
        }
      ))
    }
  }))
  .actions(applyModelChange)

export interface IDataSetMetadata extends Instance<typeof DataSetMetadata> {}
export interface IDataSetMetadataSnapshot extends SnapshotIn<typeof DataSetMetadata> {}

export function isDataSetMetadata(model?: ISharedModel): model is IDataSetMetadata {
  return model ? getType(model) === DataSetMetadata : false
}

export function isDataSetMetadataSnapshot(model?: ISharedModelSnapshot): model is IDataSetMetadataSnapshot {
  return model ? model.type === kDataSetMetadataType : false
}

export interface SetIsCollapsedAction extends ISerializedActionCall {
  name: "setIsCollapsed"
  args: [string, boolean] // [caseId, isCollapsed]
}

export function isSetIsCollapsedAction(action: ISerializedActionCall): action is SetIsCollapsedAction {
  return action.name === "setIsCollapsed"
}
