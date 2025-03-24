import { types } from "@concord-consortium/mobx-state-tree"
import { movableValueAdornmentHandler } from "./movable-value-adornment-handler"
import { kMovableValueType } from "./movable-value-adornment-types"

jest.mock("../adornment-content-info", () => {
  const mockCountModel = types.model("LSRLAdornmentModel", {
    id: types.optional(types.string, "ADRN123"),
    showConfidenceBands: types.optional(types.boolean, false),
    type: types.optional(types.string, "LSRL"),
    isVisible: types.optional(types.boolean, false),
  }).actions(self => ({
    setShowConfidenceBands(show: boolean) {
      self.showConfidenceBands = show
    },
    setVisibility(isVisible: boolean) {
      self.isVisible = isVisible
    }
  }))

  return {
    ...jest.requireActual("../adornment-content-info"),
    getAdornmentContentInfo: jest.fn().mockReturnValue({
      modelClass: mockCountModel,
      plots: ["scatterPlot"],
      prefix: "lsrl",
      type: "LSRL",
    }),
  }
})

describe("DataInteractive movableValueAdornmentHandler", () => {
  const handler = movableValueAdornmentHandler

  let mockGraphContent: any
  let mockWrongGraphContent: any
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
      adornmentsStore: {
        addAdornment: jest.fn((adornment: any, options: any) => null),
        findAdornmentOfType: jest.fn()
      },
      dataConfiguration: mockDataConfig
    }
  
    mockWrongGraphContent = {
      plotType: "linePlot"
    }

    mockMovableValueAdornment = {
      id: "ADRN123",
      isVisible: true,
      type: kMovableValueType,
      values: mockValuesMap
    }

    mockInvalidAdornment = {
      id: "ADRN456",
      type: "invalid"
    }
  })

  it("create returns an error when the adornment is not supported by the plot type", () => {
    const result = handler.create?.({graphContent: mockWrongGraphContent})
    expect(result?.success).toBe(false)
    const values = result?.values as any
    expect(values.error).toBe(`Adornment not supported by plot type.`)
  })

  it("delete returns an error when the movable value adornment is not found", () => {
    const result = handler.delete?.({graphContent: mockGraphContent})
    expect(result?.success).toBe(false)
    const values = result?.values as any
    expect(values.error).toBe("Adornment not found.")
  })

  it("get returns an error when an invalid adornment provided", () => {
    const result = handler.get?.(mockInvalidAdornment, mockGraphContent)
    expect(result?.success).toBe(false)
    expect(result?.values.error).toBe(`Not a(n) ${kMovableValueType} adornment.`)
  })

  it("get returns the expected data when movable value adornment provided", () => {
    const result = handler.get?.(mockMovableValueAdornment, mockGraphContent)
    expect(Array.isArray(result?.data)).toBe(true)
    expect(result?.data).toHaveLength(1)
    expect(result?.data[0]).toMatchObject({movableValues: [1, 3000000]})
    expect(mockDataConfig.getAllCellKeys).toHaveBeenCalled()
  })
})
