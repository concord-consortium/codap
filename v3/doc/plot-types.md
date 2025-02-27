### Plot Types

| V2 Model, View | V3 Type, Model, Component | Attribute Configuration | UI |
|----------------|---------------------------|-------------------------|----|
| `DG.CasePlot` `DG.CasePlotView` | `casePlot` `CasePlotModel` `CasePlot` | empty |
| `DG.DotChart` `DG.DotChartView` | `dotChart` `DotChartModel` `DotChart` | categorical | ❎ Fuse Dots into Bars |
| `DG.BarChart` `DG.BarChartView` | `barChart` `BarChartModel` `BarChart` | categorical | ✅ Fuse Dots into Bars ✅ Scale: Count or Percent 🚧 [1] |
| `DG.ComputedBarChart` `DG.ComputedBarChartView` | `barChart` `BarChartModel`[3] `BarChart` 🚧 [4] | categorical | ✅ Fuse Dots into Bars ✅ Scale: Formula 🚧 [2] |
| `DG.DotPlot` `DG.DotPlotView` | `dotPlot` `DotPlotModel` `DotLinePlot` | univariate numeric | ✅ Points |
| `DG.BinnedPlot` `DG.BinnedPlotView` | `binnedDotPlot` `BinnedDotPlotModel`[6] `BinnedDotPlot` | univariate numeric | ✅ Group into Bins ❎ Fuse Dots into Bars |
| `DG.BinnedPlot` `DG.HistogramView` [5] | `histogram` `HistogramModel` `Histogram` | univariate numeric | ✅ Group into Bins ✅ Fuse Dots into Bars |
| `DG.LinePlot` `DG.LinePlotView` | `linePlot` `LinePlotModel` `DotLinePlot` | univariate numeric | ✅ Bar for Each Point |
| `DG.ScatterPlot` `DG.ScatterPlotView` | `scatterPlot` `ScatterPlotModel` `ScatterPlot` | bivariate numeric |

[1] 🚧 Scale UI and percent scale not yet implemented.
[2] 🚧 Scale UI and bar height expression not yet implemented.
[3] 🚧 `breakdownType`, `expression` in `BarChartModel`
[4] 🚧 `BarChart` must be extended to support computed bar heights.
[5] `DG.HistogramView` is used when `dotsAreFused` is `true` in `DG.BinnedPlotModel`.
[6] `_binAlignment`, `_binWidth` in `BinnedDotPlotModel`.
