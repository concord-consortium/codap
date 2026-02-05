import { types } from "mobx-state-tree"
import { kDefaultCellKey } from "../../../utilities/cell-key-utils"
import { meanAdornmentHandler } from "./mean-adornment-handler"
import { kMeanType } from "./mean-adornment-types"

jest.mock("../../adornment-content-info", () => {
  const mockMeanModel = types.model("MeanAdornmentModel", {
    id: types.optional(types.string, "ADRN123"),
    measures: types.map(types.model({ value: types.number })),
    type: types.optional(types.string, "Mean"),
    isVisible: types.optional(types.boolean, false),
  }).actions(self => ({
    setVisibility(isVisible: boolean) {
      self.isVisible = isVisible
    }
  }))

  const mockContentInfo = {
    modelClass: mockMeanModel,
    plots: ["dotPlot"],
    prefix: "mean",
    type: "Mean",
  }

  return {
    ...jest.requireActual("../../adornment-content-info"),
    getAdornmentContentInfo: jest.fn().mockReturnValue(mockContentInfo),
    isCompatibleWithPlotType: jest.fn().mockImplementation((adornmentType: string, plotType: string) => {
      const info = mockContentInfo
      return info.plots.includes(plotType)
    })
  }
})

describe("DataInteractive meanAdornmentHandler", () => {
  const handler = meanAdornmentHandler

  let mockGraphContent: any
  let mockDataConfig: any
  let mockMeanAdornment: any
  let mockInvalidAdornment: any
  const mockMeasuresMap = new Map([
    [kDefaultCellKey, { value: 10 }]
  ])

  beforeEach(() => {
    mockDataConfig = {
      attributeID: jest.fn(() => "attr1"),
      attributeType: jest.fn(() => "numeric"),
      dataset: {
        getCasesForAttributes: jest.fn(() => [1, 1]),
        getNumeric: jest.fn(() => 1)
      },
      getAllCellKeys: jest.fn(() => [{}]),
      subPlotCases: jest.fn(() => [{ id: "case1" }, { id: "case2" }])
    }
    mockGraphContent = {
      adornmentsStore: {
        addAdornment: jest.fn((adornment: any, options: any) => null),
        findAdornmentOfType: jest.fn(),
        subPlotRegionBoundaries: jest.fn(() => [1, 2])
      },
      dataConfiguration: mockDataConfig,
      plotType: "dotPlot"
    }
    
    mockMeanAdornment = {
      id: "ADRN123",
      isVisible: true,
      measures: mockMeasuresMap,
      type: kMeanType
    }

    mockInvalidAdornment = {
      id: "ADRN456",
      type: "invalid"
    }
  })

  it("create returns the expected data when mean adornment created", () => {
    const createRequestValues = {
      type: kMeanType,
    }
    const result = handler.create!({ graphContent: mockGraphContent, values: createRequestValues })
    expect(result?.success).toBe(true)
    expect(result?.values).toBeDefined()
    const values = result?.values as any
    expect(values.type).toBe(kMeanType)
  })

  it("create returns error when plot type is not compatible", () => {
    mockGraphContent.plotType = "scatterPlot"
    const createRequestValues = {
      type: kMeanType,
    }
    const result = handler.create!({ graphContent: mockGraphContent, values: createRequestValues })
    expect(result?.success).toBe(false)
    const values = result?.values as { error: string }
    expect(values.error).toBe("Adornment not supported by plot type.")
  })

  it("get returns an error when an invalid adornment provided", () => {
    const result = handler.get?.(mockInvalidAdornment, mockGraphContent)
    expect(result?.success).toBe(false)
    expect(result?.values.error).toBe(`Not a(n) ${kMeanType} adornment.`)
  })

  it("get returns the expected data when mean adornment provided", () => {
    const result = handler.get?.(mockMeanAdornment, mockGraphContent)
    expect(Array.isArray(result?.data)).toBe(true)
    expect(result?.data).toHaveLength(1)
    expect(result?.data[0]).toMatchObject({ mean: 10 })
    expect(mockDataConfig.getAllCellKeys).toHaveBeenCalled()
  })

  it("update returns an error when mean adornment not found", () => {
    mockGraphContent.adornmentsStore.findAdornmentOfType.mockReturnValue(null)
    const result = handler.update?.({ graphContent: mockGraphContent })
    expect(result?.success).toBe(false)
    const values = result?.values as any
    expect(values.error).toBe("Adornment not found.")
  })

  it("update successfully updates count adornment properties", () => {
    mockGraphContent.adornmentsStore.findAdornmentOfType.mockReturnValue(mockMeanAdornment)
    const updateValues = {
      isVisible: false
    }
    const result = handler.update?.({ graphContent: mockGraphContent, values: updateValues })
    expect(result?.success).toBe(true)
  })
})
