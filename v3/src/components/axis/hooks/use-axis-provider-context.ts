import { createContext, useContext } from "react"
import { IBaseNumericAxisModel, IAxisModel, isNumericAxisModel } from "../models/axis-model"
import { AxisPlace } from "../axis-types"

export interface IAxisProvider {
  getAxis: (place: AxisPlace) => IAxisModel | undefined
  getNumericAxis: (place: AxisPlace) => IBaseNumericAxisModel | undefined
}

export const AxisProviderContext = createContext<IAxisProvider | undefined>(undefined)

export const useAxisProviderContext = () => {
  const context = useContext(AxisProviderContext)
  if (!context) {
    throw new Error("useAxisProviderContext must be used within a AxisProviderContextProvider")
  }
  return context
}

export function useAxisModel(place: AxisPlace) {
  return useAxisProviderContext().getAxis(place)
}

export function useNumericAxisModel(place: AxisPlace) {
  const axisModel = useAxisModel(place)
  return isNumericAxisModel(axisModel) ? axisModel : undefined
}
