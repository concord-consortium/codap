import { IGraphDataConfigurationModel } from "../../models/graph-data-configuration-model"
import * as contentInfo from "../adornment-content-info"
import { kCountType } from "../count/count-adornment-types"
import { kMovableValueType } from "../movable-value/movable-value-adornment-types"
import { AdornmentsStore } from "./adornments-store"

jest.spyOn(contentInfo, "getAdornmentTypes").mockReturnValue(
  [
    { type: "Count", parentType: undefined },
    { type: "Mean", parentType: "Univariate Measure" },
    { type: "Median", parentType: "Univariate Measure" },
  ]
)

const mockAdornment = {
  cellCount: () => ({x: 1, y: 1}),
  classNameFromKey: () => "mock-count-adornment",
  getAllCellKeys: () => ([]),
  id: "ADRN123",
  instanceKey: () => "mock-count-adornment",
  isUnivariateMeasure: false,
  isVisible: false,
  cellKey: () => ({}),
  setVisibility: () => true,
  updateCategories: () => ({}),
  type: kCountType,
  labelLines: 0,
  applyModelChange: (fn: () => any) => fn()
}
const mockMovableValueAdornment = {
  cellCount: () => ({x: 1, y: 1}),
  classNameFromKey: () => "mock-movable-value-adornment",
  getAllCellKeys: () => ([]),
  id: "ADRN123",
  instanceKey: () => "mock-movable-value-adornment",
  isUnivariateMeasure: false,
  isVisible: false,
  cellKey: () => ({}),
  setVisibility: () => true,
  updateCategories: () => ({}),
  values: { "{}": [10] },
  type: kMovableValueType,
  labelLines: 1,
  applyModelChange: (fn: () => any) => fn()
}
const mockUpdateCategoriesOptions = {
  rightCats: [],
  rightAttrId: "",
  topCats: [],
  topAttrId: "",
  xAttrId: "abc123",
  xCats: [],
  yAttrId: "def456",
  yCats: [],
  dataConfig: {} as IGraphDataConfigurationModel
}

describe("AdornmentsStore", () => {
  it("should be defined", () => {
    expect(AdornmentsStore).toBeDefined()
  })
  it("can be created", () => {
    const adornmentsStore = AdornmentsStore.create()
    expect(adornmentsStore).toBeDefined()
  })

  it("can have its defaultFontSize property set", () => {
    const adornmentsStore = AdornmentsStore.create()
    expect(adornmentsStore.defaultFontSize).toBe(12)
    adornmentsStore.setDefaultFontSize(14)
    expect(adornmentsStore.defaultFontSize).toBe(14)
  })
  it("can have its interceptLocked property set", () => {
    const adornmentsStore = AdornmentsStore.create()
    expect(adornmentsStore.interceptLocked).toBe(false)
    adornmentsStore.toggleInterceptLocked()
    expect(adornmentsStore.interceptLocked).toBe(true)
    adornmentsStore.toggleInterceptLocked()
    expect(adornmentsStore.interceptLocked).toBe(false)
  })
  it("can have its showMeasureLabels property set", () => {
    const adornmentsStore = AdornmentsStore.create()
    expect(adornmentsStore.showMeasureLabels).toBe(false)
    adornmentsStore.toggleShowLabels()
    expect(adornmentsStore.showMeasureLabels).toBe(true)
    adornmentsStore.toggleShowLabels()
    expect(adornmentsStore.showMeasureLabels).toBe(false)
  })
  it("can have its showConnectingLines property set", () => {
    const adornmentsStore = AdornmentsStore.create()
    expect(adornmentsStore.showConnectingLines).toBe(false)
    adornmentsStore.toggleShowConnectingLines()
    expect(adornmentsStore.showConnectingLines).toBe(true)
    adornmentsStore.toggleShowConnectingLines()
    expect(adornmentsStore.showConnectingLines).toBe(false)
  })
  it("can have its showSquaresOfResiduals property set", () => {
    const adornmentsStore = AdornmentsStore.create()
    expect(adornmentsStore.showSquaresOfResiduals).toBe(false)
    adornmentsStore.toggleShowSquaresOfResiduals()
    expect(adornmentsStore.showSquaresOfResiduals).toBe(true)
    adornmentsStore.toggleShowSquaresOfResiduals()
    expect(adornmentsStore.showSquaresOfResiduals).toBe(false)
  })
  it("returns a list of adornment items for use in menus", () => {
    const adornmentsStore = AdornmentsStore.create()
    const adornmentsMenuItems = adornmentsStore.getAdornmentsMenuItems(undefined, "dotPlot", false)
    expect(adornmentsMenuItems).toBeDefined()
    expect(adornmentsMenuItems?.length).toBeGreaterThan(0)
    expect(adornmentsMenuItems?.[0].title).toBe("DG.Inspector.graphCount")
    expect(adornmentsMenuItems?.[1].title).toBe("DG.Inspector.showLabels")
    expect(adornmentsMenuItems?.[2].title).toBe("DG.Inspector.graphCenterOptions")
    expect(adornmentsMenuItems?.[3].title).toBe("DG.Inspector.graphSpreadOptions")
    expect(adornmentsMenuItems?.[4].title).toBe("DG.Inspector.graphBoxPlotNormalCurveOptions")
    expect(adornmentsMenuItems?.[5].title).toBe("DG.Inspector.graphOtherValuesOptions")
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
    adornmentsStore.showAdornment(adornmentsStore.adornments[0], kCountType)
    expect(adornmentsStore.adornments[0].isVisible).toBe(true)
    adornmentsStore.hideAdornment(kCountType)
    expect(adornmentsStore.adornments[0].isVisible).toBe(false)
  })
  it("can trigger a callback function when updateAdornments is called", () => {
    const adornmentsStore = AdornmentsStore.create()
    const mockCallback = jest.fn()
    adornmentsStore.updateAdornment(mockCallback)
    expect(mockCallback).toHaveBeenCalled()
  })
  it("returns a boolean indicating whether existing adornments create subregions within a plot", () => {
    const adornmentsStore = AdornmentsStore.create()
    expect(adornmentsStore.subPlotsHaveRegions).toBe(false)
    adornmentsStore.addAdornment(mockMovableValueAdornment, mockUpdateCategoriesOptions)
    adornmentsStore.showAdornment(adornmentsStore.adornments[0], kMovableValueType)
    expect(adornmentsStore.subPlotsHaveRegions).toBe(true)
  })
})
