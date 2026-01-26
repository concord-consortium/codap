import { getSnapshot, Instance, SnapshotIn, types } from "mobx-state-tree"
import { isFiniteNumber } from "../../../../utilities/math-utils"
import { linRegrStdErrSlopeAndIntercept } from "../../../../utilities/stats-utils"
import { ScaleNumericBaseType } from "../../../axis/axis-types"
import { kMain, Point } from "../../../data-display/data-display-types"
import { dataDisplayGetNumericValue } from "../../../data-display/data-display-value-utils"
import { IGraphDataConfigurationModel } from "../../models/graph-data-configuration-model"
import { leastSquaresLinearRegression, tAt0975ForDf } from "../../utilities/graph-utils"
import { AdornmentModel, IAdornmentModel, IUpdateCategoriesOptions } from "../adornment-models"
import { ILineLabelInstance, LineLabelInstance } from "../line-label-instance"
import { ILineDescription } from "../shared-adornment-types"
import { kLSRLType } from "./lsrl-adornment-types"

interface ILSRLineSnap extends ILSRLInstanceSnapshot {
  category?: string
  intercept?: number
  rSquared?: number
  slope?: number
  sdResiduals?: number
  seSlope?: number
  seIntercept?: number
}

export const LSRLInstance = types.model("LSRLInstance", {})
.volatile(() => ({
  category: undefined as Maybe<string>,
  intercept: undefined as Maybe<number>,
  rSquared: undefined as Maybe<number>,
  slope: undefined as Maybe<number>,
  sdResiduals: undefined as Maybe<number>,
  seSlope: undefined as Maybe<number>,
  seIntercept: undefined as Maybe<number>
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
  },
  get seSlopeAndSeIntercept() {
    const seSlope = self.seSlope
    const seIntercept = self.seIntercept
    return {seSlope, seIntercept}
  }
}))
.actions(self => ({
  setCategory(category?: string) {
    self.category = category
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
  },
  setSeSlope(seSlope?: number) {
    self.seSlope = seSlope
  },
  setSeIntercept(seIntercept?: number) {
    self.seIntercept = seIntercept
  }
}))

function createLSRLInstance(line: ILSRLineSnap) {
  const instance = LSRLInstance.create(line)
  instance.setCategory(line.category)
  instance.setIntercept(line.intercept)
  instance.setSlope(line.slope)
  instance.setRSquared(line.rSquared)
  instance.setSdResiduals(line.sdResiduals)
  instance.setSeSlope(line.seSlope)
  instance.setSeIntercept(line.seIntercept)
  return instance
}

