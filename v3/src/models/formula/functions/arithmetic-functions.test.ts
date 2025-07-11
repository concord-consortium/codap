import {
  numericFnFactory, numericMultiArgsFnFactory
} from "@concord-consortium/codap-formulas/models/formula/functions/arithmetic-functions"
import { UNDEF_RESULT } from "./function-utils"
import { math } from "./math"

describe("numericFnFactory", () => {
  const fn = (value: number) => value * 2
  const numericFn = numericFnFactory(fn)

  it("returns a function that applies the specified function to a single numeric value", () => {
    const result = numericFn(123)
    expect(result).toBe(246)
  })

  it("returns a function that returns undefined result (empty string) for non-numeric values", () => {
    expect(numericFn("foo")).toEqual(UNDEF_RESULT)
    expect(numericFn(UNDEF_RESULT)).toEqual(UNDEF_RESULT)
  })
})

describe("numericMultiArgsFnFactory", () => {
  const fn = (valueA: number, valueB = 0) => valueA + valueB
  const numericFn = numericMultiArgsFnFactory(fn, { numOfRequiredArgs: 1 })

  it("returns a function that applies the specified function to multiple numeric values", () => {
    const result = numericFn(10, 20)
    expect(result).toBe(30)
  })

  it("returns a function that returns undefined result (empty string) if required argument is non-numeric", () => {
    expect(numericFn("foo", 10)).toEqual(UNDEF_RESULT)
    expect(numericFn("", 10)).toEqual(UNDEF_RESULT)
    expect(numericFn(UNDEF_RESULT, 10)).toEqual(UNDEF_RESULT)
    expect(numericFn("foo", "bar")).toEqual(UNDEF_RESULT)
    expect(numericFn(10, "foo")).toEqual(10)
    expect(numericFn(10, "")).toEqual(10)
  })
})

describe("abs", () => {
  it("returns correct value, ignores non-numeric values, and supports arrays", () => {
    const fn = math.compile("abs(x)")
    expect(fn.evaluate({ x: -1 })).toEqual(1)
    expect(fn.evaluate({ x: 1 })).toEqual(1)
    expect(fn.evaluate({ x: "" })).toEqual(UNDEF_RESULT)
    expect(fn.evaluate({ x: "foo" })).toEqual(UNDEF_RESULT)
    expect(fn.evaluate({ x: [-1, -2, -3] })).toEqual([1, 2, 3])
  })
})

describe("ceil", () => {
  it("returns correct value, ignores non-numeric values, and supports arrays", () => {
    const fn = math.compile("ceil(x)")
    expect(fn.evaluate({ x: 1.2 })).toEqual(2)
    expect(fn.evaluate({ x: -1.2 })).toEqual(-1)
    expect(fn.evaluate({ x: "" })).toEqual(UNDEF_RESULT)
    expect(fn.evaluate({ x: "foo" })).toEqual(UNDEF_RESULT)
    expect(fn.evaluate({ x: [1.2, -1.2, 2.5, "foo"] })).toEqual([2, -1, 3, UNDEF_RESULT])
  })
})

describe("combinations", () => {
  it("returns correct value, ignores non-numeric values, and supports arrays", () => {
    const fn = math.compile("combinations(x, y)")
    expect(fn.evaluate({ x: 4, y: 2 })).toEqual(6)
    expect(fn.evaluate({ x: 20, y: 5 })).toEqual(15504)
    expect(fn.evaluate({ x: "", y: "" })).toEqual(UNDEF_RESULT)
    expect(fn.evaluate({ x: 4, y: "foo" })).toEqual(UNDEF_RESULT)
    expect(fn.evaluate({ x: "foo", y: 4 })).toEqual(UNDEF_RESULT)
    expect(fn.evaluate({ x: [4, 20, 30], y: [2, 5, "foo"] })).toEqual([6, 15504, UNDEF_RESULT])
    expect(fn.evaluate({ x: [4, 20], y: 2 })).toEqual([6, 190])
  })
})

