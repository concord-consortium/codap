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
  were constructed by combining the contents of the cases in each collection. In contract, v3
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

import { observable, reaction, runInAction } from "mobx"
import {
  addDisposer, addMiddleware, getEnv, getSnapshot, hasEnv, Instance, isAlive, ReferenceIdentifier, SnapshotIn, types
} from "mobx-state-tree"
import pluralize from "pluralize"
import { Attribute, IAttribute, IAttributeSnapshot } from "./attribute"
import { CollectionModel, ICollectionModel, ICollectionModelSnapshot, isCollectionModel } from "./collection"
import {
  CaseGroup, CaseID, IAddAttributeOptions, IAddCasesOptions, IAddCollectionOptions, IAttributeChangeResult, ICase,
  ICaseCreation, IDerivationSpec, IGetCaseOptions, IGetCasesOptions, IGroupedCase, IMoveAttributeCollectionOptions,
  symIndex, symParent
} from "./data-set-types"
/* eslint-disable import/no-cycle */
import { isLegacyDataSetSnap, isOriginalDataSetSnap, isTempDataSetSnap } from "./data-set-conversion"
import { ISetCaseValuesCustomPatch, setCaseValuesCustomUndoRedo } from "./data-set-undo"
/* eslint-enable import/no-cycle */
import { applyModelChange } from "../history/apply-model-change"
import { withCustomUndoRedo } from "../history/with-custom-undo-redo"
import { withoutUndo } from "../history/without-undo"
import { kAttrIdPrefix, kCaseIdPrefix, typeV3Id, v3Id } from "../../utilities/codap-utils"
import { prf } from "../../utilities/profiler"
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
        canonical[id] = aCase[key]
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

// represents the set of grouped cases at a particular level of the hierarchy
export interface CollectionGroup {
  collection: ICollectionModel
  // each group represents a single case at this level along with links to child cases
  groups: CaseGroup[]
  // map from valuesJson to corresponding CaseGroup
  groupsMap: Record<string, CaseGroup>
}

