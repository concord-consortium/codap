import { AGGREGATE_SYMBOL_SUFFIX, GLOBAL_VALUE, LOCAL_ATTR } from "./formula-types"
import type { IGlobalValueManager } from "../global/global-value-manager"
import type { IDataSet } from "./data-set"

export interface IFormulaMathjsScopeContext {
  localDataSet: IDataSet
  dataSets: Map<string, IDataSet>
  globalValueManager?: IGlobalValueManager
}

// Official MathJS docs don't describe custom scopes in great detail, but there's a good example in their repo:
// https://github.com/josdejong/mathjs/blob/develop/examples/advanced/custom_scope_objects.js
export class FormulaMathJsScope {
  context: IFormulaMathjsScopeContext
  caseId = ""
  dataStorage: Record<string, any> = {}

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

      Object.defineProperty(this.dataStorage, `${LOCAL_ATTR}${attr.id}${AGGREGATE_SYMBOL_SUFFIX}`, {
        get: () => {
          return attr.strValues
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

  getDataSet(dataSetId: string) {
    return this.context.dataSets.get(dataSetId)
  }
}
