## Plot Types

### Before Refactor
| V2 Model, View | V3 Type, Component | Attribute Configuration | GraphModel pointDisplayType | UI |
|----------------|--------------------|-------------------------|-----------------------------|----|
| `DG.CasePlot` `DG.CasePlotView` | `casePlot` `CaseDots` | empty | `points` |
| `DG.DotChart` `DG.DotChartView` | `dotChart` `DotChartPoints` | categorical | `points` | ❎ Fuse Dots into Bars |
| `DG.BarChart` `DG.BarChartView` | `dotChart` `DotChartBars` | categorical | `bars` [6] | ✅ Fuse Dots into Bars ✅ Scale: Count or Percent 🚧 [1] |
| `DG.ComputedBarChart` `DG.ComputedBarChartView` | `dotChart` `DotChartBars` 🚧 [3] | categorical | `bars` | ✅ Fuse Dots into Bars ✅ Scale: Formula 🚧 [2] |
| `DG.DotPlot` `DG.DotPlotView` | `dotPlot` `FreeDotPlotDots` | univariate numeric | `points` | ✅ Points |
| `DG.BinnedPlot` `DG.BinnedPlotView` | `dotPlot` `BinnedDotPlotDots` | univariate numeric | `bins` [5] [7] | ✅ Group into Bins ❎ Fuse Dots into Bars |
| `DG.BinnedPlot` `DG.HistogramView` [4] | `dotPlot` `Histogram` | univariate numeric | `histogram` [5] [6] [7] | ✅ Group into Bins ✅ Fuse Dots into Bars |
| `DG.LinePlot` `DG.LinePlotView` | `dotPlot` `FreeDotPlotDots` | univariate numeric | `bars` | ✅ Bar for Each Point |
| `DG.ScatterPlot` `DG.ScatterPlotView` | `scatterPlot` `ScatterDots` | bivariate numeric | `points` |

[1] 🚧 Scale UI and percent scale not yet implemented.
[2] 🚧 Scale UI and bar height expression not yet implemented.
[3] 🚧 `DotChartBars` should be extendable to support computed bar heights.
[4] `DG.HistogramView` is used when `dotsAreFused` is `true` in `DG.BinnedPlotModel`.
[5] `pointsAreBinned`: `true` in `GraphModel`.
[6] `pointsFusedIntoBars`: `true` in `GraphModel`.
[7] Binning properties in `GraphModel`.

### After Refactor

| V2 Model, View | V3 Type, Model, Component | Attribute Configuration | UI |
|----------------|---------------------------|-------------------------|----|
| `DG.CasePlot` `DG.CasePlotView` | `casePlot` `CasePlotModel` `CasePlotComponent` | empty |
| `DG.DotChart` `DG.DotChartView` | `dotChart` `DotChartModel` `DotChartComponent` | categorical | ❎ Fuse Dots into Bars |
| `DG.BarChart` `DG.BarChartView` | `barChart` `BarChartModel` `BarChartComponent` | categorical | ✅ Fuse Dots into Bars ✅ Scale: Count or Percent 🚧 [1] |
| `DG.ComputedBarChart` `DG.ComputedBarChartView` | `barChart` `BarChartModel` `BarChartComponent` 🚧 [3] | categorical | ✅ Fuse Dots into Bars ✅ Scale: Formula 🚧 [2] |
| `DG.DotPlot` `DG.DotPlotView` | `dotPlot` `DotPlotModel` `DotPlotComponent` | univariate numeric | ✅ Points |
| `DG.BinnedPlot` `DG.BinnedPlotView` | `binnedDotPlot` `BinnedDotPlotModel`[5] `BinnedDotPlotComponent` | univariate numeric | ✅ Group into Bins ❎ Fuse Dots into Bars |
| `DG.BinnedPlot` `DG.HistogramView` [4] | `histogram` `HistogramModel` `HistogramComponent` | univariate numeric | ✅ Group into Bins ✅ Fuse Dots into Bars |
| `DG.LinePlot` `DG.LinePlotView` | `linePlot` `LinePlotModel` `LinePlotComponent` | univariate numeric | ✅ Bar for Each Point |
| `DG.ScatterPlot` `DG.ScatterPlotView` | `scatterPlot` `ScatterPlotModel` `ScatterPlotComponent` | bivariate numeric | `points` |

[1] 🚧 Scale UI and percent scale not yet implemented.
[2] 🚧 Scale UI and bar height expression not yet implemented.
[3] 🚧 `BarChartComponent` must be extended to support computed bar heights.
[4] `DG.HistogramView` is used when `dotsAreFused` is `true` in `DG.BinnedPlotModel`.
[5] Binning properties in `BinnedDotPlotModel`.
