import { plottedValueAdornmentHandler } from "./plotted-value-adornment-handler"
import { kPlottedValueType } from "./plotted-value-adornment-types"

describe("DataInteractive plottedValueAdornmentHandler", () => {
  const handler = plottedValueAdornmentHandler
  const adornmentId = "ADRN123"

  let mockGraphContent: any
  let mockDataConfig: any
  let mockPlottedValueAdornment: any
  let mockInvalidAdornment: any
  const mockPlottedValuesMap = new Map([
    ["{}", {value: 1}]
  ])

  beforeEach(() => {
    mockDataConfig = {
      getAllCellKeys: jest.fn(() => [{}]),
      subPlotCases: jest.fn(() => [{ id: "case1" }, { id: "case2" }])
    }
    mockGraphContent = {
      dataConfiguration: mockDataConfig
    }
    
    mockPlottedValueAdornment = {
      id: adornmentId,
      isVisible: true,
      measures: mockPlottedValuesMap,
      type: kPlottedValueType
    }

    mockInvalidAdornment = {
      id: "ADRN456",
      type: "invalid"
    }
  })

  it("get returns an error when an invalid adornment provided", () => {
    const result = handler.get?.(mockInvalidAdornment, mockGraphContent)
    expect(result?.success).toBe(false)
    expect(result?.values.error).toBe(`Not a ${kPlottedValueType} adornment`)
  })

  it("get returns the expected data when plotted value adornment provided", () => {
    const result = handler.get?.(mockPlottedValueAdornment, mockGraphContent)
    expect(result?.id).toBe(adornmentId)
    expect(Array.isArray(result?.data)).toBe(true)
    expect(result?.data).toHaveLength(1)
    expect(result?.data[0]).toMatchObject({plottedValue: 1})
    expect(mockDataConfig.getAllCellKeys).toHaveBeenCalled()
  })
})
