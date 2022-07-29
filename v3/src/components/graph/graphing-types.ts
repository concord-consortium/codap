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

// The name 'worldData' here is meant to imply the data comes from the real world context rather than screen
export type worldData = {
  x: number, y: number, selected: boolean, id: number
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
