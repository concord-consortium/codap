import { SnapshotIn } from "@concord-consortium/mobx-state-tree"
import { CountAdornmentModel } from "../components/graph/adornments/count/count-adornment-model"
import { kCountType } from "../components/graph/adornments/count/count-adornment-types"
import { LSRLAdornmentModel } from "../components/graph/adornments/lsrl/lsrl-adornment-model"
import { kLSRLType } from "../components/graph/adornments/lsrl/lsrl-adornment-types"
import { MeanAdornmentModel } from "../components/graph/adornments/univariate-measures/mean/mean-adornment-model"
import { kMeanType } from "../components/graph/adornments/univariate-measures/mean/mean-adornment-types"
import { MedianAdornmentModel } from "../components/graph/adornments/univariate-measures/median/median-adornment-model"
import { kMedianType } from "../components/graph/adornments/univariate-measures/median/median-adornment-types"
import { MovableValueAdornmentModel } from "../components/graph/adornments/movable-value/movable-value-adornment-model"
import { kMovableValueType } from "../components/graph/adornments/movable-value/movable-value-adornment-types"
import { StandardDeviationAdornmentModel }
  from "../components/graph/adornments/univariate-measures/standard-deviation/standard-deviation-adornment-model"
import { kStandardDeviationType }
  from "../components/graph/adornments/univariate-measures/standard-deviation/standard-deviation-adornment-types"

export type DICountAdornmentValues = Partial<SnapshotIn<typeof CountAdornmentModel>>
export type DILsrlAdornmentValues = Partial<SnapshotIn<typeof LSRLAdornmentModel>>
export type DIMeanAdornmentValues = Partial<SnapshotIn<typeof MeanAdornmentModel>>
export type DIMedianAdornmentValues = Partial<SnapshotIn<typeof MedianAdornmentModel>>
export type DIMovableValueAdornmentValues = Partial<SnapshotIn<typeof MovableValueAdornmentModel>>
export type DIStandardDeviationAdornmentValues = Partial<SnapshotIn<typeof StandardDeviationAdornmentModel>>
export type DIAdornmentValues = DICountAdornmentValues | DILsrlAdornmentValues | DIMeanAdornmentValues |
  DIMedianAdornmentValues | DIMovableValueAdornmentValues | DIStandardDeviationAdornmentValues

const adornmentTypes = new Set([kCountType, kLSRLType, kMeanType, kMedianType, kMovableValueType, kStandardDeviationType])

export const isAdornmentValues = (val: unknown): val is DIAdornmentValues => {
  return typeof val === "object" && val !== null && adornmentTypes.has((val as any).type)
}
