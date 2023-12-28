import { isValueNonEmpty, isNumber, isValueTruthy, equal, evaluateNode } from "./function-utils"
import { parse } from "mathjs"

describe("isValueNonEmpty", () => {
  it("should return false for empty values", () => {
    expect(isValueNonEmpty("")).toBe(false)
    expect(isValueNonEmpty(null)).toBe(false)
    expect(isValueNonEmpty(undefined)).toBe(false)
  })

  it("should return true for non-empty values", () => {
    expect(isValueNonEmpty("non-empty")).toBe(true)
    expect(isValueNonEmpty(0)).toBe(true)
    expect(isValueNonEmpty(false)).toBe(true)
  })
})

describe("isNumber", () => {
  it("should return true for numbers", () => {
    expect(isNumber(0)).toBe(true)
    expect(isNumber("0")).toBe(true)
    expect(isNumber(1.23)).toBe(true)
    expect(isNumber("1.23")).toBe(true)
  })

  it("should return false for non-numbers", () => {
    expect(isNumber("")).toBe(false)
    expect(isNumber("abc")).toBe(false)
    expect(isNumber(null)).toBe(false)
    expect(isNumber(undefined)).toBe(false)
  })
})

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
