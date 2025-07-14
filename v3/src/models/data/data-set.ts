/*
  The DataSet model is part of the data model originally designed for CLUE and updated for CODAP 3,
  which represents a flat "collection" of data. It is a MobX State Tree model which stores an array
  of Attribute models which store the actual data in frozen arrays.

  Although the data values are stored in the Attributes, the DataSet provides API for interacting
  with the data via cases, which are JavaScript objects with an `__id__` property (for storing the
  case id) and a property for each attribute. Cases can be traditional, in which case the property
  names are the attribute names, or canonical, in which case the property names are the attribute
  ids. All actions which mutate the data require canonical cases because attribute ids work better
  for undo/redo purposes because they aren't affected by renaming of attributes. The `getCases()`
  and `getCasesByIndex()` methods have a parameter which controls whether traditional or canonical
  cases are returned. Traditional cases can be useful for displaying to the user and for
  transferring data between DataSets, e.g. via copy/paste. The `toCanonical` and `fromCanonical`
  utility functions can be used to convert between the two representations.

  We currently use `__id__` to represent the case id in case objects to minimize the chance that
  we encounter conflicts with user-entered data. In theory we could use a JavaScript symbol for
  this purpose but that is left as a potential future improvement. If not provided by the client,
  case `__id__`s are automatically generated using `ulid`, which generates ordered randomized ids
  so that cases can be sorted by creation order if desired.

  As in CODAP v2, attributes can be grouped into collections. Within collections, cases with
  identical values are grouped into pseudo-cases which represent multiple child cases. For
  historical reasons, in v2 the collections and their cases were primary, and the flat "items"
  were constructed by combining the contents of the cases in each collection. In contrast, v3
  represents the flat cases by default and builds the collection-grouped pseudo-cases on the
  fly when necessary. Thus, "case" in v3 corresponds to "item" in v2, and "pseudo-case" in v3
  corresponds to "case" in v2.

  Clients can use standard MST mechanisms to listen for and respond to data model changes. For
  instance, `onAction()` will trigger whenever any DataSet action methods are called and provide
  access to the arguments that were passed to the action. Middleware is used to add attribute and
  case ids where needed so that they're available in the arguments for the `addAttributes()` and
  `addCases()` actions.

  The DataSet supports a notion of "derived" DataSets which can track a source DataSet and stay
  in sync with it as modifications are made. These derived DataSets can use a subset of the
  attributes and/or filter the cases so that, for instance, a scatter plot could make use of a
  derived DataSet with only two attributes and only cases with numeric values. This derivation
  system is loosely patterned after the case data flow architecture in Fathom, for the handful
  of people on the planet for whom that reference makes any sense.
 */

import { comparer, observable, reaction, runInAction } from "mobx"
import {
  addDisposer, addMiddleware, getEnv, hasEnv, Instance, isAlive, onPatch, ReferenceIdentifier, SnapshotIn, types
} from "mobx-state-tree"
import pluralize from "pluralize"
import { Attribute, IAttribute, IAttributeSnapshot } from "./attribute"
import { importValueToString } from "./attribute-types"
import {
  CollectionModel, ICollectionModel, ICollectionModelSnapshot, IItemData, isCollectionModel, syncCollectionLinks
} from "./collection"
import {
  CaseInfo, IAddAttributeOptions, IAddCasesOptions, IAddCollectionOptions, IAttributeChangeResult, ICase,
  ICaseCreation, IDerivationSpec, IGetCaseOptions, IGetCasesOptions, IItem, IMoveAttributeCollectionOptions,
  IMoveItemsOptions, ItemInfo
} from "./data-set-types"
// eslint-disable-next-line import/no-cycle
import { isLegacyDataSetSnap, isOriginalDataSetSnap, isTempDataSetSnap } from "./data-set-conversion"
import { Formula, IFormula } from "../formula/formula"
import { applyModelChange } from "../history/apply-model-change"
import { withoutUndo } from "../history/without-undo"
import { kAttrIdPrefix, kItemIdPrefix, typeV3Id, v3Id } from "../../utilities/codap-utils"
import { compareValues } from "../../utilities/data-utils"
import { hashOrderedStringSet, hashStringSet } from "../../utilities/js-utils"
import { gLocale } from "../../utilities/translation/locale"
import { t } from "../../utilities/translation/translate"
import { V2Model } from "./v2-model"

// remnant of derived DataSet implementation that isn't in active use
interface IEnvContext {
  srcDataSet: IDataSet;
  derivationSpec: IDerivationSpec;
}

// converts a case from canonical (id props) to traditional (named props) format
export function fromCanonicalCase(ds: IDataSet, canonical: ICase): ICase
export function fromCanonicalCase(ds: IDataSet, canonical: ICaseCreation): ICaseCreation
export function fromCanonicalCase(ds: IDataSet, canonical: ICase | ICaseCreation): ICase | ICaseCreation {
  const aCase: ICaseCreation = canonical.__id__ ? { __id__: canonical.__id__ } : {}
  for (const id in canonical) {
    if (id !== "__id__") {
      // if we can't find a name, just use the id
      const name = ds.getAttribute(id)?.name || id
      aCase[name] = canonical[id]
    }
  }
  return aCase
}

type CaseOrArray = ICase | ICaseCreation | Array<ICase | ICaseCreation>

export function fromCanonical(ds: IDataSet, cases: ICase): ICase
export function fromCanonical(ds: IDataSet, cases: ICaseCreation): ICaseCreation
export function fromCanonical(ds: IDataSet, cases: ICase[]): ICase[]
export function fromCanonical(ds: IDataSet, cases: ICaseCreation[]): ICaseCreation[]
export function fromCanonical(ds: IDataSet, cases: CaseOrArray): CaseOrArray {
  return Array.isArray(cases)
          ? cases.map(aCase => fromCanonicalCase(ds, aCase))
          : fromCanonicalCase(ds, cases)
}

// converts a case from traditional (named props) to canonical (id props) format
export function toCanonicalCase(ds: IDataSet, aCase: ICase): ICase
export function toCanonicalCase(ds: IDataSet, aCase: ICaseCreation): ICaseCreation
export function toCanonicalCase(ds: IDataSet, aCase: ICase | ICaseCreation): ICase | ICaseCreation {
  const canonical: ICaseCreation = aCase.__id__ ? { __id__: aCase.__id__ } : {}
  for (const key in aCase) {
    if (key !== "__id__") {
      const id = ds.attrIDFromName(key)
      if (id) {
        canonical[id] = importValueToString(aCase[key] ?? "")
      }
      else {
        console.warn(`Dataset.toCanonical failed to convert attribute: "${key}"`)
      }
    }
  }
  return canonical
}

