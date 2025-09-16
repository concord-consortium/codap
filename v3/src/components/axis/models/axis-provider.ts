import { AxisPlace } from "../axis-types"
import { IAxisModel } from "./axis-model"
import { IBaseNumericAxisModel } from "./numeric-axis-models"

export interface IAxisProviderBase {
  getAxis: (place: AxisPlace) => IAxisModel | undefined
  getNumericAxis: (place: AxisPlace) => IBaseNumericAxisModel | undefined
}

export interface IAxisProvider extends IAxisProviderBase {
  hasBinnedNumericAxis: (axisModel: IAxisModel) => boolean
  hasDraggableNumericAxis: (axisModel: IAxisModel) => boolean
  nonDraggableAxisTicks: (formatter: (value: number) => string) => { tickValues: number[], tickLabels: string[] }
}
