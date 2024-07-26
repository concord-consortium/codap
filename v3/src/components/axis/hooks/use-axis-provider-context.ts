import { createContext, useContext } from "react"
import { IAbstractNumericAxisModel, IAxisModel, isNumericAxisModel } from "../models/axis-model"
import { AxisPlace } from "../axis-types"

export interface IAxisProvider {
  getAxis: (place: AxisPlace) => IAxisModel | undefined
  getNumericAxis: (place: AxisPlace) => IAbstractNumericAxisModel | undefined
}
const kDefaultAxisProvider = {
  getAxis: () => undefined,
  getNumericAxis: () => undefined
}

export const AxisProviderContext = createContext<IAxisProvider>(kDefaultAxisProvider)

export const useAxisProviderContext = () => useContext(AxisProviderContext)

export function useAxisModel(place: AxisPlace) {
  return useAxisProviderContext().getAxis(place)
}

export function useNumericAxisModel(place: AxisPlace) {
  const axisModel = useAxisModel(place)
  return isNumericAxisModel(axisModel) ? axisModel : undefined
}
