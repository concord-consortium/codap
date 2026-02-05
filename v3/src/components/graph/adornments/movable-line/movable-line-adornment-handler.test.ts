import { kDefaultCellKey } from "../../utilities/cell-key-utils"
import { movableLineAdornmentHandler } from "./movable-line-adornment-handler"
import { kMovableLineType } from "./movable-line-adornment-types"

describe("DataInteractive movableLineAdornmentHandler", () => {
  const handler = movableLineAdornmentHandler

  let mockGraphContent: any
  let mockDataConfig: any
  let mockMovableLineAdornment: any
  let mockInvalidAdornment: any
  const mockLinesMap = new Map([
    [kDefaultCellKey, { intercept: 1, slope: 0.5 }]
  ])

  beforeEach(() => {
    mockDataConfig = {
      getAllCellKeys: jest.fn(() => [{}]),
      subPlotCases: jest.fn(() => [{ id: "case1" }, { id: "case2" }])
    }
    mockGraphContent = {
      dataConfiguration: mockDataConfig
    }
    
    mockMovableLineAdornment = {
      id: "ADRN123",
      isVisible: true,
      lines: mockLinesMap,
      type: kMovableLineType
    }

    mockInvalidAdornment = {
      id: "ADRN456",
      type: "invalid"
    }
  })

  it("get returns an error when an invalid adornment provided", () => {
    const result = handler.get?.(mockInvalidAdornment, mockGraphContent)
    expect(result?.success).toBe(false)
    expect(result?.values.error).toBe(`Not a(n) ${kMovableLineType} adornment.`)
  })

  it("get returns the expected data when movable line adornment provided", () => {
    const result = handler.get?.(mockMovableLineAdornment, mockGraphContent)
    expect(Array.isArray(result?.data)).toBe(true)
    expect(result?.data).toHaveLength(1)
    expect(result?.data[0]).toMatchObject({ intercept: 1, slope: 0.5 })
    expect(mockDataConfig.getAllCellKeys).toHaveBeenCalled()
  })
})
