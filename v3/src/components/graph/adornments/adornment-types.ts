import { types } from "mobx-state-tree"
import { IAdornmentModel, IUnknownAdornmentModel, UnknownAdornmentModel } from "./adornment-models"
import { IMovableLineAdornmentModel, MovableLineAdornmentModel } from "./movable-line/movable-line-adornment-model"
import { IMovablePointAdornmentModel, MovablePointAdornmentModel } from "./movable-point/movable-point-adornment-model"
import { IMovableValueAdornmentModel, MovableValueAdornmentModel } from "./movable-value/movable-value-adornment-model"
import { CountAdornmentModel, ICountAdornmentModel } from "./count/count-adornment-model"
import { IPlottedValueAdornmentModel, PlottedValueAdornmentModel } from "./plotted-value/plotted-value-adornment-model"
import { IMeanAdornmentModel, MeanAdornmentModel } from "./univariate-measures/mean/mean-adornment-model"
import { IMedianAdornmentModel, MedianAdornmentModel } from "./univariate-measures/median/median-adornment-model"

export const kGraphAdornmentsClass = "graph-adornments-grid"
export const kGraphAdornmentsClassSelector = `.${kGraphAdornmentsClass}`

const adornmentTypeDispatcher = (adornmentSnap: IAdornmentModel) => {
  switch (adornmentSnap.type) {
    case "Count": return CountAdornmentModel
    case "Mean": return MeanAdornmentModel
    case "Median": return MedianAdornmentModel
    case "Movable Line": return MovableLineAdornmentModel
    case "Movable Point": return MovablePointAdornmentModel
    case "Movable Value": return MovableValueAdornmentModel
    case "Plotted Value": return PlottedValueAdornmentModel
    default: return UnknownAdornmentModel
  }
}

export const AdornmentModelUnion = types.union({ dispatcher: adornmentTypeDispatcher },
  CountAdornmentModel, MeanAdornmentModel, MedianAdornmentModel, MovableValueAdornmentModel, MovableLineAdornmentModel,
  MovablePointAdornmentModel, PlottedValueAdornmentModel, UnknownAdornmentModel)
export type IAdornmentModelUnion = ICountAdornmentModel | IMeanAdornmentModel | IMedianAdornmentModel |
  IMovableValueAdornmentModel | IMovableLineAdornmentModel | IMovablePointAdornmentModel | IPlottedValueAdornmentModel |
  IUnknownAdornmentModel

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
    { title: "DG.Inspector.graphConnectingLine", type: "Connecting Lines" },
    { title: "DG.Inspector.graphMovablePoint", type: "Movable Point" },
    { title: "DG.Inspector.graphMovableLine", type: "Movable Line" },
    { title: "DG.Inspector.graphLSRL", type: "LSRL" },
    { title: "DG.Inspector.graphInterceptLocked", type: "Intercept Locked" },
    { title: "DG.Inspector.graphPlottedFunction", type: "Plotted Function" },
    { title: "DG.Inspector.graphPlottedValue", type: "Plotted Value" },
    { title: "DG.Inspector.graphSquares", type: "Squares" },
  ]
}
