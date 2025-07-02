import { parse } from "mathjs"
import {
  cachedAggregateFnFactory
} from "@concord-consortium/codap-formulas/models/formula/functions/aggregate-functions"
import { FormulaMathJsScope } from "../formula-mathjs-scope"
import { evaluate } from "../test-utils/formula-test-utils"

describe("cachedAggregateFnFactory", () => {
  it("returns a function wrapper that caches results based on the argument and caseAggregateGroupId", () => {
    const fn = jest.fn(() => 123)
    const cachedFn = cachedAggregateFnFactory("testFunction", fn)

    const cache = new Map()
    const scope = {
      getCaseAggregateGroupId: jest.fn(() => "testGroup"),
      setCached: (key: string, val: any) => cache.set(key, val),
      getCached: (key: string) => cache.get(key)
    } as any as FormulaMathJsScope
    const currentScope = { a: scope, b: new Map() }

    expect(cachedFn([ parse("1"), parse("2") ], null, currentScope)).toEqual(123)
    expect(fn).toHaveBeenCalledTimes(1)

    expect(cachedFn([ parse("1"), parse("2") ], null, currentScope)).toEqual(123)
    expect(fn).toHaveBeenCalledTimes(1) // Same arguments as in the previous call, cache should be used.

    expect(cachedFn([ parse("1"), parse("2"), parse("3") ], null, currentScope)).toEqual(123)
    expect(fn).toHaveBeenCalledTimes(2) // Different arguments, so cache should not be used.

    expect(cachedFn([ parse("1"), parse("2"), parse("3") ], null, currentScope)).toEqual(123)
    expect(fn).toHaveBeenCalledTimes(2) // Same arguments as in the previous call, cache should be used.

    // Update scope.getCaseAggregateGroupId
    ;(scope.getCaseAggregateGroupId as jest.Mock).mockImplementation(() => "newTestGroup")
    expect(cachedFn([ parse("1"), parse("2"), parse("3") ], null, currentScope)).toEqual(123)
    expect(fn).toHaveBeenCalledTimes(3) // New caseAggregateGroupId, so cache should not be used.

    expect(cachedFn([ parse("1"), parse("2"), parse("3") ], null, currentScope)).toEqual(123)
    expect(fn).toHaveBeenCalledTimes(3) // Same arguments and caseAggregateGroupId, cache should be used.
  })
})

describe("combine", () => {
  it("works as expected", () => {
    expect(evaluate(`combine(Diet, Order="Proboscidae")`)).toBe("plantsplants")
  })
})
