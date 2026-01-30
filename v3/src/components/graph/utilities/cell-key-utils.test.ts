import { kMain, kOther } from "../../data-display/data-display-types"
import { cellKeyToString, kImpossible } from "./cell-key-utils"

describe("cellKeyToString", () => {
  it("returns empty string for empty cell key", () => {
    expect(cellKeyToString({})).toBe("")
  })

  it("converts single entry cell key", () => {
    expect(cellKeyToString({ attr1: "value1" })).toBe("attr1:value1")
  })

  it("converts multiple entries in sorted order", () => {
    expect(cellKeyToString({ b: "2", a: "1", c: "3" })).toBe("a:1|b:2|c:3")
  })

  it("produces same string regardless of property insertion order", () => {
    const key1 = { a: "1", b: "2", c: "3" }
    const key2 = { c: "3", a: "1", b: "2" }
    const key3 = { b: "2", c: "3", a: "1" }

    const result1 = cellKeyToString(key1)
    const result2 = cellKeyToString(key2)
    const result3 = cellKeyToString(key3)

    expect(result1).toBe(result2)
    expect(result2).toBe(result3)
    expect(result1).toBe("a:1|b:2|c:3")
  })

  it("handles special values like kOther and kMain", () => {
    expect(cellKeyToString({ attr1: kOther, attr2: kMain }))
      .toBe(`attr1:${kOther}|attr2:${kMain}`)
  })
})

describe("kImpossible constant", () => {
  it("has the expected value", () => {
    expect(kImpossible).toBe("__IMPOSSIBLE__")
  })
})
