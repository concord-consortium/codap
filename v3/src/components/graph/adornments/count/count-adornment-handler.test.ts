import { countAdornmentHandler } from "./count-adornment-handler"
import { kCountType } from "./count-adornment-types"

describe("DataInteractive CountAdornmentHandler", () => {
  const handler = countAdornmentHandler

  let mockGraphContent: any
  let mockDataConfig: any
  let mockCountAdornment: any
  let mockInvalidAdornment: any

  beforeEach(() => {
    mockDataConfig = {
      getAllCellKeys: jest.fn(() => [{}]),
      subPlotCases: jest.fn(() => [{ id: "case1" }, { id: "case2" }])
    }
    mockGraphContent = {
      dataConfiguration: mockDataConfig
    }
    
    mockCountAdornment = {
      id: "ADRN123",
      isVisible: true,
      percentValue: jest.fn(() => 0.5),
      percentType: "cell",
      showCount: true,
      showPercent: true,
      type: kCountType
    }

    mockInvalidAdornment = {
      id: "ADRN456",
      type: "invalid"
    }
  })

  it("get returns an error when an invalid adornment provided", () => {
    const result = handler.get?.(mockInvalidAdornment, mockGraphContent)
    expect(result?.success).toBe(false)
    expect(result?.values.error).toBe(`Not a(n) ${kCountType} adornment.`)
  })

  it("get returns the expected data when count adornment provided", () => {
    const result = handler.get?.(mockCountAdornment, mockGraphContent)
    expect(Array.isArray(result?.data)).toBe(true)
    expect(result?.data).toHaveLength(1)
    expect(result?.data[0]).toMatchObject({ count: 2, percent: "50%" })
    expect(result?.percentType).toBe("cell")
    expect(result?.showCount).toBe(true)
    expect(result?.showPercent).toBe(true)
    expect(mockDataConfig.getAllCellKeys).toHaveBeenCalled()
    expect(mockDataConfig.subPlotCases).toHaveBeenCalled()
  })

  it("get only returns a count when showCount is true and showPercent is false", () => {
    mockCountAdornment.showPercent = false
    const result = handler.get?.(mockCountAdornment, mockGraphContent)
    expect(result?.data[0]).toMatchObject({ count: 2 })
  })

  it("get only returns a percent when showCount is false and showPercent is true", () => {
    mockCountAdornment.showCount = false
    const result = handler.get?.(mockCountAdornment, mockGraphContent)
    expect(result?.data[0]).toMatchObject({ percent: "50%" })
  })
})
