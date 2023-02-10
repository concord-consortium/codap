import { ScaleBand, ScaleContinuousNumeric, ScaleOrdinal } from "d3"

export const axisGap = 5

// "rightCat" and "top" can only be categorical axes. "rightNumeric" can only be numeric
export const AxisPlaces = ["bottom", "left", "rightCat", "top", "rightNumeric"] as const
export type AxisPlace = typeof AxisPlaces[number]

export function isHorizontal(place: AxisPlace) {
  return ["bottom", "top"].includes(place)
}

export function isVertical(place: AxisPlace) {
  return ["left", "rightCat", "rightNumeric"].includes(place)
}

export interface AxisBounds {
  left: number
  top: number
  width: number
  height: number
}

export type ScaleNumericBaseType = ScaleContinuousNumeric<number, number>
export type AxisScaleType = ScaleNumericBaseType | ScaleOrdinal<string, any> | ScaleBand<string>
