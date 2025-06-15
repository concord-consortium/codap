import { ConstantNode, MathNode, SymbolNode, isConstantNode, isFunctionNode, isSymbolNode } from "mathjs"

export const isConstantStringNode = (node: MathNode): node is ConstantNode<string> =>
  isConstantNode(node) && typeof node.value === "string"

// Note that when MathJS encounters function, it'll create a function node and a separate symbol node for the function
// name. In most cases, it's more useful to handle function node explicitly and skip the function name symbol node.
export const isNonFunctionSymbolNode = (node: MathNode, parent: MathNode): node is SymbolNode =>
  isSymbolNode(node) && (!isFunctionNode(parent) || parent.fn !== node)
