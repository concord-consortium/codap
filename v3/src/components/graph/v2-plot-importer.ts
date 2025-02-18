import { ICodapV2PlotModel } from "../../v2/codap-v2-types"
import { IBarChartSnapshot, IPlotModelUnionSnapshot } from "./models/plot-model"

export function v2PlotImporter(plotModel: ICodapV2PlotModel): IPlotModelUnionSnapshot {
  switch (plotModel.plotClass) {
    case "DG.CasePlotModel":
      return { type: "casePlot" }
    case "DG.DotChartModel":
      return { type: "dotChart" }
    case "DG.BarChartModel":
    case "DG.ComputedBarChartModel": {
      const breakdownType = plotModel.plotModelStorage?.breakdownType ? "percent" : "count"
      const expression = plotModel.plotClass === "DG.ComputedBarChartModel" &&
                          plotModel.plotModelStorage?.expression
                            ? { display: plotModel.plotModelStorage.expression }
                            : undefined
      const snap: IBarChartSnapshot = { type: "barChart", breakdownType, expression }
      return snap
    }
    case "DG.DotPlotModel":
      return { type: "dotPlot" }
    case "DG.BinnedPlotModel": {
      return { type: plotModel.plotModelStorage?.dotsAreFused ? "histogram" : "binnedDotPlot" }
    }
    case "DG.LinePlotModel":
      return { type: "linePlot" }
    case "DG.ScatterPlotModel":
      return { type: "scatterPlot" }
  }
}
