import { create, all, SymbolNode, ConstantNode } from 'mathjs'
import type { IFormulaMathjsScope } from './formula-mathjs-scope'
import { getValueOrName } from './formula-utils'

export const math = create(all)

// For some reason, Mathjs transforms our scope into a Map, so we need to use this type
type MathJSShallowCopyOfScope = Map<keyof IFormulaMathjsScope, any>

// lookupByIndex("dataSetName", "attributeName", index)
// A simpler form is also supported in V3: lookupByIndex(dataSetName, attributeName) -> as long as dataSetName
// and attributeName do not include whitespace.
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

// import the new function in the math namespace
math.import({
  lookupByIndex
})
