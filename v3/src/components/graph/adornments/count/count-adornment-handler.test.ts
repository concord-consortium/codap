import { types } from "mobx-state-tree"
import { countAdornmentHandler } from "./count-adornment-handler"
import { kCountType, kPercentType } from "./count-adornment-types"

jest.mock("../adornment-content-info", () => {
  const mockCountModel = types.model("CountAdornmentModel", {
    id: types.optional(types.string, "ADRN123"),
    type: types.optional(types.string, "Count"),
    showCount: types.optional(types.boolean, false),
    showPercent: types.optional(types.boolean, false),
    percentType: types.optional(types.string, "row"),
    isVisible: types.optional(types.boolean, false),
  }).actions(self => ({
    setShowCount(showCount: boolean) {
      self.showCount = showCount
    },
    setShowPercent(showPercent: boolean) {
      self.showPercent = showPercent
    },
    setPercentType(percentType: string) {
      self.percentType = percentType
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
      prefix: "count",
      type: "Count",
    }),
  }
})

describe("DataInteractive CountAdornmentHandler", () => {
  const handler = countAdornmentHandler

  let mockGraphContent: any
  let mockDataConfig: any
  let mockCountAdornment: any
  let mockInvalidAdornment: any

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
        subPlotsHaveRegions: true,
        subPlotRegionBoundaries: jest.fn(() => [1, 2, 3])
      },
      dataConfiguration: mockDataConfig
    }
    
    mockCountAdornment = {
      computeRegionCounts: jest.fn(() => [{ count: 2, percent: "50%" }]),
      id: "ADRN123",
      isVisible: true,
      percentValue: jest.fn(() => 0.5),
      percentType: "cell",
      showCount: true,
      showPercent: true,
      type: kCountType
    }

    mockInvalidAdornment = {
      id: "ADRN456",
      type: "invalid"
    }
  })

  it("create does not allow Percent to be added when plot does not support Percent", () => {
    const createRequestValues = {
      type: kPercentType,
      showCount: false,
      showPercent: true,
      percentType: "column"
    }
    const mockGraphContentNoPercent = {
      adornmentsStore: { subPlotsHaveRegions: false }
    } as any
    const result = handler.create!({ graphContent: mockGraphContentNoPercent, values: createRequestValues })
    expect(result?.success).toBe(false)
    const values = result?.values as any
    expect(values.error).toBe("The current plot type does not support Percent.")
  })

  it("create returns the expected data when count adornment created", () => {
    const createRequestValues = {
      type: kCountType,
      showCount: true,
      showPercent: false,
      percentType: "column"
    }
    const result = handler.create!({ graphContent: mockGraphContent, values: createRequestValues })
    expect(result?.success).toBe(true)
    expect(result?.values).toBeDefined()
    const values = result?.values as any
    expect(values.type).toBe(kCountType)
    expect(values.showCount).toBe(true)
    expect(values.showPercent).toBe(false)
    expect(values.percentType).toBe("column")
  })

  it("get returns an error when an invalid adornment provided", () => {
    const result = handler.get?.(mockInvalidAdornment, mockGraphContent)
    expect(result?.success).toBe(false)
    expect(result?.values.error).toBe(`Not a(n) ${kCountType} adornment.`)
  })

  it("get returns the expected data when count adornment provided", () => {
    const result = handler.get?.(mockCountAdornment, mockGraphContent)
    expect(Array.isArray(result?.data)).toBe(true)
    expect(result?.data).toHaveLength(1)
    expect(result?.data[0]).toMatchObject({ count: 2, percent: "50%" })
    expect(result?.percentType).toBe("cell")
    expect(result?.showCount).toBe(true)
    expect(result?.showPercent).toBe(true)
    expect(mockDataConfig.getAllCellKeys).toHaveBeenCalled()
  })

  it("get only returns a count when showCount is true and showPercent is false", () => {
    mockCountAdornment.showPercent = false
    const result = handler.get?.(mockCountAdornment, mockGraphContent)
    expect(result?.data[0]).toMatchObject({ count: 2 })
  })

  it("get only returns a percent when showCount is false and showPercent is true", () => {
    mockCountAdornment.showCount = false
    const result = handler.get?.(mockCountAdornment, mockGraphContent)
    expect(result?.data[0]).toMatchObject({ percent: "50%" })
  })

  it("update returns an error when count adornment not found", () => {
    mockGraphContent.adornmentsStore.findAdornmentOfType.mockReturnValue(null)
    const result = handler.update?.({ graphContent: mockGraphContent })
    expect(result?.success).toBe(false)
    const values = result?.values as any
    expect(values.error).toBe("Adornment not found.")
  })

  it("update successfully updates count adornment properties", () => {
    mockGraphContent.adornmentsStore.findAdornmentOfType.mockReturnValue(mockCountAdornment)
    const updateValues = {
      showCount: false,
      showPercent: true,
      percentType: "column",
      isVisible: true
    }
    const result = handler.update?.({ graphContent: mockGraphContent, values: updateValues })
    expect(result?.success).toBe(true)
  })

})
