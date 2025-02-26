## Plot Types

### Before Refactor
| V2 Model, View | V3 Type, Component | Attribute Configuration | pointDisplayType [5] pointsFusedIntoBars [6] binning [7] | UI |
|----------------|--------------------|-------------------------|----------------------------------------------------------|----|
| `DG.CasePlot` `DG.CasePlotView` | `casePlot` `CaseDots` | empty | `points` |
| `DG.DotChart` `DG.DotChartView` | `dotChart` `DotChartPoints` | categorical | `points` | ❎ Fuse Dots into Bars |
| `DG.BarChart` `DG.BarChartView` | `dotChart` `DotChartBars` | categorical | `bars` [6] | ✅ Fuse Dots into Bars ✅ Scale: Count or Percent 🚧 [1] |
| `DG.ComputedBarChart` `DG.ComputedBarChartView` | `dotChart` `DotChartBars` 🚧 [3] | categorical | `bars` | ✅ Fuse Dots into Bars ✅ Scale: Formula 🚧 [2] |
| `DG.DotPlot` `DG.DotPlotView` | `dotPlot` `FreeDotPlotDots` | univariate numeric | `points` | ✅ Points |
| `DG.BinnedPlot` `DG.BinnedPlotView` | `dotPlot` `BinnedDotPlotDots` | univariate numeric | `bins` [7] | ✅ Group into Bins ❎ Fuse Dots into Bars |
| `DG.BinnedPlot` `DG.HistogramView` [4] | `dotPlot` `Histogram` | univariate numeric | `histogram` [6] [7] | ✅ Group into Bins ✅ Fuse Dots into Bars |
| `DG.LinePlot` `DG.LinePlotView` | `dotPlot` `FreeDotPlotDots` | univariate numeric | `bars` | ✅ Bar for Each Point |
| `DG.ScatterPlot` `DG.ScatterPlotView` | `scatterPlot` `ScatterDots` | bivariate numeric | `points` |

[1] 🚧 Scale UI and percent scale not yet implemented.
[2] 🚧 Scale UI and bar height expression not yet implemented.
[3] 🚧 `DotChartBars` should be extendable to support computed bar heights.
[4] `DG.HistogramView` is used when `dotsAreFused` is `true` in `DG.BinnedPlotModel`.
[5] `pointDisplayType` in `DataDisplayContentModel`
[6] `plotType`, `pointsFusedIntoBars` in `GraphContentModel`
[7] `_binAlignment`, `_binWidth`, `pointsAreBinned` in `GraphContentModel`.

### After Refactor

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
