import {
  hashOrderedStringSet,
  hashString, hashStringSet, hashStringSets, hasOwnProperty, isEquivalentArray, isEquivalentSet
} from "./js-utils"

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

  test("hashString", () => {
    expect(hashString("")).toBe(hashString(""))
    expect(hashString("")).not.toBe(hashString("a"))
    expect(hashString("a")).toBe(hashString("a"))
    expect(hashString("a")).not.toBe(hashString("A"))
    expect(hashString("a")).not.toBe(hashString("b"))
    expect(hashString("abcdef")).toBe(hashString("abcdef"))
    expect(hashString("abcdef")).not.toBe(hashString("abCdef"))
  })

  test("hashStringSet", () => {
    expect(hashStringSet([])).toBe(hashStringSet([]))
    expect(hashStringSet(["a", "b", "c"])).toBe(hashStringSet(["a", "b", "c"]))
    expect(hashStringSet(["a", "b", "c"])).toBe(hashStringSet(["c", "b", "a"]))
    expect(hashStringSet(["a", "b", "c"])).not.toBe(hashStringSet(["a", "b"]))
    expect(hashStringSet(["a", "b", "c"])).not.toBe(hashStringSet(["a", "b", ""]))
    expect(hashStringSet(["a", "b", "c"])).not.toBe(hashStringSet(["a", "b", "C"]))
  })

  test("hashStringSets", () => {
    expect(hashStringSets([])).toBe(hashStringSets([]))
    expect(hashStringSets([["a"], ["b"]])).toBe(hashStringSets([["a"], ["b"]]))
    expect(hashStringSets([["a"]])).not.toBe(hashStringSets([["a"], ["a"]]))
    expect(hashStringSets([["a"], ["b"]])).not.toBe(hashStringSets([["a"], ["a"]]))
    expect(hashStringSets([["a"], ["b"]])).not.toBe(hashStringSets([["a"], ["b"], ["c"]]))
  })

  test("hashOrderedStringSet", () => {
    expect(hashOrderedStringSet([])).toBe(hashOrderedStringSet([]))
    expect(hashOrderedStringSet(["a", "b", "c"])).toBe(hashOrderedStringSet(["a", "b", "c"]))
    expect(hashOrderedStringSet(["a", "b", "c"])).not.toBe(hashOrderedStringSet(["c", "b", "a"]))
    expect(hashOrderedStringSet(["a", "b", "c"])).not.toBe(hashOrderedStringSet(["a", "b"]))
    expect(hashOrderedStringSet(["a", "b", "c"])).not.toBe(hashOrderedStringSet(["a", "b", ""]))
    expect(hashOrderedStringSet(["a", "b", "c"])).not.toBe(hashOrderedStringSet(["a", "b", "C"]))
  })
})
