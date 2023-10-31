import { Instance, types } from "mobx-state-tree"
import { Point } from "../../../data-display/data-display-types"
import { AdornmentModel, IAdornmentModel, IUpdateCategoriesOptions, PointModel } from "../adornment-models"
import { leastSquaresLinearRegression, tAt0975ForDf } from "../../utilities/graph-utils"
import { kLSRLType } from "./lsrl-adornment-types"
import { ICase } from "../../../../models/data/data-set-types"
import { IGraphDataConfigurationModel } from "../../models/graph-data-configuration-model"
import { ScaleNumericBaseType } from "../../../axis/axis-types"

export const LSRLInstance = types.model("LSRLInstance", {
  equationCoords: types.maybe(PointModel),
  intercept: types.number,
  rSquared: types.number,
  slope: types.number,
  sdResiduals: types.number
})
.actions(self => ({
  setEquationCoords(coords: Point) {
    self.equationCoords = PointModel.create(coords)
  },
  setIntercept(intercept: number) {
    self.intercept = intercept
  },
  setRSquared(rSquared: number) {
    self.rSquared = rSquared
  },
  setSlope(slope: number) {
    self.slope = slope
  },
  setSdResiduals(sdResiduals: number) {
    self.sdResiduals = sdResiduals
  }
}))

export const LSRLAdornmentModel = AdornmentModel
.named("LSRLAdornmentModel")
.props({
  type: types.optional(types.literal(kLSRLType), kLSRLType),
  lines: types.map(types.array(LSRLInstance)),
  showConfidenceBands: types.optional(types.boolean, false)
})
.views(() => ({
  getCaseValues(
    xAttrId: string, yAttrId: string, cellKey: Record<string, string>, dataConfig?: IGraphDataConfigurationModel,
    cat?: string
  ) {
    if (!dataConfig) return []
    const dataset = dataConfig?.dataset
    const legendAttrId = dataConfig?.attributeID("legend")
    const casesInPlot = dataConfig.subPlotCases(cellKey)
    const caseValues: Point[] = []
    casesInPlot.forEach((c: ICase) => {
      const caseValueX = Number(dataset?.getValue(c.__id__, xAttrId))
      const caseValueY = Number(dataset?.getValue(c.__id__, yAttrId))
      const caseValueLegend = dataset?.getValue(c.__id__, legendAttrId)
      if (Number.isFinite(caseValueX)) {
        if (cat && cat !== "__main__" && caseValueLegend !== cat) return
        caseValues.push({x: caseValueX, y: caseValueY})
      }
    })
    return caseValues
  }
}))
.views(self => ({
  confidenceValues(iX: number, caseValues: Point[], cellKey: Record<string, string>, lineIndex: number) {
    const lines = self.lines.get(self.instanceKey(cellKey))
    const line = lines?.[lineIndex]
    const interceptIsLocked = false
    const slopeIntercept = leastSquaresLinearRegression(caseValues, interceptIsLocked)
    const { count, mse, xSumSquaredDeviations, xMean } = slopeIntercept
    if (
      !line ||
      (!count && count !== 0) ||
      (!mse && mse !== 0) ||
      (!xMean && xMean !== 0) ||
      (!xSumSquaredDeviations && xSumSquaredDeviations !== 0)
    ) return
    const tAt0975ForD = tAt0975ForDf(count - 2)
    const tYHat = line.intercept + line.slope * iX
    const tStdErrorMeanEst = 1 / count + Math.pow(iX - xMean, 2) / xSumSquaredDeviations
    const tAddend = tAt0975ForD * Math.sqrt(mse * tStdErrorMeanEst)
    return { lower: tYHat - tAddend, upper: tYHat + tAddend }
  }
}))
.views(self => ({
  confidenceBandsPoints(
    min: number, max: number, xCellCount: number, yCellCount: number, gap: number, caseValues: Point[],
    xScale: ScaleNumericBaseType, yScale: ScaleNumericBaseType, cellKey: Record<string, string>, lineIndex: number
  ) {
    const upperPoints: any = []
    const lowerPoints: any = []
    for (let pixelX = min; pixelX <= max; pixelX += gap) {
      const tX = xScale.invert(pixelX * xCellCount)
      const tYValues = self.confidenceValues(tX, caseValues, cellKey, lineIndex)
      if (!tYValues) continue
      upperPoints.push({ x: pixelX, y: yScale(tYValues.upper) / yCellCount })
      lowerPoints.unshift({ x: pixelX, y: yScale(tYValues.lower) / yCellCount })
    }
    return { upperPoints, lowerPoints }
  }
}))
.actions(self => ({
  updateLines(line: {intercept: number, rSquared: number, slope: number, sdResiduals: number}, key="") {
    const existingLines = self.lines.get(key)
    const newLines = existingLines ? [...existingLines] : []
    newLines.push(LSRLInstance.create(line))
    self.lines.set(key, newLines)
  },
  setShowConfidenceBands(showConfidenceBands: boolean) {
    self.showConfidenceBands = showConfidenceBands
  },
  computeValues(
    xAttrId: string, yAttrId: string, cellKey: Record<string, string>,
    dataConfig: IGraphDataConfigurationModel, key="", isInterceptLocked=false,
    cat?: string
  ) {
    const caseValues = self.getCaseValues(xAttrId, yAttrId, cellKey, dataConfig, cat)
    const { intercept, rSquared, slope, sdResiduals } =
      leastSquaresLinearRegression(caseValues, isInterceptLocked)
    return { intercept, rSquared, slope, sdResiduals }  
  }
}))
.actions(self => ({
  updateCategories(options: IUpdateCategoriesOptions) {
    const { xAttrId, yAttrId, topCats, rightCats, dataConfig } = options
    if (!dataConfig) return
    self.lines.clear()
    const columnCount = topCats?.length || 1
    const rowCount = rightCats?.length || 1
    const totalCount = rowCount * columnCount
    const legendCats = dataConfig?.categoryArrayForAttrRole("legend")
    for (let i = 0; i < totalCount; ++i) {
      const cellKey = self.cellKey(options, i)
      const instanceKey = self.instanceKey(cellKey)
      for (let j = 0; j < legendCats.length; ++j) {
        // TODO: Once the Intercept Locked feature is implemented, we will need to pass in something like 
        // isInterceptLocked instead of false in the call to self.computeValues.
        const { intercept, rSquared, slope, sdResiduals } = self.computeValues(
          xAttrId, yAttrId, cellKey, dataConfig, instanceKey, false, legendCats[j]
        )
        if (
          (intercept === null && intercept !== 0) ||
          (rSquared === null && rSquared !== 0) ||
          (slope === null && slope !== 0) ||
          (sdResiduals === null && sdResiduals !== 0)
        ) continue
        self.updateLines({intercept, rSquared, slope, sdResiduals}, instanceKey)
      }
    }
  }
}))

export interface ILSRLInstance extends Instance<typeof LSRLInstance> {}
export interface ILSRLAdornmentModel extends Instance<typeof LSRLAdornmentModel> {}
export function isLSRLAdornment(adornment: IAdornmentModel): adornment is ILSRLAdornmentModel {
  return adornment.type === kLSRLType
}
