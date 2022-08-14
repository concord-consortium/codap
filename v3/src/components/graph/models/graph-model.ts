import { Instance, types } from "mobx-state-tree"
import { AdornmentModelUnion, MovableLineModel, MovableValueModel } from "../adornments/adornment-models"
import { AxisModelUnion, AxisPlace, IAxisModelUnion } from "./axis-model"

export const GraphModel = types
  .model("GraphModel", {
    // keys are AxisPlaces
    axes: types.map(types.maybe(AxisModelUnion)),
    // keys are adornment ids
    adornments: types.map(AdornmentModelUnion),
    // will eventually move into adornments map
    movableValue: MovableValueModel,
    movableLine: MovableLineModel
  })
  .views(self => ({
    getAxis(place: AxisPlace) {
      return self.axes.get(place)
    }
  }))
  .actions(self => ({
    setAxis(place: AxisPlace, axis: IAxisModelUnion) {
      self.axes.set(place, axis)
    }
  }))
export interface IGraphModel extends Instance<typeof GraphModel> {}
