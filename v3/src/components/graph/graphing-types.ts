import { IPixiPointsRef } from "./utilities/pixi-points"

export interface PlotProps {
  pixiPointsRef: IPixiPointsRef
}

// One element of the data array assigned to the points
export interface InternalizedData {
  xAttributeID: string,
  yAttributeID: string,
  cases:string[]
}

export const PlotTypes = ["casePlot", "dotPlot", "dotChart", "scatterPlot"] as const
export type PlotType = typeof PlotTypes[number]

export const PointDisplayTypes = ["points", "bars", "bins"] as const
export type PointDisplayType = typeof PointDisplayTypes[number]

export const isPointDisplayType = (value: string): value is PointDisplayType => {
  return PointDisplayTypes.includes(value as PointDisplayType)
}

export const kAxisTickLength = 4,
  kAxisGap = 2

export const kGraphClass = "graph-plot"
export const kGraphClassSelector = `.${kGraphClass}`
export const kGraphAdornmentsClass = "graph-adornments-grid"
export const kGraphAdornmentsClassSelector = `.${kGraphAdornmentsClass}`