describe("exp", () => {
  it("returns correct value, ignores non-numeric values, and supports arrays", () => {
    const fn = math.compile("exp(x)")
    expect(fn.evaluate({ x: 4 })).toEqual(Math.exp(4))
    expect(fn.evaluate({ x: 20 })).toEqual(Math.exp(20))
    expect(fn.evaluate({ x: "" })).toEqual(UNDEF_RESULT)
    expect(fn.evaluate({ x: "foo" })).toEqual(UNDEF_RESULT)
    expect(fn.evaluate({ x: [4, 20, "foo"] })).toEqual([Math.exp(4), Math.exp(20), UNDEF_RESULT])
  })
})

describe("floor", () => {
  it("returns correct value, ignores non-numeric values, and supports arrays", () => {
    const fn = math.compile("floor(x)")
    expect(fn.evaluate({ x: 1.2 })).toEqual(1)
    expect(fn.evaluate({ x: -1.2 })).toEqual(-2)
    expect(fn.evaluate({ x: "" })).toEqual(UNDEF_RESULT)
    expect(fn.evaluate({ x: "foo" })).toEqual(UNDEF_RESULT)
    expect(fn.evaluate({ x: [1.2, -1.2, 2.5, "foo"] })).toEqual([1, -2, 2, UNDEF_RESULT])
  })
})

describe("frac", () => {
  it("returns correct value, ignores non-numeric values, and supports arrays", () => {
    const fn = math.compile("frac(x)")
    expect(fn.evaluate({ x: 1.125 })).toEqual(0.125)
    expect(fn.evaluate({ x: -1.125 })).toEqual(-0.125)
    expect(fn.evaluate({ x: "" })).toEqual(UNDEF_RESULT)
    expect(fn.evaluate({ x: "foo" })).toEqual(UNDEF_RESULT)
    expect(fn.evaluate({ x: [1.125, -1.125, 2.5, "foo"] })).toEqual([0.125, -0.125, 0.5, UNDEF_RESULT])
  })
})

describe("ln", () => {
  it("returns correct value, ignores non-numeric values, and supports arrays", () => {
    const fn = math.compile("ln(x)")
    expect(fn.evaluate({ x: 4 })).toEqual(Math.log(4))
    expect(fn.evaluate({ x: 20 })).toEqual(Math.log(20))
    expect(fn.evaluate({ x: "" })).toEqual(UNDEF_RESULT)
    expect(fn.evaluate({ x: "foo" })).toEqual(UNDEF_RESULT)
    expect(fn.evaluate({ x: [4, 20, "foo"] })).toEqual([Math.log(4), Math.log(20), UNDEF_RESULT])
  })
})

describe("log", () => {
  it("returns correct value, ignores non-numeric values, and supports arrays", () => {
    const fn = math.compile("log(x)")
    expect(fn.evaluate({ x: 4 })).toEqual(Math.log10(4))
    expect(fn.evaluate({ x: 20 })).toEqual(Math.log10(20))
    expect(fn.evaluate({ x: "" })).toEqual(UNDEF_RESULT)
    expect(fn.evaluate({ x: "foo" })).toEqual(UNDEF_RESULT)
    expect(fn.evaluate({ x: [4, 20, "foo"] })).toEqual([Math.log10(4), Math.log10(20), UNDEF_RESULT])
  })
})

describe("pow", () => {
  it("returns correct value, ignores non-numeric values, and supports arrays", () => {
    const fn = math.compile("pow(x, y)")
    expect(fn.evaluate({ x: 4, y: 2 })).toEqual(16)
    expect(fn.evaluate({ x: 20, y: 5 })).toEqual(3200000)
    expect(fn.evaluate({ x: 4, y: -4 })).toEqual(1 / 256)
    expect(fn.evaluate({ x: "", y: "" })).toEqual(UNDEF_RESULT)
    expect(fn.evaluate({ x: 4, y: "foo" })).toEqual(UNDEF_RESULT)
    expect(fn.evaluate({ x: "foo", y: 4 })).toEqual(UNDEF_RESULT)
    expect(fn.evaluate({ x: [4, 20, 30], y: [2, 5, "foo"] })).toEqual([16, 3200000, UNDEF_RESULT])
    expect(fn.evaluate({ x: [4, 20], y: 2 })).toEqual([16, 400])
  })
})

