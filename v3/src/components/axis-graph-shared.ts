import {AxisPlace, AxisPlaces} from "./axis/axis-types"

export const GraphPlaces = [...AxisPlaces, "yPlus", "plot", "legend"] as const
export type GraphPlace = typeof GraphPlaces[number]

export function isVertical(place: GraphPlace) {
  return ["left", "rightCat", "rightNumeric", "yPlus"].includes(place)
}
