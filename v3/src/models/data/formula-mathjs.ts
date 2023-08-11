import { create, all, SymbolNode, ConstantNode } from 'mathjs'
import { getFormulaMathjsScope, type IFormulaMathjsScope } from './formula-mathjs-scope'
import { getValueOrName } from './formula-utils'
import { CODAPMathjsFunctions } from './formula-types'
import type { IDataSet } from './data-set'

export const math = create(all)

// For some reason, Mathjs transforms our scope into a Map, so we need to use this type
type MathJSShallowCopyOfScope = Map<keyof IFormulaMathjsScope, any>

// lookupByIndex("dataSetName", "attributeName", index)
const lookupByIndex =
  (args: (SymbolNode | ConstantNode)[], mathjs: any, scope: MathJSShallowCopyOfScope) => {
  // "dataSetName" will be treated as ConstantNode, while dataSetName will be treated as SymbolNode.
  const dataSetId = getValueOrName(args[0])?.toString() || ""
  const attrId = getValueOrName(args[1])?.toString() || ""
  const zeroBasedIndex = (Number(getValueOrName(args[2])) || 1) - 1
  return scope.get("dataSets")?.get(dataSetId)?.getValueAtIndex(zeroBasedIndex, attrId) || 0
}
// mark the function as "rawArgs", so it will be called with unevaluated arguments
lookupByIndex.rawArgs = true

// lookupByKey("dataSetName", "attributeName", "keyAttributeName", "keyAttributeValue" | localKeyAttribute)
const lookupByKey =
  (args: (SymbolNode | ConstantNode)[], mathjs: any, scope: MathJSShallowCopyOfScope) => {
  // "dataSetName" will be treated as ConstantNode, while dataSetName will be treated as SymbolNode.
  const dataSetId = getValueOrName(args[0])?.toString() || ""
  const attrId = getValueOrName(args[1])?.toString() || ""
  const keyAttributeId = getValueOrName(args[2])?.toString() || ""

  const dataSet: IDataSet = scope.get("dataSets")?.get(dataSetId)
  if (!dataSet) {
    return 0
  }

  const getValue = (keyAttributeValue: string) => {
    // TODO: is that the right way to access all the dataset cases?
    // TODO: Optimize? Sort and use binary search?
    for (const c of dataSet.cases) {
      const val = dataSet.getValue(c.__id__, keyAttributeId)
      if (val === keyAttributeValue) {
        return dataSet.getValue(c.__id__, attrId)
      }
    }
    // TODO: what is the correct value to return if the key attribute value is not found?
    return 0
  }

  if (args[3].type === "ConstantNode") {
    const keyAttributeValue = getValueOrName(args[3])?.toString() || ""
    return getValue(keyAttributeValue)
  } else if (args[3].type === "SymbolNode") {
    // TODO: Mathjs recreates our scope as a Map, but at the same time it looses most of the functionality...
    // Recreate the custom scope here as a workaround. Check if there's no bug in mathjs, as our original scope
    // wasn't a Map, so I guess it should be still provided as an object (or its copy).
    const realScope = getFormulaMathjsScope(
      scope.get("localDataSet"), scope.get("dataSets"), scope.get("globalValueManager")
    )
    realScope.setCaseId(scope.get("caseId"))

    const evaluatedSymbol = args[3].compile().evaluate(realScope)
    return getValue(evaluatedSymbol)
  }
}
// mark the function as "rawArgs", so it will be called with unevaluated arguments
lookupByKey.rawArgs = true

// import the new function in the math namespace
math.import({
  [CODAPMathjsFunctions.lookupByIndex]: lookupByIndex,
  [CODAPMathjsFunctions.lookupByKey]: lookupByKey
})
