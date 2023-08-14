import { IGlobalValueManager } from "../global/global-value-manager"
import { IDataSet } from "./data-set"
import { AGGREGATE_SYMBOL_SUFFIX, GLOBAL_VALUE, LOCAL_ATTR } from "./formula-types"

// Note that Mathjs accepts two kinds of scope: an object or Map-like object. We use the former approach, as it should
// be more efficient. Each property is defined once during scope construction so the access should be fast. If we had to
// use Map#get property, this method would need to parse provided property name. It might not be too bad, but if it
// happened repeatedly for multiple thousands of cases, it could add up to the formula evaluation time.
export const getFormulaMathjsContext = (dataSet: IDataSet, globalValueManager?: IGlobalValueManager) => {
  const scope = {
    caseId: "",
    setCaseId(caseId: string) {
      this.caseId = caseId
    }
  }

  // Provide local dataset attribute symbols.
  dataSet.attributes.forEach(attr => {
    Object.defineProperty(scope, `${LOCAL_ATTR}${attr.id}`, {
      get() {
        return dataSet.getValue(scope.caseId, attr.id)
      }
    })

    // Moving lookup and mapping outside getters should speed up execution, as mapping is done only once.
    // We can do it, as aggregate values do not depend on caseId.
    const safeNumValues = attr.numValues.map(v => v === undefined || isNaN(v) ? 0 : v)
    Object.defineProperty(scope, `${LOCAL_ATTR}${attr.id}${AGGREGATE_SYMBOL_SUFFIX}`, {
      get() {
        // Is there any case where aggregate function call would make sense with string values?
        // It doesn't seem so, so numeric values are returned.
        return safeNumValues
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
