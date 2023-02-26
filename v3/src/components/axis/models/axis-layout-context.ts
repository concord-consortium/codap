import { createContext, useContext } from "react"
import { AxisBounds, AxisPlace } from "../axis-types"
import {MultiScale} from "../../graph/models/multi-scale"
import {IScaleType} from "./axis-model"

export interface IAxisLayout {
  setParentExtent: (width: number, height: number) => void
  getAxisLength: (place: AxisPlace) => number

  // actual bounds of DOM element
  getAxisBounds: (place: AxisPlace) => AxisBounds | undefined
  setAxisBounds: (place: AxisPlace, bounds?: AxisBounds) => void

  getAxisScale: (place: AxisPlace) => MultiScale
  setAxisScaleType: (place: AxisPlace, scaleType: IScaleType) => void

  // desired/computed bounds via model
  getComputedBounds: (place: AxisPlace) => AxisBounds | undefined
  setDesiredExtent: (place: AxisPlace, extent: number) => void
}

const nullAxisLayout: IAxisLayout = {
  setParentExtent: () => undefined,
  getAxisLength: () => 0,
  getAxisBounds: () => undefined,
  setAxisBounds: () => undefined,
  getAxisScale: () => new MultiScale({scaleType: "ordinal", orientation: "horizontal"}),
  setAxisScaleType: () => undefined,
  getComputedBounds: () => undefined,
  setDesiredExtent: () => undefined
}

export const AxisLayoutContext = createContext(nullAxisLayout)
export const useAxisLayoutContext = () => useContext(AxisLayoutContext)
