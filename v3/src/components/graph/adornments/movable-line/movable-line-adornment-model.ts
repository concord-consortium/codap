import { Instance, types } from "mobx-state-tree"
import { Point } from "../../../data-display/data-display-types"
import { AdornmentModel, IAdornmentModel, IUpdateCategoriesOptions, PointModel,
         kInfinitePoint } from "../adornment-models"
import { IAxisModel } from "../../../axis/models/axis-model"
import { computeSlopeAndIntercept } from "../../utilities/graph-utils"
import { kMovableLineType } from "./movable-line-adornment-types"
import { IGraphDataConfigurationModel } from "../../models/graph-data-configuration-model"
import { IAxisLayout } from "../../../axis/models/axis-layout-context"
import { ILineDescription, ISquareOfResidual, ResidualSquareFn } from "../shared-adornment-types"

export const MovableLineInstance = types.model("MovableLineInstance", {
  equationCoords: types.maybe(PointModel),
  intercept: types.number,
  slope: types.number,
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
  },
  sumOfSquares(dataConfig: IGraphDataConfigurationModel, layout: IAxisLayout, cellKey: any) {
    const dataset = dataConfig?.dataset
    const caseData = dataset?.cases
    const xAttrID = dataConfig?.attributeID("x") ?? ""
    const yAttrID = dataConfig?.attributeID("y") ?? ""
    let sumOfSquares = 0
    caseData?.forEach((datum: any) => {
      const fullCaseData = dataConfig?.dataset?.getCase(datum.__id__)
      if (fullCaseData && dataConfig?.isCaseInSubPlot(cellKey, fullCaseData)) {
        const x = dataset?.getNumeric(datum.__id__, xAttrID) ?? 0
        const y = dataset?.getNumeric(datum.__id__, yAttrID) ?? 0
        const { slope, intercept } = self
        const lineY = slope * x + intercept
        const residual = y - lineY
        if (isFinite(residual)) {
          sumOfSquares += residual * residual
        }
      }
    })
    return sumOfSquares
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
  setVolatileIntercept(intercept?: number) {
    self.dynamicIntercept = intercept
  },
  setVolatileSlope(slope?: number) {
    self.dynamicSlope = slope
  }
}))

export const MovableLineAdornmentModel = AdornmentModel
.named("MovableLineAdornmentModel")
.props({
  type: types.optional(types.literal(kMovableLineType), kMovableLineType),
  lines: types.map(MovableLineInstance)
})
.views(self => ({
  get lineDescriptions() {
    const lineDescriptions: ILineDescription[] = []
    self.lines.forEach((line, key) => {
      // TODO: maybe don't even add the line if it isn't valid
      const { intercept, slope } = line?.slopeAndIntercept ?? { intercept: 0, slope: 0 }
      lineDescriptions.push({ cellKey: JSON.parse(key), intercept, slope })
    })
    return lineDescriptions
  },
  squaresOfResiduals(
    dataConfiguration: IGraphDataConfigurationModel,
    residualSquare: ResidualSquareFn
  ) {
    const dataset = dataConfiguration?.dataset
    const squares: ISquareOfResidual[] = []
    const interceptsAndSlopes = this.lineDescriptions
    interceptsAndSlopes.forEach(interceptAndSlope => {
      const { cellKey, intercept, slope } = interceptAndSlope
      dataset?.cases.forEach(caseData => {
        const fullCaseData = dataset?.getCase(caseData.__id__)
        if (fullCaseData && dataConfiguration?.isCaseInSubPlot(cellKey, fullCaseData)) {
          const square = residualSquare(slope, intercept, caseData.__id__)
          if (!isFinite(square.x) || !isFinite(square.y)) return
          squares.push(square)
        }
      })
    })
    return squares
  }
}))
.actions(self => ({
  setLine(
    aLine: {intercept: number, slope: number, pivot1?: Point, pivot2?: Point, equationCoords?: Point}, key=""
  ) {
    self.lines.set(key, aLine)
    const line = self.lines.get(key)
    line?.setPivot1(aLine.pivot1 ?? kInfinitePoint)
    line?.setPivot2(aLine.pivot2 ?? kInfinitePoint)
  },
  updateVolatileProps(
    aLine: {intercept: number | undefined, slope: number | undefined}, key=""
  ) {
    const existingLine = self.lines.get(key)
    existingLine?.setVolatileIntercept(aLine.intercept)
    existingLine?.setVolatileSlope(aLine.slope)
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
    dataConfig.getAllCellKeys().forEach(cellKey => {
      const instanceKey = self.instanceKey(cellKey)
      if (!self.lines.get(instanceKey) || resetPoints) {
        self.setInitialLine(xAxis, yAxis, instanceKey, interceptLocked)
      }
    })
  }
}))

export interface IMovableLineInstance extends Instance<typeof MovableLineInstance> {}
export interface IMovableLineAdornmentModel extends Instance<typeof MovableLineAdornmentModel> {}
export function isMovableLineAdornment(adornment: IAdornmentModel): adornment is IMovableLineAdornmentModel {
  return adornment.type === kMovableLineType
}
