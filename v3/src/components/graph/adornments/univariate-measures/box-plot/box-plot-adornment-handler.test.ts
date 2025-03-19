import { getCaseValues } from "../../../../../data-interactive/data-interactive-utils"
import { boxPlotAdornmentHandler } from "./box-plot-adornment-handler"
import { kBoxPlotType } from "./box-plot-adornment-types"

describe("DataInteractive boxPlotAdornmentHandler", () => {
  const handler = boxPlotAdornmentHandler
  const adornmentId = "ADRN123"

  let mockGraphContent: any
  let mockDataConfig: any
  let mockBoxPlotAdornment: any
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
    
    mockBoxPlotAdornment = {
      id: adornmentId,
      isVisible: true,
      getCaseValues: jest.fn(() => [1, 2, 3, 4, 5, 10, 15, 20]),
      lowerQuartile: jest.fn(() => 5),
      measures: mockMeasuresMap,
      minWhiskerValue: jest.fn(() => 0),
      maxWhiskerValue: jest.fn(() => 20),
      type: kBoxPlotType,
      upperQuartile: jest.fn(() => 15),
    }

    mockInvalidAdornment = {
      id: "ADRN456",
      type: "invalid"
    }
  })

  it("get returns an error when a an invalid adornment provided", () => {
    const result = handler.get?.(mockInvalidAdornment, mockGraphContent)
    expect(result?.success).toBe(false)
    expect(result?.values.error).toBe(`Not a ${kBoxPlotType} adornment`)
  })

  it("get returns the expected data when box plot adornment provided", () => {
    const result = handler.get?.(mockBoxPlotAdornment, mockGraphContent)
    expect(result?.id).toBe(adornmentId)
    expect(Array.isArray(result?.data)).toBe(true)
    expect(result?.data).toHaveLength(1)
    expect(result?.data[0]).toMatchObject({
      interquartileRange: 10,
      lower: 0,
      lowerQuartile: 5,
      median: 10,
      upper: 20,
      upperQuartile: 15
    })
    expect(mockDataConfig.getAllCellKeys).toHaveBeenCalled()
  })
})
