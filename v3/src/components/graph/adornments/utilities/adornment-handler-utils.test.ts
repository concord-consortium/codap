import { Attribute } from "../../../../models/data/attribute"
import { kDefaultCellKey } from "../../utilities/cell-key-utils"
import { adornmentMismatchResult, cellKeyToCategories, normalizeCellKey } from "./adornment-handler-utils"

describe("adornment-handler-utils", () => {
  let mockDataConfig: any

  beforeEach(() => {
    const attributes = [Attribute.create({ id: "ATTR1", name: "Category Name" })]
    mockDataConfig = {
      dataset: {
        attributes,
        getAttribute: jest.fn((id: string) => attributes.find(attr => attr.id === id))
      },
      getAllCellKeys: jest.fn(() => [{}, { ATTR1: "category value 1" }]),
      subPlotCases: jest.fn(() => [{ id: "case1" }, { id: "case2" }])
    }
  })

  describe("cellKeyToCategories", () => {
    it("returns an empty object if the cellKey is empty", () => {
      expect(cellKeyToCategories({}, mockDataConfig)).toEqual({})
    })

    it("returns a map of category name to value if cellKey contains an attribute ID", () => {
      const result = cellKeyToCategories({ ATTR1: "category value 1" }, mockDataConfig)
      expect(result).toEqual({ "Category Name": "category value 1" })
    })

    it("returns a map of category name to value for different values", () => {
      const result = cellKeyToCategories({ ATTR1: "category value 2" }, mockDataConfig)
      expect(result).toEqual({ "Category Name": "category value 2" })
    })
  })

  describe("normalizeCellKey", () => {
    it("normalizes legacy JSON format input with attribute ID to new format", () => {
      const cellKey = JSON.stringify({ ATTR1: "category value 1" })
      expect(normalizeCellKey(cellKey, mockDataConfig)).toEqual("ATTR1:category value 1")
    })

    it("normalizes new format input with attribute ID", () => {
      const cellKey = "ATTR1:category value 1"
      expect(normalizeCellKey(cellKey, mockDataConfig)).toEqual("ATTR1:category value 1")
    })

    it("converts attribute name to ID from legacy JSON format", () => {
      const cellKey = JSON.stringify({ "Category Name": "category value 1" })
      expect(normalizeCellKey(cellKey, mockDataConfig)).toEqual("ATTR1:category value 1")
    })

    it("converts attribute name to ID from new format", () => {
      const cellKey = "Category Name:category value 1"
      expect(normalizeCellKey(cellKey, mockDataConfig)).toEqual("ATTR1:category value 1")
    })

    it("returns undefined if the attribute name cannot be resolved to an ID (JSON format)", () => {
      const cellKey = JSON.stringify({ "Invalid Attribute": "category value 1" })
      const result = normalizeCellKey(cellKey, mockDataConfig)
      expect(result).toBeUndefined()
    })

    it("returns undefined if the attribute name cannot be resolved to an ID (new format)", () => {
      const cellKey = "Invalid Attribute:category value 1"
      const result = normalizeCellKey(cellKey, mockDataConfig)
      expect(result).toBeUndefined()
    })

    it("returns default key for empty cell key (JSON format)", () => {
      const cellKey = "{}"
      expect(normalizeCellKey(cellKey, mockDataConfig)).toEqual(kDefaultCellKey)
    })

    it("returns default key for empty cell key (new format)", () => {
      const cellKey = ""
      expect(normalizeCellKey(cellKey, mockDataConfig)).toEqual(kDefaultCellKey)
    })
  })

  describe("adornmentMismatchResult", () => {
    it("returns an error result for a mismatched adornment type", () => {
      expect(adornmentMismatchResult("mockAdornmentType")).toEqual({
        success: false,
        values: {
          error: "Not a(n) mockAdornmentType adornment."
        }
      })
    })
  })
})
