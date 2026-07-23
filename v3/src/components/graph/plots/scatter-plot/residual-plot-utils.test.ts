import { IAdornmentsBaseStore } from "../../adornments/store/adornments-base-store"
import { kLSRLType } from "../../adornments/lsrl/lsrl-adornment-types"
import { kMovableLineType } from "../../adornments/movable-line/movable-line-adornment-types"
import { kPlottedFunctionType } from "../../adornments/plotted-function/plotted-function-adornment-types"
import { IGraphDataConfigurationModel } from "../../models/graph-data-configuration-model"
import {
  defaultSelectedColor, defaultSelectedStroke, defaultSelectedStrokeOpacity, defaultSelectedStrokeWidth,
  defaultStrokeOpacity, defaultStrokeWidth
} from "../../../../utilities/color-utils"
import {
  getActiveLineKind, IResidualPoint, residualDomain, residualPlotIsApplicable, residualPointStyle
} from "./residual-plot-utils"

// Tiny fake store: just enough of IAdornmentsBaseStore for the applicability + kind checks.
// Cast rather than importing the full MST model — that would drag in the whole graph tree and
// duplicate rendering-side coverage for zero test value.
function fakeStore(visible: {ml?: boolean; lsrl?: boolean; pf?: boolean} = {}): IAdornmentsBaseStore {
  return {
    isShowingAdornment(type: string) {
      if (type === kMovableLineType) return !!visible.ml
      if (type === kLSRLType) return !!visible.lsrl
      if (type === kPlottedFunctionType) return !!visible.pf
      return false
    },
    interceptLocked: false
  } as unknown as IAdornmentsBaseStore
}

// Tiny fake data-config with the specific fields residualPlotIsApplicable reads.
interface IFakeConfigOptions {
  xType?: string
  yType?: string
  yAttrCount?: number
  rightNumeric?: string
  topSplit?: string
  rightSplit?: string
  legend?: string
}
function fakeConfig(opts: IFakeConfigOptions = {}): IGraphDataConfigurationModel {
  const {
    xType = "numeric", yType = "numeric", yAttrCount = 1,
    rightNumeric = "", topSplit = "", rightSplit = "", legend = ""
  } = opts
  return {
    attributeType: (role: string) => role === "x" ? xType : role === "y" ? yType : "",
    yAttributeIDs: Array.from({length: yAttrCount}, (_, i) => `y${i}`),
    attributeID: (role: string) => {
      if (role === "rightNumeric") return rightNumeric
      if (role === "topSplit") return topSplit
      if (role === "rightSplit") return rightSplit
      if (role === "legend") return legend
      return ""
    }
  } as unknown as IGraphDataConfigurationModel
}

describe("getActiveLineKind", () => {
  it("returns null when no line is visible", () => {
    expect(getActiveLineKind(fakeStore())).toBeNull()
  })
  it("returns 'movableLine' when only Movable Line is visible", () => {
    expect(getActiveLineKind(fakeStore({ml: true}))).toBe("movableLine")
  })
  it("returns 'lsrl' when only LSRL is visible", () => {
    expect(getActiveLineKind(fakeStore({lsrl: true}))).toBe("lsrl")
  })
  it("returns 'plottedFunction' when only Plotted Function is visible", () => {
    expect(getActiveLineKind(fakeStore({pf: true}))).toBe("plottedFunction")
  })
  it("returns null when two lines are visible (ambiguous — Residual Plot requires exactly one)", () => {
    expect(getActiveLineKind(fakeStore({ml: true, lsrl: true}))).toBeNull()
  })
  it("returns null when all three lines are visible", () => {
    expect(getActiveLineKind(fakeStore({ml: true, lsrl: true, pf: true}))).toBeNull()
  })
})

describe("residualPlotIsApplicable", () => {
  it("returns false when no line is active", () => {
    expect(residualPlotIsApplicable(fakeStore(), fakeConfig())).toBe(false)
  })
  it("returns false when dataConfig is undefined", () => {
    expect(residualPlotIsApplicable(fakeStore({ml: true}), undefined)).toBe(false)
  })
  it("returns true when all constraints are met (one line, numeric x/y, no extras)", () => {
    expect(residualPlotIsApplicable(fakeStore({ml: true}), fakeConfig())).toBe(true)
  })
  it("returns false when x is not numeric", () => {
    expect(residualPlotIsApplicable(fakeStore({ml: true}), fakeConfig({xType: "categorical"}))).toBe(false)
  })
  it("returns false when y is not numeric", () => {
    expect(residualPlotIsApplicable(fakeStore({ml: true}), fakeConfig({yType: "categorical"}))).toBe(false)
  })
  it("returns false when there are multiple y attributes (y+)", () => {
    expect(residualPlotIsApplicable(fakeStore({ml: true}), fakeConfig({yAttrCount: 2}))).toBe(false)
  })
  it("returns false when a rightNumeric (Y2) attribute is present", () => {
    expect(residualPlotIsApplicable(fakeStore({ml: true}), fakeConfig({rightNumeric: "attr-y2"}))).toBe(false)
  })
  it("returns false when a topSplit (top categorical) attribute is present", () => {
    expect(residualPlotIsApplicable(fakeStore({ml: true}), fakeConfig({topSplit: "attr-top"}))).toBe(false)
  })
  it("returns false when a rightSplit (right categorical) attribute is present", () => {
    expect(residualPlotIsApplicable(fakeStore({ml: true}), fakeConfig({rightSplit: "attr-right"}))).toBe(false)
  })
  it("returns false when a legend attribute is present", () => {
    expect(residualPlotIsApplicable(fakeStore({ml: true}), fakeConfig({legend: "attr-legend"}))).toBe(false)
  })
  it("returns false when two lines are active (even with all other constraints met)", () => {
    expect(residualPlotIsApplicable(fakeStore({ml: true, lsrl: true}), fakeConfig())).toBe(false)
  })
})

