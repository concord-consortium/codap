import { getSnapshot, Instance, SnapshotIn, types } from "mobx-state-tree"
import { isFiniteNumber } from "../../../../utilities/math-utils"
import { ScaleNumericBaseType } from "../../../axis/axis-types"
import { kMain, Point } from "../../../data-display/data-display-types"
import { dataDisplayGetNumericValue } from "../../../data-display/data-display-value-utils"
import { IGraphDataConfigurationModel } from "../../models/graph-data-configuration-model"
import { leastSquaresLinearRegression, tAt0975ForDf } from "../../utilities/graph-utils"
import { AdornmentModel, IAdornmentModel, IUpdateCategoriesOptions, PointModel } from "../adornment-models"
import { ILineDescription } from "../shared-adornment-types"
import { kLSRLType } from "./lsrl-adornment-types"

const kDefaultLabelHeight = 60

interface ILSRLineSnap extends ILSRLInstanceSnapshot {
  category?: string
  intercept?: number
  rSquared?: number
  slope?: number
  sdResiduals?: number
}

interface IExtents {
  labelWidth?: number
  labelHeight?: number
  plotWidth: number
  plotHeight: number
}

export const LSRLInstance = types.model("LSRLInstance", {
  // interpreted as proportional position of the center of the label in cell coordinates
  equationCoords: types.maybe(PointModel),
  // v2 used an iterative process which incorrectly factored in the plot height
  isV2Coords: types.maybe(types.boolean)
})
.volatile(() => ({
  category: undefined as Maybe<string>,
  intercept: undefined as Maybe<number>,
  rSquared: undefined as Maybe<number>,
  slope: undefined as Maybe<number>,
  sdResiduals: undefined as Maybe<number>,
  // used for coordinate transformations and exporting to v2
  labelWidth: undefined as Maybe<number>,
  labelHeight: undefined as Maybe<number>,
  plotWidth: undefined as Maybe<number>,
  plotHeight: undefined as Maybe<number>
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
  get v2ToV3AdjustedHeight() {
    const rawLabelHeight = self.labelHeight ?? kDefaultLabelHeight
    if (!self.plotHeight || !self.equationCoords || !self.isV2Coords) return rawLabelHeight
    const { y: yProportion } = self.equationCoords
    // v2 used an iterative process which incorrectly factored in the plot height
    const diffHeight = self.plotHeight - rawLabelHeight
    return rawLabelHeight + (1 - yProportion) * diffHeight * 2
  }
}))
.views(self => ({
  get labelPosition() {
    if (!self.equationCoords || !self.plotWidth || !self.plotHeight) return

    const { x: xProportion, y: yProportion } = self.equationCoords
    const labelWidthProportion = xProportion <= 0.5 ? 2 * xProportion : 2 * (1 - xProportion)
    const kDefaultLabelWidth = labelWidthProportion * self.plotWidth + (self.isV2Coords ? 3 : 0)
    const labelWidth = self.labelWidth ?? kDefaultLabelWidth
    // apply correction factor for values imported from v2
    const labelHeight = self.v2ToV3AdjustedHeight
    return {
      left: xProportion * self.plotWidth - labelWidth / 2,
      top: yProportion * self.plotHeight - labelHeight / 2
    }
  },
  get v2ExportCoords() {
    if (!self.equationCoords) return
    const { x: proportionCenterX, y: proportionCenterY } = self.equationCoords
    const v2Coords = { proportionCenterX, proportionCenterY }
    if (self.isV2Coords || !self.plotHeight) return v2Coords

    const labelHeight = self.labelHeight ?? kDefaultLabelHeight
    const heightDiff = self.plotHeight - labelHeight
    // reverse the correction factor used when importing from v2
    const _proportionCenterY = (proportionCenterY * self.plotHeight + heightDiff) / (self.plotHeight + heightDiff)
    return {
      proportionCenterX,
      proportionCenterY: _proportionCenterY
    }
  }
}))
.actions(self => ({
  setCategory(category?: string) {
    self.category = category
  },
  // interpreted as proportional position of the center of the label in cell coordinates
  setEquationCoords(coords: Point) {
    self.equationCoords = PointModel.create(coords)
    self.isV2Coords = undefined
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
  setExtents({ labelWidth, labelHeight, plotWidth, plotHeight }: IExtents) {
    if (labelWidth) self.labelWidth = labelWidth
    if (labelHeight) self.labelHeight = labelHeight
    self.plotWidth = plotWidth
    self.plotHeight = plotHeight
  }
}))

function createLSRLInstance(line: ILSRLineSnap) {
  const instance = LSRLInstance.create(line)
  instance.setCategory(line.category)
  instance.setIntercept(line.intercept)
  instance.setSlope(line.slope)
  instance.setRSquared(line.rSquared)
  instance.setSdResiduals(line.sdResiduals)
  return instance
}

export const LSRLAdornmentModel = AdornmentModel
.named("LSRLAdornmentModel")
.props({
  type: types.optional(types.literal(kLSRLType), kLSRLType),
  // first key is cell key; second key is legend category (or kMain)
  lines: types.map(types.map(LSRLInstance)),
  showConfidenceBands: false
})
.views(self => ({
  // each cell contains a map of lines, where the key is the legend category (or kMain)
  firstLineInstance(category = kMain): Maybe<ILSRLInstance> {
    return self.lines.values().next().value?.get(category)
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
      const isValidX = caseValueX && Number.isFinite(caseValueX)
      const isValidY = caseValueY && Number.isFinite(caseValueY)
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
      self.lines.set(key, {})
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
    return { intercept, rSquared, slope, sdResiduals }
  }
}))
.actions(self => ({
  updateCategories(options: IUpdateCategoriesOptions) {
    const { dataConfig, interceptLocked } = options
    const { xAttrId, yAttrId } = dataConfig.getCategoriesOptions()
    const legendCats = self.getLegendCategories(dataConfig)
    dataConfig.getAllCellKeys().forEach(cellKey => {
      const instanceKey = self.instanceKey(cellKey)
      const lines = self.lines.get(instanceKey)
      legendCats.forEach(legendCat => {
        const existingLine = lines?.get(legendCat)
        const existingLineProps = existingLine ? getSnapshot(existingLine) : undefined
        const { intercept, rSquared, slope, sdResiduals } = self.computeValues(
          xAttrId, yAttrId, cellKey, dataConfig, interceptLocked, legendCat
        )
        const lineProps = { ...existingLineProps, category: legendCat, intercept, rSquared, slope, sdResiduals }
        self.updateLines(lineProps, instanceKey, legendCat)
      })
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
    const linesInCell = self.lines.get(key)
    const legendCats = self.getLegendCategories(dataConfig)
    legendCats.forEach(legendCat => {
      const existingLine = linesInCell?.get(legendCat)
      const equationCoords = existingLine?.equationCoords
        ? getSnapshot(existingLine.equationCoords)
        : undefined
      if (!existingLine?.isValid) {
        const { intercept, rSquared, slope, sdResiduals } = self.computeValues(
          xAttrId, yAttrId, cellKey, dataConfig, interceptLocked, legendCat
        )
        if (
          !Number.isFinite(intercept) ||
          !Number.isFinite(rSquared) ||
          !Number.isFinite(slope) ||
          !Number.isFinite(sdResiduals)
        ) return
        self.updateLines({category: legendCat, equationCoords, intercept, rSquared, slope, sdResiduals}, key, legendCat)
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
