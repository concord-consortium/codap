import { createContext, useContext } from "react"
import { IDataDisplayContentModel } from "../models/data-display-content-model"
import { IAxisModel, isBaseNumericAxisModel } from "../../axis/models/axis-model"

const kDefaultDataDisplayModel = {
  // required by useDataDisplayAnimation
  isAnimating: () => false,
  startAnimation: () => undefined,
  stopAnimation: () => undefined,
  // required by AxisProviderContext
  getAxis: () => undefined,
  getNumericAxis: () => undefined,
  hasDraggableNumericAxis: (axisModel: IAxisModel) => isBaseNumericAxisModel(axisModel),
  nonDraggableAxisTicks: (formatter: (value: number) => string) => ({tickValues: [], tickLabels: []})
} as unknown as IDataDisplayContentModel

export const DataDisplayModelContext = createContext<IDataDisplayContentModel>(kDefaultDataDisplayModel)

export const useDataDisplayModelContext = () => {
  return useContext(DataDisplayModelContext)
}
