import { AxisPlace } from "../axis-types"
import { AxisHelper } from "../helper-models/axis-helper"
import { IAxisModel } from "./axis-model"
import { IBaseNumericAxisModel } from "./base-numeric-axis-model"

export interface IAxisProviderBase {
  getAxis: (place: AxisPlace) => IAxisModel | undefined
  getNumericAxis: (place: AxisPlace) => IBaseNumericAxisModel | undefined
  getAxisHelper: (place: AxisPlace, subAxisIndex: number) => AxisHelper | undefined
  setAxisHelper: (place: AxisPlace, subAxisIndex: number, axisHelper: AxisHelper) => void
}

export interface IAxisProvider extends IAxisProviderBase {
  hasBinnedNumericAxis: (axisModel: IAxisModel) => boolean
  hasDraggableNumericAxis: (axisModel: IAxisModel) => boolean
  nonDraggableAxisTicks: (formatter: (value: number) => string) => { tickValues: number[], tickLabels: string[] }
}
