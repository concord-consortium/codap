import { createContext, useContext } from "react"
import { AxisBounds, AxisPlace, AxisScaleType, IScaleType } from "../axis-types"
import {MultiScale} from "./multi-scale"

export interface IAxisLayout {
  setTileExtent: (width: number, height: number) => void
  getAxisLength: (place: AxisPlace) => number

  // actual bounds of DOM element
  getAxisBounds: (place: AxisPlace) => AxisBounds | undefined
  setAxisBounds: (place: AxisPlace, bounds?: AxisBounds) => void

  getAxisMultiScale: (place: AxisPlace) => MultiScale | undefined
  getAxisScale: (place: AxisPlace) => AxisScaleType | undefined
  setAxisScaleType: (place: AxisPlace, scaleType: IScaleType) => void

  // desired/computed bounds via model
  getComputedBounds: (place: AxisPlace) => AxisBounds | undefined
  setDesiredExtent: (place: AxisPlace, extent: number) => void
}

const nullAxisLayout: IAxisLayout = {
  setTileExtent: () => undefined,
  getAxisLength: () => 0,
  getAxisBounds: () => undefined,
  setAxisBounds: () => undefined,
  getAxisMultiScale: () => undefined,
  getAxisScale: () => undefined,
  setAxisScaleType: () => undefined,
  getComputedBounds: () => undefined,
  setDesiredExtent: () => undefined
}

export const AxisLayoutContext = createContext(nullAxisLayout)
export const useAxisLayoutContext = () => useContext(AxisLayoutContext)
