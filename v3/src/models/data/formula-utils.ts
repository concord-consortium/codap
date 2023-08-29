import { parse, MathNode, isFunctionNode, isSymbolNode } from "mathjs"
import {
  AGGREGATE_SYMBOL_SUFFIX, LOCAL_ATTR, GLOBAL_VALUE, DisplayNameMap, IFormulaDependency, ILocalAttributeDependency,
} from "./formula-types"
import { typedFnRegistry } from "./formula-fn-registry"

// Set of formula helpers that can be used outside FormulaManager context. It should make them easier to test.

export const generateCanonicalSymbolName = (name: string, aggregate: boolean, displayNameMap: DisplayNameMap) => {
  let canonicalName = null
  if (name in displayNameMap.localNames) {
    canonicalName = displayNameMap.localNames[name]
    // Consider following formula example:
    // "mean(Speed) + Speed"
    // `Speed` is one that should be resolved to two very different values depending on the context:
    // - if Speed is not an argument of aggregate function, it should be resolved to the current case value
    // - if Speed is an argument of aggregate function, it should be resolved to an array containing all the values
    // This differentiation can be done using the suffixes added to the symbol name.
    if (aggregate) {
      canonicalName += AGGREGATE_SYMBOL_SUFFIX
    }
  }
  return canonicalName
}

export const parseCanonicalSymbolName = (canonicalName: string): IFormulaDependency | null => {
  if (canonicalName.startsWith(LOCAL_ATTR)) {
    const attrId = canonicalName.substring(LOCAL_ATTR.length)
    const result: ILocalAttributeDependency = { type: "localAttribute", attrId }
    if (attrId.endsWith(AGGREGATE_SYMBOL_SUFFIX)) {
      result.attrId = attrId.substring(0, attrId.length - AGGREGATE_SYMBOL_SUFFIX.length)
      result.aggregate = true
    }
    return result
  }
  if (canonicalName.startsWith(GLOBAL_VALUE)) {
    const globalId = canonicalName.substring(GLOBAL_VALUE.length)
    return { type: "globalValue", globalId }
  }
  return null
}

export const customizeFormula = (formula: string) => {
  // Replace all the assignment operators with equality operators, as CODAP v2 uses a single "=" for equality check.
  // Over time, this function might grow significantly and require more advanced parsing of the formula.
  return formula.replace(/=/g, "==")
}

// Function replaces all the symbol names typed by user (display names) with the symbol canonical names that
// can be resolved by formula context and do not rely on user-based display names.
export const canonicalizeExpression = (displayExpression: string, displayNameMap: DisplayNameMap) => {
  const formulaTree = parse(customizeFormula(displayExpression))

  interface IExtendedMathNode extends MathNode {
    isDescendantOfAggregateFunc?: boolean
  }
  const visitNode = (node: IExtendedMathNode, path: string, parent: IExtendedMathNode) => {
    if (isFunctionNode(node) && typedFnRegistry[node.fn.name].isAggregate || parent?.isDescendantOfAggregateFunc) {
      node.isDescendantOfAggregateFunc = true
    }
    if (isFunctionNode(node) && typedFnRegistry[node.fn.name].isSemiAggregate) {
      // Current semi-aggregate functions usually have the following signature:
      // fn(expression, defaultValue, filter)
      // Symbols used in `expression` and `filter` arguments should be treated as aggregate symbols.
      // In this case, `isSemiAggregate` would be equal to [true, false, true].
      typedFnRegistry[node.fn.name].isSemiAggregate?.forEach((isAggregateArgument, index) => {
        if (isAggregateArgument) {
          (node.args[index] as IExtendedMathNode).isDescendantOfAggregateFunc = true
        }
      })
    }
    const isDescendantOfAggregateFunc = !!node.isDescendantOfAggregateFunc
    if (isSymbolNode(node)) {
      const canonicalName = generateCanonicalSymbolName(node.name, isDescendantOfAggregateFunc, displayNameMap)
      if (canonicalName) {
        node.name = canonicalName
      }
    }
    // Some functions have special kind of dependencies that need to be canonicalized in a custom way
    // (eg. lookupByIndex, lookupByKey).
    if (isFunctionNode(node) && typedFnRegistry[node.fn.name]) {
      // Note that parseArguments will modify args array in place, because we're passing canonicalizeWith option.
      typedFnRegistry[node.fn.name].canonicalize?.(node.args, displayNameMap)
    }
  }
  formulaTree.traverse(visitNode)
  return formulaTree.toString()
}

export const getFormulaDependencies = (formulaCanonical: string) => {
  const formulaTree = parse(formulaCanonical)
  const result: IFormulaDependency[] = []
  const visitNode = (node: MathNode) => {
    if (isSymbolNode(node)) {
      const parsedName = parseCanonicalSymbolName(node.name)
      if (parsedName) {
        result.push(parsedName)
      }
    }
    // Some functions have special kind of dependencies that need to be calculated in a custom way
    // (eg. lookupByIndex, lookupByKey).
    if (isFunctionNode(node) && typedFnRegistry[node.fn.name]) {
      const dependency = typedFnRegistry[node.fn.name].getDependency?.(node.args)
      if (dependency) {
        result.push(dependency)
      }
    }
  }
  formulaTree.traverse(visitNode)
  return result
}
