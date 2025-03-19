import { movableValueAdornmentHandler } from "./movable-value-adornment-handler"
import { kMovableValueType } from "./movable-value-adornment-types"

describe("DataInteractive movableValueAdornmentHandler", () => {
  const handler = movableValueAdornmentHandler
  const adornmentId = "ADRN123"

  let mockGraphContent: any
  let mockDataConfig: any
  let mockMovableValueAdornment: any
  let mockInvalidAdornment: any
  const mockValuesMap = new Map([
    ["{}", [1, 3000000]]
  ])

  beforeEach(() => {
    mockDataConfig = {
      getAllCellKeys: jest.fn(() => [{}]),
      subPlotCases: jest.fn(() => [{ id: "case1" }, { id: "case2" }])
    }
    mockGraphContent = {
      dataConfiguration: mockDataConfig
    }
    
    mockMovableValueAdornment = {
      id: adornmentId,
      isVisible: true,
      type: kMovableValueType,
      values: mockValuesMap
    }

    mockInvalidAdornment = {
      id: "ADRN456",
      type: "invalid"
    }
  })

  it("get returns an error when an invalid adornment provided", () => {
    const result = handler.get?.(mockInvalidAdornment, mockGraphContent)
    expect(result?.success).toBe(false)
    expect(result?.values.error).toBe(`Not a ${kMovableValueType} adornment`)
  })

  it("get returns the expected data when movable value adornment provided", () => {
    const result = handler.get?.(mockMovableValueAdornment, mockGraphContent)
    expect(result?.id).toBe(adornmentId)
    expect(Array.isArray(result?.data)).toBe(true)
    expect(result?.data).toHaveLength(1)
    expect(result?.data[0]).toMatchObject({movableValues: [1, 3000000]})
    expect(mockDataConfig.getAllCellKeys).toHaveBeenCalled()
  })
})
