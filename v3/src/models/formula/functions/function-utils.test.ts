import { parse } from "mathjs/number"
import { FormulaMathJsScope } from "../formula-mathjs-scope"
import { CurrentScope } from "../formula-types"
import {
  isValueCountable, passesFilter, toBoolean, equal, evaluateNode, isPartitionedMap, isMap, getRootScope
} from "./function-utils"

describe("isValueCountable", () => {
  it("should count non-empty values, including 0 and \"false\" strings (V2 parity)", () => {
    expect(isValueCountable(1)).toBe(true)
    expect(isValueCountable(0)).toBe(true)
    expect(isValueCountable(true)).toBe(true)
    expect(isValueCountable("non-empty")).toBe(true)
    expect(isValueCountable("false")).toBe(true)
  })

  it("should not count empty values or boolean false", () => {
    expect(isValueCountable("")).toBe(false)
    expect(isValueCountable(null)).toBe(false)
    expect(isValueCountable(undefined)).toBe(false)
    expect(isValueCountable(false)).toBe(false)
  })

  it("should not count NaN", () => {
    // NaN propagates through relational operators (CODAP-1286), so an expression like
    // `count(y < z)` may produce NaN entries when y or z are empty. Those entries shouldn't be counted.
    expect(isValueCountable(NaN)).toBe(false)
  })

  it("should count non-numeric strings (Number.isNaN does not coerce)", () => {
    // Strings like "abc" coerce to NaN via Number(), but isValueCountable uses the strict
    // Number.isNaN check so they are counted as non-empty values.
    expect(isValueCountable("abc")).toBe(true)
    expect(isValueCountable("NaN")).toBe(true)
  })
})

describe("passesFilter", () => {
  it("should pass true values", () => {
    expect(passesFilter(true)).toBe(true)
    expect(passesFilter(1)).toBe(true)
    expect(passesFilter("true")).toBe(true)
    expect(passesFilter("abc")).toBe(true)
  })

  it("should not pass false, zero, NaN or empty values", () => {
    expect(passesFilter(false)).toBe(false)
    expect(passesFilter(0)).toBe(false)
    expect(passesFilter("0")).toBe(false)
    expect(passesFilter("false")).toBe(false)
    expect(passesFilter(NaN)).toBe(false)
    expect(passesFilter("")).toBe(false)
    expect(passesFilter(undefined)).toBe(false)
  })
})

describe("toBoolean", () => {
  it("should return undefined for empty values", () => {
    expect(toBoolean("")).toBeUndefined()
    expect(toBoolean(null)).toBeUndefined()
    expect(toBoolean(undefined)).toBeUndefined()
  })

  it("should return boolean values unchanged", () => {
    expect(toBoolean(true)).toBe(true)
    expect(toBoolean(false)).toBe(false)
  })

  it("should treat \"true\" and \"false\" strings as booleans, ignoring case", () => {
    expect(toBoolean("true")).toBe(true)
    expect(toBoolean("TRUE")).toBe(true)
    expect(toBoolean("false")).toBe(false)
    expect(toBoolean("False")).toBe(false)
  })

  it("should treat non-zero numbers as true and zero or NaN as false", () => {
    expect(toBoolean(1)).toBe(true)
    expect(toBoolean(-2.5)).toBe(true)
    expect(toBoolean("3")).toBe(true)
    expect(toBoolean(0)).toBe(false)
    expect(toBoolean("0")).toBe(false)
    expect(toBoolean(NaN)).toBe(false)
  })

  it("should treat objects and other strings as true", () => {
    expect(toBoolean(new Date())).toBe(true)
    expect(toBoolean({})).toBe(true)
    expect(toBoolean("abc")).toBe(true)
  })
})

describe("equal", () => {
  it("should return true for equal values", () => {
    expect(equal(1, 1)).toBe(true)
    expect(equal("1", 1)).toBe(true)
    expect(equal(1, "1")).toBe(true)
    expect(equal("1", "1")).toBe(true)
    expect(equal(true, "true")).toBe(true)
    expect(equal("true", true)).toBe(true)
    const now = new Date()
    expect(equal(now, new Date(now))).toBe(true)
  })

  it("should return false for unequal values", () => {
    expect(equal(1, 2)).toBe(false)
    expect(equal("1", 2)).toBe(false)
    expect(equal(1, "2")).toBe(false)
    expect(equal("1", "2")).toBe(false)
    expect(equal(true, "false")).toBe(false)
    expect(equal("true", false)).toBe(false)
    expect(equal(true, 1)).toBe(false)
    const now = new Date()
    expect(equal(now, new Date(Date.now() + 3600))).toBe(false)
  })
})

describe("evaluateNode", () => {
  it("should evaluate math nodes correctly", () => {
    const node = parse("1 + 2")
    expect(evaluateNode(node)).toBe(3)
  })
})

describe("isPartitionedMap", () => {
  it("should return true for partitioned map", () => {
    const map = { a: {}, b: new Map() }
    expect(isPartitionedMap(map)).toBe(true)
  })

  it("should return false for non-partitioned map", () => {
    const map = new Map()
    expect(isPartitionedMap(map)).toBe(false)
  })
})

describe("isMap", () => {
  it("should return true for map", () => {
    const map = new Map()
    expect(isMap(map)).toBe(true)
  })

  it("should return false for non-map", () => {
    const map = {}
    expect(isMap(map)).toBe(false)
  })
})

describe("getRootScope", () => {
  it("should return root scope for partitioned map", () => {
    const scope = { a: {}, b: new Map() }
    expect(getRootScope(scope as any as CurrentScope)).toBe(scope.a)
  })

  it("should return scope for non-partitioned map", () => {
    const scope = {} as any as FormulaMathJsScope
    expect(getRootScope(scope)).toBe(scope)
  })
})
