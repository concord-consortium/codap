import { cellKeyToCategories } from "./adornment-handler-utils"

describe("cellKeyToCategories", () => {
  let mockDataConfig: any

  beforeEach(() => {
    mockDataConfig = {
      dataset: {
        getAttribute: jest.fn(() => { return { name: "Category Name" } })
      },
      getAllCellKeys: jest.fn(() => [{}, { "ATTR1": "category value 1" }]),
      subPlotCases: jest.fn(() => [{ id: "case1" }, { id: "case2" }])
    }
  })

  it("should return an empty array if the cellKey is empty", () => {
    const cellKey = {}
    const result = cellKeyToCategories(cellKey, mockDataConfig)
    expect(result).toEqual({})
  })

  it("should return an array of categories if the cellKey is not empty", () => {
    const cellKey1 = { ATTR1: "category value 1" }
    const result1 = cellKeyToCategories(cellKey1, mockDataConfig)
    expect(result1).toEqual({"Category Name": "category value 1"})
    const cellKey2 = { ATTR1: "category value 2" }
    const result2 = cellKeyToCategories(cellKey2, mockDataConfig)
    expect(result2).toEqual({"Category Name": "category value 2"})
  })
})
