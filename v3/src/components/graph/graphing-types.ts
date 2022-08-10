import {ScaleLinear} from "d3"
import {INumericAxisModel} from "./models/axis-model"

export interface axisProps {
  model: INumericAxisModel,
  scaleLinear: ScaleLinear<number, number>,
  transform: string,
  length: number | undefined,
  label: string | undefined
}

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
  xScale?: ScaleLinear<number, number>,
  yScale?: ScaleLinear<number, number>,
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
