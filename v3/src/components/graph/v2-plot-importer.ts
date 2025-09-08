import { ICodapV2PlotModel } from "../../v2/codap-v2-types"
import { IBarChartSnapshot } from "./plots/bar-chart/bar-chart-model"
import { IPlotModelUnionSnapshot } from "./plots/plot-model-union"

export function v2PlotImporter(plotModel: ICodapV2PlotModel): IPlotModelUnionSnapshot {
  switch (plotModel.plotClass) {
    case "DG.CasePlotModel":
      return { type: "casePlot" }
    case "DG.DotChartModel":
      return { type: "dotChart" }
    case "DG.BarChartModel":
    case "DG.ComputedBarChartModel": {
      const isComputedBarChart = plotModel.plotClass === "DG.ComputedBarChartModel"
      const hasExpression = isComputedBarChart && plotModel.plotModelStorage?.expression
      const breakdownType = hasExpression
                              ? "formula"
                              : plotModel.plotModelStorage?.breakdownType ? "percent" : "count"
      const expression = hasExpression
                            ? { display: plotModel.plotModelStorage.expression }
                            : undefined
      const snap: IBarChartSnapshot = { type: "barChart", breakdownType, formula: expression }
      return snap
    }
    case "DG.DotPlotModel":
      return { type: "dotPlot" }
    case "DG.BinnedPlotModel": {
      const { dotsAreFused, alignment: _binAlignment, width: _binWidth } = plotModel.plotModelStorage
      return { type: dotsAreFused ? "histogram" : "binnedDotPlot", _binAlignment, _binWidth }
    }
    case "DG.LinePlotModel":
      return { type: "linePlot" }
    case "DG.ScatterPlotModel":
      return { type: "scatterPlot" }
  }
}
