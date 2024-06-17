import { addDisposer, getType, IAnyStateTreeNode, Instance, SnapshotIn, types } from "mobx-state-tree"
import { Attribute, IAttribute } from "./attribute"
import {
  CaseGroup, IGroupedCase, IMoveAttributeOptions, symIndex, symParent
} from "./data-set-types"
import { V2Model } from "./v2-model"
import { kCaseIdPrefix, kCollectionIdPrefix, typeV3Id, v3Id } from "../../utilities/codap-utils"
import { comparer, observable, reaction, runInAction } from "mobx"

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
  getValue: (itemId: string, attrId: string) => string
  invalidate: () => void
}

// used for initialization and tests
export const defaultItemData: IItemData = {
  itemIds: () => [],
  getValue: () => "",
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
  caseGroupMap: new Map<string, CaseGroup>()
}))
.actions(self => ({
  setParent(parent: ICollectionModel) {
    self.parent = parent
  },
  setChild(child: ICollectionModel) {
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
    // groupKey === itemId === caseId for child-most collection
    if (!self.child) return groupKey
    let caseId = self.groupKeyCaseIds.get(groupKey)
    if (!caseId) {
      caseId = v3Id(kCaseIdPrefix)
      self.groupKeyCaseIds.set(groupKey, caseId)
    }
    return caseId
  }
}))
.actions(self => ({
  clearCases() {
    self.caseIds = []
    self.caseIdToIndexMap.clear()
    self.caseIdToGroupKeyMap.clear()
    self.caseGroupMap.clear()
  }
}))
.views(self => ({
  updateCaseGroups() {
    self.clearCases()
    self.itemData.itemIds().forEach(itemId => {
      const groupKey = self.groupKey(itemId)
      const caseId = self.groupKeyCaseId(groupKey)
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
          parentCaseId && self.parent?.addChildCase(parentCaseId, caseId)

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
      }
    })
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
  const _caseGroups = observable.box<CaseGroup[]>([])
  const _cases = observable.box<IGroupedCase[]>([])
  return {
    views: {
      get caseGroups() {
        return _caseGroups.get()
      },
      get cases() {
        return _cases.get()
      },
      completeCaseGroups(parentCaseGroups?: CaseGroup[]) {
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
                            .filter(group => !!group) as CaseGroup[]
        runInAction(() => _caseGroups.set(caseGroups))

        const cases = self.caseIds
                        .map(caseId => self.getCaseGroup(caseId)?.groupedCase)
                        .filter(groupedCase => !!groupedCase) as IGroupedCase[]
        runInAction(() => _cases.set(cases))
      }
    }
  }
})
.views(self => ({
  findParentCaseGroup(childCaseId: string): Maybe<CaseGroup> {
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

    // changes to this collection's attributes invalidate grouping and persistent ids
    addDisposer(self, reaction(
      () => self.sortedDataAttributes.map(attr => attr.id),
      () => {
        self.groupKeyCaseIds.clear()
        if (self.child) self.itemData.invalidate()
      }, { name: "CollectionModel.sortedAttributes reaction", equals: comparer.structural }
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
    if (index > 0) {
      collection.setParent(collections[index - 1])
    }
    if (index < collections.length - 1) {
      collection.setChild(collections[index + 1])
    }
    collection.setItemData(itemData)
  })
}
