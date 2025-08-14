import { types } from "mobx-state-tree"
import { IAdornmentModel, IUnknownAdornmentModel, UnknownAdornmentModel } from "./adornment-models"
import { IMovableLineAdornmentModel, MovableLineAdornmentModel } from "./movable-line/movable-line-adornment-model"
import { IMovablePointAdornmentModel, MovablePointAdornmentModel } from "./movable-point/movable-point-adornment-model"
import { IMovableValueAdornmentModel, MovableValueAdornmentModel } from "./movable-value/movable-value-adornment-model"
import { CountAdornmentModel, ICountAdornmentModel } from "./count/count-adornment-model"
import { IPlottedValueAdornmentModel, PlottedValueAdornmentModel }
  from "./univariate-measures/plotted-value/plotted-value-adornment-model"
import { IMeanAdornmentModel, MeanAdornmentModel } from "./univariate-measures/mean/mean-adornment-model"
import { IMedianAdornmentModel, MedianAdornmentModel } from "./univariate-measures/median/median-adornment-model"
import { IStandardDeviationAdornmentModel, StandardDeviationAdornmentModel }
  from "./univariate-measures/standard-deviation/standard-deviation-adornment-model"
import { IStandardErrorAdornmentModel, StandardErrorAdornmentModel }
  from "./univariate-measures/standard-error/standard-error-adornment-model"
import { INormalCurveAdornmentModel, NormalCurveAdornmentModel }
  from "./univariate-measures/normal-curve/normal-curve-adornment-model"
import { IMeanAbsoluteDeviationAdornmentModel, MeanAbsoluteDeviationAdornmentModel }
  from "./univariate-measures/mean-absolute-deviation/mean-absolute-deviation-adornment-model"
import { BoxPlotAdornmentModel, IBoxPlotAdornmentModel } from "./univariate-measures/box-plot/box-plot-adornment-model"
import { PlottedFunctionAdornmentModel, IPlottedFunctionAdornmentModel }
  from "./plotted-function/plotted-function-adornment-model"
import { ILSRLAdornmentModel, LSRLAdornmentModel } from "./lsrl/lsrl-adornment-model"
import { IRegionOfInterestAdornmentModel, RegionOfInterestAdornmentModel }
  from "./region-of-interest/region-of-interest-adornment-model"

export const kDefaultFontSize = 12
export const kGraphAdornmentsBannerHeight = 22

const adornmentTypeDispatcher = (adornmentSnap: IAdornmentModel) => {
  switch (adornmentSnap.type) {
    case "Box Plot": return BoxPlotAdornmentModel
    case "Count": return CountAdornmentModel
    case "LSRL": return LSRLAdornmentModel
    case "Mean": return MeanAdornmentModel
    case "Mean Absolute Deviation": return MeanAbsoluteDeviationAdornmentModel
    case "Median": return MedianAdornmentModel
    case "Movable Line": return MovableLineAdornmentModel
    case "Movable Point": return MovablePointAdornmentModel
    case "Movable Value": return MovableValueAdornmentModel
    case "Plotted Function": return PlottedFunctionAdornmentModel
    case "Plotted Value": return PlottedValueAdornmentModel
    case "Region of Interest": return RegionOfInterestAdornmentModel
    case "Standard Deviation": return StandardDeviationAdornmentModel
    case "Standard Error": return StandardErrorAdornmentModel
    case "Normal Curve": return NormalCurveAdornmentModel
    default: {
      console.warn(`Unknown adornment type: ${adornmentSnap.type}`)
      return UnknownAdornmentModel
    }
  }
}

// TODO: build these unions from the registration info rather than statically
export const AdornmentModelUnion = types.union({ dispatcher: adornmentTypeDispatcher },
  BoxPlotAdornmentModel, CountAdornmentModel, LSRLAdornmentModel, MeanAdornmentModel,
  MeanAbsoluteDeviationAdornmentModel, MedianAdornmentModel, MovableValueAdornmentModel, MovableLineAdornmentModel,
  MovablePointAdornmentModel, NormalCurveAdornmentModel, PlottedFunctionAdornmentModel, PlottedValueAdornmentModel,
  StandardDeviationAdornmentModel, StandardErrorAdornmentModel, RegionOfInterestAdornmentModel, UnknownAdornmentModel)
export type IAdornmentModelUnion = IBoxPlotAdornmentModel | ICountAdornmentModel | ILSRLAdornmentModel |
  IMeanAdornmentModel | IMeanAbsoluteDeviationAdornmentModel | IMedianAdornmentModel | IMovableValueAdornmentModel |
  IMovableLineAdornmentModel | IMovablePointAdornmentModel | INormalCurveAdornmentModel |
  IPlottedFunctionAdornmentModel | IPlottedValueAdornmentModel | IStandardDeviationAdornmentModel |
  IStandardErrorAdornmentModel | IRegionOfInterestAdornmentModel | IUnknownAdornmentModel