export function toCanonical(ds: IDataSet, cases: ICase): ICase
export function toCanonical(ds: IDataSet, cases: ICaseCreation): ICaseCreation
export function toCanonical(ds: IDataSet, cases: ICase[]): ICase[]
export function toCanonical(ds: IDataSet, cases: ICaseCreation[]): ICaseCreation[]
export function toCanonical(ds: IDataSet, cases: CaseOrArray): CaseOrArray {
  return Array.isArray(cases)
          ? cases.map(aCase => toCanonicalCase(ds, aCase))
          : toCanonicalCase(ds, cases)
}

export const nullItemData: IItemData = {
  itemIds: () => [],
  isHidden: () => false,
  getValue: () => "",
  addItemInfo: () => {},
  invalidate: () => {}
} as IItemData

export const DataSet = V2Model.named("DataSet").props({
  id: typeV3Id("DATA"),
  sourceID: types.maybe(types.string),
  // ordered parent-most to child-most
  collections: types.array(CollectionModel),
  attributesMap: types.map(Attribute),
  _itemIds: types.array(types.string),
  // for serialization only, not for dynamic selection tracking
  snapSelection: types.array(types.string),
  // hidden by user, e.g. set-aside in CODAP
  setAsideItemIds: types.array(types.string),
  filterFormula: types.maybe(Formula)
})
.volatile(self => ({
  // map from attribute name to attribute id
  attrNameMap: observable.map<string, string>({}, { name: "attrNameMap" }),
  // map from item ids to info like index and case ids
  itemInfoMap: new Map<string, ItemInfo>(),
  // MobX-observable set of selected item IDs
  selection: observable.set<string>(),
  selectionChanges: 0,
  // MobX-observable set of hidden (set aside) item IDs
  setAsideItemIdsSet: observable.set<string>(),
  // copy of setAsideItemIds used for change-detection
  setAsideItemIdsMirror: [] as string[],
  // map from case ID to the CaseInfo it represents
  caseInfoMap: new Map<string, CaseInfo>(),
  // map from item ID to the child case containing it
  // contains all items and child cases, including hidden ones
  itemIdChildCaseMap: new Map<string, CaseInfo>(),
  // incremented when collection parent/child links are updated
  syncCollectionLinksCount: 0,
  transactionCount: 0,
  // the id of the interactive frame handling this dataset
  // used by the Collaborative plugin
  managingControllerId: "",
  // cached result of filter formula evaluation for each item ID
  filteredOutItemIds: observable.set<string>(),
  filterFormulaError: "",
  itemData: nullItemData,
  // flag indicating that items are being appended, enabling certain optimizations
  isAppendingItems: false
}))
.extend(self => {
  const _validationCount = observable.box<number>(0)
  const _isValidCases = observable.box<boolean>(false)
  return {
    views: {
      get validationCount() {
        return _validationCount.get()
      },
      get isValidCases() {
        return _isValidCases.get()
      },
      invalidateCases() {
        runInAction(() => _isValidCases.set(false))
      },
      setValidCases() {
        if (!_isValidCases.get()) {
          runInAction(() => {
            _validationCount.set(_validationCount.get() + 1)
            _isValidCases.set(true)
          })
        }
      }
    }
  }
})
.volatile(() => {
  let cachingCount = 0
  const itemCache = new Map<string, IItem>()
  return {
    get itemCache() {
      return itemCache
    },
    isCaching() {
      // Do not use getter here, as the result would be cached and not updated when cachingCount changes.
      // Note that it also happens for volatile properties, not only views.
      return cachingCount > 0
    },
    clearCache() {
      itemCache.clear()
    },
    beginCaching() {
      return ++cachingCount
    },
    _endCaching() {
      return --cachingCount
    }
  }
})
.preProcessSnapshot(snap => {
  // convert legacy collections/attributes/cases implementation to current
  if (isLegacyDataSetSnap(snap)) {
    const {
      collections: _collections = [], attributes: _legacyAttributes, ungrouped,
      cases, itemIds, hiddenItemIds = [], ...others
    } = snap

    const attributeIds: string[] = []

    // build the attributesMap (if necessary)
    const attributesMap: Record<string, IAttributeSnapshot> = {}
    if (isOriginalDataSetSnap(snap)) {
      const { attributes: _attributes } = snap
      _attributes.forEach(attr => {
        const attrId = attr.id || v3Id(kAttrIdPrefix)
        attributeIds.push(attrId)
        attributesMap[attrId] = { id: attrId, ...attr }
      })
    }
    // extract the attribute ids
    else if (isTempDataSetSnap(snap)) {
      const { attributes: _attributes } = snap
      attributeIds.push(..._attributes)
    }

    const collections: ICollectionModelSnapshot[] = [..._collections]

    // identify parent attributes that shouldn't be in child collection
    const parentAttrs = new Set<ReferenceIdentifier>()
    collections.forEach(collection => {
      collection.attributes?.forEach(attrId => {
        attrId && parentAttrs.add(attrId)
      })
    })
    // identify child collection attributes
    const childAttrs: ReferenceIdentifier[] = []
    attributeIds?.forEach(attrId => {
      if (!parentAttrs.has(attrId)) {
        childAttrs.push(attrId)
      }
    })

    // create child collection
    const childCollection: ICollectionModelSnapshot = {
      name: t("DG.AppController.createDataSet.collectionName"),
      ...ungrouped,
      attributes: childAttrs
    }
    collections.push(childCollection)

    const _itemIds = cases?.map(({ __id__ }) => __id__) ?? itemIds ?? []

    return { attributesMap, collections, _itemIds, setAsideItemIds: hiddenItemIds, ...others }
  }
  return snap
})
.views(self => ({
  get defaultTitle() {
    return self.collections.map(collection => collection.name).join("/")
  },
  isItemSetAside(itemId: string) {
    return self.setAsideItemIdsSet.has(itemId)
  },
  isItemFilteredOut(itemId: string) {
    return self.filteredOutItemIds.has(itemId)
  }
}))
.views(self => ({
  get title() {
    return self._title || self.defaultTitle || self.name
  },
  isItemHidden(itemId: string) {
    return self.isItemSetAside(itemId) || self.isItemFilteredOut(itemId)
  }
}))
.views(self => ({
  isCaseOrItemHidden(caseOrItemId: string) {
    // A case is hidden if all of its child items are hidden
    const caseInfo = self.caseInfoMap.get(caseOrItemId)
    if (caseInfo) return caseInfo.childItemIds.length === 0 && caseInfo.hiddenChildItemIds.length > 0

    return self.isItemHidden(caseOrItemId)
  }
}))
.views(self => ({
  // ids of items that have not been hidden (set aside) by user
  get itemsNotSetAside() {
    return self._itemIds.filter(itemId => !self.isItemSetAside(itemId))
  },
  /**
   * ids of items that have not been hidden (set aside) or filtered by user
   */
  get itemIds() {
    return self._itemIds.filter(itemId => !self.isItemHidden(itemId))
  }
}))
.views(self => ({
  get attributes() {
    const attrs: IAttribute[] = []
    self.collections.forEach(collection => {
      collection.attributes.forEach(attr => {
        attr && attrs.push(attr)
      })
    })
    return attrs
  },
  get itemIdsHash() {
    // observable order-independent hash of visible (not set aside, not filtered out) item ids
    return hashStringSet(self.itemIds)
  },
  get itemIdsOrderedHash() {
    // observable order-dependent hash of visible (not set aside, not filtered out) item ids
    return hashOrderedStringSet(self.itemIds)
  },
  get items(): readonly IItem[] {
    return self.itemIds.map(id => ({ __id__: id }))
  },
  get hasFilterFormula() {
    return !!self.filterFormula && !self.filterFormula.empty
  }
}))
.views(self => ({
  attrIndexFromID(id: string) {
    const index = self.attributes.findIndex(attr => attr.id === id)
    return index >= 0 ? index : undefined
  },
  get collectionIds() {
    return self.collections.map(collection => collection.id)
  },
  get childCollection(): ICollectionModel {
    return self.collections[self.collections.length - 1]
  },
  get attrNameMap() {
    const nameMap = observable.map<string, string>({}, { name: "attrNameMap" })
    self.attributesMap.forEach(attr => {
      nameMap.set(attr.name, attr.id)
    })
    return nameMap
  }
}))
.views(self => ({
  getAttribute(id: string) {
    return self.attributesMap.get(id)
  },
  getAttributeByName(name: string) {
    return self.attributesMap.get(self.attrNameMap.get(name) ?? "")
  },
  hasItem(itemId: string) {
    return !!self.itemInfoMap.get(itemId)
  },
  getItemIndex(itemId: string) {
    return self.itemInfoMap.get(itemId)?.index
  },
  getItemIndexForCaseOrItem(caseOrItemId: string) {
    const caseInfo = self.caseInfoMap.get(caseOrItemId)
    // for cases, returns index of first item
    const itemId = caseInfo ? caseInfo.childItemIds[0] : caseOrItemId
    return this.getItemIndex(itemId)
  },
  getItemCaseIds(itemId: string): readonly string[] {
    return self.itemInfoMap.get(itemId)?.caseIds ?? []
  },
  getItemChildCaseId(itemId: string) {
    const itemInfo = self.itemInfoMap.get(itemId)
    if (!itemInfo) return
    const childCaseIndex = itemInfo.caseIds.length - 1
    return itemInfo.caseIds[childCaseIndex]
  },
  itemIDFromIndex(index: number) {
    return self.items[index]?.__id__
  },
  nextItemID(id: string) {
    const index = this.getItemIndex(id),
          nextItem = (index != null) && (index < self.items.length - 1)
                      ? self.items[index + 1] : undefined
    return nextItem?.__id__
  },
  addItemInfo(itemId: string, caseId: string) {
    const itemInfo = self.itemInfoMap.get(itemId)
    if (itemInfo) {
      itemInfo.caseIds.push(caseId)
    }
    else {
      console.warn("DataSet.addItemInfo called for missing item:", itemId)
    }
  }
}))
.actions(self => ({
  incSyncCollectionLinksCount() {
    ++self.syncCollectionLinksCount
  }
}))
.actions(self => ({
  syncCollectionLinks() {
    syncCollectionLinks(self.collections, self.itemData)
    self.incSyncCollectionLinksCount()
    self.invalidateCases()
  }
}))
.extend(self => {
  function getCollection(collectionId?: string): ICollectionModel | undefined {
    if (!isAlive(self)) {
      console.warn("DataSet.getCollection called on a defunct DataSet")
      return
    }
    return self.collections.find(({ id }) => id === collectionId)
  }

  function getCollectionByName(collectionName: string): ICollectionModel | undefined {
    if (!isAlive(self)) {
      console.warn("DataSet.getCollectionByName called on a defunct DataSet")
      return
    }
    return self.collections.find(({ name }) => name === collectionName)
  }

  function getCollectionIndex(collectionId?: string) {
    return self.collections.findIndex(({ id }) => id === collectionId)
  }

  function getCollectionForAttribute(attributeId: string): ICollectionModel | undefined {
    return self.collections.find(coll => coll.getAttribute(attributeId))
  }

  function getCollectionIndexForAttribute(attributeId: string): number | undefined {
    const id = getCollectionForAttribute(attributeId)?.id
    return id ? getCollectionIndex(id) : undefined
  }

  function getUniqueCollectionName(name: string) {
    let suffix = 1
    let collectionName = name
    while (getCollectionByName(collectionName)) collectionName = `${name}${suffix++}`
    return collectionName
  }

  return {
    views: {
      // get collection from id
      getCollection,
      // get collection from name
      getCollectionByName,
      // get index from collection
      getCollectionIndex,
      // get collection from attribute
      // undefined => attribute not present in dataset
      getCollectionForAttribute,
      getCollectionIndexForAttribute,
      getUniqueCollectionName
    },
    actions: {
      addCollection(collectionSnap: ICollectionModelSnapshot, options?: IAddCollectionOptions) {
        // ensure collection has a unique name
        const { name, ...rest } = collectionSnap
        const _name = getUniqueCollectionName(name ?? "")
        const collection = { name: _name, ...rest }

        // place the collection in the correct location
        let beforeIndex = options?.before ? getCollectionIndex(options.before) : -1
        if (beforeIndex < 0 && options?.after) {
          beforeIndex = getCollectionIndex(options.after)
          if (beforeIndex >= 0 && beforeIndex < self.collections.length) {
            ++beforeIndex
          }
        }
        // by default, new collections are added before the default child collection
        if (beforeIndex < 0 && self.collections.length > 0) {
          beforeIndex = self.collections.length - 1
        }
        if (beforeIndex >= 0) {
          self.collections.splice(beforeIndex, 0, collection)
        }
        else {
          // by default, new collections are added as the childmost collection
          beforeIndex = self.collections.length
          self.collections.push(collection)
        }

        const newCollection = self.collections[beforeIndex]
        // remove any attributes from other collections
        const attrIds: Array<ReferenceIdentifier | undefined> = [...(collection.attributes ?? [])]
        attrIds?.forEach(attrId => {
          const attrCollection = self.collections.find(_collection => {
            return attrId && _collection !== newCollection && _collection.getAttribute(`${attrId}`)
          })
          if (attrId && attrCollection) attrCollection.removeAttribute(`${attrId}`)
        })
        return newCollection
      },
      removeCollection(collection: ICollectionModel) {
        self.collections.remove(collection)
        self.syncCollectionLinks()
      }
    }
  }
})
.actions(self => ({
  setManagingControllerId(id?: string) {
    self.managingControllerId = id ?? ""
  },
  moveAttribute(attributeID: string, options?: IMoveAttributeCollectionOptions): IAttributeChangeResult {
    let removedCollectionId: string | undefined
    const attribute = self.getAttribute(attributeID)
    const srcCollection = self.getCollectionForAttribute(attributeID)
    const dstCollection = options?.before
                            ? self.getCollectionForAttribute(options.before)
                            : options?.after
                              ? self.getCollectionForAttribute(options.after)
                              : options?.collection
                                ? self.getCollection(options.collection)
                                : undefined
    if (!attribute || !srcCollection) return {}
    if (!dstCollection || srcCollection === dstCollection) {
      srcCollection?.moveAttribute(attributeID, options)
    }
    else {
      if (attribute.hasFormula) {
        // If the attribute has a formula, we need to reset all the calculated values to blank values so that they
        // are not taken into account while calculating case grouping. After the grouping is done, the formula will
        // be re-evaluated, and the values will be updated to the correct values again.
        attribute.clearValues()
      }
      if (srcCollection.getAttribute(attributeID) && srcCollection.attributes.length === 1) {
        removedCollectionId = srcCollection.id
        self.removeCollection(srcCollection)
      }
      else {
        srcCollection.removeAttribute(attributeID)
      }
      dstCollection.addAttribute(attribute, options)
      // update grouping
      self.invalidateCases()
    }
    return { removedCollectionId }
  }
}))
.views(self => ({
  validateCases() {
    if (!self.isValidCases) {
      self.caseInfoMap.clear()
      const itemsToValidate = new Set<string>(self.itemInfoMap.keys())
      self.itemInfoMap.clear()
      self._itemIds.forEach((itemId, index) => {
        self.itemInfoMap.set(itemId, { index, caseIds: [], isHidden: self.isCaseOrItemHidden(itemId) })
        itemsToValidate.delete(itemId)
      })
      self.collections.forEach((collection, index) => {
        // update the cases
        collection.updateCaseGroups()
      })
      self.collections.forEach((collection, index) => {
        // complete the case groups, including sorting child collection cases into groups
        const parentCaseGroups = index > 0 ? self.collections[index - 1].caseGroups : undefined
        collection.completeCaseGroups(parentCaseGroups)
        // update the caseGroupMap
        collection.caseGroupMap.forEach(group => self.caseInfoMap.set(group.groupedCase.__id__, group))
      })
      self.itemIdChildCaseMap.clear()
      Array.from(self.childCollection.caseGroupMap.values()).forEach(caseGroup => {
        self.itemIdChildCaseMap.set(caseGroup.childItemIds[0] ?? caseGroup.hiddenChildItemIds[0], caseGroup)
      })
      // delete removed items from selection
      itemsToValidate.forEach(itemId => {
        // update selection
        self.selection.delete(itemId)
      })
      self.setValidCases()
    }
  },
  validateCasesForNewItems(itemIds: string[]) {
    const newCaseIdsForCollections = new Map<string, string[]>()
    self.collections.forEach((collection, index) => {
      // update the cases
      const { newCaseIds } = collection.updateCaseGroups(itemIds)
      newCaseIdsForCollections.set(collection.id, newCaseIds)
    })
    self.collections.forEach((collection, index) => {
      // complete the case groups, including sorting child collection cases into groups
      const parentCaseGroups = index > 0 ? self.collections[index - 1].caseGroups : undefined
      collection.completeCaseGroups(parentCaseGroups)
      // update the caseGroupMap
      collection.caseGroupMap.forEach(group => self.caseInfoMap.set(group.groupedCase.__id__, group))
    })
    self.itemIdChildCaseMap.clear()
    Array.from(self.childCollection.caseGroupMap.values()).forEach(caseGroup => {
      self.itemIdChildCaseMap.set(caseGroup.childItemIds[0] ?? caseGroup.hiddenChildItemIds[0], caseGroup)
    })
  }
}))
.views(self => ({
  childCases() {
    self.validateCases()
    return self.collections[self.collections.length - 1].cases
  },
  getCollectionForCase(caseId: string): ICollectionModel | undefined {
    self.validateCases()
    return self.collections.find(coll => coll.hasCase(caseId))
  }
}))
.actions(self => ({
  clearFilterFormula() {
    self.filterFormula = undefined
    self.filteredOutItemIds.clear()
    self.filterFormulaError = ""
    self.invalidateCases()
  }
}))
.actions(self => ({
  hideCasesOrItems(caseOrItemIds: string[]) {
    caseOrItemIds.forEach(id => {
      const caseInfo = self.caseInfoMap.get(id)
      if (caseInfo) {
        caseInfo.childItemIds.forEach(itemId => {
          if (!self.setAsideItemIdsSet.has(itemId)) {
            self.setAsideItemIds.push(itemId)
          }
        })
      }
      else if (self.itemInfoMap.get(id)) {
        if (!self.setAsideItemIdsSet.has(id)) {
          self.setAsideItemIds.push(id)
        }
      }
    })
  },
  showHiddenCasesAndItems(caseOrItemIds?: string[]) {
    if (caseOrItemIds) {
      caseOrItemIds.forEach(id => {
        const caseInfo = self.caseInfoMap.get(id)
        if (caseInfo) {
          caseInfo.hiddenChildItemIds.forEach(itemId => {
            const foundIndex = self.setAsideItemIds.findIndex(hiddenItemId => hiddenItemId === itemId)
            if (foundIndex >= 0) self.setAsideItemIds.splice(foundIndex, 1)
          })
        }
        else if (self.itemInfoMap.get(id)) {
          const foundIndex = self.setAsideItemIds.findIndex(hiddenItemId => hiddenItemId === id)
          if (foundIndex >= 0) self.setAsideItemIds.splice(foundIndex, 1)
        }
      })
    } else {
      // show all hidden cases/items
      self.setAsideItemIds.clear()
    }
  },
  setFilterFormula(display: string) {
    if (display) {
      if (!self.filterFormula) {
        self.filterFormula = Formula.create({ display })
      }
      else {
        self.filterFormula.setDisplayExpression(display)
      }
    } else {
      self.clearFilterFormula()
    }
  },
  updateFilterFormulaResults(filterFormulaResults: { itemId: string, result: boolean }[], { replaceAll = false }) {
    if (replaceAll) {
      self.filteredOutItemIds.clear()
    }
    filterFormulaResults.forEach(({ itemId, result }) => {
      if (result === false) {
        self.filteredOutItemIds.add(itemId)
      }
      else {
        // Note that if itemResult is undefined, it means the item has not been filtered out (e.g., there may not be any
        // filter formula), so it should be considered as having passed the filter.
        self.filteredOutItemIds.delete(itemId)
      }
    })
    self.invalidateCases()
  },
  setFilterFormulaError(error: string) {
    self.filterFormulaError = error
  }
}))
.actions(self => ({
  // if beforeCollectionId is not specified, new collection is parent of the child-most collection
  moveAttributeToNewCollection(attributeId: string, beforeCollectionId?: string) {
    const attribute = self.getAttribute(attributeId)
    if (attribute) {
      const name = pluralize(attribute.name)
      const collectionSnap: ICollectionModelSnapshot = { name }
      const collection = self.addCollection(collectionSnap, { before: beforeCollectionId })
      self.moveAttribute(attributeId, { collection: collection.id })
      return collection
    }
  }
}))
.views(self => ({
  getParentCollection(collectionId?: string) {
    const foundIndex = self.collections.findIndex(collection => collection.id === collectionId)
    const parentIndex = foundIndex > 0 ? foundIndex - 1 : -1
    return parentIndex >= 0 ? self.collections[parentIndex] : undefined
  },
  getChildCollection(collectionId?: string) {
    const foundIndex = self.collections.findIndex(collection => collection.id === collectionId)
    const childIndex = foundIndex < self.collections.length - 1 ? foundIndex + 1 : -1
    return childIndex >= 0 ? self.collections[childIndex] : undefined
  },
  getGroupsForCollection(collectionId?: string) {
    self.validateCases()
    return self.getCollection(collectionId)?.caseGroups ?? []
  }
}))
.views(self => ({
  getCasesForCollection(collectionId?: string): readonly ICase[] {
    self.validateCases()
    return self.getCollection(collectionId)?.cases ?? []
  },
  getParentCase(caseId: string, collectionId?: string) {
    self.validateCases()
    const parentCollectionId = self.getCollection(collectionId)?.parent?.id
    return self.getCollection(parentCollectionId)?.findParentCaseGroup(caseId)
  },
  getCollectionForAttributes(attributeIds: string[]) {
    self.validateCases()
    for (let i = self.collections.length - 1; i >= 0; --i) {
      const collection = self.collections[i]
      if (attributeIds.some(attrId => collection.getAttribute(attrId))) {
        return collection
      }
    }
  },
  getCasesForAttributes(attributeIds: string[]) {
    const collection = this.getCollectionForAttributes(attributeIds)
    return collection?.cases ?? []
  },
  getItemsForCases(cases: ICase[]) {
    const items: IItem[] = []
    cases.forEach(aCase => {
      // convert each case change to a change to each underlying item
      const caseGroup = self.caseInfoMap.get(aCase.__id__)
      if (caseGroup?.childItemIds?.length) {
        items.push(...caseGroup.childItemIds.map(id => ({ ...aCase, __id__: id })))
      }
      else {
        // items can be added directly
        items.push(aCase)
      }
    })
    return items
  }
}))
.extend(self => {
  /*
   * private closure
   */
  const attrIDFromName = (name: string) => self.attrNameMap.get(name)

  function getItem(itemID: string, options?: IGetCaseOptions): ICase | undefined {
    const index = self.getItemIndex(itemID)
    if (index == null) { return undefined }

    const { canonical = true, numeric = true } = options || {}
    const item: ICase = { __id__: itemID }
    self.attributes.forEach((attr) => {
      const key = canonical ? attr.id : attr.name
      item[key] = numeric ? attr.value(index) : attr.strValue(index)
    })
    return item
  }

  function getItems(itemIDs: string[], options?: IGetCaseOptions): ICase[] {
    const items: ICase[] = []
    itemIDs.forEach((caseID) => {
      const item = getItem(caseID, options)
      if (item) {
        items.push(item)
      }
    })
    return items
  }

  function getItemAtIndex(index: number, options?: IGetCaseOptions) {
    const item = self.items[index],
          id = item?.__id__
    return id ? getItem(id, options) : undefined
  }

  function setItemValues(caseValues: ICase) {
    const index = self.getItemIndex(caseValues.__id__)
    if (index == null) { return }
    for (const key in caseValues) {
      if (key !== "__id__") {
        const attribute = self.getAttribute(key)
        if (attribute) {
          const value = caseValues[key]
          attribute.setValue(index, value != null ? value : undefined)
        }
      }
    }
  }

  return {
    /*
     * public views
     */
    views: {
      // [DEPRECATED] use getAttribute() instead
      attrFromID(id: string) {
        return self.getAttribute(id)
      },
      // [DEPRECATED] use getAttributeByName() instead
      attrFromName(name: string) {
        const id = self.attrNameMap.get(name)
        return id ? self.getAttribute(id) : undefined
      },
      attrIDFromName,
      hasCase(caseId: string) {
        return !!self.caseInfoMap.get(caseId)
      },
      getValue(caseID: string, attributeID: string) {
        const index = self.getItemIndexForCaseOrItem(caseID)
        return index != null ? this.getValueAtItemIndex(index, attributeID) : undefined
      },
      getValueAtItemIndex(index: number, attributeID: string) {
        if (self.isCaching()) {
          const itemId = self.items[index]?.__id__
          const cachedItem = self.itemCache.get(itemId)
          if (cachedItem && Object.prototype.hasOwnProperty.call(cachedItem, attributeID)) {
            return cachedItem[attributeID]
          }
        }
        const attr = self.getAttribute(attributeID)
        return attr?.value(index)
      },
      getStrValue(caseID: string, attributeID: string) {
        const index = self.getItemIndexForCaseOrItem(caseID)
        return index != null ? this.getStrValueAtItemIndex(index, attributeID) : ""
      },
      getStrValueAtItemIndex(itemIndex: number, attributeID: string) {
        if (self.isCaching()) {
          const itemId = self.items[itemIndex]?.__id__
          const cachedItem = self.itemCache.get(itemId)
          if (cachedItem && Object.prototype.hasOwnProperty.call(cachedItem, attributeID)) {
            return cachedItem[attributeID]?.toString()
          }
        }
        const attr = self.getAttribute(attributeID)
        return attr?.strValue(itemIndex) ?? ""
      },
      getNumeric(caseID: string, attributeID: string): number | undefined {
        const index = self.getItemIndexForCaseOrItem(caseID)
        return index != null ? this.getNumericAtItemIndex(index, attributeID) : undefined
      },
      getNumericAtItemIndex(index: number, attributeID: string) {
        if (self.isCaching()) {
          const itemId = self.items[index]?.__id__
          const cachedItem = self.itemCache.get(itemId)
          if (cachedItem && Object.prototype.hasOwnProperty.call(cachedItem, attributeID)) {
            return Number(cachedItem[attributeID])
          }
        }
        const attr = self.getAttribute(attributeID)
        return attr?.numValue(index)
      },
      getItem,
      getItems,
      getItemAtIndex,
      getItemsAtIndex(start = 0, options?: IGetCasesOptions) {
        const { count = self.items.length } = options || {}
        const endIndex = Math.min(start + count, self.items.length),
              cases = []
        for (let i = start; i < endIndex; ++i) {
          cases.push(getItemAtIndex(i, options))
        }
        return cases
      },
      getFirstItemForCase(caseId: string, options?: IGetCasesOptions) {
        const itemId = self.caseInfoMap.get(caseId)?.childItemIds[0]
        return itemId ? getItem(itemId, { numeric: false }) : undefined
      },
      isCaseSelected(caseId: string) {
        // a pseudo-case is selected if all of its individual cases are selected
        const group = self.caseInfoMap.get(caseId)
        return group
                ? group.childItemIds.every(id => self.selection.has(id))
                : self.selection.has(caseId)
      },
      get isInTransaction() {
        return self.transactionCount > 0
      }
    },
    /*
     * public actions
     *
     * These actions are used to identify potentially undoable actions and to trigger responses via
     * onAction handlers, etc. As such, responder convenience is prioritized over caller convenience.
     * For instance, rather than separate APIs for setting a single case value, setting a single case,
     * and setting multiple cases, there's a single function for setting multiple cases.
     */
    actions: {
      beginTransaction() {
        ++self.transactionCount
      },
      endTransaction() {
        --self.transactionCount
      },
      // should be called before retrieving snapshot (pre-serialization)
      prepareSnapshot() {
        // move volatile data into serializable properties
        withoutUndo({ suppressWarning: true })
        self.collections.forEach(collection => collection.prepareSnapshot())
        self.attributes.forEach(attr => attr.prepareSnapshot())
        self.snapSelection.replace(Array.from(self.selection))
      },
      // should be called after retrieving snapshot (post-serialization)
      completeSnapshot() {
        // move data back into volatile storage for efficiency
        withoutUndo({ suppressWarning: true })
        self.collections.forEach(collection => collection.completeSnapshot())
        self.attributes.forEach(attr => attr.completeSnapshot())
      },
      setName(name: string) {
        self.name = name
      },
      addAttribute(snapshot: IAttributeSnapshot, options?: IAddAttributeOptions) {
        const { before: beforeID, collection: collectionId } = options || {}

        // add attribute to attributesMap
        let collection: ICollectionModel | undefined
        const attribute = self.attributesMap.put(snapshot)

        // fill out any missing values
        // for (let i = attribute.strValues.length; i < self.cases.length; ++i) {
        for (let i = attribute.strValues.length; i < self._itemIds.length; ++i) {
          attribute.addValue()
        }

        // add attribute reference to attributes array
        const beforeIndex = beforeID ? self.attrIndexFromID(beforeID) ?? -1 : -1
        if (beforeID && beforeIndex >= 0) {
          collection = self.getCollectionForAttribute(beforeID)
          const collectionBeforeIndex = collection?.attributes.findIndex(attr => attr?.id === beforeID) ?? -1
          if (collectionBeforeIndex >= 0) {
            collection?.attributes.splice(collectionBeforeIndex, 0, attribute.id)
          }
          return attribute
        }

        // add the attribute to the specified collection (if any) or the childmost collection
        if (!collection && collectionId) {
          collection = self.getCollection(collectionId)
        }
        if (!collection) collection = self.childCollection
        collection.addAttribute(attribute)
        return attribute
      },

      setAttributeName(attributeID: string, name: string | (() => string)) {
        const attribute = attributeID && self.getAttribute(attributeID)
        if (attribute) {
          const nameStr = typeof name === "string" ? name : name()
          if (nameStr !== attribute.name) {
            attribute.setName(nameStr)
          }
        }
      },

      removeAttribute(attributeID: string) {
        const result: IAttributeChangeResult = {}
        const attribute = self.getAttribute(attributeID)

        if (attribute) {
          // remove attribute from any collection
          const collection = self.getCollectionForAttribute(attributeID)
          if (isCollectionModel(collection)) {
            if (collection.attributes.length > 1) {
              collection.removeAttribute(attributeID)
            }
            else if (self.collections.length > 1) {
              result.removedCollectionId = collection.id
              self.removeCollection(collection)
            }
          }

          // remove attribute from attributesMap
          self.attributesMap.delete(attribute.id)
        }
        return result
      },

      // TODO: This is really adding items rather than cases. A true addCases would treat any
      // provided ids as case ids rather than item ids, would allow the client to specify a
      // target collection and/or parent case, etc. Not sure at the moment whether there
      // should be two separate functions or whether one function can suffice, and if the
      // latter, whether it should be named addCases or addItems.
      addCases(cases: ICaseCreation[], options?: IAddCasesOptions) {
        const { before, after } = options || {}
        let didAppendItems = false

        const beforePosition = before
          ? self.getItemIndex(before) ?? self.getItemIndex(self.caseInfoMap.get(before)?.childItemIds[0] ?? "")
          : undefined
        const getAfterPosition = () => {
          if (!after) return

          // If after is an item id, return one index after that item
          const afterItemIndex = self.getItemIndex(after)
          if (afterItemIndex != null) return afterItemIndex + 1

          // If after is a case id, find its last item and return one index after that
          const afterCase = self.caseInfoMap.get(after)
          if (!afterCase?.childItemIds.length) return
          const afterCaseItemId = afterCase.childItemIds[afterCase.childItemIds.length - 1]
          const afterCaseItemIndex = self.getItemIndex(afterCaseItemId)
          if (afterCaseItemIndex) return afterCaseItemIndex + 1
        }
        const afterPosition = getAfterPosition()
        const insertPosition = beforePosition ?? afterPosition ?? self._itemIds.length

        // insert/append cases and empty values
        const ids = cases.map(({ __id__ = v3Id(kItemIdPrefix) }) => __id__)
        const _values = new Array(cases.length)
        if (insertPosition < self._itemIds.length) {
          self._itemIds.splice(insertPosition, 0, ...ids)
          // update the indices of cases after the insert
          self.itemInfoMap.forEach((itemInfo, caseId) => {
            if (itemInfo.index >= insertPosition) {
              itemInfo.index += cases.length
            }
          })
          // insert values for each attribute
          self.attributesMap.forEach(attr => {
            attr.addValues(_values, insertPosition)
          })
        }
        else {
          self.isAppendingItems = true

          self._itemIds.push(...ids)
          // append values to each attribute
          self.attributesMap.forEach(attr => {
            attr.setLength(self._itemIds.length)
          })

          self.isAppendingItems = false
          didAppendItems = true
        }
        // add the itemInfo for the appended cases
        ids.forEach((caseId, index) => {
          self.itemInfoMap.set(caseId, { index: insertPosition + index, caseIds: [], isHidden: false })
        })

        // copy any values provided
        const attrs = new Set<string>()
        cases.forEach((aCase, index) => {
          for (const key in aCase) {
            const value = aCase[key]
            if (value != null) {
              const attrId = options?.canonicalize ? self.attrNameMap.get(key) : key
              const attr = attrId && self.getAttribute(attrId)
              if (attr) {
                attrs.add(attrId)
                attr.setValue(insertPosition + index, value, { noInvalidate: true })
              }
            }
          }
        })

        // invalidate the affected attributes
        attrs.forEach(attrId => self.getAttribute(attrId)?.incChangeCount())

        if (didAppendItems) {
          self.validateCasesForNewItems(ids)
        }

        return ids
      },

      // Supports items or cases, but not mixing the two.
      // For cases, will set the values of all items in the group
      // regardless of whether the attribute is grouped or not.
      // `affectedAttributes` are not used in the function, but are present as a potential
      // optimization for responders, as all arguments are available to `onAction` listeners.
      // For instance, a scatter plot that is dragging many points but affecting only two
      // attributes can indicate that, which can enable more efficient responses.
      setCaseValues(cases: ICase[], affectedAttributes?: string[]) {
        const items = self.getItemsForCases(cases)

        if (self.isCaching()) {
          // update the cases in the cache
          items.forEach(item => {
            const cached = self.itemCache.get(item.__id__)
            if (!cached) {
              self.itemCache.set(item.__id__, { ...item })
            }
            else {
              Object.assign(cached, item)
            }
          })
        }
        else {
          items.forEach((caseValues) => {
            setItemValues(caseValues)
          })
        }

        // only changes to parent collection attributes invalidate grouping
        items.length && self.invalidateCases()
      },

      removeCases(caseIDs: string[]) {
        // Remove the items last -> first, so we only have to update itemInfo once
        const items = caseIDs.map(id => ({ id, index: self.getItemIndex(id) }))
          .filter(info => info.index != null) as { id: string, index: number }[]
        items.sort((a, b) => b.index - a.index)
        const firstIndex = items[items.length - 1]?.index ?? -1
        items.forEach(({ id: caseID, index }) => {
          self._itemIds.splice(index, 1)
          self.attributes.forEach((attr) => {
            attr.removeValues(index)
          })
          self.selection.delete(caseID)
          self.itemInfoMap.delete(caseID)
        })
        if (firstIndex >= 0) {
          for (let i = firstIndex; i < self._itemIds.length; ++i) {
            const itemId = self._itemIds[i]
            const itemInfo = self.itemInfoMap.get(itemId)
            if (itemInfo) itemInfo.index = i
          }
        }
      },

      moveItems(itemIds: string[], options?: IMoveItemsOptions) {
        const indices = itemIds.map(itemId => self.getItemIndex(itemId)).filter(index => index != null)
          .sort((a: number, b: number) => b - a) // Reverse order
        const items = indices.map(index => {
          const item = { index, item: self.items[index], values: [] as { strValue: string, numValue: number }[] }
          self.attributes.forEach(attr => item.values.push({
            strValue: attr.strValues[index],
            numValue: attr.numValues[index]
          }))
          return item
        }).reverse() // Normal order

        // Remove from ordered arrays
        indices.forEach(index => {
          self._itemIds.splice(index, 1)
          self.attributes.forEach(attr => attr.removeValues(index))
        })

        // Determine position to re-insert items
        const beforeIndex = options?.before ? self._itemIds.indexOf(options.before) : undefined
        const afterIndex = options?.after ? self._itemIds.indexOf(options.after) + 1 : undefined
        const insertIndex = afterIndex ?? beforeIndex ?? self._itemIds.length

        // Add back to ordered arrays
        self._itemIds.splice(insertIndex, 0, ...items.map(({ item }) => item.__id__))
        self.attributes.forEach((attr, index) => {
          attr.strValues.splice(insertIndex, 0, ...items.map(({ values }) => values[index].strValue))
          attr.numValues.splice(insertIndex, 0, ...items.map(({ values }) => values[index].numValue))
        })

        // Fix indices
        for (let i = 0; i < self._itemIds.length; ++i) {
          const itemId = self._itemIds[i]
          const itemInfo = self.itemInfoMap.get(itemId)
          if (itemInfo) itemInfo.index = i
        }
      },

      selectAll(select = true) {
        if (select) {
          self.items.forEach(({__id__}) => self.selection.add(__id__))
        }
        else {
          self.selection.clear()
        }
        ++self.selectionChanges
      },

      selectCases(caseIds: string[], select = true) {
        const ids: string[] = []
        caseIds.forEach(id => {
          const caseInfo = self.caseInfoMap.get(id)
          if (caseInfo) {
            ids.push(...caseInfo.childItemIds)
          } else {
            ids.push(id)
          }
        })
        ids.forEach(id => {
          if (select) {
            self.selection.add(id)
          }
          else {
            self.selection.delete(id)
          }
        })
        ++self.selectionChanges
      },

      setSelectedCases(caseIds: string[]) {
        const ids: string[] = []
        caseIds.forEach(id => {
          const caseInfo = self.caseInfoMap.get(id)
          if (caseInfo) {
            ids.push(...caseInfo.childItemIds)
          } else {
            ids.push(id)
          }
        })
        self.selection.replace(ids)
        ++self.selectionChanges
      }
    }
  }
})
.views(self => ({
  getParentValues(parentId: string) {
    const parentCase = self.caseInfoMap.get(parentId)
    const parentCollection = self.getCollection(parentCase?.collectionId)
    const values: Record<string, string> = {}
    parentCollection?.allAttributes.forEach(attr => {
      const attrValue = self.getStrValue(parentId, attr.id)
      if (attrValue) {
        values[attr.id] = attrValue
      }
    })
    return values
  }
}))
.actions(self => ({
  afterCreate() {
    const context: IEnvContext | Record<string, never> = hasEnv(self) ? getEnv(self) : {},
          { srcDataSet } = context

    self.itemData = {
      itemIds: () => self._itemIds,
      isHidden: (itemId) => self.isCaseOrItemHidden(itemId),
      getValue: (itemId, attrId) => self.getStrValue(itemId, attrId) ?? "",
      addItemInfo: (itemId, caseId) => self.addItemInfo(itemId, caseId),
      invalidate: () => self.invalidateCases()
    }

    self.syncCollectionLinks()

    // build itemIDMap
    self._itemIds.forEach((itemId, index) => {
      self.itemInfoMap.set(itemId, { index, caseIds: [], isHidden: self.isCaseOrItemHidden(itemId) })
    })

    // make sure attributes have appropriate length, including attributes with formulas
    self.attributesMap.forEach(attr => {
      attr.setLength(self._itemIds.length)
    })

    // add initial collection if not already present
    if (!self.collections.length) {
      self.addCollection({ name: t("DG.AppController.createDataSet.collectionName") })
    }

    // initialize selection
    self.selection.replace(self.snapSelection)

    // initialize setAsideItemIdsSet
    self.setAsideItemIdsSet.replace(self.setAsideItemIds)

    if (!srcDataSet) {
      // set up middleware to add ids to inserted attributes and cases
      // adding the ids in middleware makes them available as action arguments
      // to derived DataSets.
      addDisposer(self, addMiddleware(self, (call, next) => {
        if (call.context === self && call.name === "addAttribute") {
          const { id = v3Id(kAttrIdPrefix), ...others } = call.args[0] as IAttributeSnapshot
          call.args[0] = { id, ...others }
        }
        else if (call.context === self && call.name === "addCases") {
          call.args[0] = (call.args[0] as ICaseCreation[]).map(iCase => {
            const { __id__ = v3Id(kItemIdPrefix), ...others } = iCase
            return { __id__, ...others }
          })
        }
        next(call)
      }))

      // when collections change...
      addDisposer(self, reaction(
        () => self.collectionIds,
        () => self.syncCollectionLinks(),
        { name: "DataSet.collections", equals: comparer.structural, fireImmediately: true }
      ))

      // when items are added/removed...
      // use MST's onPatch mechanism to respond to removals of items or undoing their creation.
      addDisposer(self, onPatch(self, ({ op, path, value }) => {
        if (/_itemIds(\/\d+)?$/.test(path)) {
          // we don't need a full invalidation if we're appending items
          if (op !== "add" || !self.isAppendingItems) {
            self.invalidateCases()
          }
        }
      }))

      // when items are hidden/shown...
      // Use MST's onPatch mechanism to respond to changes to the `setAsideItemIds`.
      // This will be called once for each item added/removed and will update related properties.
      addDisposer(self, onPatch(self, ({ op, path, value }) => {
        let match: RegExpExecArray | null = null
        if ((op === "add" || op === "remove") && (match = /setAsideItemIds\/(\d+)$/.exec(path))) {
          const index = +match[1]
          if (op === "add") {
            const itemId = value
            self.setAsideItemIdsMirror.splice(index, 0, itemId)
            self.setAsideItemIdsSet.add(itemId)
          }
          else {
            const itemId = self.setAsideItemIdsMirror[index]
            self.setAsideItemIdsMirror.splice(index, 1)
            self.setAsideItemIdsSet.delete(itemId)
          }
          self.invalidateCases()
        }
        if ((op === "replace") && /setAsideItemIds$/.test(path)) {
          const replacementArray: string[] = value
          self.setAsideItemIdsMirror = [...replacementArray]
          self.setAsideItemIdsSet.replace(observable.set<string>(replacementArray))
          self.invalidateCases()
        }
      }))
    }
  },
  commitCache() {
    self.setCaseValues(Array.from(self.itemCache.values()))
  },
  endCaching(commitCache = false) {
    if (self._endCaching() === 0) {
      commitCache && this.commitCache()
      self.clearCache()
    }
  },
  removeCollectionWithAttributes(collection: ICollectionModel) {
    collection.attributes.forEach(attribute => {
      if (attribute) {
        collection.removeAttribute(attribute.id)
        self.removeAttribute(attribute.id)
      }
    })
    self.removeCollection(collection)
  },
  sortByAttribute(attributeId: string, direction: "ascending" | "descending" = "ascending") {
    self.validateCases()

    const compareFn = (aItemId: string, bItemId: string) => {
      const aValue = self.getValue(aItemId, attributeId)
      const bValue = self.getValue(bItemId, attributeId)
      const compareResult = compareValues(aValue, bValue, gLocale.compareStrings)
      return direction === "descending" ? -compareResult : compareResult
    }

    const finalItemIds = Array.from(self._itemIds)
    const itemIdToIndexMap: Record<string, { beforeIndex: number, afterIndex: number }> = {}
    self._itemIds.forEach((itemId, beforeIndex) => itemIdToIndexMap[itemId] = { beforeIndex, afterIndex: -1 })

    const collection = self.getCollectionForAttribute(attributeId)
    const parentCollection = collection?.parent

    // if there's a parent collection, items are sorted within their parent cases
    if (parentCollection) {
      parentCollection.caseGroups.forEach(group => {
        // combine all the child item ids for this parent case
        const origGroupItemIds = [...group.childItemIds, ...group.hiddenChildItemIds]
        // sort them into their original order
        origGroupItemIds.sort((aItemId, bItemId) => {
          return itemIdToIndexMap[aItemId].beforeIndex - itemIdToIndexMap[bItemId].beforeIndex
        })
        // sort them into their sorted order
        const sortedGroupItemIds = origGroupItemIds.slice()
        sortedGroupItemIds.sort(compareFn)
        // map indices from original to sorted
        sortedGroupItemIds.forEach((itemId, index) => {
          const origItemIdAtIndex = origGroupItemIds[index]
          itemIdToIndexMap[itemId].afterIndex = itemIdToIndexMap[origItemIdAtIndex].beforeIndex
        })
        // sort the items into their appropriate sorted locations
        finalItemIds.sort((aItemId, bItemId) => {
          return itemIdToIndexMap[aItemId].afterIndex - itemIdToIndexMap[bItemId].afterIndex
        })
      })
    }

    // if no parent collection, items can be sorted globally
    else {
      finalItemIds.sort(compareFn)
      finalItemIds.forEach((itemId, index) => itemIdToIndexMap[itemId].afterIndex = index)
    }

    // if no changes then nothing to do
    if (finalItemIds.every((itemId, index) => itemId === self._itemIds[index])) return

    // apply the index mapping to each attribute's value arrays
    const origIndices = finalItemIds.map(itemId => itemIdToIndexMap[itemId].beforeIndex)
    self.attributes.forEach(attr => attr.orderValues(origIndices))

    // update the _itemIds array
    self._itemIds.replace(finalItemIds)

    return itemIdToIndexMap
  }
}))
// performs the specified action so that response actions are included and undo/redo strings assigned
.actions(applyModelChange)

export interface IDataSet extends Instance<typeof DataSet> {}
export interface IDataSetSnapshot extends SnapshotIn<typeof DataSet> {}

export interface IDataSetWithFilterFormula extends IDataSet {
  filterFormula: IFormula
}

export function isFilterFormulaDataSet(dataSet?: IDataSet): dataSet is IDataSetWithFilterFormula {
  return !!dataSet?.hasFilterFormula
}
