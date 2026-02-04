import { PointRendererBase } from "../data-display/renderer"

export interface IPlotProps {
  renderer?: PointRendererBase
  abovePointsGroupRef: React.RefObject<SVGGElement>
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

export type GraphCellKey = Record<string, string>

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

export function isCategoricalPlotType(plotType: PlotType): boolean {
  return ["dotChart", "barChart"].includes(plotType)
}

export function isUnivariateNumericPlotType(plotType: PlotType): boolean {
  return ["dotPlot", "binnedDotPlot", "histogram", "linePlot"].includes(plotType)
}

export const BreakdownTypes = ["count", "percent", "formula"] as const
export type BreakdownType = typeof BreakdownTypes[number]
export function isBreakdownType(value: unknown): value is BreakdownType {
  return typeof value === "string" && (BreakdownTypes as readonly string[]).includes(value)
}

export const kGraphClass = "graph-plot"
export const kGraphClassSelector = `.${kGraphClass}`
export const kGraphAdornmentsClass = "graph-adornments-grid"
export const kGraphAdornmentsClassSelector = `.${kGraphAdornmentsClass}`
