import { parse, MathNode, SymbolNode, FunctionNode } from "mathjs"
import {
  AGGREGATE_SYMBOL_SUFFIX, LOCAL_ATTR, GLOBAL_VALUE, DisplayNameMap, IFormulaDependency, ILocalAttributeDependency
} from "./formula-types"

// Set of formula helpers that can be used outside FormulaManager context. It should make them easier to test.

const AGGREGATE_FUNCTION: Record<string, boolean> = {
  mean: true,
  sum: true,
  // TODO: add more functions while working on the aggregate functions support
}

export const isAggregateFunction = (name: string) => AGGREGATE_FUNCTION[name] === true

// Function replaces all the symbol names typed by user (display names) with the symbol canonical names that
// can be resolved by formula context and do not rely on user-based display names.
export const canonicalizeExpression = (displayExpression: string, displayNameMap: DisplayNameMap) => {
  const formulaTree = parse(displayExpression)

  interface IExtendedMathNode extends MathNode {
    isDescendantOfAggregateFunc?: boolean
  }

  const visitNode = (node: IExtendedMathNode, path: string, parent: IExtendedMathNode) => {
    if (node.type === "FunctionNode" && isAggregateFunction((node as FunctionNode).fn.name) ||
      parent?.isDescendantOfAggregateFunc) {
      node.isDescendantOfAggregateFunc = true
    }
    if (node.type === "SymbolNode") {
      const symbolNode = node as SymbolNode
      if (symbolNode.name in displayNameMap) {
        const newNode = symbolNode.clone()
        newNode.name = displayNameMap[symbolNode.name]
        // Consider following formula example:
        // "mean(Speed) + Speed"
        // `Speed` is one one that should be resolved to two very different values depending on the context:
        // - if Speed is not an argument of aggregate function, it should be resolved to the current case value
        // - if Speed is an argument of aggregate function, it should be resolved to an array containing all the values
        // This differentiation can be done using the suffixes added to the symbol name.
        if (parent.isDescendantOfAggregateFunc) {
          newNode.name += AGGREGATE_SYMBOL_SUFFIX
        }
        return newNode
      }
    }
    return node
  }

  return formulaTree.transform(visitNode)?.toString()
}

export const parseCanonicalSymbolName = (symbolName: string): IFormulaDependency | null => {
  if (symbolName.startsWith(LOCAL_ATTR)) {
    const attrId = symbolName.substring(LOCAL_ATTR.length)
    const result: ILocalAttributeDependency = { type: "localAttribute" as const, attrId }
    if (attrId.endsWith(AGGREGATE_SYMBOL_SUFFIX)) {
      result.attrId = attrId.substring(0, attrId.length - AGGREGATE_SYMBOL_SUFFIX.length)
      result.aggregate = true
    }
    return result
  }
  if (symbolName.startsWith(GLOBAL_VALUE)) {
    const globalId = symbolName.substring(GLOBAL_VALUE.length)
    return { type: "globalValue" as const, globalId }
  }
  return null
}

export const getFormulaDependencies = (formulaCanonical: string) => {
  const formulaTree = parse(formulaCanonical)
  const result: IFormulaDependency[] = []

  const visitNode = (node: MathNode) => {
    if (node.type === "SymbolNode") {
      const symbolNode = node as SymbolNode
      const parsedName = parseCanonicalSymbolName(symbolNode.name)
      if (parsedName) {
        result.push(parsedName)
      }
    }
  }
  formulaTree.traverse(visitNode)
  return result
}
