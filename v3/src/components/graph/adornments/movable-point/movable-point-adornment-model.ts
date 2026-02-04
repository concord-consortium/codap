import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { IAxisModel } from "../../../axis/models/axis-model"
import { isAnyNumericAxisModel } from "../../../axis/models/numeric-axis-models"
import { Point } from "../../../data-display/data-display-types"
import { migrateInstanceKeyMap } from "../../utilities/cell-key-utils"
import { AdornmentModel, IAdornmentModel, IUpdateCategoriesOptions } from "../adornment-models"
import { IPointModel, PointModel } from "../point-model"
import { kMovablePointType } from "./movable-point-adornment-types"


export const MovablePointAdornmentModel = AdornmentModel
  .named("MovablePointAdornmentModel")
  .props({
    type: types.optional(types.literal(kMovablePointType), kMovablePointType),
    points: types.map(PointModel)
  })
  .preProcessSnapshot(snapshot => {
    const points = migrateInstanceKeyMap(snapshot.points)
    return points ? { ...snapshot, points } : snapshot
  })
  .views(self => ({
    get firstPoint(): Maybe<IPointModel> {
      return self.points.values().next().value
    },
    getInitialPosition(axis?: IAxisModel) {
      if (!isAnyNumericAxisModel(axis)) return 0
      const [min, max] = axis.domain
      return max - (max - min) / 4
    }
  }))
  .actions(self => ({
    setPoint(aPoint: Point, key="") {
      self.points.set(key, aPoint)
    }
  }))
  .actions(self => ({
    setInitialPoint(xAxis?: IAxisModel, yAxis?: IAxisModel, key="") {
      self.setPoint({ x: self.getInitialPosition(xAxis), y: self.getInitialPosition(yAxis) }, key)
    }
  }))
  .actions(self => ({
    updateCategories(options: IUpdateCategoriesOptions) {
      const { resetPoints, xAxis, yAxis, dataConfig } = options
      dataConfig.getAllCellKeys().forEach(cellKey => {
        const instanceKey = self.instanceKey(cellKey)
        if (!self.points.get(instanceKey) || resetPoints) {
          self.setInitialPoint(xAxis, yAxis, instanceKey)
        }
      })
    }
  }))
export interface IMovablePointAdornmentModelSnapshot extends SnapshotIn<typeof MovablePointAdornmentModel> {}
export interface IMovablePointAdornmentModel extends Instance<typeof MovablePointAdornmentModel> {}
export function isMovablePointAdornment(adornment: IAdornmentModel): adornment is IMovablePointAdornmentModel {
  return adornment.type === kMovablePointType
}
