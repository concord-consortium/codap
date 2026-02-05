import { kDefaultCellKey } from "../../../utilities/cell-key-utils"
import { normalCurveAdornmentHandler } from "./normal-curve-adornment-handler"
import { kNormalCurveType } from "./normal-curve-adornment-types"

describe("DataInteractive normalCurveAdornmentHandler", () => {
  const handler = normalCurveAdornmentHandler

  let mockGraphContent: any
  let mockDataConfig: any
  let mockNormalCurveAdornment: any
  let mockInvalidAdornment: any
  const mockMeasuresMap = new Map([
    [kDefaultCellKey, { value: 24 }]
  ])

  beforeEach(() => {
    mockDataConfig = {
      getAllCellKeys: jest.fn(() => [{}]),
      subPlotCases: jest.fn(() => [{ id: "case1" }, { id: "case2" }])
    }
    mockGraphContent = {
      dataConfiguration: mockDataConfig
    }
    
    mockNormalCurveAdornment = {
      computeMean: jest.fn(() => 24),
      computeStandardDeviation: jest.fn(() => 20),
      computeStandardError: jest.fn(() => 4),
      id: "ADRN123",
      isVisible: true,
      measures: mockMeasuresMap,
      type: kNormalCurveType
    }

    mockInvalidAdornment = {
      id: "ADRN456",
      type: "invalid"
    }
  })

  it("get returns an error when an invalid adornment provided", () => {
    const result = handler.get?.(mockInvalidAdornment, mockGraphContent)
    expect(result?.success).toBe(false)
    expect(result?.values.error).toBe(`Not a(n) ${kNormalCurveType} adornment.`)
  })

  it("get returns the expected data when normalCurve adornment provided", () => {
    const result = handler.get?.(mockNormalCurveAdornment, mockGraphContent)
    expect(Array.isArray(result?.data)).toBe(true)
    expect(result?.data).toHaveLength(1)
    expect(result?.data[0]).toMatchObject({
      mean: 24, standardDeviation: 20, standardError: 4
    })
    expect(mockDataConfig.getAllCellKeys).toHaveBeenCalled()
  })
})
