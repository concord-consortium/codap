import { createContext, useContext } from "react"
import { IDataDisplayContentModel } from "../models/data-display-content-model"

const kDefaultDataDisplayModel = {
  // required by useDataDisplayAnimation
  isAnimating: () => false,
  startAnimation: () => undefined,
  stopAnimation: () => undefined,
  // required by AxisProviderContext
  getAxis: () => undefined,
  getNumericAxis: () => undefined,
  hasDraggableNumericAxis: () => undefined,
  nonDraggableAxisTicks: () => ({tickValues: [], tickLabels: []})
} as unknown as IDataDisplayContentModel

export const DataDisplayModelContext = createContext<IDataDisplayContentModel>(kDefaultDataDisplayModel)

export const useDataDisplayModelContext = () => {
  return useContext(DataDisplayModelContext)
}
