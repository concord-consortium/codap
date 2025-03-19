import { standardErrorAdornmentHandler } from "./standard-error-adornment-handler"
import { kStandardErrorType } from "./standard-error-adornment-types"

describe("DataInteractive standardErrorAdornmentHandler", () => {
  const handler = standardErrorAdornmentHandler
  const adornmentId = "ADRN123"

  let mockGraphContent: any
  let mockDataConfig: any
  let mockStandardErrorAdornment: any
  let mockInvalidAdornment: any
  const mockMeasuresMap = new Map([
    ["{}", { value: 4 }]
  ])

  beforeEach(() => {
    mockDataConfig = {
      getAllCellKeys: jest.fn(() => [{}]),
      subPlotCases: jest.fn(() => [{ id: "case1" }, { id: "case2" }])
    }
    mockGraphContent = {
      dataConfiguration: mockDataConfig
    }
    
    mockStandardErrorAdornment = {
      computeMeasureRange: jest.fn(() => { return {min: 20, max: 28} }),
      id: adornmentId,
      isVisible: true,
      measures: mockMeasuresMap,
      type: kStandardErrorType
    }

    mockInvalidAdornment = {
      id: "ADRN456",
      type: "invalid"
    }
  })

  it("get returns an error when an invalid adornment provided", () => {
    const result = handler.get?.(mockInvalidAdornment, mockGraphContent)
    expect(result?.success).toBe(false)
    expect(result?.values.error).toBe(`Not a ${kStandardErrorType} adornment`)
  })

  it("get returns the expected data when standard error adornment provided", () => {
    const result = handler.get?.(mockStandardErrorAdornment, mockGraphContent)
    expect(result?.id).toBe(adornmentId)
    expect(Array.isArray(result?.data)).toBe(true)
    expect(result?.data).toHaveLength(1)
    expect(result?.data[0]).toMatchObject({ standardError: 4, min: 20, max: 28 })
    expect(mockDataConfig.getAllCellKeys).toHaveBeenCalled()
  })
})
