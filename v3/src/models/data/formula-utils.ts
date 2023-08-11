import { parse, MathNode, SymbolNode, FunctionNode, ConstantNode } from "mathjs"
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

const LOOKUP_FUNCTION: Record<string, boolean> = {
  lookupByIndex: true,
  // TODO: add more functions while working on the lookup functions support
}

export const isLookupFunction = (name: string) => LOOKUP_FUNCTION[name] === true

export const getValueOrName = (node: MathNode) => {
  if (node.type === "SymbolNode") {
    return (node as SymbolNode).name
  }
  if (node.type === "ConstantNode") {
    return (node as ConstantNode).value
  }
  return ""
}

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
      if (symbolNode.name in displayNameMap.localNames) {
        const newNode = symbolNode.clone()
        newNode.name = displayNameMap.localNames[symbolNode.name]
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
    if (node.type === "FunctionNode" && isLookupFunction((node as FunctionNode).fn.name)) {
      const functionNode = node as FunctionNode
      const newNode = functionNode.cloneDeep()
      const dataSetName = getValueOrName(functionNode.args[0])?.toString() || ""
      const attrName = getValueOrName(functionNode.args[1])?.toString() || ""
      newNode.args[0] = new SymbolNode(displayNameMap.dataSet[dataSetName]?.id)
      newNode.args[1] = new SymbolNode(displayNameMap.dataSet[dataSetName]?.attribute[attrName])
      return newNode
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
    if (node.type === "FunctionNode" && isLookupFunction((node as FunctionNode).fn.name)) {
      const functionNode = node as FunctionNode
      const dataSetId = getValueOrName(functionNode.args[0])?.toString() || ""
      const attrId = getValueOrName(functionNode.args[1])?.toString() || ""
      if (functionNode.fn.name === "lookupByIndex") {
        const zeroBasedIndex = Number(getValueOrName(functionNode.args[2])) - 1 ?? undefined
        result.push({ type: "lookupByIndex" as const, dataSetId, attrId, index: zeroBasedIndex })
      }
      // TODO: lookupByKey
      // if (functionNode.fn.name === "lookupByKey") {

      // }
    }
  }
  formulaTree.traverse(visitNode)
  return result
}
