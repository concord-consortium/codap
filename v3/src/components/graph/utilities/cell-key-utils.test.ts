import { kMain, kOther } from "../../data-display/data-display-types"
import {
  cellKeyToString,
  isLegacyInstanceKey,
  kDefaultCellKey,
  kImpossible,
  migrateInstanceKeyMap,
  migrateLegacyInstanceKey,
  stringToCellKey
} from "./cell-key-utils"

describe("cellKeyToString", () => {
  it("returns default key for empty cell key", () => {
    expect(cellKeyToString({})).toBe(kDefaultCellKey)
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

  it("escapes special characters in keys and values", () => {
    expect(cellKeyToString({ "key:with:colons": "value|with|pipes" }))
      .toBe("key\\:with\\:colons:value\\|with\\|pipes")
  })
})

describe("stringToCellKey", () => {
  it("returns empty object for empty string or default key", () => {
    expect(stringToCellKey("")).toEqual({})
    expect(stringToCellKey(kDefaultCellKey)).toEqual({})
  })

  it("parses single entry cell key", () => {
    expect(stringToCellKey("attr1:value1")).toEqual({ attr1: "value1" })
  })

  it("parses multiple entries", () => {
    expect(stringToCellKey("a:1|b:2|c:3")).toEqual({ a: "1", b: "2", c: "3" })
  })

  it("handles escaped special characters", () => {
    expect(stringToCellKey("key\\:with\\:colons:value\\|with\\|pipes"))
      .toEqual({ "key:with:colons": "value|with|pipes" })
  })

  it("is the inverse of cellKeyToString", () => {
    const original = { attr1: "value1", attr2: "value2" }
    const asString = cellKeyToString(original)
    expect(stringToCellKey(asString)).toEqual(original)
  })

  it("handles legacy JSON format", () => {
    const legacyKey = '{"abc123":"pizza","def456":"red"}'
    expect(stringToCellKey(legacyKey)).toEqual({ abc123: "pizza", def456: "red" })
  })
})

describe("isLegacyInstanceKey", () => {
  it("returns true for JSON format keys", () => {
    expect(isLegacyInstanceKey("{}")).toBe(true)
    expect(isLegacyInstanceKey('{"a":"1"}')).toBe(true)
    expect(isLegacyInstanceKey('{"abc123":"pizza","def456":"red"}')).toBe(true)
  })

  it("returns false for new format keys", () => {
    expect(isLegacyInstanceKey("")).toBe(false)
    expect(isLegacyInstanceKey(kDefaultCellKey)).toBe(false)
    expect(isLegacyInstanceKey("a:1")).toBe(false)
    expect(isLegacyInstanceKey("a:1|b:2")).toBe(false)
  })
})

describe("migrateLegacyInstanceKey", () => {
  it("converts legacy JSON format to new format", () => {
    expect(migrateLegacyInstanceKey("{}")).toBe(kDefaultCellKey)
    expect(migrateLegacyInstanceKey('{"abc123":"pizza"}')).toBe("abc123:pizza")
    expect(migrateLegacyInstanceKey('{"abc123":"pizza","def456":"red"}'))
      .toBe("abc123:pizza|def456:red")
  })

  it("leaves new format keys unchanged", () => {
    expect(migrateLegacyInstanceKey("")).toBe("")
    expect(migrateLegacyInstanceKey("a:1")).toBe("a:1")
    expect(migrateLegacyInstanceKey("a:1|b:2")).toBe("a:1|b:2")
  })

  it("returns original key if JSON parsing fails", () => {
    expect(migrateLegacyInstanceKey("{invalid json")).toBe("{invalid json")
  })
})

describe("migrateInstanceKeyMap", () => {
  it("returns undefined for undefined input", () => {
    expect(migrateInstanceKeyMap(undefined)).toBeUndefined()
  })

  it("returns undefined if no migration needed", () => {
    expect(migrateInstanceKeyMap({})).toBeUndefined()
    expect(migrateInstanceKeyMap({ "a:1": { value: 1 } })).toBeUndefined()
  })

  it("migrates legacy keys to new format", () => {
    const input = {
      '{"abc":"1"}': { value: 1 },
      '{"def":"2"}': { value: 2 }
    }
    const expected = {
      "abc:1": { value: 1 },
      "def:2": { value: 2 }
    }
    expect(migrateInstanceKeyMap(input)).toEqual(expected)
  })

  it("migrates mixed legacy and new keys", () => {
    const input = {
      '{"abc":"1"}': { value: 1 },
      "def:2": { value: 2 }
    }
    const expected = {
      "abc:1": { value: 1 },
      "def:2": { value: 2 }
    }
    expect(migrateInstanceKeyMap(input)).toEqual(expected)
  })
})

describe("kImpossible constant", () => {
  it("has the expected value", () => {
    expect(kImpossible).toBe("__IMPOSSIBLE__")
  })
})
