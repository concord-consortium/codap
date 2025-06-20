import { isValueTruthy, equal, evaluateNode, isPartitionedMap, isMap, getRootScope } from "./function-utils"
import { parse } from "mathjs"
import { CurrentScope } from "../formula-types"
import { FormulaMathJsScope } from "../formula-mathjs-scope"

describe("isValueTruthy", () => {
  it("should return true for truthy values", () => {
    expect(isValueTruthy(1)).toBe(true)
    expect(isValueTruthy("non-empty")).toBe(true)
  })

  it("should return false for falsy values", () => {
    expect(isValueTruthy("")).toBe(false)
    expect(isValueTruthy(null)).toBe(false)
    expect(isValueTruthy(undefined)).toBe(false)
    expect(isValueTruthy(false)).toBe(false)
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
