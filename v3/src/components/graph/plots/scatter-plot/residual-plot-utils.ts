import { IGraphContentModel } from "../../models/graph-content-model"
import { IAdornmentsBaseStore } from "../../adornments/store/adornments-base-store"
import { kLSRLType } from "../../adornments/lsrl/lsrl-adornment-types"
import { kMovableLineType } from "../../adornments/movable-line/movable-line-adornment-types"
import { kPlottedFunctionType } from "../../adornments/plotted-function/plotted-function-adornment-types"

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

// Residual Plot applicability. Phase 2: exactly one of {movable line, LSRL, plotted function} visible.
// Phase 3 will extend to also require numeric x-axis, numeric left y-axis, no numeric right axis,
// no top/right categorical, and no legend attribute.
export function residualPlotIsApplicable(graphModel: IGraphContentModel): boolean {
  return getActiveLineKind(graphModel.adornmentsStore) !== null
}