describe("round", () => {
  it("returns correct value, ignores non-numeric values, and supports arrays", () => {
    const fn = math.compile("round(x, y)")
    expect(fn.evaluate({ x: 1.2, y: 0 })).toEqual(1)
    expect(fn.evaluate({ x: 1.2, y: "" })).toEqual(1)
    expect(fn.evaluate({ x: 1.2, y: "foo" })).toEqual(1)
    expect(fn.evaluate({ x: 1.5, y: 0 })).toEqual(2)
    expect(fn.evaluate({ x: -1.2, y: 0 })).toEqual(-1)
    expect(fn.evaluate({ x: -1.5, y: 0 })).toEqual(-1)
    expect(fn.evaluate({ x: 1.234, y: 2 })).toEqual(1.23)
    expect(fn.evaluate({ x: 1.235, y: 2 })).toEqual(1.24)
    expect(fn.evaluate({ x: -1.234, y: 2 })).toEqual(-1.23)
    expect(fn.evaluate({ x: -1.235, y: 2 })).toEqual(-1.24)
    expect(fn.evaluate({ x: -1.235, y: "" })).toEqual(-1)
    expect(fn.evaluate({ x: "", y: "" })).toEqual(UNDEF_RESULT)
    expect(fn.evaluate({ x: "", y: 2 })).toEqual(UNDEF_RESULT)
    expect(fn.evaluate({ x: "foo", y: 1.2 })).toEqual(UNDEF_RESULT)
    expect(fn.evaluate({ x: [1.2, 1.5, -1.2, -1.5, 2.5, "foo"], y: 0 })).toEqual([1, 2, -1, -1, 3, UNDEF_RESULT])
    expect(fn.evaluate({ x: [1.2, 1.5, 1.234, 1.235, "foo"], y: [0, 0, 2, 2, "foo"] })).toEqual(
      [1, 2, 1.23, 1.24, UNDEF_RESULT]
    )
    const fn2 = math.compile("round(x)")
    expect(fn2.evaluate({ x: 1.2 })).toEqual(1)
    expect(fn2.evaluate({ x: 1.5 })).toEqual(2)
    expect(fn2.evaluate({ x: -1.2 })).toEqual(-1)
    expect(fn2.evaluate({ x: -1.5 })).toEqual(-1)
    expect(fn2.evaluate({ x: 1.234 })).toEqual(1)
  })
})

describe("sqrt", () => {
  it("returns correct value, ignores non-numeric values, and supports arrays", () => {
    const fn = math.compile("sqrt(x)")
    expect(fn.evaluate({ x: 4 })).toEqual(2)
    expect(fn.evaluate({ x: 9 })).toEqual(3)
    expect(fn.evaluate({ x: "" })).toEqual(UNDEF_RESULT)
    expect(fn.evaluate({ x: "foo" })).toEqual(UNDEF_RESULT)
    expect(fn.evaluate({ x: [4, 9, 16, "foo"] })).toEqual([2, 3, 4, UNDEF_RESULT])
  })
})

describe("trunc", () => {
  it("returns correct value, ignores non-numeric values, and supports arrays", () => {
    const fn = math.compile("trunc(x)")
    expect(fn.evaluate({ x: 1.2 })).toEqual(1)
    expect(fn.evaluate({ x: 1.5 })).toEqual(1)
    expect(fn.evaluate({ x: -1.2 })).toEqual(-1)
    expect(fn.evaluate({ x: -1.5 })).toEqual(-1)
    expect(fn.evaluate({ x: "" })).toEqual(UNDEF_RESULT)
    expect(fn.evaluate({ x: "foo" })).toEqual(UNDEF_RESULT)
    expect(fn.evaluate({ x: [1.2, 1.5, -1.2, -1.5, 2.5, "foo"] })).toEqual([1, 1, -1, -1, 2, UNDEF_RESULT])
  })
})
