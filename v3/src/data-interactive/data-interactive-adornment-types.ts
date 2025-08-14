import { SnapshotIn } from "mobx-state-tree"
import { CountAdornmentModel } from "../components/graph/adornments/count/count-adornment-model"
import { kCountType } from "../components/graph/adornments/count/count-adornment-types"
import { ConnectingLinesAdornmentModel }
  from "../components/graph/adornments/connecting-lines/connecting-lines-adornment-model"
import { kConnectingLinesType } from "../components/graph/adornments/connecting-lines/connecting-lines-adornment-types"
import { LSRLAdornmentModel } from "../components/graph/adornments/lsrl/lsrl-adornment-model"
import { kLSRLType } from "../components/graph/adornments/lsrl/lsrl-adornment-types"
import { MeanAdornmentModel } from "../components/graph/adornments/univariate-measures/mean/mean-adornment-model"
import { kMeanType } from "../components/graph/adornments/univariate-measures/mean/mean-adornment-types"
import { MedianAdornmentModel } from "../components/graph/adornments/univariate-measures/median/median-adornment-model"
import { kMedianType } from "../components/graph/adornments/univariate-measures/median/median-adornment-types"
import { MovableValueAdornmentModel } from "../components/graph/adornments/movable-value/movable-value-adornment-model"
import { kMovableValueType } from "../components/graph/adornments/movable-value/movable-value-adornment-types"
import { kPlottedValueType }
  from "../components/graph/adornments/univariate-measures/plotted-value/plotted-value-adornment-types"
import { PlottedValueAdornmentModel }
  from "../components/graph/adornments/univariate-measures/plotted-value/plotted-value-adornment-model"
import { StandardDeviationAdornmentModel }
  from "../components/graph/adornments/univariate-measures/standard-deviation/standard-deviation-adornment-model"
import { kStandardDeviationType }
  from "../components/graph/adornments/univariate-measures/standard-deviation/standard-deviation-adornment-types"
import { isDIAdornmentValuesBase, resolveAdornmentType } from "./data-interactive-adornment-base-types"
import { RegionOfInterestAdornmentModel }
  from "../components/graph/adornments/region-of-interest/region-of-interest-adornment-model"
import { kRegionOfInterestType }
  from "../components/graph/adornments/region-of-interest/region-of-interest-adornment-types"

export type DIConnectingLinesAdornmentValues = Partial<SnapshotIn<typeof ConnectingLinesAdornmentModel>>
export type DICountAdornmentValues = Partial<SnapshotIn<typeof CountAdornmentModel>>
export type DILsrlAdornmentValues = Partial<SnapshotIn<typeof LSRLAdornmentModel>>
export type DIMeanAdornmentValues = Partial<SnapshotIn<typeof MeanAdornmentModel>>
export type DIMedianAdornmentValues = Partial<SnapshotIn<typeof MedianAdornmentModel>>
export type DIMovableValueAdornmentValues = Partial<SnapshotIn<typeof MovableValueAdornmentModel>>
export type DIPlottedValueAdornmentValues = Partial<SnapshotIn<typeof PlottedValueAdornmentModel>>
export type DIStandardDeviationAdornmentValues = Partial<SnapshotIn<typeof StandardDeviationAdornmentModel>>
export type DIRegionOfInterestAdornmentValues = Partial<SnapshotIn<typeof RegionOfInterestAdornmentModel>>
export type DIAdornmentValues = DIConnectingLinesAdornmentValues | DICountAdornmentValues | DILsrlAdornmentValues |
  DIMeanAdornmentValues | DIMedianAdornmentValues | DIMovableValueAdornmentValues | DIStandardDeviationAdornmentValues |
  DIRegionOfInterestAdornmentValues

const kAdornmentTypes = [
  kConnectingLinesType, kCountType, kLSRLType, kMeanType, kMedianType, kMovableValueType, kPlottedValueType,
  kRegionOfInterestType, kStandardDeviationType
]
const adornmentTypes = new Set(kAdornmentTypes)

export const isAdornmentValues = (val: unknown): val is DIAdornmentValues => {
  return isDIAdornmentValuesBase(val) && adornmentTypes.has(resolveAdornmentType(val.type))
}
