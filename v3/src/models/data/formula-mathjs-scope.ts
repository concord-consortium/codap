import { AGGREGATE_SYMBOL_SUFFIX, GLOBAL_VALUE, LOCAL_ATTR, NO_PARENT_KEY } from "./formula-types"
import type { IGlobalValueManager } from "../global/global-value-manager"
import type { IDataSet } from "./data-set"
import type { IValueType } from "./attribute"

const CACHE_ENABLED = true

export interface IFormulaMathjsScopeContext {
  localDataSet: IDataSet
  dataSets: Map<string, IDataSet>
  globalValueManager?: IGlobalValueManager
  formulaAttributeCollectionId?: string
  caseGroupId: Record<string, string>
}

// Official MathJS docs don't describe custom scopes in great detail, but there's a good example in their repo:
// https://github.com/josdejong/mathjs/blob/develop/examples/advanced/custom_scope_objects.js
export class FormulaMathJsScope {
  parent?: FormulaMathJsScope
  context: IFormulaMathjsScopeContext
  caseId = ""
  dataStorage: Record<string, any> = {}
  cache = new Map<string, any>()
  // Expression is meant to be cacheable by default. Once it references a value that makes it not cacheable, this
  // state property will be updated (e.g. when it references a case-dependent attribute).
  cacheable = true

  constructor (context: IFormulaMathjsScopeContext, parent?: FormulaMathJsScope) {
    this.context = context

    // In regular MathJS use case, a subscope is used to create a new scope for a function call. It needs to ensure
    // that variables from subscope cannot overwrite variables from the parent scope. However, since we don't allow
    // any variables to be set in the formula scope, we can reuse multiple data structures for simplicity and
    // performance reasons.
    if (parent) {
      this.parent = parent
      this.caseId = parent.caseId
      this.cache = parent.cache
    }
    // Cacheability does not depend on the parent. It's actually defined the other way - parent is not cacheable if
    // any of its children is not cacheable (see setNotCacheable() method).
    this.cacheable = true
    // Note that dataStorage cannot be reused, as it relies on closures and binding to correct `this` instance.
    // It needs to be recreated, but it is not a costly operation. Make sure that all the caching and
    // case processing is done lazily, only for attributes that are actually referenced by the formula.
    this.initDataStorage(context)
  }

  initDataStorage(context: IFormulaMathjsScopeContext) {
    // We could parse symbol name in get() function, but this should theoretically be faster, as it's done only once,
    // and no parsing is needed when the symbol is accessed for each dataset case.
    // First, provide local dataset attribute symbols.
    context.localDataSet.attributes.forEach(attr => {
      Object.defineProperty(this.dataStorage, `${LOCAL_ATTR}${attr.id}`, {
        get: () => {
          // Any expression that depends on case-dependent attribute is not cacheable.
          this.setNotCacheable()
          return context.localDataSet.getValue(this.caseId, attr.id)
        }
      })

      const allCasesForAttr = context.localDataSet.getCasesForAttributes([attr.id])
      const cachedGroup: Record<string, IValueType[]> = {}
      let cacheInitialized = false
      Object.defineProperty(this.dataStorage, `${LOCAL_ATTR}${attr.id}${AGGREGATE_SYMBOL_SUFFIX}`, {
        get: () => {
          // There are two separate kinds of aggregate cases grouping:
          // - Same-level grouping, which is used when the table is flat or when the aggregate function is referencing
          //   another attribute from the same collection. In this case the group ID is the currently processed case
          //   parent ID.
          // - Parent-child grouping, which is used when the table is hierarchical and the aggregate function is
          //   referencing an attribute from a different collection. In this case the group ID is the currently
          //   processed case ID.
          const attrCollectionId = context.localDataSet.getCollectionForAttribute(attr.id)?.id
          //  When the table is flat, collection IDs might be equal to undefined but equality check works anyway.
          const useSameLevelGrouping = context.formulaAttributeCollectionId === attrCollectionId

          if (!cacheInitialized) {
            // Cache is calculated lazily to avoid calculating it for all the attributes that are not referenced by
            // the formula. Note that each case is processed only once, so this mapping is only O(n) complexity.
            allCasesForAttr.forEach(c => {
              const groupId = context.caseGroupId[c.__id__]
              if (!cachedGroup[groupId]) {
                cachedGroup[groupId] = []
              }
              cachedGroup[groupId].push(context.localDataSet.getValue(c.__id__, attr.id))
            })
            cacheInitialized = true
          }
          // Same-level grouping uses parent ID as a group ID, parent-child grouping uses case ID as a group ID.
          const groupParentId = useSameLevelGrouping ? context.caseGroupId[this.caseId] : this.caseId
          if (!useSameLevelGrouping) {
            // Any expression that depends on parent-child grouping is not cacheable.
            this.setNotCacheable()
          }
          return cachedGroup[groupParentId] || cachedGroup[NO_PARENT_KEY]
        }
      })
    })

    // Then, provide global value symbols.
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

  // MathJS creates a separate subscope for every parsed and evaluated function call.
  createSubScope () {
    return new FormulaMathJsScope(this.context, this)
  }

  // --- Custom functions used by our formulas or formula manager --
  setNotCacheable() {
    if (this.cacheable) {
      this.parent?.setNotCacheable()
      this.cacheable = false
    }
  }

  isCacheable() {
    return this.cacheable
  }

  setCaseId(caseId: string) {
    this.caseId = caseId
  }

  getCaseId() {
    return this.caseId
  }

  getCaseIndex() {
    return this.context.localDataSet.caseIDMap[this.caseId]
  }

  getLocalDataSet() {
    return this.context.localDataSet
  }

  getDataSet(dataSetId: string) {
    return this.context.dataSets.get(dataSetId)
  }

  getCaseGroupId() {
    return this.context.caseGroupId[this.caseId]
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
