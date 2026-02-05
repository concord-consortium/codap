import { types } from "mobx-state-tree"
import { kDefaultCellKey } from "../../utilities/cell-key-utils"
import { movableValueAdornmentHandler } from "./movable-value-adornment-handler"
import { kMovableValueType } from "./movable-value-adornment-types"

// Note: Using "__EMPTY__" directly in jest.mock since it's hoisted before imports
jest.mock("../adornment-content-info", () => {
  const mockMovableValueModel = types.model("MovableValueAdornmentModel", {
    id: types.optional(types.string, "ADRN123"),
    type: types.optional(types.string, "Movable Value"),
    isVisible: types.optional(types.boolean, false),
    values: types.map(types.array(types.number))
  }).actions(self => ({
    addValue(value: number) {
      self.values.set("__EMPTY__", [value])
    },
    replaceValue(value: number, key: string) {
      self.values.set(key, [value])
    },
    setVisibility(isVisible: boolean) {
      self.isVisible = isVisible
    }
  }))

  const mockContentInfo = {
    modelClass: mockMovableValueModel,
    plots: ["dotPlot"],
    prefix: "movable-value",
    type: "Movable Value",
  }

  return {
    ...jest.requireActual("../adornment-content-info"),
    getAdornmentContentInfo: jest.fn().mockReturnValue(mockContentInfo),
    isCompatibleWithPlotType: jest.fn().mockImplementation((adornmentType: string, plotType: string) => {
      const info = mockContentInfo
      return info.plots.includes(plotType)
    })
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
    [kDefaultCellKey, [1, 3000000]]
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
      dataConfiguration: mockDataConfig,
      getUpdateCategoriesOptions: jest.fn(() => ({})),
      plotType: "dotPlot"
    }
  
    mockWrongGraphContent = {
      plotType: "scatterPlot"
    }

    mockMovableValueAdornment = {
      id: "ADRN123",
      isVisible: true,
      replaceValue: jest.fn(),
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

  it("create returns the expected data when Movable Value adornment created", () => {
    const createRequestValues = {
      type: kMovableValueType,
      values: [["", 5]]
    }
    const result = handler.create!({ graphContent: mockGraphContent, values: createRequestValues })
    expect(result?.success).toBe(true)
    expect(result?.values).toBeDefined()
    const values = result?.values as any
    expect(values.type).toBe(kMovableValueType)
    expect(values.data).toEqual([{"movableValues": [5]}])
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

  it("update returns an error when Movable Value adornment not found", () => {
    mockGraphContent.adornmentsStore.findAdornmentOfType.mockReturnValue(null)
    const result = handler.update?.({ graphContent: mockGraphContent })
    expect(result?.success).toBe(false)
    const values = result?.values as any
    expect(values.error).toBe("Adornment not found.")
  })

  it("update successfully updates count adornment properties", () => {
    mockGraphContent.adornmentsStore.findAdornmentOfType.mockReturnValue(mockMovableValueAdornment)
    const updateValues = {
      values: [["", 5]]
    }
    const result = handler.update?.({ graphContent: mockGraphContent, values: updateValues })
    expect(result?.success).toBe(true)
    expect(mockMovableValueAdornment.replaceValue).toHaveBeenCalledWith(5, kDefaultCellKey)
  })
})
