import { AdornmentsStore } from "./adornments-store"
import * as contentInfo from "./adornment-content-info"

jest.spyOn(contentInfo, "getAdornmentTypes").mockReturnValue(
  [
    { type: "Count", parentType: undefined },
    { type: "Mean", parentType: "Univariate Measure" },
    { type: "Median", parentType: "Univariate Measure" },
  ]
)

const mockAdornment = {
  classNameFromKey: () => "mock-count-adornment",
  id: "ADRN123",
  instanceKey: () => "mock-count-adornment",
  isUnivariateMeasure: false,
  isVisible: false,
  generateCellKey: () => ({}),
  setVisibility: () => true,
  updateCategories: () => ({}),
  type: "Mock Adornment"
}
const mockUpdateCategoriesOptions = {
  rightCats: [],
  rightAttrId: "",
  topCats: [],
  topAttrId: "",
  xAttrId: "abc123",
  xCats: [],
  yAttrId: "def456",
  yCats: []
}

describe("AdornmentsStore", () => {
  it("should be defined", () => {
    expect(AdornmentsStore).toBeDefined()
  })
  it("can be created", () => {
    const adornmentsStore = AdornmentsStore.create()
    expect(adornmentsStore).toBeDefined()
    expect(adornmentsStore.type).toEqual("Adornments Store")
  })
  it("can have its showMeasureLabels property set", () => {
    const adornmentsStore = AdornmentsStore.create()
    expect(adornmentsStore.showMeasureLabels).toBe(false)
    adornmentsStore.toggleShowLabels()
    expect(adornmentsStore.showMeasureLabels).toBe(true)
    adornmentsStore.toggleShowLabels()
    expect(adornmentsStore.showMeasureLabels).toBe(false)
  })
  it("returns a list of adornment items for use in menus", () => {
    const adornmentsStore = AdornmentsStore.create()
    const adornmentsMenuItems = adornmentsStore.getAdornmentsMenuItems("dotPlot")
    expect(adornmentsMenuItems).toBeDefined()
    expect(adornmentsMenuItems?.length).toBeGreaterThan(0)
    expect(adornmentsMenuItems?.[0].title).toBe("DG.Inspector.graphCount")
    expect(adornmentsMenuItems?.[1].title).toBe("DG.Inspector.showLabels")
    expect(adornmentsMenuItems?.[2].title).toBe("DG.Inspector.graphPlottedMean")
    expect(adornmentsMenuItems?.[3].title).toBe("DG.Inspector.graphPlottedMedian")
  })
  it("can add adornments", () => {
    const adornmentsStore = AdornmentsStore.create()
    expect(adornmentsStore.adornments.length).toBe(0)
    adornmentsStore.addAdornment(mockAdornment, mockUpdateCategoriesOptions)
    expect(adornmentsStore.adornments.length).toBe(1)
  })
  it("can set adornments to be visible or hidden", () => {
    const adornmentsStore = AdornmentsStore.create()
    expect(adornmentsStore.adornments.length).toBe(0)
    adornmentsStore.addAdornment(mockAdornment, mockUpdateCategoriesOptions)
    expect(adornmentsStore.adornments.length).toBe(1)
    expect(adornmentsStore.adornments[0].isVisible).toBe(false)
    adornmentsStore.showAdornment(adornmentsStore.adornments[0], "Mock Adornment")
    expect(adornmentsStore.adornments[0].isVisible).toBe(true)
    adornmentsStore.hideAdornment("Mock Adornment")
    expect(adornmentsStore.adornments[0].isVisible).toBe(false)
  })
  it("can trigger a callback function when updateAdornments is called", () => {
    const adornmentsStore = AdornmentsStore.create()
    const mockCallback = jest.fn()
    adornmentsStore.updateAdornment(mockCallback)
    expect(mockCallback).toHaveBeenCalled()
  })
})
