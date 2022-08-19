// One element of the data array assigned to the points
export interface InternalizedData {
  xAttributeID: string,
  yAttributeID: string,
  cases:string[]
}

export interface Rect {
  x: number, y: number, width: number, height: number
}

export interface rTreeRect { x: number, y: number, w: number, h: number }

export interface plotProps {
  transform: string
}

export interface counterProps {
  counter:number,
  setCounter: React.Dispatch<React.SetStateAction<number>>
}

export const transitionDuration = 1000,
  defaultRadius = 5,
  defaultDiameter = 2 * defaultRadius,
  dragRadius = 10

export const PlotTypes = ["dotPlot", "scatterPlot"] as const
export type PlotType = typeof PlotTypes[number]

export const kGraphClass = "graph-plot"
export const kGraphClassSelector = `.${kGraphClass}`
