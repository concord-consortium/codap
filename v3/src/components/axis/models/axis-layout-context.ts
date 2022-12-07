import { createContext, useContext } from "react"
import { AxisBounds, AxisPlace, AxisScaleType } from "../axis-types"

export interface IAxisLayout {
  setParentExtent: (width: number, height: number) => void
  getAxisLength: (place: AxisPlace) => number

  // actual bounds of DOM element
  getAxisBounds: (place: AxisPlace) => AxisBounds | undefined
  setAxisBounds: (place: AxisPlace, bounds?: AxisBounds) => void

  getAxisScale: (place: AxisPlace) => AxisScaleType | undefined
  setAxisScale: (place: AxisPlace, scale: AxisScaleType) => void

  // desired/computed bounds via model
  getComputedBounds: (place: AxisPlace) => AxisBounds | undefined
  setDesiredExtent: (place: AxisPlace, extent: number) => void
}

const nullAxisLayout: IAxisLayout = {
  setParentExtent: () => undefined,
  getAxisLength: () => 0,
  getAxisBounds: () => undefined,
  setAxisBounds: () => undefined,
  getAxisScale: () => undefined,
  setAxisScale: () => undefined,
  getComputedBounds: () => undefined,
  setDesiredExtent: () => undefined
}

export const AxisLayoutContext = createContext(nullAxisLayout)
export const useAxisLayoutContext = () => useContext(AxisLayoutContext)
