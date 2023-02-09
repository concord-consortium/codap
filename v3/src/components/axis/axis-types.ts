import { ScaleBand, ScaleContinuousNumeric, ScaleOrdinal } from "d3"

export const axisGap = 5

// "right" and "top" can only be categorical axes. "v2" can only be numeric
export const AxisPlaces = ["bottom", "left", "right", "top", "v2"] as const
export type AxisPlace = typeof AxisPlaces[number]

export function isHorizontal(place: AxisPlace) {
  return ["bottom", "top"].includes(place)
}

export function isVertical(place: AxisPlace) {
  return ["left", "right", "v2"].includes(place)
}

export interface AxisBounds {
  left: number
  top: number
  width: number
  height: number
}

export type ScaleNumericBaseType = ScaleContinuousNumeric<number, number>
export type AxisScaleType = ScaleNumericBaseType | ScaleOrdinal<string, any> | ScaleBand<string>
