import { isValueTruthy, equal, evaluateNode } from "./function-utils"
import { parse } from "mathjs"

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
  })

  it("should return false for unequal values", () => {
    expect(equal(1, 2)).toBe(false)
    expect(equal("1", 2)).toBe(false)
    expect(equal(1, "2")).toBe(false)
    expect(equal("1", "2")).toBe(false)
    expect(equal(true, "false")).toBe(false)
    expect(equal("true", false)).toBe(false)
    expect(equal(true, 1)).toBe(false)
  })
})

describe("evaluateNode", () => {
  it("should evaluate math nodes correctly", () => {
    const node = parse("1 + 2")
    expect(evaluateNode(node)).toBe(3)
  })
})
