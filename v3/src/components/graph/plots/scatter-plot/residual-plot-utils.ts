import { IGraphDataConfigurationModel } from "../../models/graph-data-configuration-model"
import { IAdornmentsBaseStore } from "../../adornments/store/adornments-base-store"
import { IMovableLineAdornmentModel } from "../../adornments/movable-line/movable-line-adornment-model"
import { IPlottedFunctionAdornmentModel } from "../../adornments/plotted-function/plotted-function-adornment-model"
import { kLSRLType } from "../../adornments/lsrl/lsrl-adornment-types"
import { kMovableLineType } from "../../adornments/movable-line/movable-line-adornment-types"
import { kPlottedFunctionType } from "../../adornments/plotted-function/plotted-function-adornment-types"
import { leastSquaresLinearRegression } from "../../utilities/graph-utils"
import { dataDisplayGetNumericValue } from "../../../data-display/data-display-value-utils"
import { Point } from "../../../data-display/data-display-types"
import { isFiniteNumber } from "../../../../utilities/math-utils"
import {
  defaultSelectedColor, defaultSelectedStroke, defaultSelectedStrokeOpacity, defaultSelectedStrokeWidth,
  defaultStrokeOpacity, defaultStrokeWidth
} from "../../../../utilities/color-utils"

export type ActiveLineKind = "movableLine" | "lsrl" | "plottedFunction"

export function getActiveLineKind(store: IAdornmentsBaseStore): ActiveLineKind | null {
  const movableLine = store.isShowingAdornment(kMovableLineType)
  const lsrl = store.isShowingAdornment(kLSRLType)
  const plottedFunction = store.isShowingAdornment(kPlottedFunctionType)
  const count = (movableLine ? 1 : 0) + (lsrl ? 1 : 0) + (plottedFunction ? 1 : 0)
  if (count !== 1) return null
  if (movableLine) return "movableLine"
  if (lsrl) return "lsrl"
  return "plottedFunction"
}

// Residual Plot applicability. Per the design PDF / Jira spec:
//   - Numeric attribute on x-axis
//   - Numeric attribute on left y-axis, exactly one y attribute (no y+)
//   - No attribute on the right numeric (Y2) axis
//   - No attribute on the top or right split axes (categorical splitters)
//   - No legend attribute
//   - Exactly one of {movable line, LSRL, plotted function} visible
export function residualPlotIsApplicable(
  store: IAdornmentsBaseStore, dataConfig?: IGraphDataConfigurationModel
): boolean {
  if (getActiveLineKind(store) === null) return false
  if (!dataConfig) return false
  if (dataConfig.attributeType("x") !== "numeric") return false
  if (dataConfig.attributeType("y") !== "numeric") return false
  if (dataConfig.yAttributeIDs.length !== 1) return false
  if (dataConfig.attributeID("rightNumeric")) return false
  if (dataConfig.attributeID("topSplit")) return false
  if (dataConfig.attributeID("rightSplit")) return false
  if (dataConfig.attributeID("legend")) return false
  return true
}

// A predictor maps an x-value to a predicted y-value. Returns NaN when the prediction is undefined
// (e.g. plotted function throws or produces a non-finite result). The Residual Plot's v1
// constraints exclude legend / categorical axes, so slope/intercept and formula are always read
// from the single default cell (whose instance key is kDefaultCellKey / "__EMPTY__").
export type Predictor = (x: number) => number

