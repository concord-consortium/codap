import { Instance, types } from "mobx-state-tree"
import { median } from "mathjs"
import { UnivariateMeasureAdornmentModel } from "../univariate-measure-adornment-model"
import { kBoxPlotType, kBoxPlotValueTitleKey } from "./box-plot-adornment-types"
import { IGraphDataConfigurationModel } from "../../../models/graph-data-configuration-model"
import { IAdornmentModel } from "../../adornment-models"

export const BoxPlotAdornmentModel = UnivariateMeasureAdornmentModel
  .named("BoxPlotAdornmentModel")
  .props({
    type: types.optional(types.literal(kBoxPlotType), kBoxPlotType),
    labelTitle: types.optional(types.literal(kBoxPlotValueTitleKey), kBoxPlotValueTitleKey),
    showOutliers: types.optional(types.boolean, false)
  })
  .views(() => ({
    get hasRange() {
      return true
    },
    getQuantileValue(quantile: number, caseValues: number[]) {
      if (caseValues.length === 0) return NaN
      const sortedCaseValues = caseValues.sort((a, b) => a - b)
      const lastIndex = sortedCaseValues.length - 1
      const i = lastIndex * quantile / 100
      const i1 = Math.floor(i)
      const i2 = Math.ceil(i)
      const fraction = i - i1

      if (i < 0) {
        return 0 // length === 0, or quantile < 0.0
      } else if (i >= lastIndex) {
        return sortedCaseValues[lastIndex] // quantile >= 1.0
      } else if (i === i1) {
        return sortedCaseValues[i1] // quantile falls on data value exactly
      } else {
        // quantile between two data values;
        // note that quantile algorithms vary on method used to get value here, there is no fixed standard.
        return (sortedCaseValues[i2] * fraction + sortedCaseValues[i1] * (1.0 - fraction))
      }
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
  }))
  .views(self => ({
    // Returns the minimum value to use in constructing the whisker line. If we're showing outliers, we need to return
    // the lowest non-outlier value since outliers are not part of the line.
    minWhiskerValue(attrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel) {
      const caseValues = self.getCaseValues(attrId, cellKey, dataConfig).filter(v => !Number.isNaN(v))
      if (self.showOutliers) {
        // If we're showing outliers, the min is the lowest non-outlier value.
        const interquartileRange = self.interquartileRange(caseValues)
        const lowerQuartile = self.lowerQuartile(caseValues)
        const min = lowerQuartile - 1.5 * interquartileRange
        return Math.min(...caseValues.filter(v => v >= min))
      }
      return Math.min(...caseValues)
    },
    // Returns the maximum value to use in constructing the whisker line. If we're showing outliers, we need to return
    // the greatest non-outlier value since outliers are not part of the line.
    maxWhiskerValue(attrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel) {
      const caseValues = self.getCaseValues(attrId, cellKey, dataConfig).filter(v => !Number.isNaN(v))
      if (self.showOutliers) {
        // If we're showing outliers, the max is the highest non-outlier value.
        const interquartileRange = self.interquartileRange(caseValues)
        const upperQuartile = self.upperQuartile(caseValues)
        const max = upperQuartile + 1.5 * interquartileRange
        return Math.max(...caseValues.filter(v => v <= max))
      }
      return Math.max(...caseValues)
    },
    computeMeasureValue(attrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel) {
      const caseValues = self.getCaseValues(attrId, cellKey, dataConfig)
      if (caseValues.length === 0) return NaN
      return median(caseValues)
    }
  }))
  .views(self => ({
    computeMeasureRange(attrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel) {
      const caseValues = self.getCaseValues(attrId, cellKey, dataConfig)
      return { min: self.lowerQuartile(caseValues), max: self.upperQuartile(caseValues) }
    },
    lowerOutliers(attrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel) {
      const caseValues = self.getCaseValues(attrId, cellKey, dataConfig)
      const interquartileRange = self.interquartileRange(caseValues)
      const lowerQuartile = self.lowerQuartile(caseValues)
      const min = lowerQuartile - 1.5 * interquartileRange
      return caseValues.filter(v => v < min).sort((a, b) => a - b)
    },
    upperOutliers(attrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel) {
      const caseValues = self.getCaseValues(attrId, cellKey, dataConfig)
      const interquartileRange = self.interquartileRange(caseValues)
      const upperQuartile = self.upperQuartile(caseValues)
      const max = upperQuartile + 1.5 * interquartileRange
      return caseValues.filter(v => v > max).sort((a, b) => a - b)
    }
  }))
  .actions(self => ({
    setShowOutliers(showOutliers: boolean) {
      self.showOutliers = showOutliers
    }
  }))

export interface IBoxPlotAdornmentModel extends Instance<typeof BoxPlotAdornmentModel> {}
export function isBoxPlotAdornment(adornment: IAdornmentModel): adornment is IBoxPlotAdornmentModel {
  return adornment.type === kBoxPlotType
}
