import {axisBottom, axisLeft, axisRight, axisTop, ScaleBand, ScaleContinuousNumeric, ScaleOrdinal} from "d3"

export const axisGap = 5

// "rightCat" and "top" can only be categorical axes. "rightNumeric" can only be numeric
export const AxisPlaces = ["bottom", "left", "rightCat", "top", "rightNumeric"] as const
export type AxisPlace = typeof AxisPlaces[number]

export function otherPlace(aPlace: AxisPlace): AxisPlace {
  return ['bottom', 'top'].includes(aPlace) ? 'left' : 'bottom'
}

export type AxisOrientation = "horizontal" | "vertical"

export const ScaleTypes = ["linear", "log", "ordinal", "band"] as const
export type IScaleType = typeof ScaleTypes[number]

export const axisPlaceToAxisFn = (place: AxisPlace) => {
  return {
    bottom: axisBottom,
    left: axisLeft,
    rightCat: axisRight,
    rightNumeric: axisRight,
    top: axisTop
  }[place]
}

export function isHorizontal(place: AxisPlace) {
  return ["bottom", "top"].includes(place)
}

export interface AxisBounds {
  left: number
  top: number
  width: number
  height: number
}

export type ScaleNumericBaseType = ScaleContinuousNumeric<number, number>
export type AxisScaleType = ScaleNumericBaseType | ScaleOrdinal<string, any> | ScaleBand<string>
