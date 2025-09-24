import { comparer, observable, reaction, runInAction } from "mobx"
import { addDisposer, getType, IAnyStateTreeNode, Instance, SnapshotIn, types } from "mobx-state-tree"
import { kCaseIdPrefix, kCollectionIdPrefix, typeV3Id, v3Id } from "../../utilities/codap-utils"
import { hashStringSet, hashOrderedStringSet, safeJsonParse } from "../../utilities/js-utils"
import { Attribute, IAttribute } from "./attribute"
import {
  CaseInfo, IGroupedCase, IMoveAttributeOptions, symIndex, symParent
} from "./data-set-types"
import { V2Model } from "./v2-model"

// interface to data provided by DataSet
export interface IItemData {
  itemIds: () => string[]
  isHidden: (itemId: string) => boolean
  getValue: (itemId: string, attrId: string) => string
  addItemInfo: (itemId: string, caseId: string) => void
  invalidate: () => void
}

// used for initialization and tests
export const defaultItemData: IItemData = {
  itemIds: () => [],
  isHidden: () => false,
  getValue: () => "",
  addItemInfo: () => null,
  invalidate: () => null
}

const kGroupKeySeparator = "\t"

export function makeGroupKey(values: string[]) {
  return `[${values.join(kGroupKeySeparator)}]`
}

