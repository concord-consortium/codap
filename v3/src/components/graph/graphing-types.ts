import { PixiPoints } from "./utilities/pixi-points"

export interface PlotProps {
  pixiPoints?: PixiPoints
  belowPointsGroupRef?: React.RefObject<SVGGElement>
  abovePointsGroupRef?: React.RefObject<SVGGElement>
}

// One element of the data array assigned to the points
export interface InternalizedData {
  xAttributeID: string,
  yAttributeID: string,
  cases:string[]
}

export interface IDomainOptions {
  clampPosMinAtZero?: boolean
}

export interface IBarCover {
  class: string
  primeCat: string
  secCat: string
  extraPrimeCat: string
  extraSecCat: string
  x: string
  y: string
  width: string
  height: string
}

export const PlotTypes = ["casePlot", "dotPlot", "dotChart", "scatterPlot"] as const
export type PlotType = typeof PlotTypes[number]

export const kAxisTickLength = 4,
  kAxisGap = 2

export const kGraphClass = "graph-plot"
export const kGraphClassSelector = `.${kGraphClass}`
export const kGraphAdornmentsClass = "graph-adornments-grid"
export const kGraphAdornmentsClassSelector = `.${kGraphAdornmentsClass}`
