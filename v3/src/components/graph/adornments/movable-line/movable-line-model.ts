import { Instance, types } from "mobx-state-tree"
import { AdornmentModel, IAdornmentModel, PointModel, kInfinitePoint } from "../adornment-models"
import { kMovableLineType } from "./movable-line-types"
import { Point } from "../../graphing-types"

export const MovableLineParams = types.model("MovableLineParams", {
  equationCoords: types.maybe(PointModel),
  intercept: types.number,
  slope: types.number,
})
.volatile(self => ({
  pivot1: PointModel.create(),
  pivot2: PointModel.create()
}))
.actions(self => ({
  setEquationCoords(coords: Point) {
    self.equationCoords = PointModel.create(coords)
  },
  setPivot1(point: Point) {
    self.pivot1.set(point)
  },
  setPivot2(point: Point) {
    self.pivot2.set(point)
  }
}))

export const MovableLineModel = AdornmentModel
.named('MovableLineModel')
.props({
  type: 'Movable Line',
  lines: types.map(MovableLineParams)
})
.actions(self => ({
  setLine(
    aLine: {intercept: number, slope: number, pivot1?: Point, pivot2?: Point, equationCoords?: Point}, key=''
  ) {
    self.lines.set(key, aLine)
    const line = self.lines.get(key)
    line?.setPivot1(aLine.pivot1 ?? kInfinitePoint)
    line?.setPivot2(aLine.pivot2 ?? kInfinitePoint)
  }
}))
export interface IMovableLineModel extends Instance<typeof MovableLineModel> {}
export function isMovableLine(adornment: IAdornmentModel): adornment is IMovableLineModel {
return adornment.type === kMovableLineType
}
