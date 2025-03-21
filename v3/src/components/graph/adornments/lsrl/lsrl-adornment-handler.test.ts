import { lsrlAdornmentHandler } from "./lsrl-adornment-handler"
import { kLSRLType } from "./lsrl-adornment-types"

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
      dataConfiguration: mockDataConfig
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

  it("get returns an error when an invalid adornment provided", () => {
    const result = handler.get?.(mockInvalidAdornment, mockGraphContent)
    expect(result?.success).toBe(false)
    expect(result?.values.error).toBe(`Not an ${kLSRLType} adornment`)
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
