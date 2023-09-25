import {
  FValue, AGGREGATE_SYMBOL_SUFFIX, CASE_INDEX_FAKE_ATTR_ID, GLOBAL_VALUE, LOCAL_ATTR, NO_PARENT_KEY
} from "./formula-types"
import type { IGlobalValueManager } from "../global/global-value-manager"
import type { IDataSet } from "./data-set"
import type { IValueType } from "./attribute"
import type { ICase } from "./data-set-types"

const CACHE_ENABLED = true

export interface IFormulaMathjsScopeContext {
  formulaAttrId: string
  localDataSet: IDataSet
  dataSets: Map<string, IDataSet>
  childMostCollectionCases: ICase[]
  useSameLevelGrouping: boolean
  caseGroupId: Record<string, string>
  caseChildrenCount: Record<string, number>
  globalValueManager?: IGlobalValueManager
}

// Official MathJS docs don't describe custom scopes in great detail, but there's a good example in their repo:
// https://github.com/josdejong/mathjs/blob/develop/examples/advanced/custom_scope_objects.js
export class FormulaMathJsScope {
  context: IFormulaMathjsScopeContext
  caseId = ""
  dataStorage: Record<string, any> = {}
  caseIndexCache?: Record<string, number>
  // `cache` is used directly by custom formula functions like `prev`, `next` or other aggregate functions.
  cache = new Map<string, any>()
  // Previous result is used for calculating recursive functions like prev() referencing itself, e.g.:
  // prev(CumulativeValue, 0) + Value
  usePreviousCase = false
  previousResult: FValue = ""
  previousCaseId = ""

  constructor (context: IFormulaMathjsScopeContext) {
    this.context = context
    this.initDataStorage(context)
  }

  initDataStorage(context: IFormulaMathjsScopeContext) {
    // `caseIndex` is a special symbol that might be used by formulas.
    const localAttributeIds = context.localDataSet.attributes.map(a => a.id).concat(CASE_INDEX_FAKE_ATTR_ID)

    // We could parse symbol name in get() function, but this should theoretically be faster, as it's done only once,
    // and no parsing is needed when the symbol is accessed for each dataset case.
    // First, provide local dataset attribute symbols.
    localAttributeIds.forEach(attrId => {
      Object.defineProperty(this.dataStorage, `${LOCAL_ATTR}${attrId}`, {
        get: () => {
          return this.getLocalValue(this.caseId, attrId)
        }
      })

      // Make sure that all the caching and case processing is done lazily, only for attributes that are actually
      // referenced by the formula.
      let cachedGroup: Record<string, IValueType[]>
      Object.defineProperty(this.dataStorage, `${LOCAL_ATTR}${attrId}${AGGREGATE_SYMBOL_SUFFIX}`, {
        get: () => {
          if (this.usePreviousCase) {
            // Note that this block is only used by `prev()` function that has iterative approach to calculating
            // its values rather than relying on arrays of values like other aggregate functions. However, its arguments
            // are still considered aggregate, so caching and grouping works as expected.
            if (attrId === this.context.formulaAttrId) {
              // When formula references its own attribute, we cannot simply return case values - we're just trying
              // to calculate them. In most cases this is not allowed, but there are some exceptions, e.g. prev function
              // referencing its own attribute. It could be used to calculate cumulative value in a recursive way.
              return this.previousResult
            }
            return this.getLocalValue(this.previousCaseId, attrId)
          }

          if (!cachedGroup) {
            cachedGroup = {}
            // Cache is calculated lazily to avoid calculating it for all the attributes that are not referenced by
            // the formula. Note that each case is processed only once, so this mapping is only O(n) complexity.
            context.childMostCollectionCases.forEach(c => {
              const groupId = context.caseGroupId[c.__id__]
              if (!cachedGroup[groupId]) {
                cachedGroup[groupId] = []
              }
              cachedGroup[groupId].push(this.getLocalValue(c.__id__, attrId))
            })
          }
          return cachedGroup[this.getCaseGroupId()] || cachedGroup[NO_PARENT_KEY]
        }
      })
    })

    // Global value symbols.
    context.globalValueManager?.globals.forEach(global => {
      Object.defineProperty(this.dataStorage, `${GLOBAL_VALUE}${global.id}`, {
        get: () => {
          return global.value
        }
      })
    })
  }
  // --- Functions required by MathJS scope "interface". It doesn't seem to be defined/typed anywhere, so it's all
  //     based on: // https://github.com/josdejong/mathjs/blob/develop/examples/advanced/custom_scope_objects.js ---
  get(key: string): any {
    return this.dataStorage[key]
  }

  set() {
    throw new Error("It's not allowed to set local values in the formula scope.")
  }

  has(key: string) {
    return Object.prototype.hasOwnProperty.call(this.dataStorage, key)
  }

  keys(): any {
    return new Set(Object.keys(this.dataStorage))
  }

  delete() {
    throw new Error("It's not allowed to delete local values in the formula scope.")
  }

  clear () {
    throw new Error("It's not allowed to clear values in the formula scope.")
  }

  // MathJS requests a separate subscope for every parsed and evaluated function call.
  createSubScope () {
    // In regular MathJS use case, a subscope is used to create a new scope for a function call. It needs to ensure
    // that variables from subscope cannot overwrite variables from the parent scope. However, since we don't allow
    // any variables to be set in the formula scope, we can reuse the same scope instance.
    return this
  }

  // --- Custom functions used by our formulas or formula manager --
  getCaseIndex(caseId: string) {
    if (!this.caseIndexCache) {
      // Cache is calculated lazily to avoid calculating when not necessary.
      // Note that each case is processed only once, so this mapping is only O(n) complexity.
      this.caseIndexCache = {}
      const casesCount: Record<string, number> = {}
      this.context.childMostCollectionCases.forEach(c => {
        const groupId = this.context.caseGroupId[c.__id__]
        if (!casesCount[groupId]) {
          casesCount[groupId] = 0
        }
        casesCount[groupId] += 1
        this.caseIndexCache![c.__id__] = casesCount[groupId]
      })
    }
    return this.caseIndexCache[caseId]
  }

  getLocalValue(caseId: string, attrId: string) {
    return attrId === CASE_INDEX_FAKE_ATTR_ID
      ? this.getCaseIndex(caseId)
      : this.context.localDataSet.getValue(caseId, attrId)
  }

  setCaseId(caseId: string) {
    this.caseId = caseId
  }

  getCaseId() {
    return this.caseId
  }

  setPreviousCaseId(caseId: string) {
    this.previousCaseId = caseId
  }

  setPreviousResult(value: FValue) {
    this.previousResult = value
  }

  withPreviousCase(callback: () => void) {
    this.usePreviousCase = true
    callback()
    this.usePreviousCase = false
  }

  getCaseChildrenCount() {
    return this.context.caseChildrenCount[this.caseId] ?? 0
  }

  getLocalDataSet() {
    return this.context.localDataSet
  }

  getDataSet(dataSetId: string) {
    return this.context.dataSets.get(dataSetId)
  }

  getCaseGroupId() {
    // Same-level grouping uses parent ID as a group ID, parent-child grouping uses case ID as a group ID.
    return this.context.useSameLevelGrouping ? this.context.caseGroupId[this.caseId] : this.caseId
  }

  setCached(key: string, value: any) {
    if (CACHE_ENABLED) {
      this.cache.set(key, value)
    }
  }

  getCached(key: string) {
    if (CACHE_ENABLED) {
      return this.cache.get(key)
    }
    return undefined
  }
}
