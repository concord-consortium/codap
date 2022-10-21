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

import { observable } from "mobx"
import { addMiddleware, getEnv, Instance, types } from "mobx-state-tree"
import { Attribute, IAttribute, IAttributeSnapshot, IValueType } from "./attribute"
import { CollectionModel, ICollectionModelSnapshot } from "./collection"
import { uniqueId, uniqueOrderedId } from "../utilities/js-utils"

export const newCaseId = uniqueOrderedId

export const CaseID = types.model("CaseID", {
  __id__: types.optional(types.identifier, () => newCaseId())
})
export interface ICaseID extends Instance<typeof CaseID> {}

export interface ICase {
  __id__: string;
  [key: string]: IValueType;
}
export interface ICaseCreation {
  __id__?: string;
  [key: string]: IValueType | null;
}

export type ICaseFilter = (attrId: (name: string) => string, aCase: ICase) => ICase | undefined

export interface IGetCaseOptions {
  // canonical cases have attribute ids as property keys (rather than names)
  canonical?: boolean;
  // numeric cases convert all valid numeric values to numbers
  // non-numeric cases return all property values as strings
  numeric?: boolean;
}

export interface IGetCasesOptions extends IGetCaseOptions {
  count?: number;
}
export interface IAddCaseOptions {
  // id(s) of case(s) before which to insert new cases
  // if not specified, new cases are appended
  before?: string | string[];
  after?: string | string[];
}

export interface IMoveAttributeOptions {
  before?: string;  // id of attribute before which the moved attribute should be placed
  after?: string;   // id of attribute after which the moved attribute should be placed
}

export interface IDerivationSpec {
  attributeIDs?: string[];
  filter?: ICaseFilter;
  synchronize?: boolean;
}

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

