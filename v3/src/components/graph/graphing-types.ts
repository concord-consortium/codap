// One element of the data array assigned to the points
export interface InternalizedData {
  xAttributeID: string,
  yAttributeID: string,
  cases:string[]
}

export type Point = { x: number, y: number }
export type CPLine = { slope: number, intercept: number, pivot1?: Point, pivot2?: Point }
export const kNullPoint = {x: -999, y: -999}

export interface Rect {
  x: number, y: number, width: number, height: number
}

export interface rTreeRect { x: number, y: number, w: number, h: number }

export interface counterProps {
  counter:number,
  setCounter: React.Dispatch<React.SetStateAction<number>>
}

export const transitionDuration = 1000,
  defaultRadius = 5,
  defaultDiameter = 2 * defaultRadius,
  dragRadius = 10

export const PlotTypes = ["casePlot", "dotPlot", 'dotChart', "scatterPlot"] as const
export type PlotType = typeof PlotTypes[number]

export const kGraphClass = "graph-plot"
export const kGraphClassSelector = `.${kGraphClass}`
