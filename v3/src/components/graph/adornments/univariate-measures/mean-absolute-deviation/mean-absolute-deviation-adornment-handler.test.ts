import { kDefaultCellKey } from "../../../utilities/cell-key-utils"
import { meanAbsoluteDeviationAdornmentHandler } from "./mean-absolute-deviation-adornment-handler"
import { kMeanAbsoluteDeviationType } from "./mean-absolute-deviation-adornment-types"

describe("DataInteractive meanAbsoluteDeviationAdornmentHandler", () => {
  const handler = meanAbsoluteDeviationAdornmentHandler

  let mockGraphContent: any
  let mockDataConfig: any
  let mockMeanAbsoluteDeviationAdornment: any
  let mockInvalidAdornment: any
  const mockMeasuresMap = new Map([
    [kDefaultCellKey, { value: 10 }]
  ])

  beforeEach(() => {
    mockDataConfig = {
      getAllCellKeys: jest.fn(() => [{}]),
      subPlotCases: jest.fn(() => [{ id: "case1" }, { id: "case2" }])
    }
    mockGraphContent = {
      dataConfiguration: mockDataConfig
    }
    
    mockMeanAbsoluteDeviationAdornment = {
      computeMeasureRange: jest.fn(() => { return {min: 0, max: 20} }),
      id: "ADRN123",
      isVisible: true,
      measures: mockMeasuresMap,
      type: kMeanAbsoluteDeviationType
    }

    mockInvalidAdornment = {
      id: "ADRN456",
      type: "invalid"
    }
  })

  it("get returns an error when a an invalid adornment provided", () => {
    const result = handler.get?.(mockInvalidAdornment, mockGraphContent)
    expect(result?.success).toBe(false)
    expect(result?.values.error).toBe(`Not a(n) ${kMeanAbsoluteDeviationType} adornment.`)
  })

  it("get returns the expected data when mean absolute deviation adornment provided", () => {
    const result = handler.get?.(mockMeanAbsoluteDeviationAdornment, mockGraphContent)
    expect(Array.isArray(result?.data)).toBe(true)
    expect(result?.data).toHaveLength(1)
    expect(result?.data[0]).toMatchObject({ mean: 10, min: 0, max: 20 })
    expect(mockDataConfig.getAllCellKeys).toHaveBeenCalled()
  })
})