export const LSRLAdornmentModel = AdornmentModel
.named("LSRLAdornmentModel")
.props({
  type: types.optional(types.literal(kLSRLType), kLSRLType),
  // first key is cell key; second key is legend category (or kMain)
  labels: types.map(types.map(LineLabelInstance)),
  showConfidenceBands: false,
})
.volatile(() => ({
  // first key is cell key; second key is legend category (or kMain)
  lines: new Map<string, Map<string, ILSRLInstance>>(),
  // Used for notification
  changeCount: 0
}))
.views(self => ({
  // each cell contains a map of lines, where the key is the legend category (or kMain)
  firstLineInstance(category = kMain): Maybe<ILSRLInstance> {
    return self.lines.values().next().value?.get(category)
  },
  // each cell contains a map of lines, where the key is the legend category (or kMain)
  firstLabelInstance(category = kMain): Maybe<ILineLabelInstance> {
    return self.labels.values().next().value?.get(category)
  },
  getCaseValues(
    xAttrId: string, yAttrId: string, cellKey: Record<string, string>, dataConfig?: IGraphDataConfigurationModel,
    cat?: string
  ) {
    if (!dataConfig) return []
    const dataset = dataConfig?.dataset
    const legendAttrId = dataConfig?.attributeID("legend")
    const casesInPlot = dataConfig?.filterCasesForDisplay(dataConfig.subPlotCases(cellKey))
    const caseValues: Point[] = []
    casesInPlot.forEach(caseId => {
      const caseValueX = dataDisplayGetNumericValue(dataset, caseId, xAttrId)
      const caseValueY = dataDisplayGetNumericValue(dataset, caseId, yAttrId)
      const caseValueLegend = dataset?.getValue(caseId, legendAttrId)
      const isValidX = isFiniteNumber(caseValueX)
      const isValidY = isFiniteNumber(caseValueY)
      const categoryMatch = cat === kMain || caseValueLegend === cat
      if (isValidX && isValidY && categoryMatch) {
        caseValues.push({x: caseValueX, y: caseValueY})
      }
    })
    return caseValues
  },
  getLegendCategories(dataConfig: IGraphDataConfigurationModel) {
    return dataConfig.categoryArrayForAttrRole("legend")
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
    iX: number, caseValues: Point[], cellKey: Record<string, string>, legendCat = kMain, isInterceptLocked = false
  ) {
    const line = self.lines.get(self.instanceKey(cellKey))?.get(legendCat)
    const { count, mse, xSumSquaredDeviations, xMean } = leastSquaresLinearRegression(caseValues, isInterceptLocked)
    if (
      line?.intercept == null || line.slope == null || count == null || mse == null || xMean == null ||
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
    xScale: ScaleNumericBaseType, yScale: ScaleNumericBaseType, cellKey: Record<string, string>, legendCat = kMain
  ) {
    const upperPoints: Point[] = []
    const lowerPoints: Point[] = []
    for (let pixelX = min; pixelX <= max; pixelX += gap) {
      const tX = xScale.invert(pixelX * xCellCount)
      const tYValues = self.confidenceValues(tX, caseValues, cellKey, legendCat)
      if (!tYValues) continue
      upperPoints.push({ x: pixelX, y: yScale(tYValues.upper) / yCellCount })
      lowerPoints.unshift({ x: pixelX, y: yScale(tYValues.lower) / yCellCount })
    }
    return { upperPoints, lowerPoints }
  }
}))
.actions(self => ({
  updateLines(line: ILSRLineSnap, key: string, legendCat = kMain) {
    let linesInCell = self.lines.get(key)
    if (!linesInCell) {
      self.lines.set(key, new Map<string, ILSRLInstance>())
      linesInCell = self.lines.get(key)!
    }
    linesInCell.set(legendCat, createLSRLInstance(line))
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
    const { stdErrSlope, stdErrIntercept } = self.showConfidenceBands ? linRegrStdErrSlopeAndIntercept(caseValues) : {}

    return { intercept, rSquared, slope, sdResiduals, stdErrSlope, stdErrIntercept }
  },
  incrementChangeCount() {
    self.changeCount++
  }
}))
.actions(self => ({
  updateCategories(options: IUpdateCategoriesOptions) {
    const { dataConfig, interceptLocked } = options
    const { xAttrId, yAttrId } = dataConfig.getCategoriesOptions()
    const legendCats = self.getLegendCategories(dataConfig)
    const legendCatsSet = new Set(legendCats)
    const validCellKeys = new Set<string>()

    dataConfig.getAllCellKeys().forEach(cellKey => {
      const instanceKey = self.instanceKey(cellKey)
      validCellKeys.add(instanceKey)
      const lines = self.lines.get(instanceKey)
      const labels = self.labels.get(instanceKey)

      // Remove lines and labels for categories that are no longer valid
      for (const map of [lines, labels]) {
        if (map) {
          const keysToRemove: string[] = []
          // String() is needed because MST types.map keys are typed as `string | number`
          map.forEach((_, category) => {
            const key = String(category)
            if (!legendCatsSet.has(key)) {
              keysToRemove.push(key)
            }
          })
          keysToRemove.forEach(key => map.delete(key))
        }
      }

      legendCats.forEach(legendCat => {
        const existingLine = lines ? lines.get(legendCat) : undefined
        const existingLineProps = existingLine ? getSnapshot(existingLine) : undefined
        const { intercept, rSquared, slope, sdResiduals, stdErrSlope, stdErrIntercept } = self.computeValues(
          xAttrId, yAttrId, cellKey, dataConfig, interceptLocked, legendCat
        )
        const lineProps = { ...existingLineProps, category: legendCat, intercept, rSquared, slope, sdResiduals,
          seSlope: stdErrSlope, seIntercept: stdErrIntercept }
        self.updateLines(lineProps, instanceKey, legendCat)
      })
    })

    // Remove lines and labels for cell keys that are no longer valid
    const cellKeysToRemove: string[] = []
    self.lines.forEach((_, cellKey) => {
      if (!validCellKeys.has(cellKey)) {
        cellKeysToRemove.push(cellKey)
      }
    })
    cellKeysToRemove.forEach(key => self.lines.delete(key))
    const labelKeysToRemove: string[] = []
    // MST types.map forEach types keys as `string | number`, but keys are always strings
    self.labels.forEach((_, cellKey) => {
      const key = String(cellKey)
      if (!validCellKeys.has(key)) {
        labelKeysToRemove.push(key)
      }
    })
    labelKeysToRemove.forEach(key => self.labels.delete(key))

    self.incrementChangeCount()
  },
  setLabel(cellKey: Record<string, string>, category: string, label: ILineLabelInstance) {
    const key = self.instanceKey(cellKey)
    let labelsInCell = self.labels.get(key)
    if (!labelsInCell) {
      self.labels.set(key, {})
      labelsInCell = self.labels.get(key)!
    }
    labelsInCell.set(category, label)
  },
  setLabelEquationCoords(cellKey: Record<string, string>, category: string, equationCoords: Point) {
    const key = self.instanceKey(cellKey)
    const labelsInCell = self.labels.get(key)
    let label = labelsInCell ? labelsInCell.get(category) : undefined
    if (!label) {
      label = LineLabelInstance.create({ equationCoords: { x: 0, y: 0 } })
      this.setLabel(cellKey, category, label)
    }
    label.setEquationCoords(equationCoords)
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
    const linesInCell = self.lines.get(key)
    const legendCats = self.getLegendCategories(dataConfig)
    legendCats.forEach(legendCat => {
      const existingLine = linesInCell ? linesInCell.get(legendCat) : undefined
      if (!existingLine?.isValid) {
        const { intercept, rSquared, slope, sdResiduals, stdErrSlope, stdErrIntercept } =
          self.computeValues(xAttrId, yAttrId, cellKey, dataConfig, interceptLocked, legendCat)
        if (
          !Number.isFinite(intercept) ||
          !Number.isFinite(rSquared) ||
          !Number.isFinite(slope) ||
          !Number.isFinite(sdResiduals)
        ) return
        self.updateLines({category: legendCat, intercept, rSquared, slope, sdResiduals,
          seSlope: stdErrSlope, seIntercept: stdErrIntercept }, key, legendCat)
      }
    })
    return linesInCell
  }
}))

export interface ILSRLInstanceSnapshot extends SnapshotIn<typeof LSRLInstance> {}
export interface ILSRLInstance extends Instance<typeof LSRLInstance> {}
export interface ILSRLAdornmentModelSnapshot extends SnapshotIn<typeof LSRLAdornmentModel> {}
export interface ILSRLAdornmentModel extends Instance<typeof LSRLAdornmentModel> {}
export function isLSRLAdornment(adornment: IAdornmentModel): adornment is ILSRLAdornmentModel {
  return adornment.type === kLSRLType
}
