import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { BarChartModel } from "./bar-chart/bar-chart-model"
import { BinnedDotPlotModel } from "./binned-dot-plot/binned-dot-plot-model"
import { CasePlotModel } from "./case-plot/case-plot-model"
import { DotChartModel } from "./dot-chart/dot-chart-model"
import { DotPlotModel } from "./dot-plot/dot-plot-model"
import { HistogramModel } from "./histogram/histogram-model"
import { LinePlotModel } from "./line-plot/line-plot-model"
import { ScatterPlotModel } from "./scatter-plot/scatter-plot-model"

export const PlotModelUnion = types.union(CasePlotModel, DotChartModel, BarChartModel, DotPlotModel,
                                          BinnedDotPlotModel, HistogramModel, LinePlotModel, ScatterPlotModel)
export type IPlotModelUnion = Instance<typeof PlotModelUnion>
export type IPlotModelUnionSnapshot = SnapshotIn<typeof PlotModelUnion>
