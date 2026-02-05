// Note: Using "__EMPTY__" directly since jest.mock is hoisted before imports
jest.mock("../../adornment-content-info", () => ({
  ...jest.requireActual("../../adornment-content-info"),
  getAdornmentContentInfo: jest.fn().mockReturnValue({
    modelClass: {
      create: jest.fn().mockReturnValue({
        id: "ADRN123",
        type: "plottedValue",
        isVisible: true,
        setExpression: jest.fn(),
        setVisibility: jest.fn(),
        measures: new Map([["__EMPTY__", { value: 1 }]])
      })
    }
  }),
  isCompatibleWithPlotType: jest.fn().mockReturnValue(true)
}))

jest.mock("./plotted-value-adornment-model", () => ({
  ...jest.requireActual("./plotted-value-adornment-model"),
  isPlottedValueAdornment: jest.fn((adornment: any) => adornment.type === "Plotted Value")
}))

jest.mock("../../../../../data-interactive/data-interactive-adornment-types", () => ({
  ...jest.requireActual("../../../../../data-interactive/data-interactive-adornment-types"),
  isAdornmentValues: jest.fn().mockReturnValue(true)
}))

import { kDefaultCellKey } from "../../../utilities/cell-key-utils"
import { plottedValueAdornmentHandler } from "./plotted-value-adornment-handler"
import { kPlottedValueType } from "./plotted-value-adornment-types"

describe("DataInteractive plottedValueAdornmentHandler", () => {
  const handler = plottedValueAdornmentHandler
  const formula = { display: "y = 2x" }

  let mockGraphContent: any
  let mockDataConfig: any
  let mockPlottedValueAdornment: any
  let mockInvalidAdornment: any
  const mockPlottedValuesMap = new Map([
    [kDefaultCellKey, { value: 1 }]
  ])

  beforeEach(() => {
    mockDataConfig = {
      getAllCellKeys: jest.fn(() => [{}]),
      subPlotCases: jest.fn(() => [{ id: "case1" }, { id: "case2" }])
    }
    mockGraphContent = {
      adornmentsStore: {
        addAdornment: jest.fn((adornment: any, options: any) => null),
        removeAdornment: jest.fn(),
        findAdornmentOfType: jest.fn(),
        hideAdornment: jest.fn()
      },
      dataConfiguration: mockDataConfig,
      plotType: "dotPlot"
    }
    
    mockPlottedValueAdornment = {
      error: "",
      formula,
      id: "ADRN123",
      isVisible: true,
      measures: mockPlottedValuesMap,
      type: kPlottedValueType,
      setExpression: jest.fn(),
      setVisibility: jest.fn()
    }

    mockInvalidAdornment = {
      id: "ADRN456",
      type: "invalid",
      formula: { display: "invalid" },
      measures: new Map()
    }
  })

  it("get returns an error when an invalid adornment provided", () => {
    const result = handler.get?.(mockInvalidAdornment, mockGraphContent)
    expect(result?.success).toBe(false)
    expect(result?.values.error).toBe(`Not a(n) ${kPlottedValueType} adornment.`)
  })

  it("get returns the expected data when plotted value adornment provided", () => {
    const result = handler.get?.(mockPlottedValueAdornment, mockGraphContent)
    expect(Array.isArray(result?.data)).toBe(true)
    expect(result?.data).toHaveLength(1)
    expect(result?.data[0]).toMatchObject({ plottedValue: 1 })
    expect(result?.error).toBe("")
    expect(result?.formula).toBe(JSON.stringify(formula.display))
    expect(mockDataConfig.getAllCellKeys).toHaveBeenCalled()
  })

  describe("create", () => {
    it("creates a new plotted value adornment", () => {
      const values = { isVisible: true, formula }
      const result = handler.create?.({ graphContent: mockGraphContent, values })
      expect(result?.success).toBe(true)
      expect(mockGraphContent.adornmentsStore.addAdornment).toHaveBeenCalled()
    })
  })

  describe("update", () => {
    it("updates an existing plotted value adornment", () => {
      const values = { isVisible: false }
      const setVisibilityMock = jest.fn()
      const existingAdornment = { 
        ...mockPlottedValueAdornment, 
        setVisibility: setVisibilityMock
      }
      mockGraphContent.adornmentsStore.findAdornmentOfType = jest.fn(() => existingAdornment)
      const result = handler.update?.({ graphContent: mockGraphContent, values })
      expect(result?.success).toBe(true)
      expect(setVisibilityMock).toHaveBeenCalledWith(false)
    })

    it("returns error if no existing adornment", () => {
      mockGraphContent.adornmentsStore.findAdornmentOfType = jest.fn(() => undefined)
      const result = handler.update?.({ graphContent: mockGraphContent, values: { isVisible: false } })
      expect(result?.success).toBe(false)
    })
  })

  describe("delete", () => {
    it("removes an existing plotted value adornment", () => {
      const existingAdornment = { ...mockPlottedValueAdornment }
      mockGraphContent.adornmentsStore.findAdornmentOfType = jest.fn(() => existingAdornment)
      const result = handler.delete?.({ graphContent: mockGraphContent })
      expect(result?.success).toBe(true)
      expect(mockGraphContent.adornmentsStore.hideAdornment).toHaveBeenCalledWith(kPlottedValueType)
    })

    it("returns error if no existing adornment to delete", () => {
      mockGraphContent.adornmentsStore.findAdornmentOfType = jest.fn(() => undefined)
      const result = handler.delete?.({ graphContent: mockGraphContent })
      expect(result?.success).toBe(false)
    })
  })

})
