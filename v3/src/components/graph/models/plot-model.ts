import { Instance, types } from "mobx-state-tree"
import {
  AdornmentModelUnion,
  IAdornmentModelUnion,
  MovableLineModel,
  MovableValueModel
} from "../adornments/adornment-models"
import { AxisModelUnion, AxisPlace, IAxisModelUnion } from "./axis-model"
import { PlotType, PlotTypes } from "../graphing-types"

export const PlotModel = types
  .model("PlotModel", {
    plotType: types.enumeration(PlotTypes.slice()),
    // keys are adornment ids
    adornments: types.map(AdornmentModelUnion),
  })
  .views(self => ({
    getAdornment(key: IAdornmentModelUnion) {
      return self.adornments[key]
    }
  }))
  .actions(self => ({
    setAxis(place: AxisPlace, axis: IAxisModelUnion) {
      self.axes.set(place, axis)
    },
    setPlotType(type: PlotType) {
      self.plotType = type
    }
  }))
export interface IPlotModel extends Instance<typeof PlotModel> {}
