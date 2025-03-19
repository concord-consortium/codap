import { standardDeviationAdornmentHandler } from "./standard-deviation-adornment-handler"
import { kStandardDeviationType } from "./standard-deviation-adornment-types"

describe("DataInteractive standardDeviationAdornmentHandler", () => {
  const handler = standardDeviationAdornmentHandler
  const adornmentId = "ADRN123"

  let mockGraphContent: any
  let mockDataConfig: any
  let mockStandardDeviationAdornment: any
  let mockInvalidAdornment: any
  const mockMeasuresMap = new Map([
    ["{}", { value: 10 }]
  ])

  beforeEach(() => {
    mockDataConfig = {
      getAllCellKeys: jest.fn(() => [{}]),
      subPlotCases: jest.fn(() => [{ id: "case1" }, { id: "case2" }])
    }
    mockGraphContent = {
      dataConfiguration: mockDataConfig
    }
    
    mockStandardDeviationAdornment = {
      computeMeasureRange: jest.fn(() => { return {min: 0, max: 20} }),
      id: adornmentId,
      isVisible: true,
      measures: mockMeasuresMap,
      type: kStandardDeviationType
    }

    mockInvalidAdornment = {
      id: "ADRN456",
      type: "invalid"
    }
  })

  it("get returns an error when an invalid adornment provided", () => {
    const result = handler.get?.(mockInvalidAdornment, mockGraphContent)
    expect(result?.success).toBe(false)
    expect(result?.values.error).toBe(`Not a ${kStandardDeviationType} adornment`)
  })

  it("get returns the expected data when standard deviation adornment provided", () => {
    const result = handler.get?.(mockStandardDeviationAdornment, mockGraphContent)
    expect(result?.id).toBe(adornmentId)
    expect(Array.isArray(result?.data)).toBe(true)
    expect(result?.data).toHaveLength(1)
    expect(result?.data[0]).toMatchObject({ mean: 10, min: 0, max: 20 })
    expect(mockDataConfig.getAllCellKeys).toHaveBeenCalled()
  })
})
