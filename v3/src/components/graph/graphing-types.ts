import { PixiPoints } from "../data-display/pixi/pixi-points"

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

export interface IBarCover {
  caseIDs: string[]
  class: string
  legendCat?: string
  primeCat: string
  secCat: string
  primeSplitCat: string
  secSplitCat: string
  x: string
  y: string
  width: string
  height: string
}

export type CellType = { p: number, s: number, ep: number, es: number }
type CellRecordType = Record<string, { cell: CellType, numSoFar: number }>
export type CatMapType = Record<string, Record<string, Record<string, CellRecordType>>>

export const PlotTypes = [
  "casePlot",
  // categorical charts
  "dotChart",
  "barChart",
  // univariate numeric plots
  "dotPlot",
  "binnedDotPlot",
  "histogram",
  "linePlot",
  // bivariate numeric plots
  "scatterPlot"
] as const
export type PlotType = typeof PlotTypes[number]

export const BreakdownTypes = ["count", "percent"] as const
export type BreakdownType = typeof BreakdownTypes[number]

export const kGraphClass = "graph-plot"
export const kGraphClassSelector = `.${kGraphClass}`
export const kGraphAdornmentsClass = "graph-adornments-grid"
export const kGraphAdornmentsClassSelector = `.${kGraphAdornmentsClass}`
