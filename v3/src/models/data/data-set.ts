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
import { addDisposer, addMiddleware, getEnv, Instance, isAlive, SnapshotIn, types } from "mobx-state-tree"
import pluralize from "pluralize"
import { Attribute, IAttribute, IAttributeSnapshot } from "./attribute"
import {
  CollectionModel, CollectionPropsModel, ICollectionModel, ICollectionPropsModel, isCollectionModel
} from "./collection"
import {
  CaseGroup, CaseID, IAddAttributeOptions, IAddCaseOptions, ICase, ICaseCreation, IDerivationSpec,
  IGetCaseOptions, IGetCasesOptions, IGroupedCase, IMoveAttributeCollectionOptions, IMoveAttributeOptions,
  symIndex, symParent, uniqueCaseId
} from "./data-set-types"
// eslint-disable-next-line import/no-cycle
import {
  IMoveAttributeCustomPatch, ISetCaseValuesCustomPatch, moveAttributeCustomUndoRedo, setCaseValuesCustomUndoRedo
} from "./data-set-undo"
import { applyUndoableAction } from "../history/apply-undoable-action"
import { withCustomUndoRedo } from "../history/with-custom-undo-redo"
import { withoutUndo } from "../history/without-undo"
import { typedId } from "../../utilities/js-utils"
import { prf } from "../../utilities/profiler"
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
      const name = ds.attrFromID(id)?.name || id
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
  id: types.optional(types.identifier, () => typedId("DATA")),
  sourceID: types.maybe(types.string),
  // ordered parent-most to child-most; no explicit collection for ungrouped (child-most) attributes
  collections: types.array(CollectionModel),
  // ungrouped (child-most) collection has properties, but no grouping attributes
  ungrouped: types.optional(CollectionPropsModel, () => CollectionPropsModel.create()),
  attributes: types.array(Attribute),
  cases: types.array(CaseID),
  sourceName: types.maybe(types.string),
  description: types.maybe(types.string),
  importDate: types.maybe(types.string),
  // for serialization only, not for dynamic selection tracking
  snapSelection: types.array(types.string)
})
.volatile(self => ({
  // map from case IDs to indices
  caseIDMap: new Map<string, number>(),
  // MobX-observable set of selected case IDs
  selection: observable.set<string>(),
  // map from pseudo-case ID to the CaseGroup it represents
  pseudoCaseMap: new Map<string, CaseGroup>(),
  transactionCount: 0
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
.views(self => ({
  // map from attribute id to attribute
  get attrIDMap() {
    const idMap = new Map<string, IAttribute>()
    self.attributes.forEach(attr => {
      idMap.set(attr.id, attr)
    })
    return idMap
  },
  // map from attribute name to attribute id
  get attrNameMap() {
    const nameMap: Record<string, string> = {}
    self.attributes.forEach(attr => {
      nameMap[attr.name] = attr.id
    })
    return nameMap

  },
  attrIndexFromID(id: string) {
    const index = self.attributes.findIndex(attr => attr.id === id)
    return index >= 0 ? index : undefined
  },
  get collectionIds() {
    return [...self.collections.map(collection => collection.id), self.ungrouped.id]
  },
  get collectionModels(): ICollectionPropsModel[] {
    return [...self.collections, self.ungrouped]
  }
}))
.views(self => ({
  getAttribute(id: string) {
    return self.attrIDMap.get(id)
  },
  getAttributeByName(name: string) {
    return self.attrIDMap.get(self.attrNameMap[name])
  }
}))
.actions(self => ({
  // change the attribute order within the data set itself; doesn't handle collections
  moveAttribute(attributeID: string, options?: IMoveAttributeOptions) {
    const beforeAttrIndex = options?.before ? self.attrIndexFromID(options.before) : undefined
    const afterAttrIndex = options?.after ? self.attrIndexFromID(options.after) : undefined
    const found = self.attributes.find(attr => attr.id === attributeID)
    if (found) {
      const srcAttrIndex = self.attrIndexFromID(attributeID)
      const nextAttrId = srcAttrIndex != null && srcAttrIndex < self.attributes.length - 1
                          ? self.attributes[srcAttrIndex + 1].id
                          : undefined
      // removing an MST model from an MST array calls destroy() on it, so the only way
      // to change the order without destroying any of the elements is to sort the array
      const dstOrder: Record<string, number> = {}
      // collect the current indices of each attribute in the array
      self.attributes.forEach((attr, i) => dstOrder[attr.id] = i)
      // assign the moved attribute an "index" value corresponding to its destination
      dstOrder[attributeID] = beforeAttrIndex != null
                                ? beforeAttrIndex - 0.5
                                : afterAttrIndex != null
                                    ? afterAttrIndex + 0.5
                                    : self.attributes.length
      // sort the attributes by the adjusted "indices"
      self.attributes.sort((a, b) => dstOrder[a.id] - dstOrder[b.id])

      !options?.withoutCustomUndo && withCustomUndoRedo<IMoveAttributeCustomPatch>({
        type: "DataSet.moveAttribute",
        data: { dataId: self.id, attrId: attributeID, before: { before: nextAttrId }, after: options }
      }, moveAttributeCustomUndoRedo)
    }
  }
}))
.views(self => ({
  // array of attributes that are grouped into collections
  get groupedAttributes() {
    const groupedAttrs: IAttribute[] = []
    self.collections.forEach(collection => {
      collection.attributes.forEach(attr => attr && groupedAttrs.push(attr))
    })
    return groupedAttrs
  }
}))
.views(self => ({
  // array of attributes _not_ grouped into collections
  get ungroupedAttributes(): IAttribute[] {
    const grouped = new Set(self.groupedAttributes.map(attr => attr.id))
    return self.attributes.filter(attr => attr && !grouped.has(attr.id))
  },
}))
.extend(self => {
  // we do our own caching because MST's auto-caching wasn't working as expected
  const _collectionGroups = observable.box<CollectionGroup[]>([])
  // array of child-most cases, i.e. cases not grouped in a collection
  let _childCases: IGroupedCase[] = []
  const isValidCollectionGroups = observable.box(false)

  function getGroupedCollection(collectionId: string): ICollectionModel | undefined {
    return self.collections.find(coll => coll.id === collectionId)
  }

  function getCollection(collectionId: string): ICollectionPropsModel | undefined {
    if (!isAlive(self)) {
      console.warn("DataSet.getCollection called on a defunct DataSet")
      return
    }
    return collectionId === self.ungrouped.id ? self.ungrouped : getGroupedCollection(collectionId)
  }

  function getGroupedCollectionByName(name: string): ICollectionModel | undefined {
    return self.collections.find(collection => collection.name === name)
  }

  function getCollectionByName(name: string): ICollectionPropsModel | undefined {
    if (!isAlive(self)) {
      console.warn("DataSet.getCollectionByName called on a defunct DataSet")
      return
    }
    return name === self.ungrouped.name ? self.ungrouped : getGroupedCollectionByName(name)
  }

  function getCollectionIndex(collectionId: string) {
    // For consistency, treat ungrouped as the last / child-most collection
    return collectionId === self.ungrouped.id
      ? self.collections.length
      : self.collections.findIndex(coll => coll.id === collectionId)
  }

  function getCollectionForAttribute(attributeId: string): ICollectionPropsModel | undefined {
    return self.collections.find(coll => coll.getAttribute(attributeId)) ??
            (self.attributes.find(attr => attr.id === attributeId) ? self.ungrouped : undefined)
  }

  return {
    views: {
      // get real collection from id (ungrouped collection is not considered to be a real collection)
      getGroupedCollection,
      // get collection from id (including ungrouped collection)
      getCollection,
      // get real collection from name (ungrouped collection is not considered to be a real collection)
      getGroupedCollectionByName,
      // get collection from name (including ungrouped collection)
      getCollectionByName,
      // get index from collection (including ungrouped collection)
      getCollectionIndex,
      // get collection from attribute. Ungrouped collection is returned for ungrouped attributes.
      // undefined => attribute not present in dataset
      getCollectionForAttribute,
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

        // create groups for each collection (does not included ungrouped)
        const newCollectionGroups: CollectionGroup[] =
          self.collections.map(collection => ({ collection, groups: [], groupsMap: {} }))

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
                const pseudoCase: IGroupedCase = { __id__: typedId("PCAS"), ...cumulativeValues }
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
        // can't assign empty object because we're not an action
        for (const id in self.pseudoCaseMap) {
          self.pseudoCaseMap.delete(id)
        }
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
      setUngroupedCollection(collection: ICollectionPropsModel) {
        self.ungrouped = collection
      },
      addCollection(collection: ICollectionModel, beforeCollectionId?: string) {
        const beforeIndex = beforeCollectionId ? getCollectionIndex(beforeCollectionId) : -1
        if (beforeIndex >= 0) {
          self.collections.splice(beforeIndex, 0, collection)
        }
        else {
          self.collections.push(collection)
        }
        this.invalidateCollectionGroups()
      },
      removeCollection(collection: ICollectionModel) {
        self.collections.remove(collection)
      },
      setCollectionForAttribute(attributeId: string, options?: IMoveAttributeCollectionOptions) {
        const attribute = self.attributes.find(attr => attr.id === attributeId)
        const newCollection = options?.collection ? getGroupedCollection(options.collection) : undefined
        const oldCollection = getCollectionForAttribute(attributeId)
        if (attribute && oldCollection !== newCollection) {
          if (attribute.hasFormula) {
            // If the attribute has a formula, we need to reset all the calculated values to blank values so that they
            // are not taken into account while calculating case grouping. After the grouping is done, the formula will
            // be re-evaluated, and the values will be updated to the correct values again.
            attribute.clearValues()
          }
          if (isCollectionModel(oldCollection)) {
            // remove it from previous collection (if any)
            if (oldCollection?.attributes.length > 1) {
              oldCollection.removeAttribute(attributeId)
            }
            // remove the entire collection if it was the last attribute
            else {
              this.removeCollection(oldCollection)
            }
          }
          if (newCollection) {
            // add it to the new collection
            newCollection.addAttribute(attribute, options)
          }
          else if (options?.before || options?.after) {
            // move it within the data set
            self.moveAttribute(attributeId, { withoutCustomUndo: true, ...options })
          }
          if (!isCollectionModel(oldCollection)) {
            // if the last ungrouped attribute was moved into a collection, then eliminate
            // the last collection, thus un-grouping the child-most attributes
            const allAttrCount = self.attributes.length
            const collectionAttrCount = self.collections
                                          .reduce((sum, collection) => sum += collection.attributes.length, 0)
            if (collectionAttrCount >= allAttrCount) {
              self.collections.splice(self.collections.length - 1, 1)
            }
          }
          this.invalidateCollectionGroups()
        }
      },
      // if beforeCollectionId is not specified, new collection is last (child-most)
      moveAttributeToNewCollection(attributeId: string, beforeCollectionId?: string) {
        const attribute = self.getAttribute(attributeId)
        if (attribute) {
          const name = pluralize(attribute.name)
          const collection = CollectionModel.create({ name })
          this.addCollection(collection, beforeCollectionId)
          this.setCollectionForAttribute(attributeId, { collection: collection.id })
          return collection
        }
      }
    }
  }
})
.views(self => ({
  getCasesForCollection(collectionId?: string) {
    if (collectionId && self.getCollection(collectionId)) {
      for (let i = self.collectionGroups.length - 1; i >= 0; --i) {
        const collectionGroup = self.collectionGroups[i]
        if (!isAlive(collectionGroup.collection)) {
          console.warn("DataSet.getCasesForCollection encountered defunct collection in collectionGroup")
        }
        else if (collectionGroup.collection.id === collectionId) {
          return collectionGroup.groups.map(group => group.pseudoCase)
        }
      }
    }
    return self.childCases()
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
.extend(self => {
  /*
   * private closure
   */
  const attrIDFromName = (name: string) => self.attrNameMap[name]

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

  function beforeIndexForInsert(index: number, beforeID?: string | string[]) {
    if (!beforeID) { return self.cases.length }
    return Array.isArray(beforeID)
            ? self.caseIDMap.get(beforeID[index])
            : self.caseIDMap.get(beforeID)
  }

  function afterIndexForInsert(index: number, afterID?: string | string[]) {
    if (!afterID) { return self.cases.length }
    return Array.isArray(afterID)
            ? (self.caseIDMap.get(afterID[index]) || 0) + 1
            : (self.caseIDMap.get(afterID) || 0) + 1
  }

  function insertCaseIDAtIndex(id: string, beforeIndex: number) {
    const newCase = { __id__: id }
    if ((beforeIndex != null) && (beforeIndex < self.cases.length)) {
      self.cases.splice(beforeIndex, 0, newCase)
      // increment indices of all subsequent cases
      for (let i = beforeIndex + 1; i < self.cases.length; ++i) {
        const aCase = self.cases[i]
        const currentVal = self.caseIDMap.get(aCase.__id__)
        if (currentVal != null) {
          self.caseIDMap.set(aCase.__id__, currentVal + 1)
        }
      }
    }
    else {
      self.cases.push(newCase)
      beforeIndex = self.cases.length - 1
    }
    self.caseIDMap.set(self.cases[beforeIndex].__id__, beforeIndex)

  }

  function setCaseValues(caseValues: ICase) {
    const index = self.caseIDMap.get(caseValues.__id__)
    if (index == null) { return }
    for (const key in caseValues) {
      if (key !== "__id__") {
        const attribute = self.attrIDMap.get(key)
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
      attrFromID(id: string) {
        return self.attrIDMap.get(id)
      },
      attrFromName(name: string) {
        const id = self.attrNameMap[name]
        return id ? self.attrIDMap.get(id) : undefined
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
          const attr = self.attrIDMap.get(attributeID)
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
        const attr = self.attrIDMap.get(attributeID)
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
        const attr = self.attrIDMap.get(attributeID)
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
        const context: IEnvContext = getEnv(self),
              { srcDataSet, } = context

        // build caseIDMap
        self.cases.forEach((aCase, index) => {
          self.caseIDMap.set(aCase.__id__, index)
        })

        if (!srcDataSet) {
          // set up middleware to add ids to inserted attributes and cases
          // adding the ids in middleware makes them available as action arguments
          // to derived DataSets.
          addDisposer(self, addMiddleware(self, (call, next) => {
            if (call.context === self && call.name === "addAttribute") {
              const { id = typedId("ATTR"), ...others } = call.args[0] as IAttributeSnapshot
              call.args[0] = { id, ...others }
            }
            else if (call.context === self && call.name === "addCases") {
              call.args[0] = (call.args[0] as ICaseCreation[]).map(iCase => {
                const { __id__ = uniqueCaseId(), ...others } = iCase
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
      setDescription(description: string) {
        self.description = description
      },
      addAttribute(snapshot: IAttributeSnapshot, options?: IAddAttributeOptions) {
        const { before: beforeID, collection: collectionId } = options || {}
        let beforeIndex = beforeID ? self.attrIndexFromID(beforeID) ?? -1 : -1
        if (beforeIndex >= 0) {
          self.attributes.splice(beforeIndex, 0, snapshot)
        }
        else {
          beforeIndex = self.attributes.push(snapshot) - 1
        }
        const attribute = self.attributes[beforeIndex]
        for (let i = attribute.strValues.length; i < self.cases.length; ++i) {
          attribute.addValue()
        }
        if (collectionId) {
          const collection = self.getGroupedCollection(collectionId)
          collection?.addAttribute(attribute)
        }
        return attribute
      },

      setAttributeName(attributeID: string, name: string | (() => string)) {
        const attribute = attributeID && self.attrIDMap.get(attributeID)
        if (attribute) {
          const nameStr = typeof name === "string" ? name : name()
          attribute.setName(nameStr)
        }
      },

      removeAttribute(attributeID: string) {
        const attrIndex = self.attrIndexFromID(attributeID),
              attribute = attributeID ? self.attrIDMap.get(attributeID) : undefined

        if (attribute && attrIndex != null) {
          // remove attribute from any collection
          const collection = self.getCollectionForAttribute(attributeID)
          if (isCollectionModel(collection)) {
            if (collection.attributes.length > 1) {
              collection.removeAttribute(attributeID)
            }
            else {
              self.removeCollection(collection)
            }
          }

          // remove attribute from data set
          self.attributes.splice(attrIndex, 1)
        }
      },

      addCases(cases: ICaseCreation[], options?: IAddCaseOptions) {
        const { before, after } = options || {}
        cases.forEach((aCase, index) => {
          // shouldn't ever have to assign an id here since the middleware should do so
          const { __id__ = uniqueCaseId() } = aCase
          const insertPosition = after ? afterIndexForInsert(index, after) : beforeIndexForInsert(index, before)
          self.attributes.forEach((attr: IAttribute) => {
            const value = aCase[attr.id]
            attr.addValue(value != null ? value : undefined, insertPosition)
          })
          insertCaseIDAtIndex(__id__, insertPosition ?? 0)
        })
        // invalidate collectionGroups (including childCases)
        self.invalidateCollectionGroups()
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
  }
}))
// performs the specified action so that response actions are included and undo/redo strings assigned
.actions(applyUndoableAction)

export interface IDataSet extends Instance<typeof DataSet> {}
export interface IDataSetSnapshot extends SnapshotIn<typeof DataSet> {}
