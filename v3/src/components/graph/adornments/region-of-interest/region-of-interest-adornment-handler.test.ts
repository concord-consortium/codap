import { types } from "mobx-state-tree"
import { regionOfInterestAdornmentHandler } from "./region-of-interest-adornment-handler"
import { kRegionOfInterestType } from "./region-of-interest-adornment-types"

jest.mock("../adornment-content-info", () => {
  const mockRegionOfInterestModel = types.model("RegionOfInterestAdornmentModel", {
    id: types.optional(types.string, "ADRN123"),
    type: types.optional(types.string, "Region of Interest"),
    isVisible: types.optional(types.boolean, false),
    height: types.optional(types.number, 100),
    width: types.optional(types.number, 150),
    xAttribute: types.optional(types.string, ""),
    xPosition: types.optional(
      types.frozen<Record<string, number | string>>(), { unit: "coordinate", value: 10 }
    ),
    yAttribute: types.optional(types.string, ""),
    yPosition: types.optional(
      types.frozen<Record<string, number | string>>(), { unit: "coordinate", value: 15 }
    )
  }).actions(self => ({
    setHeight(height: number) {
      self.height = height
    },
    setWidth(width: number) {
      self.width = width
    },
    setPosition(x: Record<string, number | string>, y: Record<string, number | string>) {
      self.xPosition = x
      self.yPosition = y
    },
    setSize(width: number, height: number) {
      self.width = width
      self.height = height
    },
    setVisibility(isVisible: boolean) {
      self.isVisible = isVisible
    }
  }))

  const mockContentInfo = {
    modelClass: mockRegionOfInterestModel,
    plots: ["dotPlot"],
    prefix: "region-of-interest",
    type: "Region of Interest",
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

describe("DataInteractive regionOfInterestAdornmentHandler", () => {
  const handler = regionOfInterestAdornmentHandler

  let mockGraphContent: any
  let mockDataConfig: any
  let mockRegionOfInterestAdornment: any
  let mockInvalidAdornment: any

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
    
    mockRegionOfInterestAdornment = {
      height: 100,
      id: "ADRN123",
      isVisible: true,
      setVisibility: jest.fn(),
      type: kRegionOfInterestType,
      width: 150,
      xPosition: { unit: "coordinate", value: 10 },
      yPosition: { unit: "coordinate", value: 15 }
    }

    mockInvalidAdornment = {
      id: "ADRN456",
      type: "invalid"
    }
  })

  it("create returns the expected data when Region of Interest adornment created", () => {
    const createRequestValues = {
      type: kRegionOfInterestType
    }
    const result = handler.create!({ graphContent: mockGraphContent, values: createRequestValues })
    expect(result?.success).toBe(true)
    expect(result?.values).toBeDefined()
    const values = result?.values as any
    expect(values.type).toBe(kRegionOfInterestType)
    expect(values.id).toBe("ADRN123")
    expect(values.isVisible).toBe(true)
    expect(values.height).toBe(100)
    expect(values.width).toBe(150)
    expect(values.xPosition).toBe(JSON.stringify({ unit: "coordinate", value: 10 }))
    expect(values.yPosition).toBe(JSON.stringify({ unit: "coordinate", value: 15 }))
  })

  it("get returns an error when an invalid adornment provided", () => {
    const result = handler.get?.(mockInvalidAdornment, mockGraphContent)
    expect(result?.success).toBe(false)
    expect(result?.values.error).toBe(`Not a(n) Region of Interest adornment.`)
  })

  it("get returns the expected data when Region of Interest adornment provided", () => {
    const result = handler.get?.(mockRegionOfInterestAdornment, mockGraphContent)
    expect(result?.id).toBe("ADRN123")
    expect(result?.isVisible).toBe(true)
    expect(result?.type).toBe(kRegionOfInterestType)
  })

  it("update returns an error when no Region of Interest adornment found", () => {
    const result = handler.update?.({ graphContent: mockGraphContent, values: {} })
    expect(result?.success).toBe(false)
  })

  it("update returns the expected data when Region of Interest adornment updated", () => {
    mockGraphContent.adornmentsStore.findAdornmentOfType.mockReturnValue(mockRegionOfInterestAdornment)
    const result = handler.update?.({ graphContent: mockGraphContent, values: { isVisible: false } })
    expect(result?.success).toBe(true)
  })
})
