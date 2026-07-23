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
  computeResiduals, getActiveLineKind, getPredictor, IResidualPoint, Predictor,
  residualDomain, residualPlotIsApplicable, residualPointStyle
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

// A fake store that also answers findAdornmentOfType, for the predictor tests. Movable-line and
// plotted-function predictors read their model via findAdornmentOfType; the LSRL predictor computes
// from the data instead, so it only needs isShowingAdornment + interceptLocked.
function fakeStoreWithAdornments(opts: {
  ml?: boolean; lsrl?: boolean; pf?: boolean; mlModel?: unknown; pfModel?: unknown; interceptLocked?: boolean
} = {}): IAdornmentsBaseStore {
  return {
    isShowingAdornment(type: string) {
      if (type === kMovableLineType) return !!opts.ml
      if (type === kLSRLType) return !!opts.lsrl
      if (type === kPlottedFunctionType) return !!opts.pf
      return false
    },
    findAdornmentOfType(type: string) {
      if (type === kMovableLineType) return opts.mlModel
      if (type === kPlottedFunctionType) return opts.pfModel
      return undefined
    },
    interceptLocked: !!opts.interceptLocked
  } as unknown as IAdornmentsBaseStore
}

// A fake data config backed by per-case numeric values, for computeResiduals / LSRL predictor.
// dataDisplayGetNumericValue reads dataset.getAttribute(id).type and dataset.getNumeric(caseID, id);
// an undefined value models a non-numeric/missing cell (filtered out).
const kXId = "xId", kYId = "yId"
function fakeConfigWithData(
  cases: Array<{ caseID: string; x?: number; y?: number }>
): IGraphDataConfigurationModel {
  const numeric: Record<string, Record<string, number | undefined>> = {}
  cases.forEach(c => { numeric[c.caseID] = { [kXId]: c.x, [kYId]: c.y } })
  const dataset = {
    getAttribute: () => ({ type: "numeric" }),
    getNumeric: (caseID: string, attrID: string) => numeric[caseID]?.[attrID]
  }
  return {
    dataset,
    attributeID: (role: string) => role === "x" ? kXId : role === "y" ? kYId : "",
    getCaseDataArray: () => cases.map(c => ({ caseID: c.caseID }))
  } as unknown as IGraphDataConfigurationModel
}

describe("getPredictor", () => {
  it("returns null when no line is active", () => {
    expect(getPredictor(fakeStoreWithAdornments(), fakeConfigWithData([]))).toBeNull()
  })

  it("builds a slope/intercept predictor from the movable line", () => {
    const store = fakeStoreWithAdornments({ ml: true, mlModel: { lineDescriptions: [{ slope: 2, intercept: 1 }] } })
    const predictor = getPredictor(store, fakeConfigWithData([]))
    expect(predictor).not.toBeNull()
    expect(predictor?.(3)).toBe(7)   // 2*3 + 1
    expect(predictor?.(0)).toBe(1)
  })

  it("returns null when the movable line has no description", () => {
    const store = fakeStoreWithAdornments({ ml: true, mlModel: { lineDescriptions: [] } })
    expect(getPredictor(store, fakeConfigWithData([]))).toBeNull()
  })

  it("computes the LSRL fresh from the current data", () => {
    const store = fakeStoreWithAdornments({ lsrl: true })
    // Perfectly linear y = 2x, so slope 2 / intercept 0.
    const config = fakeConfigWithData([
      { caseID: "a", x: 1, y: 2 }, { caseID: "b", x: 2, y: 4 }, { caseID: "c", x: 3, y: 6 }
    ])
    const predictor = getPredictor(store, config)
    expect(predictor).not.toBeNull()
    expect(predictor?.(10)).toBeCloseTo(20, 5)
  })

  it("returns null for the LSRL when there are fewer than two finite points", () => {
    const store = fakeStoreWithAdornments({ lsrl: true })
    const config = fakeConfigWithData([{ caseID: "a", x: 1, y: 2 }, { caseID: "b", x: undefined, y: 4 }])
    expect(getPredictor(store, config)).toBeNull()
  })

  // The default (single, no-split) cell key is "__EMPTY__" — what instanceKey({}) resolves to in
  // production. Keying the map with "__EMPTY__" (rather than the literal "{}") means these tests fail
  // if production ever hard-codes "{}" instead of calling instanceKey({}).
  it("evaluates the plotted function from the default cell", () => {
    const store = fakeStoreWithAdornments({
      pf: true,
      pfModel: {
        instanceKey: () => "__EMPTY__",
        plottedFunctions: new Map([["__EMPTY__", { formulaFunction: (x: number) => x * x }]])
      }
    })
    const predictor = getPredictor(store, fakeConfigWithData([]))
    expect(predictor?.(4)).toBe(16)
  })

  it("returns NaN (not throw) when the plotted function throws", () => {
    const store = fakeStoreWithAdornments({
      pf: true,
      pfModel: {
        instanceKey: () => "__EMPTY__",
        plottedFunctions: new Map([["__EMPTY__", { formulaFunction: () => { throw new Error("boom") } }]])
      }
    })
    const predictor = getPredictor(store, fakeConfigWithData([]))
    expect(predictor).not.toBeNull()
    expect(Number.isNaN(predictor?.(1) as number)).toBe(true)
  })
})

describe("computeResiduals", () => {
  const identity: Predictor = (x: number) => x

  it("returns y - predicted for each case", () => {
    const config = fakeConfigWithData([{ caseID: "a", x: 1, y: 5 }, { caseID: "b", x: 2, y: 5 }])
    expect(computeResiduals(config, identity)).toEqual([
      { caseID: "a", x: 1, residual: 4 },   // 5 - 1
      { caseID: "b", x: 2, residual: 3 }    // 5 - 2
    ])
  })

  it("skips cases with a non-finite x or y", () => {
    const config = fakeConfigWithData([
      { caseID: "a", x: 1, y: 5 }, { caseID: "b", x: undefined, y: 5 }, { caseID: "c", x: 3, y: undefined }
    ])
    expect(computeResiduals(config, () => 0)).toEqual([{ caseID: "a", x: 1, residual: 5 }])
  })

  it("skips cases whose predicted value is non-finite", () => {
    const config = fakeConfigWithData([{ caseID: "a", x: 1, y: 5 }])
    expect(computeResiduals(config, () => NaN)).toEqual([])
  })

  it("returns an empty array when there is no dataset", () => {
    const config = {
      dataset: undefined, attributeID: () => "id", getCaseDataArray: () => []
    } as unknown as IGraphDataConfigurationModel
    expect(computeResiduals(config, identity)).toEqual([])
  })
})
