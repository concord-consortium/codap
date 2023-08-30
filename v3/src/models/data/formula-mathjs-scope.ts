import { AGGREGATE_SYMBOL_SUFFIX, GLOBAL_VALUE, LOCAL_ATTR } from "./formula-types"
import type { IGlobalValueManager } from "../global/global-value-manager"
import type { IDataSet } from "./data-set"

const CACHE_ENABLED = false

export interface IFormulaMathjsScopeContext {
  localDataSet: IDataSet
  dataSets: Map<string, IDataSet>
  globalValueManager?: IGlobalValueManager
  formulaAttributeCollectionId?: string
}

// Official MathJS docs don't describe custom scopes in great detail, but there's a good example in their repo:
// https://github.com/josdejong/mathjs/blob/develop/examples/advanced/custom_scope_objects.js
export class FormulaMathJsScope {
  context: IFormulaMathjsScopeContext
  caseId = ""
  // child cases in hierarchical tables, or empty array in flat tables
  childCaseIds: string[] = []
  // all cases in flat tables, or group based on the closes parent in hierarchical tables
  sameLevelGroupIds: string[] = []
  dataStorage: Record<string, any> = {}
  cache = new Map<string, any>()

  constructor (context: IFormulaMathjsScopeContext) {
    this.context = context

    // We could parse symbol name in get() function, but this should theoretically be faster, as it's done only once,
    // and no parsing is needed when the symbol is accessed for each dataset case.
    // First, provide local dataset attribute symbols.
    context.localDataSet.attributes.forEach(attr => {
      Object.defineProperty(this.dataStorage, `${LOCAL_ATTR}${attr.id}`, {
        get: () => {
          return context.localDataSet.getValue(this.caseId, attr.id)
        }
      })

      const cachedSameLevelCases: Record<string, any> = {}
      Object.defineProperty(this.dataStorage, `${LOCAL_ATTR}${attr.id}${AGGREGATE_SYMBOL_SUFFIX}`, {
        get: () => {
          // Note that we have to return all the same level cases in two cases:
          // - the table is flat and aggregate function is referencing another attribute
          // - the table is hierarchical and aggregate function is referencing an attribute from the same collection
          // In both cases it's enough to compare collection ids. When the table is flat, they might be equal to
          // undefined but equality check works anyway.
          const attrCollectionId = context.localDataSet.getCollectionForAttribute(attr.id)?.id
          const useSameLevelCases = context.formulaAttributeCollectionId === attrCollectionId
          // Note that mapping childCaseIds might look like potential performance issue / O(n^2), but it's not.
          // When we're dealing with hierarchical data, each parent has distinct set of child cases, so we're not
          // processing any child case more than once. In other words, child cases sets never overlap and they always
          // sum to the total number of cases in the dataset.
          // However, when dealing with flat tables and returning all the cases over and over, we could easily
          // reach O(n^2) complexity just in the cases retrieval. That's why they need to be cached.
          if (useSameLevelCases) {
            if (!cachedSameLevelCases[this.caseId]) {
              cachedSameLevelCases[this.caseId] =
                this.sameLevelGroupIds.map(caseId => context.localDataSet.getValue(caseId, attr.id))
            }
            return cachedSameLevelCases[this.caseId]
          }
          return this.childCaseIds.map(caseId => context.localDataSet.getValue(caseId, attr.id))
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

  // In regular MathJS use case, a subscope is used to create a new scope for a function call. It needs to ensure
  // that variables from subscope cannot overwrite variables from the parent scope. However, since we don't allow
  // any variables to be set in the formula scope, we can just return the same scope for simplicity and
  // performance reasons.
  createSubScope () {
    return this
  }

  // --- Custom functions used by our formulas or formula manager --
  setCaseId(caseId: string) {
    this.caseId = caseId
  }

  setChildCaseIds(childCaseIds: string[]) {
    this.childCaseIds = childCaseIds
  }

  setSameLevelGroupIds(sameLevelGroupIds: string[]) {
    this.sameLevelGroupIds = sameLevelGroupIds
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
