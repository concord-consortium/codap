import { Instance, types } from "mobx-state-tree"
import { Point } from "../../../data-display/data-display-types"
import { AdornmentModel, IAdornmentModel, IUpdateCategoriesOptions, PointModel } from "../adornment-models"
import { leastSquaresLinearRegression, tAt0975ForDf } from "../../utilities/graph-utils"
import { kLSRLType } from "./lsrl-adornment-types"
import { IGraphDataConfigurationModel } from "../../models/graph-data-configuration-model"
import { ScaleNumericBaseType } from "../../../axis/axis-types"
import { ILineDescription } from "../shared-adornment-types"
import { isFiniteNumber } from "../../../../utilities/math-utils"

interface ILSRLine {
  category?: string
  equationCoords?: Point
  intercept?: number
  rSquared?: number
  slope?: number
  sdResiduals?: number
}

export const LSRLInstance = types.model("LSRLInstance", {
  equationCoords: types.maybe(PointModel)
})
.volatile(() => ({
  category: undefined as string | undefined,
  intercept: undefined as number | undefined,
  rSquared: undefined as number | undefined,
  slope: undefined as number | undefined,
  sdResiduals: undefined as number | undefined
}))
.views(self => ({
  get isValid() {
    return isFinite(Number(self.intercept)) &&
           isFinite(Number(self.rSquared)) &&
           isFinite(Number(self.slope)) &&
           isFinite(Number(self.sdResiduals))
  },
  get slopeAndIntercept() {
    const intercept = self.intercept
    const slope = self.slope
    return {intercept, slope}
  }
}))
.actions(self => ({
  setCategory(category?: string) {
    self.category = category
  },
  setEquationCoords(coords: Point) {
    self.equationCoords = PointModel.create(coords)
  },
  setIntercept(intercept?: number) {
    self.intercept = intercept
  },
  setRSquared(rSquared?: number) {
    self.rSquared = rSquared
  },
  setSlope(slope?: number) {
    self.slope = slope
  },
  setSdResiduals(sdResiduals?: number) {
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
.views(self => ({
  getCaseValues(
    xAttrId: string, yAttrId: string, cellKey: Record<string, string>, dataConfig?: IGraphDataConfigurationModel,
    cat?: string
  ) {
    if (!dataConfig) return []
    const dataset = dataConfig?.dataset
    const legendAttrId = dataConfig?.attributeID("legend")
    const casesInPlot = dataConfig.subPlotCases(cellKey)
    const caseValues: Point[] = []
    casesInPlot.forEach(caseId => {
      const caseValueX = dataset?.getNumeric(caseId, xAttrId)
      const caseValueY = dataset?.getNumeric(caseId, yAttrId)
      const caseValueLegend = dataset?.getValue(caseId, legendAttrId)
      const isValidX = caseValueX && Number.isFinite(caseValueX)
      const isValidY = caseValueY && Number.isFinite(caseValueY)
      const categoryMatch = cat === "__main__" || caseValueLegend === cat
      if (isValidX && isValidY && categoryMatch) {
        caseValues.push({x: caseValueX, y: caseValueY})
      }
    })
    return caseValues
  },
  get lineDescriptions() {
    const lineDescriptions: ILineDescription[] = []
    self.lines.forEach((linesArray, key) => {
      linesArray.forEach(line => {
        const { category, intercept, slope } = line
        if (!isFiniteNumber(intercept) || !isFiniteNumber(slope)) return
        const cellKey = JSON.parse(`${key}`)
        lineDescriptions.push({ category, cellKey, intercept, slope })
      })
    })
    return lineDescriptions
  }
}))
.views(self => ({
  confidenceValues(
    iX: number, caseValues: Point[], cellKey: Record<string, string>, lineIndex: number, isInterceptLocked=false
  ) {
    const lines = self.lines.get(self.instanceKey(cellKey))
    const line = lines?.[lineIndex]
    const { count, mse, xSumSquaredDeviations, xMean } = leastSquaresLinearRegression(caseValues, isInterceptLocked)
    if (
      !line || line.intercept == null || line.slope == null || count == null || mse == null || xMean == null ||
      xSumSquaredDeviations == null
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
    const upperPoints: Point[] = []
    const lowerPoints: Point[] = []
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
  updateLines(line: ILSRLine, key="", index: number) {
    const { category, equationCoords, intercept, rSquared, sdResiduals, slope } = line
    const existingLines = self.lines.get(key)
    const newLines = existingLines ? [...existingLines] : []
    // Remove any pre-existing line in newLines at specified index, otherwise we can end up with duplicates.
    newLines.splice(index, 1)
    const newLine = LSRLInstance.create(line)
    newLine.setCategory(category)
    newLine.setIntercept(intercept)
    newLine.setRSquared(rSquared)
    newLine.setSlope(slope)
    newLine.setSdResiduals(sdResiduals)
    equationCoords && newLine.setEquationCoords(equationCoords)
    newLines[index] = newLine
    self.lines.set(key, newLines)
  },
  setShowConfidenceBands(showConfidenceBands: boolean) {
    self.showConfidenceBands = showConfidenceBands
  },
  computeValues(
    xAttrId: string, yAttrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel,
    isInterceptLocked=false, cat?: string
  ) {
    const caseValues = self.getCaseValues(xAttrId, yAttrId, cellKey, dataConfig, cat)
    const { intercept, rSquared, slope, sdResiduals } = leastSquaresLinearRegression(caseValues, isInterceptLocked)
    return { intercept, rSquared, slope, sdResiduals }
  }
}))
.actions(self => ({
  updateCategories(options: IUpdateCategoriesOptions) {
    const { dataConfig, interceptLocked } = options
    const { xAttrId, yAttrId } = dataConfig.getCategoriesOptions()
    const legendCats = dataConfig?.categoryArrayForAttrRole("legend")
    dataConfig.getAllCellKeys().forEach(cellKey => {
      const instanceKey = self.instanceKey(cellKey)
      const lines = self.lines.get(instanceKey)
      for (let j = 0; j < legendCats.length; ++j) {
        const existingLine = lines?.[j]
        const equationCoords = existingLine?.equationCoords?.isValid()
          ? { x: existingLine.equationCoords.x, y: existingLine.equationCoords.y }
          : undefined
        const category = legendCats[j]
        const { intercept, rSquared, slope, sdResiduals } = self.computeValues(
          xAttrId, yAttrId, cellKey, dataConfig, interceptLocked, category
        )
        self.updateLines({category, equationCoords, intercept, rSquared, slope, sdResiduals}, instanceKey, j)
      }
    })
  }
}))
.views(self => ({
  // Clients should call getLines instead of accessing the lines property directly. getLines will compute and set the
  // values for lines in cases where their volatile properties may have been reset to the defaults. This can happen, for
  // example, when the adornment is added to the graph, then removed and added back again using the undo/redo feature.
  getLines(
    xAttrId: string, yAttrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel,
    interceptLocked=false
  ) {
    const key = self.instanceKey(cellKey)
    const lines = self.lines.get(key)
    const legendCats = dataConfig?.categoryArrayForAttrRole("legend")
    lines?.forEach((line, i) => {
      const existingLine = lines?.[i]
      const equationCoords = existingLine?.equationCoords?.isValid()
        ? { x: existingLine.equationCoords.x, y: existingLine.equationCoords.y }
        : undefined
      if (!line.isValid) {
        const { intercept, rSquared, slope, sdResiduals } = self.computeValues(
          xAttrId, yAttrId, cellKey, dataConfig, interceptLocked, legendCats[i]
        )
        if (
          !Number.isFinite(intercept) ||
          !Number.isFinite(rSquared) ||
          !Number.isFinite(slope) ||
          !Number.isFinite(sdResiduals)
        ) return
        self.updateLines({category: legendCats[i], equationCoords, intercept, rSquared, slope, sdResiduals}, key, i)
      }
    })
    return lines
  }
}))

export interface ILSRLInstance extends Instance<typeof LSRLInstance> {}
export interface ILSRLAdornmentModel extends Instance<typeof LSRLAdornmentModel> {}
export function isLSRLAdornment(adornment: IAdornmentModel): adornment is ILSRLAdornmentModel {
  return adornment.type === kLSRLType
}
