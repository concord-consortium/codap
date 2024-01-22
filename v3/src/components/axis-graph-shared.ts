import {AxisPlaces} from "./axis/axis-types"

export const GraphPlaces = [...AxisPlaces, "yPlus", "plot", "legend"] as const
export type GraphPlace = typeof GraphPlaces[number]

export type GraphExtentsPlace = GraphPlace | "banners"

export function isVertical(place: GraphPlace) {
  return ["left", "rightCat", "rightNumeric", "yPlus"].includes(place)
}
