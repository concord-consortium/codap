import { kDefaultCellKey } from "../../utilities/cell-key-utils"
import { movablePointAdornmentHandler } from "./movable-point-adornment-handler"
import { kMovablePointType } from "./movable-point-adornment-types"

describe("DataInteractive movablePointAdornmentHandler", () => {
  const handler = movablePointAdornmentHandler

  let mockGraphContent: any
  let mockDataConfig: any
  let mockMovablePointAdornment: any
  let mockInvalidAdornment: any
  const mockPointsMap = new Map([
    [kDefaultCellKey, { x: 1, y: 2 }]
  ])

  beforeEach(() => {
    mockDataConfig = {
      attributeID: jest.fn((axis) => axis === "x" ? "idX" : "idY"),
      dataset: {
        attributes: [{ id: "idX", name: "lifeSpan" }, { id: "idY", name: "mass" }],
        getAttribute: jest.fn((id) => ({ id, name: id === "idX" ? "lifeSpan" : "mass" }))
      },
      getAllCellKeys: jest.fn(() => [{}]),
      getAttribute: jest.fn((axis) => axis === "x" ? "lifeSpan" : "mass"),
      subPlotCases: jest.fn(() => [{ id: "case1" }, { id: "case2" }])
    }
    mockGraphContent = {
      dataConfiguration: mockDataConfig
    }
    
    mockMovablePointAdornment = {
      id: "ADRN123",
      isVisible: true,
      points: mockPointsMap,
      type: kMovablePointType
    }

    mockInvalidAdornment = {
      id: "ADRN456",
      type: "invalid"
    }
  })

  it("get returns an error when an invalid adornment provided", () => {
    const result = handler.get?.(mockInvalidAdornment, mockGraphContent)
    expect(result?.success).toBe(false)
    expect(result?.values.error).toBe(`Not a(n) ${kMovablePointType} adornment.`)
  })

  it("get returns the expected data when movable point adornment provided", () => {
    const result = handler.get?.(mockMovablePointAdornment, mockGraphContent)
    expect(Array.isArray(result?.data)).toBe(true)
    expect(result?.data).toHaveLength(1)
    expect(result?.data[0]).toMatchObject({ lifeSpan: 1, mass: 2 })
    expect(mockDataConfig.getAllCellKeys).toHaveBeenCalled()
  })
})