export function getPredictor(
  store: IAdornmentsBaseStore, dataConfig?: IGraphDataConfigurationModel
): Predictor | null {
  const kind = getActiveLineKind(store)
  if (!kind) return null

  if (kind === "movableLine") {
    const mlModel = store.findAdornmentOfType<IMovableLineAdornmentModel>(kMovableLineType)
    const description = mlModel?.lineDescriptions[0]
    if (!description) return null
    const { slope, intercept } = description
    return (x: number) => slope * x + intercept
  }

  if (kind === "lsrl") {
    // Compute LSRL freshly from current dataset values so residuals recompute during point drag
    // (setCaseValues under beginCaching writes only to the plain-JS item cache — not observable,
    // so the LSRL model's stored slope/intercept can be stale mid-drag). Reading the cache via
    // dataDisplayGetNumericValue picks up the drag deltas immediately.
    if (!dataConfig) return null
    const dataset = dataConfig.dataset
    const xAttrId = dataConfig.attributeID("x") ?? ""
    const yAttrId = dataConfig.attributeID("y") ?? ""
    if (!dataset || !xAttrId || !yAttrId) return null
    const points: Point[] = []
    for (const c of dataConfig.getCaseDataArray(0)) {
      const x = dataDisplayGetNumericValue(dataset, c.caseID, xAttrId)
      const y = dataDisplayGetNumericValue(dataset, c.caseID, yAttrId)
      if (isFiniteNumber(x) && isFiniteNumber(y)) points.push({ x, y })
    }
    if (points.length < 2) return null
    const { slope, intercept } = leastSquaresLinearRegression(points, store.interceptLocked)
    if (!isFiniteNumber(slope) || !isFiniteNumber(intercept)) return null
    return (x: number) => slope * x + intercept
  }

  // plottedFunction
  const pfModel = store.findAdornmentOfType<IPlottedFunctionAdornmentModel>(kPlottedFunctionType)
  // The Residual Plot's v1 constraints exclude legend / categorical axes, so there's a single cell
  // with an empty cellKey. instanceKey({}) resolves to the "__EMPTY__" default; hardcoding "{}" would
  // silently miss the map entry.
  const func = pfModel?.plottedFunctions.get(pfModel.instanceKey({}))?.formulaFunction
  if (!func) return null
  return (x: number) => {
    try {
      return func(x)
    } catch {
      return NaN
    }
  }
}

export interface IResidualPoint {
  caseID: string
  x: number
  residual: number
}

export function computeResiduals(
  dataConfiguration: IGraphDataConfigurationModel,
  predictor: Predictor
): IResidualPoint[] {
  const dataset = dataConfiguration.dataset
  const xAttrID = dataConfiguration.attributeID("x") ?? ""
  const yAttrID = dataConfiguration.attributeID("y") ?? ""
  if (!dataset || !xAttrID || !yAttrID) return []

  const result: IResidualPoint[] = []
  const cases = dataConfiguration.getCaseDataArray(0)
  for (const c of cases) {
    const caseID = c.caseID
    const x = dataDisplayGetNumericValue(dataset, caseID, xAttrID) ?? NaN
    const y = dataDisplayGetNumericValue(dataset, caseID, yAttrID) ?? NaN
    if (!isFinite(x) || !isFinite(y)) continue
    const predicted = predictor(x)
    if (!isFinite(predicted)) continue
    result.push({ caseID, x, residual: y - predicted })
  }
  return result
}

export interface IResidualPointStyle {
  fill: string
  radius: number
  stroke: string
  strokeWidth: number
  strokeOpacity: number
}

export interface IResidualPointStyleParams {
  isSelected: boolean
  hasLegend: boolean
  legendColor?: string
  pointColor: string
  pointStrokeColor: string
  pointRadius: number
  selectedRadius: number
}

// Selection-dependent styling for a single residual point. Mirrors setPointSelection in
// data-display-utils.ts: without a legend, selected points get a solid blue fill; with a legend,
// they keep the category color and get a highlighted stroke. Kept pure (no dataset/observable reads)
// so the selection restyle path can be exercised in isolation and the component's paint can apply it
// under mobx.untracked without subscribing the syncResidualPlot autorun to selection.
export function residualPointStyle(params: IResidualPointStyleParams): IResidualPointStyle {
  const {
    isSelected, hasLegend, legendColor, pointColor, pointStrokeColor, pointRadius, selectedRadius
  } = params
  const baseFill = legendColor ?? pointColor
  const useSelectionFill = isSelected && !hasLegend
  return {
    fill: useSelectionFill ? defaultSelectedColor : baseFill,
    radius: isSelected ? selectedRadius : pointRadius,
    stroke: isSelected && !useSelectionFill ? defaultSelectedStroke : pointStrokeColor,
    strokeWidth: isSelected && !useSelectionFill ? defaultSelectedStrokeWidth : defaultStrokeWidth,
    strokeOpacity: isSelected && !useSelectionFill ? defaultSelectedStrokeOpacity : defaultStrokeOpacity
  }
}

// Auto-scaled domain for the lower y-axis. Always includes 0 (the "on the line" position) and adds
// a small padding so points on the extremes aren't clipped by the axis edge.
export function residualDomain(residuals: IResidualPoint[]): [number, number] {
  if (residuals.length === 0) return [-1, 1]
  let min = 0
  let max = 0
  for (const r of residuals) {
    if (r.residual < min) min = r.residual
    if (r.residual > max) max = r.residual
  }
  // 5% padding on each end; guarantees min < max even for degenerate all-zero residuals.
  const range = max - min || 1
  const padding = range * 0.05
  return [min - padding, max + padding]
}