export const DataSet = V2Model.named("DataSet").props({
  id: typeV3Id("DATA"),
  sourceID: types.maybe(types.string),
  // ordered parent-most to child-most
  collections: types.array(CollectionModel),
  attributesMap: types.map(Attribute),
  cases: types.array(CaseID),
  sourceName: types.maybe(types.string),
  description: types.maybe(types.string),
  importDate: types.maybe(types.string),
  // for serialization only, not for dynamic selection tracking
  snapSelection: types.array(types.string)
})
.volatile(self => ({
  // map from attribute name to attribute id
  attrNameMap: observable.map<string, string>({}, { name: "attrNameMap" }),
  // map from case IDs to indices
  caseIDMap: new Map<string, number>(),
  // MobX-observable set of selected case IDs
  selection: observable.set<string>(),
  selectionChanges: 0,
  // map from pseudo-case ID to the CaseGroup it represents
  pseudoCaseMap: new Map<string, CaseGroup>(),
  transactionCount: 0,
  // the id of the interactive frame handling this dataset
  // used by the Collaborative plugin
  managingControllerId: ""
}))
.volatile(() => {
  let cachingCount = 0
  const caseCache = new Map<string, ICase>()
  return {
    get caseCache() {
      return caseCache
    },
    isCaching() {
      // Do not use getter here, as the result would be cached and not updated when cachingCount changes.
      // Note that it also happens for volatile properties, not only views.
      return cachingCount > 0
    },
    clearCache() {
      caseCache.clear()
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
  // convert legacy collections/attributes implementation to current
  if (isLegacyDataSetSnap(snap)) {
    const { collections: _collections = [], attributes: _legacyAttributes, ungrouped, ...others } = snap

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

    return { attributesMap, collections, ...others }
  }
  return snap
})
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
  get parentCollections() {
    const _parentCollections = [...self.collections]
    _parentCollections.splice(_parentCollections.length - 1, 1)
    return _parentCollections
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
  }
}))
.views(self => ({
  getAttribute(id: string) {
    return self.attributesMap.get(id)
  },
  getAttributeByName(name: string) {
    return self.attributesMap.get(self.attrNameMap.get(name) ?? "")
  }
}))
.extend(self => {
  // we do our own caching because MST's auto-caching wasn't working as expected
  const _collectionGroups = observable.box<CollectionGroup[]>([])
  // array of child-most cases, i.e. cases not grouped in a collection
  let _childCases: IGroupedCase[] = []
  const isValidCollectionGroups = observable.box(false)

  function getCollection(collectionId: string): ICollectionModel | undefined {
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

  function getCollectionIndex(collectionId: string) {
    return self.collections.findIndex(({ id }) => id === collectionId)
  }

  function getCollectionForAttribute(attributeId: string): ICollectionModel | undefined {
    return self.collections.find(coll => coll.getAttribute(attributeId))
  }

  function getCollectionForCase(caseId: string): ICollectionModel | undefined {
    return self.collections.find(coll => coll.hasCase(caseId))
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
      getCollectionForCase,
      getUniqueCollectionName,
      // leaf-most child cases (i.e. those not grouped in a collection)
      childCases() {
        if (!isValidCollectionGroups.get()) {
          // childCases array cache is built by collectionGroups()
          this.collectionGroups // eslint-disable-line no-unused-expressions
        }
        return _childCases
      },
      // the resulting collection groups
      get collectionGroups() {
        if (isValidCollectionGroups.get()) return _collectionGroups.get()

        // create groups for each parent collection
        const newCollectionGroups: CollectionGroup[] =
          self.parentCollections.map(collection => ({ collection, groups: [], groupsMap: {} }))

        prf.measure("DataSet.collectionGroups", () => {
          self.cases.forEach(aCase => {
            const index = self.caseIDMap.get(aCase.__id__) ?? -1
            // parent attributes used for grouping are cumulative
            const parentAttrs: IAttribute[] = []
            newCollectionGroups.forEach(({ collection, groups, groupsMap }, collIndex) => {
              const collectionAttrs: IAttribute[] = Array.from(collection.attributes) as IAttribute[]
              const parentValues: Record<string, string> = {}
              const cumulativeValues: Record<string, string> = {}
              parentAttrs.forEach(attr => {
                parentValues[attr.id] = attr.value(index)
                cumulativeValues[attr.id] = attr.value(index)
              })
              collectionAttrs.forEach(attr => {
                cumulativeValues[attr.id] = attr.value(index)
              })
              // group by stringified values of grouped attributes
              const parentValuesJson = JSON.stringify(parentValues)
              const cumulativeValuesJson = JSON.stringify(cumulativeValues)
              if (!groupsMap[cumulativeValuesJson]) {
                // start a new group with just this case (for now)
                // note: PCAS ids are considered ephemeral and should not be stored/serialized,
                // because they can be regenerated whenever the data changes.
                const pseudoCase: IGroupedCase = { __id__: v3Id(kCaseIdPrefix), ...cumulativeValues }
                groupsMap[cumulativeValuesJson] = {
                  collectionId: collection.id,
                  pseudoCase,
                  childCaseIds: [aCase.__id__],
                  valuesJson: cumulativeValuesJson
                }
                if (collIndex === 0) {
                  // for the first collection, index is just position in the array
                  pseudoCase[symIndex] = groups.length
                  groups.push(groupsMap[cumulativeValuesJson])
                }
                else {
                  // for collections after the first, index is determined from position in parent
                  // and we must link up parent cases to child cases
                  const parentCollectionGroup = newCollectionGroups[collIndex - 1]
                  const parentCaseGroup = parentCollectionGroup.groupsMap[parentValuesJson]
                  if (parentCaseGroup) {
                    const parentPseudoCase = parentCaseGroup.pseudoCase
                    let indexOfLastCaseWithSameParent = -1

                    // add link from child to parent
                    pseudoCase[symParent] = parentPseudoCase.__id__

                    // add link from parent to child
                    if (!parentCaseGroup.childPseudoCaseIds) {
                      // this is the first child of the corresponding parent pseudo-case
                      parentCaseGroup.childPseudoCaseIds = [pseudoCase.__id__]
                      pseudoCase[symIndex] = 0
                    }
                    else {
                      // add a new child to the corresponding parent pseudo-case
                      pseudoCase[symIndex] = parentCaseGroup.childPseudoCaseIds.length
                      parentCaseGroup.childPseudoCaseIds.push(pseudoCase.__id__)

                      // add new group as last case of parent
                      for (let i = 0; i < groups.length; ++i) {
                        if (groups[i].pseudoCase[symParent] === pseudoCase[symParent]) {
                          indexOfLastCaseWithSameParent = i
                        }
                        else if (indexOfLastCaseWithSameParent >= 0) {
                          break
                        }
                      }
                    }
                    // add the new pseudo-case at its appropriate place in the array
                    if (indexOfLastCaseWithSameParent >= 0) {
                      groups.splice(indexOfLastCaseWithSameParent + 1, 0, groupsMap[cumulativeValuesJson])
                    }
                    else {
                      groups.push(groupsMap[cumulativeValuesJson])
                    }
                  }
                  else {
                    /* istanbul ignore next */
                    console.warn(`Failed to find expected parent for case ${cumulativeValuesJson}!`)
                  }
                }
              }
              else {
                // add the case to an existing group
                groupsMap[cumulativeValuesJson].childCaseIds.push(aCase.__id__)
              }
              parentAttrs.push(...collectionAttrs)
            })
          })
        })

        _childCases = []
        const lastCollectionGroup = newCollectionGroups.length
                                      ? newCollectionGroups[newCollectionGroups.length - 1]
                                      : undefined
        if (lastCollectionGroup) {
          // if there are collections, then child cases are determined by the parents
          lastCollectionGroup?.groups.forEach(group => {
            _childCases.push(...group.childCaseIds.map((caseId, index) =>
              ({__id__: caseId, [symParent]: group.pseudoCase.__id__, [symIndex]: index })))
          })
        }
        else {
          // in the absence of collections, use the original cases
          _childCases = self.cases.map(c => ({ __id__: c.__id__ }))
        }

        // clear map from pseudo-case id to pseudo-case
        self.pseudoCaseMap.clear()

        // update map from pseudo-case id to pseudo-case
        newCollectionGroups.forEach(collectionGroup => {
          collectionGroup.groups.forEach(caseGroup => {
            self.pseudoCaseMap.set(caseGroup.pseudoCase.__id__, caseGroup)
          })
        })

        runInAction(() => {
          _collectionGroups.set(newCollectionGroups)
          isValidCollectionGroups.set(true)
        })
        return _collectionGroups.get()
      }
    },
    actions: {
      invalidateCollectionGroups() {
        isValidCollectionGroups.set(false)
      },
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
        // recalculate groups
        this.invalidateCollectionGroups()
        return newCollection
      },
      removeCollection(collection: ICollectionModel) {
        self.collections.remove(collection)
      },
    }
  }
})
.actions(self => ({
  setManagingControllerId(id: string) {
    self.managingControllerId = id
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
      self.invalidateCollectionGroups()
    }
    return { removedCollectionId }
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
    if (collectionId && self.getCollection(collectionId)) {
      for (let i = self.collectionGroups.length - 1; i >= 0; --i) {
        const collectionGroup = self.collectionGroups[i]
        if (!isAlive(collectionGroup.collection)) {
          /* istanbul ignore next */
          console.warn("DataSet.getCasesForCollection encountered defunct collection in collectionGroup")
        }
        else if (collectionGroup.collection.id === collectionId) {
          return collectionGroup.groups
        }
      }
    }
  },
  getParentCollectionGroup(collectionId?: string) {
    if (collectionId && self.collectionGroups.length) {
      if (self.getCollection(collectionId)) {
        const parentCollection = this.getParentCollection(collectionId)
        return self.collectionGroups.find((_collectionGroup, index) => {
          return _collectionGroup.collection.id === parentCollection?.id
        })
      }
    }
  }
}))
.views(self => ({
  getCasesForCollection(collectionId?: string): ICase[] {
    if (!collectionId || !self.getCollection(collectionId)) return []
    // parent collection cases can be retrieved from the groups
    const collectionGroups = self.getGroupsForCollection(collectionId)
    if (collectionGroups) return collectionGroups.map(group => group.pseudoCase)
    // child collection cases can be ordered by parent
    const parentCollection = self.getParentCollection(collectionId || self.childCollection.id)
    const parentGroups = parentCollection ? self.getGroupsForCollection(parentCollection.id) : undefined
    if (parentGroups) {
      const cases: ICase[] = []
      parentGroups.forEach(group => {
        const caseCount = cases.length
        cases.push(...group.childCaseIds.map((__id__, index) => ({
          __id__,
          [symParent]: group.pseudoCase.__id__,
          [symIndex]: caseCount + index
        })))
      })
      return cases
    }
    // return child cases in data set order
    return getSnapshot(self.cases) as ICase[]
  },
  getParentCase(caseId: string, collectionId?: string) {
    const parentCollectionGroup = self.getParentCollectionGroup(collectionId)
    return parentCollectionGroup?.groups.find(group =>
      (group.childPseudoCaseIds ?? group.childCaseIds)?.includes(caseId))
  },
  getCollectionGroupForAttributes(attributeIds: string[]) {
    // finds the child-most collection (if any) among the specified attributes
    let collectionIndex = -1
    for (const attrId of attributeIds) {
      let attrCollectionIndex = -1
      for (let i = self.collectionGroups.length - 1; i >= 0; --i) {
        const collectionGroup = self.collectionGroups[i]
        if (collectionGroup.collection.getAttribute(attrId)) {
          attrCollectionIndex = Math.max(i, attrCollectionIndex)
        }
      }
      if (attrCollectionIndex < 0) {
        // if we get here then the attribute isn't grouped, so no collection group can be returned
        return null
      }
      collectionIndex = Math.max(collectionIndex, attrCollectionIndex)
    }
    // return the child-most collection that included any of the attributes
    return self.collectionGroups[collectionIndex]
  },
  getCasesForAttributes(attributeIds: string[]) {
    const collectionGroup = this.getCollectionGroupForAttributes(attributeIds)
    if (collectionGroup) {
      return collectionGroup.groups.map(group => group.pseudoCase)
    } else {
      // If there are no groups, regular cases can be used
      return self.childCases()
    }
  }
}))
.views(self => ({
  getParentValues(parentId: string) {
    const parentCase = self.pseudoCaseMap.get(parentId)
    return parentCase ? JSON.parse(parentCase.valuesJson) : {}
  }
}))
.extend(self => {
  /*
   * private closure
   */
  const attrIDFromName = (name: string) => self.attrNameMap.get(name)

  function getCase(caseID: string, options?: IGetCaseOptions): ICase | undefined {
    const index = self.caseIDMap.get(caseID)
    if (index == null) { return undefined }

    const { canonical = true, numeric = true } = options || {}
    const aCase: ICase = { __id__: caseID }
    self.attributes.forEach((attr) => {
      const key = canonical ? attr.id : attr.name
      aCase[key] = numeric && attr.isNumeric(index) ? attr.numeric(index) : attr.value(index)
    })
    return aCase
  }

  function getCases(caseIDs: string[], options?: IGetCaseOptions): ICase[] {
    const cases: ICase[] = []
    caseIDs.forEach((caseID) => {
      const aCase = getCase(caseID, options)
      if (aCase) {
        cases.push(aCase)
      }
    })
    return cases
  }

  function getCaseAtIndex(index: number, options?: IGetCaseOptions) {
    const aCase = self.cases[index],
          id = aCase?.__id__
    return id ? getCase(id, options) : undefined
  }

  function setCaseValues(caseValues: ICase) {
    const index = self.caseIDMap.get(caseValues.__id__)
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
      caseIndexFromID(id: string) {
        return self.caseIDMap.get(id)
      },
      caseIDFromIndex(index: number) {
        return getCaseAtIndex(index)?.__id__
      },
      nextCaseID(id: string) {
        const index = self.caseIDMap.get(id),
              nextCase = (index != null) && (index < self.cases.length - 1)
                          ? self.cases[index + 1] : undefined
        return nextCase?.__id__
      },
      getValue(caseID: string, attributeID: string) {
        // The values of a pseudo-case are considered to be the values of the first real case.
        // For grouped attributes, these will be the grouped values. Clients shouldn't be
        // asking for ungrouped values from pseudo-cases.
        const pseudoCase = self.pseudoCaseMap.get(caseID)
        const _caseId = pseudoCase ? pseudoCase?.childCaseIds[0] : caseID
        const index = self.caseIDMap.get(_caseId)
        return index != null ? this.getValueAtIndex(index, attributeID) : undefined
      },
      getValueAtIndex(index: number, attributeID: string) {
          if (self.isCaching()) {
            const caseID = self.cases[index]?.__id__
            const cachedCase = self.caseCache.get(caseID)
            if (cachedCase && Object.prototype.hasOwnProperty.call(cachedCase, attributeID)) {
              return cachedCase[attributeID]
            }
          }
          const attr = self.getAttribute(attributeID)
          return attr?.value(index)
      },
      getStrValue(caseID: string, attributeID: string) {
        // The values of a pseudo-case are considered to be the values of the first real case.
        // For grouped attributes, these will be the grouped values. Clients shouldn't be
        // asking for ungrouped values from pseudo-cases.
        const pseudoCase = self.pseudoCaseMap.get(caseID)
        const _caseId = pseudoCase ? pseudoCase.childCaseIds[0] : caseID
        const index = self.caseIDMap.get(_caseId)
        return index != null ? this.getStrValueAtIndex(index, attributeID) : ""
      },
      getStrValueAtIndex(index: number, attributeID: string) {
        if (self.isCaching()) {
          const caseID = self.cases[index]?.__id__
          const cachedCase = self.caseCache.get(caseID)
          if (cachedCase && Object.prototype.hasOwnProperty.call(cachedCase, attributeID)) {
            return cachedCase[attributeID]?.toString()
          }
        }
        const attr = self.getAttribute(attributeID)
        return attr?.value(index) ?? ""
      },
      getNumeric(caseID: string, attributeID: string): number | undefined {
        // The values of a pseudo-case are considered to be the values of the first real case.
        // For grouped attributes, these will be the grouped values. Clients shouldn't be
        // asking for ungrouped values from pseudo-cases.
        const pseudoCase = self.pseudoCaseMap.get(caseID)
        const _caseId = pseudoCase ? pseudoCase.childCaseIds[0] : caseID
        const index = _caseId ? self.caseIDMap.get(_caseId) : undefined
        return index != null ? this.getNumericAtIndex(index, attributeID) : undefined
      },
      getNumericAtIndex(index: number, attributeID: string) {
        if (self.isCaching()) {
          const caseID = self.cases[index]?.__id__
          const cachedCase = self.caseCache.get(caseID)
          if (cachedCase && Object.prototype.hasOwnProperty.call(cachedCase, attributeID)) {
            return Number(cachedCase[attributeID])
          }
        }
        const attr = self.getAttribute(attributeID)
        return attr?.numeric(index)
      },
      getCase,
      getCases,
      getCaseAtIndex,
      getCasesAtIndex(start = 0, options?: IGetCasesOptions) {
        const { count = self.cases.length } = options || {}
        const endIndex = Math.min(start + count, self.cases.length),
              cases = []
        for (let i = start; i < endIndex; ++i) {
          cases.push(getCaseAtIndex(i, options))
        }
        return cases
      },
      isCaseSelected(caseId: string) {
        // a pseudo-case is selected if all of its individual cases are selected
        const group = self.pseudoCaseMap.get(caseId)
        return group
                ? group.childCaseIds.every(id => self.selection.has(id))
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
      afterCreate() {
        const context: IEnvContext | Record<string, never> = hasEnv(self) ? getEnv(self) : {},
              { srcDataSet } = context

        // build attrNameMap
        self.attributesMap.forEach(attr => {
          self.attrNameMap.set(attr.name, attr.id)
        })

        // build caseIDMap
        self.cases.forEach((aCase, index) => {
          self.caseIDMap.set(aCase.__id__, index)
        })

        // make sure attributes have appropriate length, including attributes with formulas
        self.attributesMap.forEach(attr => {
          attr.setLength(self.cases.length)
        })

        // add initial collection if not already present
        if (!self.collections.length) {
          self.addCollection({ name: t("DG.AppController.createDataSet.collectionName") })
        }

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
                const { __id__ = v3Id(kCaseIdPrefix), ...others } = iCase
                return { __id__, ...others }
              })
            }
            next(call)
          }))

          // invalidate collection groups when collections change
          addDisposer(self, reaction(
            () => self.collectionIds,
            () => self.invalidateCollectionGroups()
          ))
        }
      },
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
        self.attributes.forEach(attr => attr.prepareSnapshot())
      },
      // should be called after retrieving snapshot (post-serialization)
      completeSnapshot() {
        // move data back into volatile storage for efficiency
        withoutUndo({ suppressWarning: true })
        self.attributes.forEach(attr => attr.completeSnapshot())
      },
      setName(name: string) {
        self.name = name
      },
      setSourceName(source: string) {
        self.sourceName = source
      },
      setImportDate(date: string) {
        self.importDate = date
      },
      setDescription(description?: string) {
        self.description = description
      },
      addAttribute(snapshot: IAttributeSnapshot, options?: IAddAttributeOptions) {
        const { before: beforeID, collection: collectionId } = options || {}

        // add attribute to attributesMap
        let collection: ICollectionModel | undefined
        const attribute = self.attributesMap.put(snapshot)

        // add attribute to attrNameMap
        self.attrNameMap.set(attribute.name, attribute.id)

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

        // fill out any missing values
        for (let i = attribute.strValues.length; i < self.cases.length; ++i) {
          attribute.addValue()
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
            self.attrNameMap.delete(attribute.name)
            attribute.setName(nameStr)
            self.attrNameMap.set(nameStr, attribute.id)
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

          // remove attribute from attrNameMap
          self.attrNameMap.delete(attribute.name)
          // remove attribute from attributesMap
          self.attributesMap.delete(attribute.id)
        }
        return result
      },

      addCases(cases: ICaseCreation[], options?: IAddCasesOptions) {
        const { before, after } = options || {}

        const beforePosition = before ? self.caseIDMap.get(before) : undefined
        const _afterPosition = after ? self.caseIDMap.get(after) : undefined
        const afterPosition = _afterPosition != null ? _afterPosition + 1 : undefined
        const insertPosition = beforePosition ?? afterPosition ?? self.cases.length

        // insert/append cases and empty values
        const ids: string[] = []
        const _cases = cases.map(({ __id__ = v3Id(kCaseIdPrefix) }) => {
          ids.push(__id__)
          return { __id__ }
        })
        const _values = new Array(cases.length)
        if (insertPosition < self.cases.length) {
          self.cases.splice(insertPosition, 0, ..._cases)
          // update the indices of cases after the insert
          self.caseIDMap.forEach((caseIndex, caseId) => {
            if (caseIndex >= insertPosition) {
              self.caseIDMap.set(caseId, caseIndex + cases.length)
            }
          })
          // insert values for each attribute
          self.attributesMap.forEach(attr => {
            attr.addValues(_values, insertPosition)
          })
        }
        else {
          self.cases.push(..._cases)
          // append values to each attribute
          self.attributesMap.forEach(attr => {
            attr.setLength(self.cases.length)
          })
        }
        // update the indices for the appended cases
        ids.forEach((caseId, index) => {
          self.caseIDMap.set(caseId, insertPosition + index)
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

        // invalidate collectionGroups (including childCases)
        self.invalidateCollectionGroups()
        return ids
      },

      // Supports regular cases or pseudo-cases, but not mixing the two.
      // For pseudo-cases, will set the values of all cases in the group
      // regardless of whether the attribute is grouped or not.
      // `affectedAttributes` are not used in the function, but are present as a potential
      // optimization for responders, as all arguments are available to `onAction` listeners.
      // For instance, a scatter plot that is dragging many points but affecting only two
      // attributes can indicate that, which can enable more efficient responses.
      setCaseValues(cases: ICase[], affectedAttributes?: string[]) {
        const ungroupedCases: ICase[] = []
        // convert each pseudo-case change to a change to each underlying case
        cases.forEach(aCase => {
          const caseGroup = self.pseudoCaseMap.get(aCase.__id__)
          if (caseGroup) {
            ungroupedCases.push(...caseGroup.childCaseIds.map(id => ({ ...aCase, __id__: id })))
          }
        })
        const _cases = ungroupedCases.length > 0
                        ? ungroupedCases
                        : cases
        const before = getCases(_cases.map(({ __id__ }) => __id__))
        if (self.isCaching()) {
          // update the cases in the cache
          _cases.forEach(aCase => {
            const cached = self.caseCache.get(aCase.__id__)
            if (!cached) {
              self.caseCache.set(aCase.__id__, { ...aCase })
            }
            else {
              Object.assign(cached, aCase)
            }
          })
        }
        else {
          _cases.forEach((caseValues) => {
            setCaseValues(caseValues)
          })
        }
        // custom undo/redo since values aren't observed all the way down
        const after = getCases(_cases.map(({ __id__ }) => __id__))
        withCustomUndoRedo<ISetCaseValuesCustomPatch>({
          type: "DataSet.setCaseValues",
          data: { dataId: self.id, before, after }
        }, setCaseValuesCustomUndoRedo)

        // only changes to parent collection attributes invalidate grouping
        ungroupedCases.length && self.invalidateCollectionGroups()
      },

      removeCases(caseIDs: string[]) {
        caseIDs.forEach((caseID) => {
          const index = self.caseIDMap.get(caseID)
          if (index != null) {
            self.cases.splice(index, 1)
            self.attributes.forEach((attr) => {
              attr.removeValues(index)
            })
            self.selection.delete(caseID)
            self.caseIDMap.delete(caseID)
            for (let i = index; i < self.cases.length; ++i) {
              const id = self.cases[i].__id__
              self.caseIDMap.set(id, i)
            }
          }
        })
        // invalidate collectionGroups (including childCases)
        self.invalidateCollectionGroups()
      },

      selectAll(select = true) {
        if (select) {
          self.cases.forEach(({__id__}) => self.selection.add(__id__))
        }
        else {
          self.selection.clear()
        }
        ++self.selectionChanges
      },

      selectCases(caseIds: string[], select = true) {
        const ids: string[] = []
        caseIds.forEach(id => {
          const pseudoCase = self.pseudoCaseMap.get(id)
          if (pseudoCase) {
            ids.push(...pseudoCase.childCaseIds)
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
          const pseudoCase = self.pseudoCaseMap.get(id)
          if (pseudoCase) {
            ids.push(...pseudoCase.childCaseIds)
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
.actions(self => ({
  commitCache() {
    self.setCaseValues(Array.from(self.caseCache.values()))
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
  }
}))
// performs the specified action so that response actions are included and undo/redo strings assigned
.actions(applyModelChange)

export interface IDataSet extends Instance<typeof DataSet> {}
export interface IDataSetSnapshot extends SnapshotIn<typeof DataSet> {}
