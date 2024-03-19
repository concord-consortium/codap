import { createContext, useContext } from "react"
import { IDataDisplayContentModel } from "../models/data-display-content-model"
import { MultiScale } from "../../axis/models/multi-scale"

const kDefaultDataDisplayModel = {
  // required by useDataDisplayAnimation
  isAnimating: () => false,
  startAnimation: () => undefined,
  stopAnimation: () => undefined,
  // required by AxisProviderContext
  getAxis: () => undefined,
  getNumericAxis: () => undefined,
  hasDraggableNumericAxis: () => undefined,
  nonDraggableAxisTicks: (multiScale?: MultiScale) => ({tickValues: [], tickLabels: []})
} as unknown as IDataDisplayContentModel

export const DataDisplayModelContext = createContext<IDataDisplayContentModel>(kDefaultDataDisplayModel)

export const useDataDisplayModelContext = () => {
  return useContext(DataDisplayModelContext)
}
