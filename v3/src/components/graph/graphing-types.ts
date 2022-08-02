import {ScaleLinear} from "d3"

export type axisProps = {
  orientation: 'bottom' | 'left' | 'right' | 'top',
  scaleLinear: ScaleLinear<number, number>,
  transform: string,
  length: number | undefined,
  label: string | undefined,
  counter:number,
  setCounter: React.Dispatch<React.SetStateAction<number>>
}

// One element of the data array assigned to the points
export type InternalizedData = {
  xAttributeID: string,
  yAttributeID: string,
  cases:string[]
}

export type Rect = {
  x: number, y: number, width: number, height: number
}

export type rTreeRect = { x: number, y: number, w: number, h: number }

export type plotProps = {
  xScale?: ScaleLinear<number, number>,
  yScale?: ScaleLinear<number, number>,
  transform: string
}

export type counterProps = {
  counter:number,
  setCounter: React.Dispatch<React.SetStateAction<number>>
}

export const transitionDuration = 1000,
  defaultRadius = 5,
  defaultDiameter = 2 * defaultRadius,
  dragRadius = 10
