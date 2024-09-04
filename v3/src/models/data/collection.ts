import { comparer, observable, reaction, runInAction } from "mobx"
import { addDisposer, getType, IAnyStateTreeNode, Instance, SnapshotIn, types } from "mobx-state-tree"
import { kCaseIdPrefix, kCollectionIdPrefix, typeV3Id, v3Id } from "../../utilities/codap-utils"
import { Attribute, IAttribute } from "./attribute"
import {
  CaseInfo, IGroupedCase, IMoveAttributeOptions, symIndex, symParent
} from "./data-set-types"
import { V2Model } from "./v2-model"

export const CollectionLabels = types.model("CollectionLabels", {
  singleCase: "",
  pluralCase: "",
  singleCaseWithArticle: "",
  setOfCases: "",
  setOfCasesWithArticle: ""
})
export interface ICollectionLabels extends Instance<typeof CollectionLabels> {}

// interface to data provided by DataSet
export interface IItemData {
  itemIds: () => string[]
  isHidden: (itemId: string) => boolean
  getValue: (itemId: string, attrId: string) => string
  addItemInfo: (itemId: string, index: number, caseId: string) => void
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

export const CollectionModel = V2Model
.named("Collection")
.props({
  id: typeV3Id(kCollectionIdPrefix),
  labels: types.maybe(CollectionLabels),
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
  // map from group key (stringified attribute values) to CaseGroup
  caseGroupMap: new Map<string, CaseInfo>(),
  // case ids in case table/render order
  prevCaseIds: undefined as Maybe<string[]>,
  // map from case id to case index
  prevCaseIdToIndexMap: undefined as Maybe<Map<string, number>>,
  // map from case id to group key (stringified attribute values)
  prevCaseIdToGroupKeyMap: undefined as Maybe<Map<string, string>>,
  // map from group key (stringified attribute values) to CaseGroup
  prevCaseGroupMap: undefined as Maybe<Map<string, CaseInfo>>
}))
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
    const allValues = self.allDataAttributes.map(attr => self.itemData.getValue(itemId, attr.id))
    return JSON.stringify(allValues)
  },
  parentGroupKey(itemId: string) {
    if (!self.parent) return
    const allValues = self.sortedParentDataAttrs.map(attr => self.itemData.getValue(itemId, attr.id))
    return JSON.stringify(allValues)
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

    if (!self.prevCaseIdToIndexMap) self.prevCaseIdToIndexMap = self.caseIdToIndexMap
    self.caseIdToIndexMap = new Map<string, number>()

    if (!self.prevCaseIdToGroupKeyMap) self.prevCaseIdToGroupKeyMap = self.caseIdToGroupKeyMap
    self.caseIdToGroupKeyMap = new Map<string, string>()

    if (!self.prevCaseGroupMap) self.prevCaseGroupMap = self.caseGroupMap
    self.caseGroupMap = new Map<string, CaseInfo>()
  },
  clearPrevCases() {
    self.prevCaseIds = undefined
    self.prevCaseIdToIndexMap = undefined
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
  updateCaseGroups() {
    self.clearCases()

    const newCaseIds: string[] = []
    const parentChildIdPairs: Array<[string, string]> = []
    self.itemData.itemIds().forEach((itemId, itemIndex) => {
      if (self.itemData.isHidden(itemId)) return
      const groupKey = self.groupKey(itemId)
      const hadCaseIdForGroupKey = !!self.groupKeyCaseIds.get(groupKey)
      const caseId = self.groupKeyCaseId(groupKey)
      if (caseId && !hadCaseIdForGroupKey) newCaseIds.push(caseId)
      if (groupKey && caseId) {
        let caseGroup = self.caseGroupMap.get(groupKey)
        if (!caseGroup) {
          const newCaseIndex = self.caseIds.length
          self.caseIds.push(caseId)
          self.caseIdToIndexMap.set(caseId, newCaseIndex)
          self.caseIdToGroupKeyMap.set(caseId, groupKey)

          const parentGroupKey = self.parentGroupKey(itemId)
          const parentCaseId = self.parent?.groupKeyCaseId(parentGroupKey)
          const parent = parentCaseId ? { [symParent]: parentCaseId } : {}
          // stash parent/child pairs so they can be remapped if necessary
          parentGroupKey && parentCaseId && parentChildIdPairs.push([parentCaseId, caseId])

          caseGroup = {
            collectionId: self.id,
            groupedCase: {
              __id__: caseId,
              ...parent,
              [symIndex]: newCaseIndex
            },
            childItemIds: [itemId],
            groupKey
          }
          self.caseGroupMap.set(groupKey, caseGroup)
        }
        else {
          caseGroup.childItemIds.push(itemId)
        }

        self.itemData.addItemInfo(itemId, itemIndex, caseId)
      }
    })

    // Identify any new case ids that should be replaced with a prior case id
    const remappedCaseIds = self.getRemappedCaseIds(newCaseIds)

    // add child case ids to parent cases, remapping child case ids where appropriate
    parentChildIdPairs.forEach(([parentCaseId, _childCaseId]) => {
      const childCaseId = remappedCaseIds.get(_childCaseId) ?? _childCaseId
      self.parent?.addChildCase(parentCaseId, childCaseId)
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
    self.clearPrevCases()
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
  const _caseGroups = observable.box<CaseInfo[]>([])
  const _cases = observable.box<IGroupedCase[]>([])
  return {
    views: {
      get caseGroups() {
        return _caseGroups.get()
      },
      get cases() {
        return _cases.get()
      },
      completeCaseGroups(parentCaseGroups?: CaseInfo[]) {
        if (parentCaseGroups) {
          self.caseIds.splice(0, self.caseIds.length)
          // sort cases by parent cases
          parentCaseGroups.forEach(parentGroup => {
            const childCaseIds = parentGroup.childCaseIds ?? []
            // update indices
            childCaseIds.forEach((childCaseId, index) => {
              const caseGroup = self.getCaseGroup(childCaseId)
              caseGroup && (caseGroup.groupedCase[symIndex] = index)
            })
            // append case ids in grouped order
            self.caseIds.push(...childCaseIds)
          })
        }

        const caseGroups = self.caseIds
                            .map(caseId => self.getCaseGroup(caseId))
                            .filter(group => !!group)
        runInAction(() => _caseGroups.set(caseGroups))

        const cases = self.caseIds
                        .map(caseId => self.getCaseGroup(caseId)?.groupedCase)
                        .filter(groupedCase => !!groupedCase)
        runInAction(() => _cases.set(cases))
      }
    }
  }
})
.views(self => ({
  findParentCaseGroup(childCaseId: string): Maybe<CaseInfo> {
    return self.caseGroups.find(group => group.childCaseIds?.includes(childCaseId))
  }
}))
.actions(self => ({
  setSingleCase(singleCase: string) {
    if (self.labels) {
      self.labels.singleCase = singleCase
    } else {
      self.labels = CollectionLabels.create({ singleCase })
    }
  },
  setPluralCase(pluralCase: string) {
    if (self.labels) {
      self.labels.pluralCase = pluralCase
    } else {
      self.labels = CollectionLabels.create({ pluralCase })
    }
  },
  setSingleCaseWithArticle(singleCaseWithArticle: string) {
    if (self.labels) {
      self.labels.singleCaseWithArticle = singleCaseWithArticle
    } else {
      self.labels = CollectionLabels.create({ singleCaseWithArticle })
    }
  },
  setSetOfCases(setOfCases: string) {
    if (self.labels) {
      self.labels.setOfCases = setOfCases
    } else {
      self.labels = CollectionLabels.create({ setOfCases })
    }
  },
  setSetOfCasesWithArticle(setOfCasesWithArticle: string) {
    if (self.labels) {
      self.labels.setOfCasesWithArticle = setOfCasesWithArticle
    } else {
      self.labels = CollectionLabels.create({ setOfCasesWithArticle })
    }
  }
}))
.actions(self => ({
  setLabels(labels: Partial<ICollectionLabels>) {
    if (labels.singleCase) self.setSingleCase(labels.singleCase)
    if (labels.pluralCase) self.setPluralCase(labels.pluralCase)
    if (labels.singleCaseWithArticle) self.setSingleCaseWithArticle(labels.singleCaseWithArticle)
    if (labels.setOfCases) self.setSetOfCases(labels.setOfCases)
    if (labels.setOfCasesWithArticle) self.setSetOfCasesWithArticle(labels.setOfCasesWithArticle)
  }
}))
.actions(self => ({
  afterCreate() {
    if (self._groupKeyCaseIds) {
      self.groupKeyCaseIds = new Map<string, string>(self._groupKeyCaseIds)
    }

    // changes to a parent collection's attributes invalidate grouping and persistent ids
    addDisposer(self, reaction(
      () => self.sortedDataAttributes.map(attr => attr.id),
      () => {
        if (self.child) {
          self.itemData.invalidate()
        }
      }, { name: "CollectionModel.sortedDataAttributes reaction", equals: comparer.structural }
    ))
  },
  prepareSnapshot() {
    self._groupKeyCaseIds = Array.from(self.groupKeyCaseIds.entries())
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
    if (attr) {
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
