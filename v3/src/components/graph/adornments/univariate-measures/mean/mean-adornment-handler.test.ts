import { meanAdornmentHandler } from "./mean-adornment-handler"
import { kMeanType } from "./mean-adornment-types"

describe("DataInteractive meanAdornmentHandler", () => {
  const handler = meanAdornmentHandler
  const adornmentId = "ADRN123"

  let mockGraphContent: any
  let mockDataConfig: any
  let mockMeanAdornment: any
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
    
    mockMeanAdornment = {
      id: adornmentId,
      isVisible: true,
      measures: mockMeasuresMap,
      type: kMeanType
    }

    mockInvalidAdornment = {
      id: "ADRN456",
      type: "invalid"
    }
  })

  it("get returns an error when an invalid adornment provided", () => {
    const result = handler.get?.(mockInvalidAdornment, mockGraphContent)
    expect(result?.success).toBe(false)
    expect(result?.values.error).toBe(`Not a ${kMeanType} adornment`)
  })

  it("get returns the expected data when mean adornment provided", () => {
    const result = handler.get?.(mockMeanAdornment, mockGraphContent)
    expect(result?.id).toBe(adornmentId)
    expect(Array.isArray(result?.data)).toBe(true)
    expect(result?.data).toHaveLength(1)
    expect(result?.data[0]).toMatchObject({ mean: 10 })
    expect(mockDataConfig.getAllCellKeys).toHaveBeenCalled()
  })
})
