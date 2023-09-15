import { types } from "mobx-state-tree"
import t from "../../../utilities/translation/translate"
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
  
export const measures: IMeasures = {
  "casePlot": [
    { title: t("DG.Inspector.graphCount"), type: "adornment" }
  ],
  "dotChart": [
    { title: t("DG.Inspector.graphCount"), type: "adornment" }
  ],
  "dotPlot":  [
    { title: t("DG.Inspector.graphCount"), type: "adornment" },
    { title: t("DG.Inspector.graphPlottedMean"), type: "adornment" },
    { title: t("DG.Inspector.graphPlottedMedian"), type: "adornment" },
    { title: t("DG.Inspector.graphPlottedStDev"), type: "adornment" },
    { title: t("DG.Inspector.graphPlottedMeanAbsDev"), type: "adornment" },
    { title: t("DG.Inspector.graphPlottedBoxPlot"), type: "adornment" },
    { title: t("DG.Inspector.graphBoxPlotShowOutliers"), type: "adornment" },
    { title: t("DG.Inspector.graphPlottedValue"), type: "adornment" },
    { title: t("DG.Inspector.graphMovableValue"), type: "adornment" }
  ],
  "scatterPlot": [
    { title: t("DG.Inspector.graphCount"), type: "adornment" },
    { title: t("DG.Inspector.graphConnectingLine"), type: "adornment" },
    { title: t("DG.Inspector.graphMovablePoint"), type: "adornment" },
    { title: t("DG.Inspector.graphMovableLine"), type: "adornment" },
    { title: t("DG.Inspector.graphLSRL"), type: "adornment" },
    { title: t("DG.Inspector.graphInterceptLocked"), type: "adornment" },
    { title: t("DG.Inspector.graphPlottedFunction"), type: "adornment" },
    { title: t("DG.Inspector.graphPlottedValue"), type: "adornment" },
    { title: t("DG.Inspector.graphSquares"), type: "adornment" }
  ]
}
