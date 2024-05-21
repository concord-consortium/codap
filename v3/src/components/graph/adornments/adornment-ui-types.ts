import { RulerStateKey } from "../../../models/ui-state-types"
export { type RulerStateKey }

export interface IMeasure {
  title: string
  type: string
  rulerStateKey?: RulerStateKey
  items?: IMeasure[]  // for groups
}

export interface IMeasures {
  [key: string]: IMeasure[]
}

export const measures: IMeasures = {
  "casePlot": [
    {title: "DG.Inspector.graphCount", type: "Count"}
  ],
  "dotChart": [
    {title: "DG.Inspector.graphCount", type: "Count"}
  ],
  "dotPlot": [
    {title: "DG.Inspector.graphCount", type: "Count"},
    {
      title: "DG.Inspector.graphCenterOptions", type: "Group", rulerStateKey: 'measuresOfCenter', items: [
        {title: "DG.Inspector.graphPlottedMean", type: "Mean"},
        {title: "DG.Inspector.graphPlottedMedian", type: "Median"},
      ]
    },
    {
      title: "DG.Inspector.graphSpreadOptions", type: "Group", rulerStateKey: 'measuresOfSpread', items: [
        {title: "DG.Inspector.graphPlottedStDev", type: "Standard Deviation"},
        {title: "DG.Inspector.graphPlottedStErr", type: "Standard Error"},
        {title: "DG.Inspector.graphPlottedMeanAbsDev", type: "Mean Absolute Deviation"},
      ]
    },
    {
      title: "DG.Inspector.graphBoxPlotNormalCurveOptions", type: "Group", rulerStateKey: 'boxPlotAndNormalCurve',
      items: [
        {title: "DG.Inspector.graphPlottedBoxPlot", type: "Box Plot"},
        {title: "DG.Inspector.graphPlottedNormal", type: "Normal Curve"},
      ]
    },
    {
      title: "DG.Inspector.graphOtherValuesOptions", type: "Group", rulerStateKey: 'otherValues', items: [
        {title: "DG.Inspector.graphPlottedValue", type: "Plotted Value"},
        {title: "DG.Inspector.graphMovableValue", type: "Movable Value"}
      ]
    },
  ],
  "scatterPlot": [
    {title: "DG.Inspector.graphCount", type: "Count"},
    {title: "DG.Inspector.graphMovablePoint", type: "Movable Point"},
    {title: "DG.Inspector.graphMovableLine", type: "Movable Line"},
    {title: "DG.Inspector.graphLSRL", type: "LSRL"},
    {title: "DG.Inspector.graphPlottedFunction", type: "Plotted Function"},
    {title: "DG.Inspector.graphPlottedValue", type: "Plotted Value"}
  ]
}
