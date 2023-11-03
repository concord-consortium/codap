import { MathNode, SymbolNode, parse } from "mathjs"
import { FormulaMathJsScope } from "../formula-mathjs-scope"
import { evaluateRawWithAggregateContext, evaluateRawWithDefaultArg, evaluateToEvaluateRaw } from "./math"
import { FValue } from "../formula-types"

describe("evaluateRawWithAggregateContext", () => {
  it("should call provided function within withAggregateContext", () => {
    const args: MathNode[] = []
    const mathjs = {}
    const scope = {
      aggregateContext: false,
      withAggregateContext: (fn: () => any) => {
        scope.aggregateContext = true
        fn()
        scope.aggregateContext = false
      }
    }
    let result = false
    const mockFn = jest.fn(() => { result = scope.aggregateContext; return "" })

    evaluateRawWithAggregateContext(mockFn)(args, mathjs, scope as any as FormulaMathJsScope)
    expect(mockFn).toHaveBeenCalledWith(args, mathjs, scope)
    expect(result).toBeTruthy()
  })
})

describe("evaluateRawWithDefaultArg", () => {
  it("should call provided function with default argument if not enough arguments are provided", () => {
    const args: MathNode[] = []
    const mathjs = {}
    const scope = {
      defaultArgumentNode: { name: "default" }
    }
    const mockFn = jest.fn((_args: MathNode[]) => (_args[0] as SymbolNode).name)

    const numOfReqArgs = 1
    const res = evaluateRawWithDefaultArg(mockFn, numOfReqArgs)(args, mathjs, scope as any as FormulaMathJsScope)
    expect(mockFn).toHaveBeenCalledWith([scope.defaultArgumentNode], mathjs, scope)
    expect(res).toEqual("default")
  })

  it("should call provided function without default argument if enough arguments are provided", () => {
    const args = [ { name: "provided" } ]
    const mathjs = {}
    const scope = {
      defaultArgumentNode: { name: "default" }
    }
    const mockFn = jest.fn((_args: MathNode[]) => (_args[0] as SymbolNode).name)

    const res =
      evaluateRawWithDefaultArg(mockFn, 1)(args as any as MathNode[], mathjs, scope as any as FormulaMathJsScope)
    expect(mockFn).toHaveBeenCalledWith(args, mathjs, scope)
    expect(res).toEqual("provided")
  })
})

describe("evaluateToEvaluateRaw", () => {
  it("should call provided function with evaluated arguments", () => {
    const args = [ parse("1"), parse("2") ]
    const mathjs = {}
    const scope = {}
    const mockFn = jest.fn((a: FValue, b: FValue) => Number(a) + Number(b))

    const res = evaluateToEvaluateRaw(mockFn)(args as any as MathNode[], mathjs, scope as any as FormulaMathJsScope)
    expect(mockFn).toHaveBeenCalledWith(1, 2)
    expect(res).toEqual(3)
  })
})
