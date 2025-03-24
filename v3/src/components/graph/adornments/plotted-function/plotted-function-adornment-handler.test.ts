import { plottedFunctionAdornmentHandler } from "./plotted-function-adornment-handler"
import { kPlottedFunctionType } from "./plotted-function-adornment-types"

describe("DataInteractive plottedFunctionAdornmentHandler", () => {
  const handler = plottedFunctionAdornmentHandler
  const formula = { display: "y = 2x" }

  let mockGraphContent: any
  let mockDataConfig: any
  let mockPlottedFunctionAdornment: any
  let mockInvalidAdornment: any

  beforeEach(() => {
    mockDataConfig = {
      getAllCellKeys: jest.fn(() => [{}]),
      subPlotCases: jest.fn(() => [{ id: "case1" }, { id: "case2" }])
    }
    mockGraphContent = {
      dataConfiguration: mockDataConfig
    }
    
    mockPlottedFunctionAdornment = {
      adornmentId: "ADRN123",
      error: "",
      formula,
      isVisible: true,
      type: kPlottedFunctionType
    }

    mockInvalidAdornment = {
      id: "ADRN456",
      type: "invalid"
    }
  })

  it("get returns an error when an invalid adornment provided", () => {
    const result = handler.get?.(mockInvalidAdornment, mockGraphContent)
    expect(result?.success).toBe(false)
    expect(result?.values.error).toBe(`Not a(n) ${kPlottedFunctionType} adornment.`)
  })

  it("get returns the expected data when plotted function adornment provided", () => {
    const result = handler.get?.(mockPlottedFunctionAdornment, mockGraphContent)
    expect(result?.error).toBe("")
    expect(result?.formula).toBe(JSON.stringify(formula.display))
  })
})
