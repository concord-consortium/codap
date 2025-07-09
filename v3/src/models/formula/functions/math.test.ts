import { MathNode, SymbolNode, parse } from "mathjs"
import {
  evaluateRawWithAggregateContext, evaluateRawWithDefaultArg, evaluateToEvaluateRaw, evaluateWithAggregateContextSupport,
  registerMathjsFunction, typedFnRegistry, math
} from "@concord-consortium/codap-formulas/models/formula/functions/math"
import { FValue, FValueOrArray, MathJSPartitionedMap } from "../formula-types"
import { UNDEF_RESULT } from "./function-utils"

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
    const currentScope = { a: scope, b: new Map() } as any as MathJSPartitionedMap
    let result = false
    const mockFn = jest.fn(() => { result = scope.aggregateContext; return "" })

    evaluateRawWithAggregateContext(mockFn)(args, mathjs, currentScope)
    expect(mockFn).toHaveBeenCalledWith(args, mathjs, currentScope)
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
    const currentScope = { a: scope, b: new Map() } as any as MathJSPartitionedMap
    const mockFn = jest.fn((_args: MathNode[]) => (_args[0] as SymbolNode).name)

    const numOfReqArgs = 1
    const res = evaluateRawWithDefaultArg(mockFn, numOfReqArgs)(args, mathjs, currentScope)
    expect(mockFn).toHaveBeenCalledWith([scope.defaultArgumentNode], mathjs, currentScope)
    expect(res).toEqual("default")
  })

  it("should call provided function without default argument if enough arguments are provided", () => {
    const args = [ { name: "provided" } ]
    const mathjs = {}
    const scope = {
      defaultArgumentNode: { name: "default" }
    }
    const currentScope = { a: scope, b: new Map() } as any as MathJSPartitionedMap
    const mockFn = jest.fn((_args: MathNode[]) => (_args[0] as SymbolNode).name)

    const res =
      evaluateRawWithDefaultArg(mockFn, 1)(args as any as MathNode[], mathjs, currentScope)
    expect(mockFn).toHaveBeenCalledWith(args, mathjs, currentScope)
    expect(res).toEqual("provided")
  })
})

describe("evaluateToEvaluateRaw", () => {
  it("should call provided function with evaluated arguments", () => {
    const args = [ parse("1"), parse("2") ]
    const mathjs = {}
    const scope = {}
    const currentScope = { a: scope, b: new Map() } as any as MathJSPartitionedMap
    const mockFn = jest.fn((a: FValueOrArray, b: FValueOrArray) => Number(a) + Number(b))

    const res = evaluateToEvaluateRaw(mockFn)(args as any as MathNode[], mathjs, currentScope)
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

describe("registerMathjsFunction", () => {
  it("can add aliases of existing functions", () => {
    registerMathjsFunction("roof", typedFnRegistry["ceil"])
    const fn = math.compile("roof(x)")
    expect(fn.evaluate({ x: 1.2 })).toEqual(2)
    expect(fn.evaluate({ x: -1.2 })).toEqual(-1)
    expect(fn.evaluate({ x: "" })).toEqual(UNDEF_RESULT)
    expect(fn.evaluate({ x: "foo" })).toEqual(UNDEF_RESULT)
    expect(fn.evaluate({ x: [1.2, -1.2, 2.5, "foo"] })).toEqual([2, -1, 3, UNDEF_RESULT])
  })
})