export const DataSet = types.model("DataSet", {
  id: types.optional(types.identifier, () => uniqueId()),
  sourceID: types.maybe(types.string),
  name: types.maybe(types.string),
  collections: types.array(CollectionModel),
  attributes: types.array(Attribute),
  cases: types.array(CaseID),
  // for serialization only, not for dynamic selection tracking
  snapSelection: types.array(types.string)
})
.volatile(self => ({
  transactionCount: 0,
  selection: observable.set<string>()
}))
.views(self => {
  let cachingCount = 0
  const caseCache = new Map<string, ICase>()
  return {
    get isCaching() {
      return cachingCount > 0
    },
    get caseCache() {
      return caseCache
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
.extend(self => {
  /*
   * private closure
   */
  const attrIDMap: { [index: string]: IAttribute } = {},
        // map from attribute names to attribute IDs
        attrNameMap: { [index: string]: string } = {},
        // map from case IDs to indices
        caseIDMap: { [index: string]: number } = {},
        disposers: { [index: string]: () => void } = {}

  const attrIDFromName = (name: string) => attrNameMap[name]

  function attrIndexFromID(id: string) {
    const index = self.attributes.findIndex(attr => attr.id === id )
    return index >= 0 ? index : undefined
  }

  function getCase(caseID: string, options?: IGetCaseOptions): ICase | undefined {
    const index = caseIDMap[caseID]
    if (index == null) { return undefined }

    const { canonical = true, numeric = true } = options || {}
    const aCase: ICase = { __id__: caseID }
    self.attributes.forEach((attr) => {
      const key = canonical ? attr.id : attr.name
      aCase[key] = numeric && attr.isNumeric(index) ? attr.numeric(index) : attr.value(index)
    })
    return aCase
  }

  function getCaseAtIndex(index: number, options?: IGetCaseOptions) {
    const aCase = self.cases[index],
          id = aCase?.__id__
    return id ? getCase(id, options) : undefined
  }

  function beforeIndexForInsert(index: number, beforeID?: string | string[]) {
    if (!beforeID) { return self.cases.length }
    return Array.isArray(beforeID)
            ? caseIDMap[beforeID[index]]
            : caseIDMap[beforeID]
  }

  function afterIndexForInsert(index: number, afterID?: string | string[]) {
    if (!afterID) { return self.cases.length }
    return Array.isArray(afterID)
            ? caseIDMap[afterID[index]] + 1
            : caseIDMap[afterID] + 1
  }

  function insertCaseIDAtIndex(id: string, beforeIndex: number) {
    // const newCase = { __id__: id, __index__: beforeIndex };
    const newCase = { __id__: id }
    if ((beforeIndex != null) && (beforeIndex < self.cases.length)) {
      self.cases.splice(beforeIndex, 0, newCase )
      // increment indices of all subsequent cases
      for (let i = beforeIndex + 1; i < self.cases.length; ++i) {
        const aCase = self.cases[i]
        ++caseIDMap[aCase.__id__]
        // aCase.__index__ = i;
      }
    }
    else {
      self.cases.push(newCase)
      beforeIndex = self.cases.length - 1
    }
    caseIDMap[self.cases[beforeIndex].__id__] = beforeIndex
  }

  function setCaseValues(caseValues: ICase) {
    const index = caseIDMap[caseValues.__id__]
    if (index == null) { return }

    for (const key in caseValues) {
      if (key !== "__id__") {
        const attribute = attrIDMap[key]
        if (attribute) {
          const value = caseValues[key]
          attribute.setValue(index, value != null ? value : undefined)
        }
      }
    }
  }

  function getUniqueAttributeName(baseName: string, allowNames: (string | null)[]) {
    let newName = baseName
    const attrNames = self.attributes.map(function (attr) {
          return attr.name
        })
    let suffix = 1
    while ((attrNames.indexOf(newName) >= 0) && ((!allowNames || allowNames.indexOf(newName) < 0))) {
      newName = baseName + (++suffix)
    }
    return newName
  }

  return {
    /*
     * public views
     */
    views: {
      attrFromID(id: string) {
        return attrIDMap[id]
      },
      attrFromName(name: string) {
        const id = attrNameMap[name]
        return id ? attrIDMap[id] : undefined
      },
      attrIDFromName,
      attrIndexFromID,
      caseIndexFromID(id: string) {
        return caseIDMap[id]
      },
      caseIDFromIndex(index: number) {
        return getCaseAtIndex(index)?.__id__
      },
      nextCaseID(id: string) {
        const index = caseIDMap[id],
              nextCase = (index != null) && (index < self.cases.length - 1)
                          ? self.cases[index + 1] : undefined
        return nextCase?.__id__
      },
      getValue(caseID: string, attributeID: string) {
        return this.getValueAtIndex(caseIDMap[caseID], attributeID)
      },
      getValueAtIndex(index: number, attributeID: string) {
        const attr = attrIDMap[attributeID],
              caseID = self.cases[index]?.__id__,
              cachedCase = self.isCaching ? self.caseCache.get(caseID) : undefined
        return (cachedCase && Object.prototype.hasOwnProperty.call(cachedCase, attributeID))
                ? cachedCase[attributeID]
                : attr && (index != null) ? attr.value(index) : undefined
      },
      getNumeric(caseID: string, attributeID: string): number | undefined {
        return this.getNumericAtIndex(caseIDMap[caseID], attributeID)
      },
      getNumericAtIndex(index: number, attributeID: string) {
        const attr = attrIDMap[attributeID],
              caseID = self.cases[index]?.__id__,
              cachedCase = self.isCaching ? self.caseCache.get(caseID) : undefined
        return (cachedCase && Object.prototype.hasOwnProperty.call(cachedCase, attributeID))
                ? Number(cachedCase[attributeID])
                : attr && (index != null) ? attr.numeric(index) : undefined
      },
      getCase(caseID: string, options?: IGetCaseOptions): ICase | undefined {
        return getCase(caseID, options)
      },
      getCases(caseIDs: string[], options?: IGetCaseOptions): ICase[] {
        const cases: ICase[] = []
        caseIDs.forEach((caseID) => {
          const aCase = getCase(caseID, options)
          if (aCase) {
            cases.push(aCase)
          }
        })
        return cases
      },
      getCaseAtIndex(index: number, options?: IGetCaseOptions) {
        return getCaseAtIndex(index, options)
      },
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
        return self.selection.has(caseId)
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

        // build attrIDMap
        self.attributes.forEach(attr => {
          attrIDMap[attr.id] = attr
          attrNameMap[attr.name] = attr.id
        })

        // build caseIDMap
        self.cases.forEach((aCase, index) => {
          caseIDMap[aCase.__id__] = index
        })

        // set up middleware to add ids to inserted attributes and cases
        // adding the ids in middleware makes them available as action arguments
        // to derived DataSets.
        if (!srcDataSet) {
          disposers.addIdsMiddleware = addMiddleware(self, (call, next) => {
            if (call.name === "addAttribute") {
              const { id = uniqueId(), ...others } = call.args[0] as IAttributeSnapshot
              call.args[0] = { id, ...others }
            }
            else if (call.name === "addCases") {
              call.args[0] = (call.args[0] as ICaseCreation[]).map(iCase => {
                const { __id__ = newCaseId(), ...others } = iCase
                return { __id__, ...others }
              })
            }
            next(call)
          })
        }
      },
      beforeDestroy() {
        Object.keys(disposers).forEach((key: string) => disposers[key]())
      },
      beginTransaction() {
        ++self.transactionCount
      },
      endTransaction() {
        --self.transactionCount
      },
      // should be called before retrieving snapshot (pre-serialization)
      prepareSnapshot() {
        self.attributes.forEach(attr => attr.prepareSnapshot())
      },
      // should be called after retrieving snapshot (post-serialization)
      completeSnapshot() {
        self.attributes.forEach(attr => attr.completeSnapshot())
      },
      setName(name: string) {
        self.name = name
      },
      addCollection(snapshot: ICollectionModelSnapshot) {
        self.collections.push(CollectionModel.create(snapshot))
      },
      addAttribute(snapshot: IAttributeSnapshot, beforeID?: string) {
        let beforeIndex = beforeID ? attrIndexFromID(beforeID) ?? -1 : -1
        if (beforeIndex >= 0) {
          self.attributes.splice(beforeIndex, 0, snapshot)
        }
        else {
          beforeIndex = self.attributes.push(snapshot) - 1
        }
        const attribute = self.attributes[beforeIndex]
        attrIDMap[attribute.id] = attribute
        attrNameMap[attribute.name] = attribute.id
        for (let i = attribute.strValues.length; i < self.cases.length; ++i) {
          attribute.addValue()
        }
      },

      setAttributeName(attributeID: string, name: string) {
        const attribute = attributeID && attrIDMap[attributeID]
        if (attribute) {
          const currAttrName =  attribute.name || null
          const uniqueAttrName = getUniqueAttributeName(name, [currAttrName])
          delete attrNameMap[attribute.name]
          attribute.setName(uniqueAttrName)
          attrNameMap[uniqueAttrName] = attributeID
        }
      },

      showAllAttributes() {
        self.attributes.forEach(attr => attr.setHidden(false))
      },

      removeAttribute(attributeID: string) {
        const attrIndex = attrIndexFromID(attributeID),
              attribute = attributeID ? attrIDMap[attributeID] : undefined,
              attrName = attribute?.name
        if (attrIndex != null) {
          self.attributes.splice(attrIndex, 1)
          attributeID && delete attrIDMap[attributeID]
          attrName && delete attrNameMap[attrName]
        }
      },

      moveAttribute(attributeID: string, options?: IMoveAttributeOptions) {
        const beforeAttrIndex = options?.before ? attrIndexFromID(options.before) : undefined
        const afterAttrIndex = options?.after ? attrIndexFromID(options.after) : undefined
        if (attrIDMap[attributeID]) {
          const dstOrder: Record<string, number> = {}
          self.attributes.forEach((attr, i) => dstOrder[attr.id] = i)
          // assign the moved attribute an "index" value corresponding to its destination
          dstOrder[attributeID] = beforeAttrIndex != null
                                    ? beforeAttrIndex - 0.5
                                    : afterAttrIndex != null
                                        ? afterAttrIndex + 0.5
                                        : self.attributes.length
          // sort the attributes by the adjusted "indices"
          self.attributes.sort((a, b) => dstOrder[a.id] - dstOrder[b.id])
        }
      },

      addCases(cases: ICaseCreation[], options?: IAddCaseOptions) {
        const { before, after } = options || {}
        cases.forEach((aCase, index) => {
          // shouldn't ever have to assign an id here since the middleware should do so
          const { __id__ = newCaseId() } = aCase
          const insertPosition = after ? afterIndexForInsert(index, after) : beforeIndexForInsert(index, before)
          self.attributes.forEach((attr: IAttribute) => {
            const value = aCase[attr.id]
            attr.addValue(value != null ? value : undefined, insertPosition)
          })
          insertCaseIDAtIndex(__id__, insertPosition)
        })
      },

      setCaseValues(cases: ICase[]) {
        if (self.isCaching) {
          // update the cases in the cache
          cases.forEach(aCase => {
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
          cases.forEach((caseValues) => {
            setCaseValues(caseValues)
          })
        }
      },

      removeCases(caseIDs: string[]) {
        caseIDs.forEach((caseID) => {
          const index = caseIDMap[caseID]
          if (index != null) {
            self.cases.splice(index, 1)
            self.attributes.forEach((attr) => {
              attr.removeValues(index)
            })
            delete caseIDMap[caseID]
            for (let i = index; i < self.cases.length; ++i) {
              const id = self.cases[i].__id__
              caseIDMap[id] = i
            }
          }
        })
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
        caseIds.forEach(id => {
          if (select) {
            self.selection.add(id)
          }
          else {
            self.selection.delete(id)
          }
        })
      },

      setSelectedCases(caseIds: string[]) {
        this.selectAll(false)
        this.selectCases(caseIds)
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

export interface IDataSet extends Instance<typeof DataSet> {}
