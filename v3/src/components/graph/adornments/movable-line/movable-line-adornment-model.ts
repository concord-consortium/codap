import { Instance, types } from "mobx-state-tree"
import { Point } from "../../../data-display/data-display-types"
import { AdornmentModel, IAdornmentModel, IUpdateCategoriesOptions, PointModel,
         kInfinitePoint } from "../adornment-models"
import { IAxisModel } from "../../../axis/models/axis-model"
import { computeSlopeAndIntercept } from "../../utilities/graph-utils"
import { kMovableLineType } from "./movable-line-adornment-types"

export const MovableLineInstance = types.model("MovableLineInstance", {
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

export const MovableLineAdornmentModel = AdornmentModel
.named("MovableLineAdornmentModel")
.props({
  type: types.optional(types.literal(kMovableLineType), kMovableLineType),
  lines: types.map(MovableLineInstance)
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
.actions(self => ({
  setInitialLine(xAxis?: IAxisModel, yAxis?: IAxisModel, key='') {
    const { intercept, slope } = computeSlopeAndIntercept(xAxis, yAxis)
    self.setLine({ intercept, slope }, key)
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
      if (!self.lines.get(instanceKey) || resetPoints) {
        self.setInitialLine(xAxis, yAxis, instanceKey)
      }
    }
  }
}))

export interface IMovableLineInstance extends Instance<typeof MovableLineInstance> {}
export interface IMovableLineAdornmentModel extends Instance<typeof MovableLineAdornmentModel> {}
export function isMovableLineAdornment(adornment: IAdornmentModel): adornment is IMovableLineAdornmentModel {
  return adornment.type === kMovableLineType
}
