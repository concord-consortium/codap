import { ConstantNode, FunctionNode, SymbolNode } from "mathjs/number"
import { isConstantStringNode, isNonFunctionSymbolNode } from "./mathjs-utils"

describe("isConstantStringNode", () => {
  it("returns true if the node is a constant node with string value", () => {
    const node = new ConstantNode("foo")
    expect(isConstantStringNode(node)).toBe(true)
  })
  it("returns false if the node is not a string constant node", () => {
    const node = new ConstantNode(123)
    expect(isConstantStringNode(node)).toBe(false)
  })
})

describe("isNonFunctionSymbolNode", () => {
  it("returns true if the node is a symbol node and the parent is not a function node", () => {
    const node = new SymbolNode("foo")
    const parent = new SymbolNode("bar")
    expect(isNonFunctionSymbolNode(node, parent)).toBe(true)
  })
  it("returns false if the node is not a symbol node", () => {
    const node = new ConstantNode(123)
    const parent = new ConstantNode("bar")
    expect(isNonFunctionSymbolNode(node, parent)).toBe(false)
  })
  it("returns false if the parent is a function node and the function name is the same as the symbol node", () => {
    const node = new SymbolNode("foo")
    const parent = new FunctionNode<SymbolNode>(node, [])
    expect(isNonFunctionSymbolNode(node, parent)).toBe(false)
  })
})
