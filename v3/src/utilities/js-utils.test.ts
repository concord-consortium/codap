import { hasOwnProperty, isEquivalentArray, isEquivalentSet } from "./js-utils"

describe("JavaScript Utilities", () => {

  test("hasOwnProperty", () => {
    expect(hasOwnProperty({}, "")).toBe(false)
    expect(hasOwnProperty({ foo: undefined }, "foo")).toBe(true)
    expect(hasOwnProperty({ foo: "bar" }, "foo")).toBe(true)
    expect(hasOwnProperty({ foo: "bar" }, "bar")).toBe(false)
    expect(hasOwnProperty({ hasOwnProperty: true }, "foo")).toBe(false)
    expect(hasOwnProperty({ hasOwnProperty: undefined }, "hasOwnProperty")).toBe(true)
  })

  test("isEquivalentArray", () => {
    expect(isEquivalentArray([], [])).toBe(true)
    expect(isEquivalentArray([1], [])).toBe(false)
    expect(isEquivalentArray([], ["a"])).toBe(false)
    expect(isEquivalentArray(["a"], ["a"])).toBe(true)
    expect(isEquivalentArray([1, 2, 3], [1, 2, 3])).toBe(true)
    expect(isEquivalentArray(["a", "b"], ["a", "c"])).toBe(false)
  })

  test("isEquivalentSet", () => {
    expect(isEquivalentSet(new Set([]), new Set([]))).toBe(true)
    expect(isEquivalentSet(new Set([1]), new Set([]))).toBe(false)
    expect(isEquivalentSet(new Set([]), new Set(["a"]))).toBe(false)
    expect(isEquivalentSet(new Set(["a"]), new Set(["a"]))).toBe(true)
    expect(isEquivalentSet(new Set([1, 2, 3]), new Set([1, 2, 3]))).toBe(true)
    expect(isEquivalentSet(new Set(["a", "b"]), new Set(["a", "c"]))).toBe(false)
    expect(isEquivalentSet(new Set(["a", "a", "b"]), new Set(["a", "b", "b"]))).toBe(true)
  })

})
