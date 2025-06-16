import {axisBottom, axisLeft, axisRight, axisTop,
  ScaleBand, ScaleContinuousNumeric, ScaleOrdinal, select, Selection} from "d3"

export const axisGap = 5

// "rightCat" and "top" can only be categorical axes. "rightNumeric" can only be numeric
export const AxisPlaces = ["bottom", "left", "rightCat", "top", "rightNumeric"] as const
export type AxisPlace = typeof AxisPlaces[number]

export function isAxisPlace(place: string): place is AxisPlace {
  return (AxisPlaces as readonly string[]).includes(place)
}

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

export interface IAxisDomainOptions {
  clampPosMinAtZero?: boolean
}

export type TickFormatter = (value: number) => string

export interface IAxisTicks {
  tickValues: number[]
  tickLabels: string[]
}

export type ScaleNumericBaseType = ScaleContinuousNumeric<number, number>
export type AxisScaleType = ScaleNumericBaseType | ScaleOrdinal<string, any> | ScaleBand<string>

// type arguments:
//  SVGRectElement: type of element being selected
//  RectIndices: type of data attached to selected element
//  SVGGElement: type of parent element selected by initial/global select
//  unknown: type of data attached to parent element (none in this case)
export type RectIndices = [number, number?, number?]  // data signify lower, middle, upper rectangles
export type DragRectSelection = Selection<SVGRectElement, RectIndices, SVGGElement, unknown>

// selects all `.dragRect` elements, optionally with additional classes, e.g. `.dragRect.additional.classes`
export function selectDragRects(parent: SVGGElement | null, additionalClasses = ""): DragRectSelection | null {
  return parent
    ? select(parent).selectAll<SVGRectElement, RectIndices>(`.dragRect${additionalClasses}`)
    : null
}
