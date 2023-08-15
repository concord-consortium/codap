import { IFormulaMathjsScope, AGGREGATE_SYMBOL_SUFFIX, GLOBAL_VALUE, LOCAL_ATTR } from "./formula-types"
import type { IGlobalValueManager } from "../global/global-value-manager"
import type { IDataSet } from "./data-set"

// Note that Mathjs accepts two kinds of scope: an object or Map-like object. We use the former approach, as it should
// be more efficient. Each property is defined once during scope construction so the access should be fast. If we had to
// use Map#get property, this method would need to parse provided property name. It might not be too bad, but if it
// happened repeatedly for multiple thousands of cases, it could add up to the formula evaluation time.
export const getFormulaMathjsScope = (
  localDataSet: IDataSet, dataSets: Map<string, IDataSet>, globalValueManager?: IGlobalValueManager
) => {
  const scope: IFormulaMathjsScope = {
    caseId: "",
    setCaseId(caseId: string) {
      this.caseId = caseId
    },
    localDataSet,
    globalValueManager,
    dataSets
  }

  // Provide local dataset attribute symbols.
  localDataSet.attributes.forEach(attr => {
    Object.defineProperty(scope, `${LOCAL_ATTR}${attr.id}`, {
      get() {
        return localDataSet.getValue(scope.caseId, attr.id)
      }
    })

    Object.defineProperty(scope, `${LOCAL_ATTR}${attr.id}${AGGREGATE_SYMBOL_SUFFIX}`, {
      get() {
        return attr.strValues
      }
    })
  })

  // Provide global value symbols.
  globalValueManager?.globals.forEach(global => {
    Object.defineProperty(scope, `${GLOBAL_VALUE}${global.id}`, {
      get() {
        return global.value
      }
    })
  })

  return scope
}
