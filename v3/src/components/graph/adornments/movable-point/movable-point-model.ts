import { Instance, types } from "mobx-state-tree"
import { AdornmentModel, IAdornmentModel, PointModel } from "../adornment-models"
import { Point } from "../../graphing-types"
import { kMovablePointType } from "./movable-point-types"
import { IAxisModel, isNumericAxisModel } from "../../../axis/models/axis-model"

export const MovablePointModel = AdornmentModel
  .named('MovablePointModel')
  .props({
    type: 'Movable Point',
    points: types.map(PointModel)
  })
  .views(self => ({
    getInitialPosition(axis?: IAxisModel) {
      if (!isNumericAxisModel(axis)) return 0
      const [min, max] = axis.domain
      return max - (max - min) / 4
    }
  }))
  .actions(self => ({
    setPoint(aPoint: Point, key='') {
      self.points.set(key, aPoint)
    }
  }))
  .actions(self => ({
    setInitialPoint(xAxis?: IAxisModel, yAxis?: IAxisModel, key='') {
      self.setPoint({ x: self.getInitialPosition(xAxis), y: self.getInitialPosition(yAxis) }, key)
    }
  }))
export interface IMovablePointModel extends Instance<typeof MovablePointModel> {}
export function isMovablePoint(adornment: IAdornmentModel): adornment is IMovablePointModel {
  return adornment.type === kMovablePointType
}
