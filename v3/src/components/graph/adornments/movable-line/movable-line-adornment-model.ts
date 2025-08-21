import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { JsonNumber } from "../../../../utilities/json-number"
import { IAxisModel } from "../../../axis/models/axis-model"
import { Point } from "../../../data-display/data-display-types"
import { computeSlopeAndIntercept } from "../../utilities/graph-utils"
import { AdornmentModel, IAdornmentModel, IUpdateCategoriesOptions } from "../adornment-models"
import { LineLabelInstance } from "../line-label-instance"
import { kInfinitePoint, PointModel } from "../point-model"
import { ILineDescription } from "../shared-adornment-types"
import { kMovableLineType } from "./movable-line-adornment-types"

export const MovableLineInstance = LineLabelInstance
.named("MovableLineInstance")
.props({
  intercept: types.number,
  slope: JsonNumber
})
.volatile(() => ({
  dynamicIntercept: undefined as number | undefined,
  dynamicSlope: undefined as number | undefined,
  pivot1: PointModel.create(),
  pivot2: PointModel.create()
}))
.views(self => ({
  get slopeAndIntercept() {
    const intercept = self.dynamicIntercept ?? self.intercept
    const slope = self.dynamicSlope ?? self.slope
    return {intercept, slope}
  }
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
  },
  setVolatile(intercept?: number, slope?: number) {
    self.dynamicIntercept = intercept
    self.dynamicSlope = slope
  }
}))

export const MovableLineAdornmentModel = AdornmentModel
.named("MovableLineAdornmentModel")
.props({
  type: types.optional(types.literal(kMovableLineType), kMovableLineType),
  // key is cell key
  lines: types.map(MovableLineInstance)
})
.views(self => ({
  get firstLineInstance(): Maybe<IMovableLineInstance> {
    return self.lines.values().next().value
  },
  get lineDescriptions() {
    const lineDescriptions: ILineDescription[] = []
    self.lines.forEach((line, key) => {
      const { intercept, slope } = line.slopeAndIntercept
      if (!Number.isFinite(intercept) || !Number.isFinite(slope)) return
      const cellKey = JSON.parse(`${key}`)
      lineDescriptions.push({ cellKey, intercept, slope })
    })
    return lineDescriptions
  }
}))
.actions(self => ({
  setLine(
    aLine: {intercept: number, slope: number, pivot1?: Point, pivot2?: Point, equationCoords?: Point}, key=""
  ) {
    self.lines.set(key, aLine)
    const line = self.lines.get(key)
    line?.setVolatile()
    line?.setPivot1(aLine.pivot1 ?? kInfinitePoint)
    line?.setPivot2(aLine.pivot2 ?? kInfinitePoint)
  },
  setVolatileLine(
    aLine: {intercept: number | undefined, slope: number | undefined}, key=""
  ) {
    const existingLine = self.lines.get(key)
    existingLine?.setVolatile(aLine.intercept, aLine.slope)
  }
}))
.actions(self => ({
  setInitialLine(xAxis?: IAxisModel, yAxis?: IAxisModel, key="", interceptLocked=false) {
    const { intercept, slope } = computeSlopeAndIntercept(xAxis, yAxis, interceptLocked)
    self.setLine({ intercept, slope }, key)
  }
}))
.actions(self => ({
  updateCategories(options: IUpdateCategoriesOptions) {
    const { resetPoints, dataConfig, interceptLocked, xAxis, yAxis } = options
    if (dataConfig.xAndYAreNumeric) {
      dataConfig.getAllCellKeys().forEach(cellKey => {
        const instanceKey = self.instanceKey(cellKey)
        if (!self.lines.get(instanceKey) || resetPoints) {
          self.setInitialLine(xAxis, yAxis, instanceKey, interceptLocked)
        }
      })
    }
  }
}))

export interface IMovableLineInstanceSnapshot extends SnapshotIn<typeof MovableLineInstance> {}
export interface IMovableLineInstance extends Instance<typeof MovableLineInstance> {}
export interface IMovableLineAdornmentModelSnapshot extends SnapshotIn<typeof MovableLineAdornmentModel> {}
export interface IMovableLineAdornmentModel extends Instance<typeof MovableLineAdornmentModel> {}
export function isMovableLineAdornment(adornment: IAdornmentModel): adornment is IMovableLineAdornmentModel {
  return adornment.type === kMovableLineType
}
