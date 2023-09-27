import { types } from "mobx-state-tree"
import { IAdornmentModel, IUnknownAdornmentModel, UnknownAdornmentModel } from "./adornment-models"
import { IMovableLineModel, MovableLineModel } from "./movable-line/movable-line-model"
import { IMovablePointModel, MovablePointModel } from "./movable-point/movable-point-model"
import { IMovableValueModel, MovableValueModel } from "./movable-value/movable-value-model"
import { CountModel, ICountModel } from "./count/count-model"
import { IPlottedValueModel, PlottedValueModel } from "./plotted-value/plotted-value-model"
import { IMeanAdornmentModel, MeanAdornmentModel } from "./univariate-measures/mean/mean-adornment-model"
import { IMedianAdornmentModel, MedianAdornmentModel } from "./univariate-measures/median/median-adornment-model"

export const kGraphAdornmentsClass = "graph-adornments-grid"
export const kGraphAdornmentsClassSelector = `.${kGraphAdornmentsClass}`

const adornmentTypeDispatcher = (adornmentSnap: IAdornmentModel) => {
  switch (adornmentSnap.type) {
    case "Count": return CountModel
    case "Mean": return MeanAdornmentModel
    case "Median": return MedianAdornmentModel
    case "Movable Line": return MovableLineModel
    case "Movable Point": return MovablePointModel
    case "Movable Value": return MovableValueModel
    case "Plotted Value": return PlottedValueModel
    default: return UnknownAdornmentModel
  }
}

export const AdornmentModelUnion = types.union({ dispatcher: adornmentTypeDispatcher },
  CountModel, MeanAdornmentModel, MedianAdornmentModel, MovableValueModel, MovableLineModel, MovablePointModel,
  PlottedValueModel, UnknownAdornmentModel)
export type IAdornmentModelUnion = ICountModel | IMeanAdornmentModel | IMedianAdornmentModel | IMovableValueModel |
  IMovableLineModel | IMovablePointModel | IPlottedValueModel | IUnknownAdornmentModel

export type PlotTypes = "casePlot" | "dotChart" | "dotPlot" | "scatterPlot"

export interface IMeasure {
  title: string
  type: string
}
  
export interface IMeasures {
  [key: string]: IMeasure[]
}

export const ParentAdornmentTypes = ["Univariate Measure"] as const
export type ParentAdornmentType = typeof ParentAdornmentTypes[number]
  
export const measures: IMeasures = {
  "casePlot": [
    { title: "DG.Inspector.graphCount", type: "Count" }
  ],
  "dotChart": [
    { title: "DG.Inspector.graphCount", type: "Count" }
  ],
  "dotPlot":  [
    { title: "DG.Inspector.graphCount", type: "Count" },
    { title: "DG.Inspector.graphPlottedMean", type: "Mean" },
    { title: "DG.Inspector.graphPlottedMedian", type: "Median" },
    { title: "DG.Inspector.graphPlottedStDev", type: "Standard Deviation" },
    { title: "DG.Inspector.graphPlottedMeanAbsDev", type: "Mean Absolute Deviation" },
    { title: "DG.Inspector.graphPlottedBoxPlot", type: "Box Plot" },
    { title: "DG.Inspector.graphBoxPlotShowOutliers", type: "Show Outliers" },
    { title: "DG.Inspector.graphPlottedValue", type: "Plotted Value" },
    { title: "DG.Inspector.graphMovableValue", type: "Movable Value" }
  ],
  "scatterPlot": [
    { title: "DG.Inspector.graphCount", type: "Count" },
    { title: "DG.Inspector.graphConnectingLine", type: "adornment" },
    { title: "DG.Inspector.graphMovablePoint", type: "Movable Point" },
    { title: "DG.Inspector.graphMovableLine", type: "Movable Line" },
    { title: "DG.Inspector.graphLSRL", type: "LSRL" },
    { title: "DG.Inspector.graphInterceptLocked", type: "Intercept Locked" },
    { title: "DG.Inspector.graphPlottedFunction", type: "Plotted Function" },
    { title: "DG.Inspector.graphPlottedValue", type: "Plotted Value" },
    { title: "DG.Inspector.graphSquares", type: "Squares" },
  ]
}
