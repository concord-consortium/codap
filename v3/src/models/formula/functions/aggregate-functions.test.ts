import { parse } from "mathjs"
import { evaluate } from "../test-utils/formula-test-utils"
import { cachedAggregateFnFactory } from "./aggregate-functions"
import { UNDEF_RESULT } from "./function-utils"
import { FormulaMathJsScope } from "../formula-mathjs-scope"

// Note that aggregate functions require formula-test-utils since they use the custom MathJS scope API to support
// caching. Therefore, they cannot be simply tested using basic MathJS evaluation, similar to arithmetic functions.

// Most of the test use Speed attribute from Mammals dataset, as this attribute is mostly numeric, but has some
// empty values, which should be ignored by aggregate functions.

describe("mean", () => {
  it("returns correct value", () => {
    expect(evaluate("mean(Speed)")).toBeCloseTo(48.917)
  })

  it("supports filter expression", () => {
    expect(evaluate("mean(Speed, Diet = 'plants')")).toBeCloseTo(57.571)
  })

  it("ignores non-numeric values", () => {
    expect(evaluate("mean(Diet)")).toEqual(UNDEF_RESULT)
  })

  it("supports single value argument", () => {
    expect(evaluate("mean(1, true)")).toEqual(1)
    expect(evaluate("mean(1, false)")).toEqual(UNDEF_RESULT)
  })
})

describe("median", () => {
  it("returns correct value", () => {
    expect(evaluate("median(Speed)")).toBeCloseTo(49)
  })

  it("supports filter expression", () => {
    expect(evaluate("median(Speed, Diet = 'plants')")).toBeCloseTo(50)
  })

  it("ignores non-numeric values", () => {
    expect(evaluate("median(Diet)")).toEqual(UNDEF_RESULT)
  })

  it("supports single value argument", () => {
    expect(evaluate("median(1, true)")).toEqual(1)
    expect(evaluate("median(1, false)")).toEqual(UNDEF_RESULT)
  })
})

describe("mad", () => {
  it("returns correct value", () => {
    expect(evaluate("mad(Speed)")).toBeCloseTo(11.5)
  })

  it("supports filter expression", () => {
    expect(evaluate("mad(Speed, Diet = 'plants')")).toBeCloseTo(10)
  })

  it("ignores non-numeric values", () => {
    expect(evaluate("mad(Diet)")).toEqual(UNDEF_RESULT)
  })

  it("supports single value argument", () => {
    expect(evaluate("mad(1, true)")).toEqual(0)
    expect(evaluate("mad(1, false)")).toEqual(UNDEF_RESULT)
  })
})

describe("max", () => {
  it("returns correct value", () => {
    expect(evaluate("max(Speed)")).toBe(110)
  })

  it("supports filter expression", () => {
    expect(evaluate("max(Speed, Diet = 'plants')")).toBe(98)
  })

  it("ignores non-numeric values", () => {
    expect(evaluate("max(Diet)")).toEqual(UNDEF_RESULT)
  })

  it("supports single value argument", () => {
    expect(evaluate("max(1, true)")).toEqual(1)
    expect(evaluate("max(1, false)")).toEqual(UNDEF_RESULT)
  })
})

describe("min", () => {
  it("returns correct value", () => {
    expect(evaluate("min(Speed)")).toBe(1)
  })

  it("supports filter expression", () => {
    expect(evaluate("min(Speed, Diet = 'plants')")).toBe(40)
  })

  it("ignores non-numeric values", () => {
    expect(evaluate("min(Diet)")).toEqual(UNDEF_RESULT)
  })

  it("supports single value argument", () => {
    expect(evaluate("min(1, true)")).toEqual(1)
    expect(evaluate("min(1, false)")).toEqual(UNDEF_RESULT)
  })
})

describe("sum", () => {
  it("returns correct value", () => {
    expect(evaluate("sum(Speed)")).toBeCloseTo(1174)
  })

  it("supports filter expression", () => {
    expect(evaluate("sum(Speed, Diet = 'plants')")).toBeCloseTo(403)
  })

  it("ignores non-numeric values", () => {
    expect(evaluate("sum(Diet)")).toEqual(UNDEF_RESULT)
  })

  it("supports single value argument", () => {
    expect(evaluate("sum(1, true)")).toEqual(1)
    expect(evaluate("sum(1, false)")).toEqual(UNDEF_RESULT)
  })
})

describe("count", () => {
  it("returns correct value", () => {
    expect(evaluate("count(LifeSpan)")).toBe(27)
    expect(evaluate("count(Speed)")).toBe(24) // a few empty cells
  })

  it("supports filter expression", () => {
    expect(evaluate("count(Speed, Diet = 'plants')")).toBe(7)
  })

  it("supports single value argument", () => {
    expect(evaluate("count(1, true)")).toEqual(1)
    expect(evaluate("count(1, false)")).toEqual(0)
  })
})

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
