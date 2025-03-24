import { types } from "mobx-state-tree"
import { lsrlAdornmentHandler } from "./lsrl-adornment-handler"
import { kLSRLType } from "./lsrl-adornment-types"

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

describe("DataInteractive lsrlAdornmentHandler", () => {
  const handler = lsrlAdornmentHandler

  let mockGraphContent: any
  let mockDataConfig: any
  let mockLSRLAdornment: any
  let mockInvalidAdornment: any
  const mockLinesMap = new Map([
    ["{}", new Map([
      ["__main__", { category: "category", intercept: 1, rSquared: 0.5, sdResiduals: 0.5, slope: 0.5 }]
    ])]
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
      plotType: "scatterPlot"
    }
    
    mockLSRLAdornment = {
      id: "ADRN123",
      isVisible: true,
      lines: mockLinesMap,
      showConfidenceBands: true,
      type: kLSRLType
    }

    mockInvalidAdornment = {
      id: "ADRN456",
      type: "invalid"
    }
  })

  it("create returns the expected data when LSRL adornment created", () => {
    const createRequestValues = {
      type: kLSRLType,
      showConfidenceBands: true
    }
    const result = handler.create!({ graphContent: mockGraphContent, values: createRequestValues })
    expect(result?.success).toBe(true)
    expect(result?.values).toBeDefined()
    const values = result?.values as any
    expect(values.type).toBe(kLSRLType)
    expect(values.showConfidenceBands).toBe(true)
  })

  it("get returns an error when an invalid adornment provided", () => {
    const result = handler.get?.(mockInvalidAdornment, mockGraphContent)
    expect(result?.success).toBe(false)
    expect(result?.values.error).toBe(`Not a(n) ${kLSRLType} adornment.`)
  })

  it("get returns the expected data when LSRL adornment provided", () => {
    const result = handler.get?.(mockLSRLAdornment, mockGraphContent)
    expect(Array.isArray(result?.data)).toBe(true)
    expect(result?.data).toHaveLength(1)
    expect(result?.data[0]).toMatchObject({
      category: "category", intercept: 1, rSquared: 0.5, sdResiduals: 0.5, slope: 0.5
    })
    expect(result?.showConfidenceBands).toBe(true)
    expect(mockDataConfig.getAllCellKeys).toHaveBeenCalled()
  })
})
