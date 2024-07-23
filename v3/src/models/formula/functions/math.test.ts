import { MathNode, SymbolNode, parse } from "mathjs"
import { FormulaMathJsScope } from "../formula-mathjs-scope"
import {
  evaluateRawWithAggregateContext, evaluateRawWithDefaultArg, evaluateToEvaluateRaw, evaluateWithAggregateContextSupport
} from "./math"
import { FValue, FValueOrArray } from "../formula-types"

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
    const partitionedMap = { a: scope } as any as { a: FormulaMathJsScope }
    let result = false
    const mockFn = jest.fn(() => { result = scope.aggregateContext; return "" })

    evaluateRawWithAggregateContext(mockFn)(args, mathjs, partitionedMap)
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
    const partitionedMap = { a: scope } as any as { a: FormulaMathJsScope }
    const mockFn = jest.fn((_args: MathNode[]) => (_args[0] as SymbolNode).name)

    const numOfReqArgs = 1
    const res = evaluateRawWithDefaultArg(mockFn, numOfReqArgs)(args, mathjs, partitionedMap)
    expect(mockFn).toHaveBeenCalledWith([scope.defaultArgumentNode], mathjs, scope)
    expect(res).toEqual("default")
  })

  it("should call provided function without default argument if enough arguments are provided", () => {
    const args = [ { name: "provided" } ]
    const mathjs = {}
    const scope = {
      defaultArgumentNode: { name: "default" }
    }
    const partitionedMap = { a: scope } as any as { a: FormulaMathJsScope }
    const mockFn = jest.fn((_args: MathNode[]) => (_args[0] as SymbolNode).name)

    const res =
      evaluateRawWithDefaultArg(mockFn, 1)(args as any as MathNode[], mathjs, partitionedMap)
    expect(mockFn).toHaveBeenCalledWith(args, mathjs, scope)
    expect(res).toEqual("provided")
  })
})

describe("evaluateToEvaluateRaw", () => {
  it("should call provided function with evaluated arguments", () => {
    const args = [ parse("1"), parse("2") ]
    const mathjs = {}
    const scope = {}
    const partitionedMap = { a: scope } as any as { a: FormulaMathJsScope }
    const mockFn = jest.fn((a: FValueOrArray, b: FValueOrArray) => Number(a) + Number(b))

    const res = evaluateToEvaluateRaw(mockFn)(args as any as MathNode[], mathjs, partitionedMap)
    expect(mockFn).toHaveBeenCalledWith(1, 2)
    expect(res).toEqual(3)
  })
})

describe("evaluateWithAggregateContextSupport", () => {
  it("should call provided function for each element of the array argument", () => {
    const args = [ [ 1, 2 ], [ 3, 4 ] ]
    const mockFn = jest.fn((a: FValue, b: FValue) => Number(a) + Number(b))
    const res = evaluateWithAggregateContextSupport(mockFn)(...args)
    expect(mockFn).toHaveBeenCalledTimes(2)
    expect(res).toEqual([ 4, 6 ])
  })

  it("should support mix of array and single value arguments", () => {
    const mockFn = jest.fn((a: FValue, b: FValue) => Number(a) + Number(b))
    let res = evaluateWithAggregateContextSupport(mockFn)(...[ [ 1, 2 ], 3 ])
    expect(mockFn).toHaveBeenCalledTimes(2)
    expect(res).toEqual([ 4, 5 ])

    res = evaluateWithAggregateContextSupport(mockFn)(...[ 1, [ 2, 3 ] ])
    expect(mockFn).toHaveBeenCalledTimes(4)
    expect(res).toEqual([ 3, 4 ])

    res = evaluateWithAggregateContextSupport(mockFn)(...[ 1, 2 ])
    expect(mockFn).toHaveBeenCalledTimes(5)
    expect(res).toEqual(3)
  })
})
