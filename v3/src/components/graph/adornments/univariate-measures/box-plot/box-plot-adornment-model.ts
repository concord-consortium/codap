import { observable } from "mobx"
import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { median } from "mathjs"
import { quantileOfSortedArray } from "../../../../../utilities/math-utils"
import { UnivariateMeasureAdornmentModel } from "../univariate-measure-adornment-model"
import { kBoxPlotType, kBoxPlotValueTitleKey } from "./box-plot-adornment-types"
import { IGraphDataConfigurationModel } from "../../../models/graph-data-configuration-model"
import { IAdornmentModel, IUpdateCategoriesOptions } from "../../adornment-models"

type BoxPlotParamsType = {
  median: number
  lowerQuartile: number
  upperQuartile: number
  iqr: number
  minWhiskerValue: number
  maxWhiskerValue: number
  lowerOutliers: number[]
  upperOutliers: number[]
}

type BoxPlotParamInstance = {
    boxPlotParams: BoxPlotParamsType,
    isValid: boolean
  }

export const BoxPlotAdornmentModel = UnivariateMeasureAdornmentModel
  .named("BoxPlotAdornmentModel")
  .props({
    type: types.optional(types.literal(kBoxPlotType), kBoxPlotType),
    labelTitle: types.optional(types.literal(kBoxPlotValueTitleKey), kBoxPlotValueTitleKey),
    showOutliers: false,
    // showICI can only be set to true when the ICI=yes url parameter is present. But, if present in a saved
    // document, the ICI will be shown.
    showICI: false  // show informal confidence interval
  })
  .volatile(() => ({
    boxPlotParams: observable.map<string, BoxPlotParamInstance>({}),
  }))
  .actions(self => ({
    addBoxPlotParams(boxPlotParams: BoxPlotParamsType, key="{}") {
      const newBoxPlotParam: BoxPlotParamInstance = { boxPlotParams, isValid: true }
      self.boxPlotParams.set(key, newBoxPlotParam)
    },
    updateBoxPlotParams(boxPlotParams: BoxPlotParamsType, key="{}") {
      const boxPlotParam = self.boxPlotParams.get(key)
      if (boxPlotParam) {
        boxPlotParam.boxPlotParams = boxPlotParams
      }
      else {
        this.addBoxPlotParams(boxPlotParams, key)
      }
    },
    removeBoxPlotParam(key: string) {
      self.boxPlotParams.delete(key)
    },
    invalidateBoxPlotParams() {
      self.boxPlotParams.forEach(boxPlotParam => boxPlotParam.isValid = false)
    }
  }))
  .views(() => ({
    get hasRange() {
      return true
    },
    getQuantileValue(quantile: 25 | 75, caseValues: number[]) {
      const sortedCaseValues = caseValues.sort((a, b) => a - b)
      const quantileValue = quantileOfSortedArray(sortedCaseValues, quantile / 100)
      return quantileValue || NaN
    }
  }))
  .views(self => ({
    lowerQuartile(caseValues: number[]) {
      return self.getQuantileValue(25, caseValues)
    },
    upperQuartile(caseValues: number[]) {
      return self.getQuantileValue(75, caseValues)
    },
  }))
  .views(self => ({
    interquartileRange(caseValues: number[]) {
      return self.upperQuartile(caseValues) - self.lowerQuartile(caseValues)
    },
    iqr(attrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel) {
      // BoxPlotAdornmentComponent can more easily access the IQR value by calling this method
      // than by passing in caseValues to interquartileRange.
      const caseValues = self.getCaseValues(attrId, cellKey, dataConfig).filter(v => !Number.isNaN(v))
      return this.interquartileRange(caseValues)
    }
  }))
  .views(self => ({
    computeMeasureRange(attrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel) {
      const caseValues = self.getCaseValues(attrId, cellKey, dataConfig)
      return { min: self.lowerQuartile(caseValues), max: self.upperQuartile(caseValues) }
    },
    computeICIRange(attrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel) {
      const caseValues = self.getCaseValues(attrId, cellKey, dataConfig)
      const medianValue = Number(self.computeMeasureValue(attrId, cellKey, dataConfig))
      const interquartileRange = self.interquartileRange(caseValues)
      const ici = 1.5 * interquartileRange / Math.sqrt(caseValues.length)
      return { min: medianValue - ici, max: medianValue + ici }
    },
    computeBoxPlotParamValues(attrId: string, cellKey: Record<string, string>,
                             dataConfig: IGraphDataConfigurationModel) {
      const caseValues = self.getCaseValues(attrId, cellKey, dataConfig)
      const numValues = caseValues.length
      const interquartileRange = self.interquartileRange(caseValues)
      const lowerQuartile = self.lowerQuartile(caseValues)
      const upperQuartile = self.upperQuartile(caseValues)
      // Returns the minimum value to use in constructing the whisker line. If we're showing outliers, we need to return
      // the lowest non-outlier value since outliers are not part of the line.
      const minWhiskerValue = () =>{
        if (self.showOutliers) {
          // If we're showing outliers, the min is the lowest non-outlier value.
          const min = lowerQuartile - 1.5 * interquartileRange
          return Math.min(...caseValues.filter(v => v >= min))
        }
        return Math.min(...caseValues)
      }
      // Returns the maximum value to use in constructing the whisker line. If we're showing outliers, we need to return
      // the greatest non-outlier value since outliers are not part of the line.
      const maxWhiskerValue = () => {
        if (self.showOutliers) {
          // If we're showing outliers, the max is the highest non-outlier value.
          const max = upperQuartile + 1.5 * interquartileRange
          return Math.max(...caseValues.filter(v => v <= max))
        }
        return Math.max(...caseValues)
      }
      const lowerOutliers = () => {
        const min = lowerQuartile - 1.5 * interquartileRange
        return caseValues.filter(v => v < min).sort((a, b) => a - b)
      }
      const upperOutliers = () => {
        const max = upperQuartile + 1.5 * interquartileRange
        return caseValues.filter(v => v > max).sort((a, b) => a - b)
      }

      const boxPlotParams: BoxPlotParamsType = {
        median: numValues > 0 ? median(caseValues) : NaN,
        lowerQuartile: self.getQuantileValue(25, caseValues),
        upperQuartile: self.getQuantileValue(75, caseValues),
        iqr: self.interquartileRange(caseValues),
        minWhiskerValue: minWhiskerValue(),
        maxWhiskerValue: maxWhiskerValue(),
        lowerOutliers: lowerOutliers(),
        upperOutliers: upperOutliers()
      }
      return boxPlotParams
    }
  }))
  .views(self => ({
    getBoxPlotParams(cellKey: Record<string, string>) {
      const instanceKey = self.instanceKey(cellKey)
      const boxPlotParam = self.boxPlotParams.get(instanceKey)
      return boxPlotParam?.isValid ? boxPlotParam.boxPlotParams : {
        median: NaN,
        lowerQuartile: NaN,
        upperQuartile: NaN,
        iqr: NaN,
        minWhiskerValue: NaN,
        maxWhiskerValue: NaN,
        lowerOutliers: [],
        upperOutliers: []
      }
    },
    // For the following note that the range is inclusive, so we can include cases matching a single value
    getCasesWithValuesInRange(attrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel,
                              min: number, max: number) {
      const dataset = dataConfig.dataset
      const casesInPlot = dataConfig.filterCasesForDisplay(dataConfig.subPlotCases(cellKey))
      return casesInPlot.filter(caseId => {
        const caseValue = dataset?.getNumeric(caseId, attrId)
        return caseValue != null && caseValue >= min && caseValue <= max
      })
    }
  }))
  .actions(self => ({
    setShowOutliers(showOutliers: boolean) {
      self.showOutliers = showOutliers
    },
    setShowICI(showICI: boolean) {
      self.showICI = showICI
    },
    updateCategories(options: IUpdateCategoriesOptions) {
      const { dataConfig, resetPoints } = options
      const { xAttrId, yAttrId, xAttrType } = dataConfig.getCategoriesOptions()
      const attrId = xAttrId && xAttrType === "numeric" ? xAttrId : yAttrId
      dataConfig.getAllCellKeys().forEach(cellKey => {
        const instanceKey = self.instanceKey(cellKey)
        const boxPlotParams = self.computeBoxPlotParamValues(attrId, cellKey, dataConfig)
        if (!self.boxPlotParams.get(instanceKey) || resetPoints) {
          self.addBoxPlotParams(boxPlotParams, instanceKey)
        } else {
          self.updateBoxPlotParams(boxPlotParams, instanceKey)
        }
      })
    }
  }))

export interface IBoxPlotAdornmentModelSnapshot extends SnapshotIn<typeof BoxPlotAdornmentModel> {}
export interface IBoxPlotAdornmentModel extends Instance<typeof BoxPlotAdornmentModel> {}
export function isBoxPlotAdornment(adornment: IAdornmentModel): adornment is IBoxPlotAdornmentModel {
  return adornment.type === kBoxPlotType
}