describe("residualDomain", () => {
  it("returns [-1, 1] for an empty residual set (safe fallback for axis rendering)", () => {
    expect(residualDomain([])).toEqual([-1, 1])
  })
  it("always includes 0, even when all residuals are positive", () => {
    const residuals: IResidualPoint[] = [
      {caseID: "a", x: 1, residual: 10}, {caseID: "b", x: 2, residual: 20}, {caseID: "c", x: 3, residual: 30}
    ]
    const [min, max] = residualDomain(residuals)
    expect(min).toBeLessThanOrEqual(0)
    expect(max).toBeGreaterThanOrEqual(30)
  })
  it("always includes 0, even when all residuals are negative", () => {
    const residuals: IResidualPoint[] = [
      {caseID: "a", x: 1, residual: -10}, {caseID: "b", x: 2, residual: -20}
    ]
    const [min, max] = residualDomain(residuals)
    expect(min).toBeLessThanOrEqual(-20)
    expect(max).toBeGreaterThanOrEqual(0)
  })
  it("brackets both extremes when residuals straddle zero", () => {
    const residuals: IResidualPoint[] = [
      {caseID: "a", x: 1, residual: -50}, {caseID: "b", x: 2, residual: 100}
    ]
    const [min, max] = residualDomain(residuals)
    expect(min).toBeLessThan(-50)
    expect(max).toBeGreaterThan(100)
  })
  it("adds 5% padding on each end", () => {
    const residuals: IResidualPoint[] = [
      {caseID: "a", x: 1, residual: 0}, {caseID: "b", x: 2, residual: 100}
    ]
    const [min, max] = residualDomain(residuals)
    // range is 100, padding is 5
    expect(min).toBeCloseTo(-5, 5)
    expect(max).toBeCloseTo(105, 5)
  })
  it("returns a non-degenerate range when all residuals are exactly zero", () => {
    const residuals: IResidualPoint[] = [
      {caseID: "a", x: 1, residual: 0}, {caseID: "b", x: 2, residual: 0}
    ]
    const [min, max] = residualDomain(residuals)
    expect(min).toBeLessThan(max)
  })
})

describe("residualPointStyle", () => {
  const base = {
    hasLegend: false, legendColor: undefined as string | undefined,
    pointColor: "#111111", pointStrokeColor: "#222222", pointRadius: 3, selectedRadius: 5
  }

  it("uses the point color and default stroke when unselected (no legend)", () => {
    expect(residualPointStyle({ ...base, isSelected: false })).toEqual({
      fill: "#111111", radius: 3,
      stroke: "#222222", strokeWidth: defaultStrokeWidth, strokeOpacity: defaultStrokeOpacity
    })
  })

  it("uses the solid selection fill and grows the radius when selected without a legend", () => {
    const style = residualPointStyle({ ...base, isSelected: true })
    expect(style.fill).toBe(defaultSelectedColor)
    expect(style.radius).toBe(5)
    // With the solid selection fill there is no highlighted stroke — it stays the default.
    expect(style.stroke).toBe("#222222")
    expect(style.strokeWidth).toBe(defaultStrokeWidth)
    expect(style.strokeOpacity).toBe(defaultStrokeOpacity)
  })

  it("keeps the legend color as fill when unselected with a legend", () => {
    expect(residualPointStyle({ ...base, hasLegend: true, legendColor: "#abcdef", isSelected: false }))
      .toEqual({
        fill: "#abcdef", radius: 3,
        stroke: "#222222", strokeWidth: defaultStrokeWidth, strokeOpacity: defaultStrokeOpacity
      })
  })

  it("keeps the legend color as fill and applies the highlight stroke when selected with a legend", () => {
    const style = residualPointStyle({ ...base, hasLegend: true, legendColor: "#abcdef", isSelected: true })
    // With a legend the category color is preserved; selection shows through the stroke, not the fill.
    expect(style.fill).toBe("#abcdef")
    expect(style.radius).toBe(5)
    expect(style.stroke).toBe(defaultSelectedStroke)
    expect(style.strokeWidth).toBe(defaultSelectedStrokeWidth)
    expect(style.strokeOpacity).toBe(defaultSelectedStrokeOpacity)
  })

  it("falls back to the point color when a legend is present but no color resolves", () => {
    expect(residualPointStyle({ ...base, hasLegend: true, legendColor: undefined, isSelected: false }).fill)
      .toBe("#111111")
  })
})