export const CollectionModel = V2Model
.named("Collection")
.props({
  id: typeV3Id(kCollectionIdPrefix),
  // attributes in left-to-right order
  attributes: types.array(types.safeReference(Attribute)),
  // array of [group key (stringified attribute values), case id] tuples
  // serialized so that case ids are persistent
  _groupKeyCaseIds: types.maybe(types.frozen<Array<[string, string]>>())
})
.volatile(self => ({
  parent: undefined as ICollectionModel | undefined,
  child: undefined as ICollectionModel | undefined,
  // map from group key (stringified attribute values) => case id
  groupKeyCaseIds: new Map<string, string>(),
  itemData: defaultItemData,
  // case ids in case table/render order
  caseIds: [] as string[],
  // map from case id to case index
  caseIdToIndexMap: new Map<string, number>(),
  // map from case id to group key (stringified attribute values)
  caseIdToGroupKeyMap: new Map<string, string>(),
  // map from group key (stringified attribute values) to CaseInfo
  caseGroupMap: new Map<string, CaseInfo>(),
  // previous case ids in case table/render order
  prevCaseIds: undefined as Maybe<string[]>,
  // previous map from case id to group key (stringified attribute values)
  prevCaseIdToGroupKeyMap: undefined as Maybe<Map<string, string>>,
  // previous map from group key (stringified attribute values) to CaseInfo
  prevCaseGroupMap: undefined as Maybe<Map<string, CaseInfo>>
}))
.preProcessSnapshot(snap => {
  if (snap._groupKeyCaseIds) {
    // Prior to PR #2006, group keys were JSON.stringified attribute values.
    const { _groupKeyCaseIds: legacyGroupKeyCaseIds, ...others } = snap
    const _groupKeyCaseIds = legacyGroupKeyCaseIds.map(([snapGroupKey, caseId]) => {
      if (snapGroupKey.includes(kGroupKeySeparator)) return [snapGroupKey, caseId]
      // convert legacy group key to new format
      const groupKeyValues = safeJsonParse<string[]>(snapGroupKey)
      const groupKey = groupKeyValues ? makeGroupKey(groupKeyValues) : snapGroupKey
      return [groupKey, caseId]
    }).filter(([groupKey, caseId]) => !!groupKey && !!caseId) as Array<[string, string]>
    return { _groupKeyCaseIds, ...others }
  }
  return snap
})
.actions(self => ({
  setParent(parent?: ICollectionModel) {
    self.parent = parent
  },
  setChild(child?: ICollectionModel) {
    self.child = child
  },
  setItemData(itemData: IItemData) {
    self.itemData = itemData
  }
}))
.views(self => ({
  getAttribute(attrId: string) {
    return self.attributes.find(attribute => attribute?.id === attrId)
  },
  getAttributeIndex(attrId: string) {
    return self.attributes.findIndex(attribute => attribute?.id === attrId)
  },
  getAttributeByName(name: string) {
    return self.attributes.find(attribute => attribute?.name === name)
  },
  get attributesArray(): IAttribute[] {
    return Array.from(self.attributes).filter(attr => !!attr) as IAttribute[]
  },
  // non-formula attributes
  get dataAttributesArray(): IAttribute[] {
    return Array.from(self.attributes).filter(attr => attr && !attr.hasFormula) as IAttribute[]
  },
  // sorted non-formula attributes
  get sortedDataAttributes(): IAttribute[] {
    return this.dataAttributesArray.sort((a, b) => a.id.localeCompare(b.id))
  },
  // attributes of all parent collections
  get allParentAttrs(): IAttribute[] {
    const attrs: IAttribute[] = []

    function addParentAttrs(collection: ICollectionModel) {
      if (collection.parent) {
        addParentAttrs(collection.parent)
      }
      collection.attributes.forEach(attr => {
        attr && attrs.push(attr)
      })
    }
    if (self.parent) {
      addParentAttrs(self.parent)
    }

    return attrs
  },
  // non-formula attributes of all parent collections
  get allParentDataAttrs() {
    return this.allParentAttrs.filter(attr => !attr.hasFormula)
  },
  get isTopLevel(): boolean {
    return !self.parent
  }
}))
.views(self => ({
  get allAttributes() {
    return [...self.allParentAttrs, ...self.attributesArray]
  },
  // all non-formula
  get allDataAttributes() {
    // sort the attributes by id so that original attribute order doesn't affect the result
    return [...self.allParentDataAttrs, ...self.dataAttributesArray].sort((a, b) => a.id.localeCompare(b.id))
  },
  // sorted non-formula attributes of parent collections
  get sortedParentDataAttrs() {
    return self.allParentDataAttrs.sort((a, b) => a.id.localeCompare(b.id))
  }
}))
.views(self => ({
  groupKey(itemId: string) {
    // only parent collections group cases; child collections "group" by itemId
    if (!self.child) return itemId
    return makeGroupKey(self.allDataAttributes.map(attr => self.itemData.getValue(itemId, attr.id)))
  },
  parentGroupKey(itemId: string) {
    if (!self.parent) return
    return makeGroupKey(self.sortedParentDataAttrs.map(attr => self.itemData.getValue(itemId, attr.id)))
  },
  groupKeyCaseId(groupKey?: string) {
    if (!groupKey) return undefined
    let caseId = self.groupKeyCaseIds.get(groupKey)
    if (!caseId) {
      caseId = v3Id(kCaseIdPrefix)
      self.groupKeyCaseIds.set(groupKey, caseId)
    }
    return caseId
  }
}))
.views(self => ({
  getChildItemsToken(caseId: string) {
    const groupKey = self.caseIdToGroupKeyMap.get(caseId)
    const caseGroup = groupKey ? self.caseGroupMap.get(groupKey) : undefined
    const childItemIds = caseGroup?.childItemIds.length ? caseGroup.childItemIds : undefined
    return childItemIds?.sort().join()
  },
  getPrevChildItemsToken(caseId: string) {
    const groupKey = self.prevCaseIdToGroupKeyMap?.get(caseId)
    const caseGroup = groupKey ? self.prevCaseGroupMap?.get(groupKey) : undefined
    const childItemIds = caseGroup?.childItemIds.length ? caseGroup.childItemIds : undefined
    return childItemIds?.sort().join()
  }
}))
.actions(self => ({
  clearCases() {
    if (!self.prevCaseIds) self.prevCaseIds = self.caseIds
    self.caseIds = []

    self.caseIdToIndexMap.clear()

    if (!self.prevCaseIdToGroupKeyMap) self.prevCaseIdToGroupKeyMap = self.caseIdToGroupKeyMap
    self.caseIdToGroupKeyMap = new Map<string, string>()

    if (!self.prevCaseGroupMap) self.prevCaseGroupMap = self.caseGroupMap
    self.caseGroupMap = new Map<string, CaseInfo>()
  },
  clearPrevCases() {
    self.prevCaseIds = undefined
    self.prevCaseIdToGroupKeyMap = undefined
    self.prevCaseGroupMap = undefined
  }
}))
.views(self => ({
  // returns a map from newly assigned case id to previously used case id
  getRemappedCaseIds(newCaseIds: string[]) {
    // See if any case ids should be remapped. This occurs when the grouping values of a parent
    // case change in unison, in which case we preserve the original case id rather than assigning
    // a new one. Because the grouping values are used to generate the groupKey, and groupKeys are
    // mapped to case ids, normally changing grouping values results in generation of a new id.
    // To detect this, we identify case ids that were in use the last time we grouped cases as
    // well as newly generated case ids corresponding to new groupKeys. If there are any recently
    // unused case ids that correspond to the same set of items as any of the newly generated case
    // ids, then we replace the new case id with the original case id in our internal structures.
    // We have to do this in a second pass because we don't know the full set of child item ids
    // associated with a particular case id or groupKey until the completion of the first pass.
    // This assumes that from one grouping pass to the next, either items were added/removed
    // (in which case sets of child item ids may have changed but case ids should be persistent)
    // OR item values were changed (in which case case ids may have changed but sets of child item
    // ids will not have changed). If both sets of changes occur in one pass then the remapping
    // algorithm won't recognize the new cases as appropriate to inherit the previous case ids.
    const remappedCaseIds = new Map<string, string>() // new case id => original case id
    if (self.prevCaseIds) {
      // identify recently released case ids no longer in use
      const unusedCaseIds = self.prevCaseIds.filter(caseId => !self.caseIdToGroupKeyMap.get(caseId))
      if (unusedCaseIds.length && newCaseIds.length) {
        // determine the set of child item ids corresponding to each unused case id
        const unusedChildItemTokens = new Map<string, string>()
        unusedCaseIds.forEach(caseId => {
          const childItemToken = self.getPrevChildItemsToken(caseId)
          if (childItemToken) {
            unusedChildItemTokens.set(childItemToken, caseId)
          }
        })
        // see if any newly assigned case ids correspond to sets of items previously
        // associated with one of the recently released case ids no longer in use
        newCaseIds.forEach(newCaseId => {
          const childItemToken = self.getChildItemsToken(newCaseId)
          const unusedCaseIdForToken = childItemToken && unusedChildItemTokens.get(childItemToken)
          if (unusedCaseIdForToken) {
            // found an unused case id corresponding to the same child items as a new case id
            remappedCaseIds.set(newCaseId, unusedCaseIdForToken)
          }
        })
      }
    }
    return remappedCaseIds
  }
}))
.views(self => ({
  updateCaseGroups(itemIds?: string[], isAppending?: boolean) {
    // For now, we treat appending items as a special case for which we don't need to start
    // from scratch. Eventually, we may be able to handle inserting items efficiently as well.
    const isAppendingItems = !!itemIds && !!isAppending
    if (!itemIds) {
      self.clearCases()
      itemIds = self.itemData.itemIds()
    }

    const newCaseIds: string[] = []
    // key is child caseId
    const parentChildIdMap = new Map<string, { parentCaseId: string, isHidden: boolean }>()
    const itemInfo: Array<{itemId: string, caseId: string}> = []
    itemIds.forEach(itemId => {
      const isItemHidden = self.itemData.isHidden(itemId)
      const groupKey = self.groupKey(itemId)
      const hadCaseIdForGroupKey = !!self.groupKeyCaseIds.get(groupKey)
      const caseId = self.groupKeyCaseId(groupKey)
      if (caseId && !hadCaseIdForGroupKey) newCaseIds.push(caseId)
      if (groupKey && caseId) {
        let caseGroup = self.caseGroupMap.get(groupKey)
        if (!caseGroup) {
          // cases with only hidden items aren't in caseIds and don't get indices
          const newCaseIndex = isItemHidden ? -1 : self.caseIds.length
          !isItemHidden && self.caseIds.push(caseId)
          self.caseIdToIndexMap.set(caseId, newCaseIndex)
          self.caseIdToGroupKeyMap.set(caseId, groupKey)

          const parentGroupKey = self.parentGroupKey(itemId)
          const parentCaseId = self.parent?.groupKeyCaseId(parentGroupKey)
          const parent = parentCaseId ? { [symParent]: parentCaseId } : {}
          // stash parent/child pairs so they can be remapped if necessary
          parentCaseId && parentChildIdMap.set(caseId, { parentCaseId, isHidden: isItemHidden })

          caseGroup = {
            collectionId: self.id,
            groupedCase: {
              __id__: caseId,
              ...parent,
              [symIndex]: newCaseIndex
            },
            childItemIds: isItemHidden ? [] : [itemId],
            hiddenChildItemIds: isItemHidden ? [itemId] : [],
            groupKey,
            // case is hidden if all of its items are hidden
            isHidden: isItemHidden
          }
          self.caseGroupMap.set(groupKey, caseGroup)
        }
        // case group already exists
        else {
          // If case is hidden, then this is its first visible item. Need to make the case visible.
          if (!isItemHidden && caseGroup.isHidden) {
            const newCaseIndex = self.caseIds.length
            const parentChildInfo = parentChildIdMap.get(caseId)
            self.caseIds.push(caseId)
            self.caseIdToIndexMap.set(caseId, newCaseIndex)
            parentChildInfo && (parentChildInfo.isHidden = false)
            caseGroup.groupedCase[symIndex] = newCaseIndex
            caseGroup.isHidden = false
          }
          if (isItemHidden) {
            caseGroup.hiddenChildItemIds.push(itemId)
          }
          else {
            caseGroup.childItemIds.push(itemId)
          }
        }

        // item info is stored for all items
        itemInfo.push({ itemId, caseId })
      }
    })

    // Identify any new case ids that should be replaced with a prior case id
    const remappedCaseIds = self.getRemappedCaseIds(newCaseIds)

    // add item info, remapping case ids where appropriate
    itemInfo.forEach(({ itemId, caseId }) => {
      const _caseId = remappedCaseIds.get(caseId) ?? caseId
      self.itemData.addItemInfo(itemId, _caseId)
    })

    // add child case ids to parent cases, remapping child case ids where appropriate
    parentChildIdMap.forEach(({ parentCaseId, isHidden }, _childCaseId) => {
      if (!isHidden) {
        const childCaseId = remappedCaseIds.get(_childCaseId) ?? _childCaseId
        self.parent?.addChildCase(parentCaseId, childCaseId)
      }
    })

    // remap case ids in our internal structures
    if (remappedCaseIds.size) {
      self.caseIds.forEach((caseId, i) => {
        const remappedCaseId = remappedCaseIds.get(caseId)
        if (remappedCaseId) {
          self.caseIds[i] = remappedCaseId
        }
      })
    }
    Array.from(remappedCaseIds.entries()).forEach(([newCaseId, origCaseId]) => {
      // update index map
      const caseIndex = self.caseIdToIndexMap.get(newCaseId)
      if (caseIndex != null) {
        self.caseIdToIndexMap.delete(newCaseId)
        self.caseIdToIndexMap.set(origCaseId, caseIndex)
      }
      // update group key-case id relationships
      const groupKey = self.caseIdToGroupKeyMap.get(newCaseId)
      if (groupKey != null) {
        // update group key to case id map
        const origGroupKey = self.prevCaseIdToGroupKeyMap?.get(origCaseId)
        origGroupKey && self.groupKeyCaseIds.delete(origGroupKey)
        self.groupKeyCaseIds.set(groupKey, origCaseId)

        // update case id to group key map
        self.caseIdToGroupKeyMap.delete(newCaseId)
        self.caseIdToGroupKeyMap.set(origCaseId, groupKey)

        // update case group map entry
        const caseGroup = self.caseGroupMap.get(groupKey)
        if (caseGroup) {
          caseGroup.groupedCase.__id__ = origCaseId
        }
      }
    })
    if (!isAppendingItems) {
      self.clearPrevCases()
    }

    return { isAppendingItems, newCaseIds }
  }
}))
.views(self => ({
  hasCase(caseId: string) {
    return self.caseIdToIndexMap.has(caseId)
  },
  getCaseIndex(caseId: string) {
    return self.caseIdToIndexMap.get(caseId)
  },
  getCaseGroup(caseId: string) {
    const groupKey = self.caseIdToGroupKeyMap.get(caseId)
    return groupKey ? self.caseGroupMap.get(groupKey) : undefined
  },
  addChildCase(parentCaseId: string, childCaseId: string) {
    const groupKey = self.caseIdToGroupKeyMap.get(parentCaseId)
    const caseGroup = groupKey && self.caseGroupMap.get(groupKey)
    if (caseGroup) {
      if (!caseGroup.childCaseIds) {
        caseGroup.childCaseIds = [childCaseId]
      }
      else {
        caseGroup.childCaseIds.push(childCaseId)
      }
    }
    else {
      console.warn("CollectionModel.addChildCase -- missing parent case:", parentCaseId)
    }
  },
}))
.extend(self => {
  const _caseGroups = observable.box<CaseInfo[]>([], { deep: false })
  const _cases = observable.box<IGroupedCase[]>([], { deep: false })
  const _caseIdsHash = observable.box<number>(0)
  const _caseIdsOrderedHash = observable.box<number>(0)
  return {
    views: {
      get caseGroups() {
        return _caseGroups.get()
      },
      get cases() {
        return _cases.get()
      },
      get caseIdsHash() {
        return _caseIdsHash.get()
      },
      get caseIdsOrderedHash() {
        return _caseIdsOrderedHash.get()
      },
      completeCaseGroups(parentCases: Maybe<CaseInfo[]>, newCaseIds?: string[]) {
        if (parentCases) {
          self.caseIds.splice(0, self.caseIds.length)
          // sort cases by parent cases
          parentCases.forEach(parentCase => {
            const childCaseIds = parentCase.childCaseIds ?? []
            // update indices
            childCaseIds.forEach((childCaseId, index) => {
              const caseGroup = self.getCaseGroup(childCaseId)
              caseGroup && (caseGroup.groupedCase[symIndex] = index)
            })
            // append case ids in grouped order
            self.caseIds.push(...childCaseIds)
          })
          // rebuild the case id to index map, since the order of child cases may have changed
          self.caseIdToIndexMap.clear()
          self.caseIds.forEach((caseId, index) => {
            self.caseIdToIndexMap.set(caseId, index)
          })
        }

        let caseGroups = _caseGroups.get()
        let cases = _cases.get()

        // append new cases to existing arrays
        if (!parentCases && newCaseIds) {
          const newCaseGroups = newCaseIds.map(caseId => self.getCaseGroup(caseId))
          caseGroups.push(...newCaseGroups.filter(group => !!group))

          const newCases = newCaseIds.map(caseId => self.getCaseGroup(caseId)?.groupedCase)
          cases.push(...newCases.filter(aCase => !!aCase))
        }
        // rebuild arrays from scratch
        else {
          caseGroups = self.caseIds
                        .map(caseId => self.getCaseGroup(caseId))
                        .filter(group => !!group)

          cases = self.caseIds
                    .map(caseId => self.getCaseGroup(caseId)?.groupedCase)
                    .filter(groupedCase => !!groupedCase)
        }

        runInAction(() => {
          _caseGroups.set(caseGroups)
          _cases.set(cases)
          _caseIdsHash.set(hashStringSet(self.caseIds))
          _caseIdsOrderedHash.set(hashOrderedStringSet(self.caseIds))
        })
      }
    }
  }
})
.actions(self => ({
  initializeVolatileState() {
    if (self._groupKeyCaseIds) {
      self.groupKeyCaseIds = new Map<string, string>(self._groupKeyCaseIds)
    }

    // TODO: do we need to do anything else here? There are many other volatile properties
  }
}))
.actions(self => ({
  afterCreate() {
    self.initializeVolatileState()

    // changes to a parent collection's attributes invalidate grouping
    addDisposer(self, reaction(
      () => self.sortedDataAttributes.map(attr => attr.id),
      () => {
        if (self.child) {
          // There's a tradeoff here. By preserving the group key => case id mappings across
          // hierarchy changes, we allow case ids to be persistent across such hierarchy changes.
          // For instance, removing an attribute from a collection (which causes re-grouping) and
          // then adding it back will result in the same case ids as before. The cost of this,
          // however, is that collections maintain a history of all of the group key => case id
          // mappings that have ever come before, and this gets serialized as well. Conversely,
          // we can reduce the memory used by the collection and the size of the serialized
          // document by clearing the map on hierarchy changes and accepting that new case ids
          // will be generated at these times. At this writing, it seems unlikely that large
          // documents with large numbers of cases that go through lots of different parent
          // case groupings will be particularly common, but we can revisit if necessary.
          // self.groupKeyCaseIds.clear()
          self.itemData.invalidate()
        }
      }, { name: "CollectionModel.sortedDataAttributes reaction", equals: comparer.structural }
    ))
  },
  prepareSnapshot() {
    self._groupKeyCaseIds = Array.from(self.groupKeyCaseIds.entries())
  },
  completeSnapshot() {
  },
  afterApplySnapshot() {
    self.initializeVolatileState()
  },
  addAttribute(attr: IAttribute, options?: IMoveAttributeOptions) {
    const beforeIndex = options?.before ? self.getAttributeIndex(options.before) : -1
    const afterIndex = options?.after ? self.getAttributeIndex(options.after) : -1
    if (beforeIndex >= 0) {
      self.attributes.splice(beforeIndex, 0, attr)
    }
    else if (afterIndex >= 0) {
      self.attributes.splice(afterIndex + 1, 0, attr)
    }
    else {
      self.attributes.push(attr)
    }
  },
  removeAttribute(attrId: string) {
    const attr = self.getAttribute(attrId)
    attr && self.attributes.remove(attr)
  }
}))
.actions(self => ({
  moveAttribute(attrId: string, options?: IMoveAttributeOptions) {
    const attr = self.getAttribute(attrId)
    // is the attribute being moved before/after itself?
    const isMoving = attrId !== options?.after && attrId !== options?.before
    if (attr && isMoving) {
      self.removeAttribute(attr.id)
      self.addAttribute(attr, options)
    }
  }
}))
export interface ICollectionModel extends Instance<typeof CollectionModel> {}
export interface ICollectionModelSnapshot extends SnapshotIn<typeof CollectionModel> {}

export function isCollectionModel(model?: IAnyStateTreeNode): model is ICollectionModel {
  return !!model && getType(model) === CollectionModel
}

export function syncCollectionLinks(collections: ICollectionModel[], itemData: IItemData) {
  collections.forEach((collection, index) => {
    if (index === 0) {
      collection.setParent()
    }
    if (index > 0) {
      collection.setParent(collections[index - 1])
    }
    if (index < collections.length - 1) {
      collection.setChild(collections[index + 1])
    }
    if (index === collections.length - 1) {
      collection.setChild()
    }
    collection.setItemData(itemData)
  })
}
