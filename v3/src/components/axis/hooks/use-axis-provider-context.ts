import { createContext, useContext } from "react"
import { AxisPlace } from "../axis-types"
import { IAxisModel } from "../models/axis-model"
import { IBaseNumericAxisModel } from "../models/numeric-axis-models"

export interface IAxisProvider {
  getAxis: (place: AxisPlace) => IAxisModel | undefined
  getNumericAxis: (place: AxisPlace) => IBaseNumericAxisModel | undefined
  hasBinnedNumericAxis: (axisModel: IAxisModel) => boolean
  hasDraggableNumericAxis: (axisModel: IAxisModel) => boolean
  nonDraggableAxisTicks: (formatter: (value: number) => string) => { tickValues: number[], tickLabels: string[] }
}

export const AxisProviderContext = createContext<Maybe<IAxisProvider>>(undefined)

export const useAxisProviderContext = () => {
  const context = useContext(AxisProviderContext)
  if (!context) {
    throw new Error("useAxisProviderContext must be used within an AxisProviderContextProvider")
  }
  return context
}

export function useAxisModel(place: AxisPlace) {
  return useAxisProviderContext().getAxis(place)
}
