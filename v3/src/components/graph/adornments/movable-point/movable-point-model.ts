import { Instance, types } from "mobx-state-tree"
import { Point } from "../../../data-display/data-display-types"
import { AdornmentModel, IAdornmentModel, IUpdateCategoriesOptions, PointModel } from "../adornment-models"
import { IAxisModel, isNumericAxisModel } from "../../../axis/models/axis-model"
import { kMovablePointType } from "./movable-point-types"


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
  .actions(self => ({
    updateCategories(options: IUpdateCategoriesOptions) {
      const { xAxis, yAxis, topCats, rightCats, resetPoints } = options
      const columnCount = topCats?.length || 1
      const rowCount = rightCats?.length || 1
      const totalCount = rowCount * columnCount
      for (let i = 0; i < totalCount; ++i) {
        const cellKey = self.setCellKey(options, i)
        const instanceKey = self.instanceKey(cellKey)
        if (!self.points.get(instanceKey) || resetPoints) {
          self.setInitialPoint(xAxis, yAxis, instanceKey)
        }
      }
    }
  }))
export interface IMovablePointModel extends Instance<typeof MovablePointModel> {}
export function isMovablePoint(adornment: IAdornmentModel): adornment is IMovablePointModel {
  return adornment.type === kMovablePointType
}
