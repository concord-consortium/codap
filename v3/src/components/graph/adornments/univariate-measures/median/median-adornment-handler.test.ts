import { medianAdornmentHandler } from "./median-adornment-handler"
import { kMedianType } from "./median-adornment-types"

describe("DataInteractive medianAdornmentHandler", () => {
  const handler = medianAdornmentHandler

  let mockGraphContent: any
  let mockDataConfig: any
  let mockMedianAdornment: any
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
    
    mockMedianAdornment = {
      id: "ADRN123",
      isVisible: true,
      measures: mockMeasuresMap,
      type: kMedianType
    }

    mockInvalidAdornment = {
      id: "ADRN456",
      type: "invalid"
    }
  })

  it("get returns an error when an invalid adornment provided", () => {
    const result = handler.get?.(mockInvalidAdornment, mockGraphContent)
    expect(result?.success).toBe(false)
    expect(result?.values.error).toBe(`Not a(n) ${kMedianType} adornment.`)
  })

  it("get returns the expected data when median adornment provided", () => {
    const result = handler.get?.(mockMedianAdornment, mockGraphContent)
    expect(Array.isArray(result?.data)).toBe(true)
    expect(result?.data).toHaveLength(1)
    expect(result?.data[0]).toMatchObject({ median: 10 })
    expect(mockDataConfig.getAllCellKeys).toHaveBeenCalled()
  })
})
