import { mean, std } from "mathjs"
import { observable } from "mobx"
import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { IGraphDataConfigurationModel } from "../../../models/graph-data-configuration-model"
import { IAdornmentModel, IUpdateCategoriesOptions } from "../../adornment-models"
import { UnivariateMeasureAdornmentModel } from "../univariate-measure-adornment-model"
import { kNormalCurveValueTitleKey, kNormalCurveType } from "./normal-curve-adornment-types"

type CurveParamInstance = {
    sampleMean: number,
    sampleStdDev: number,
    isValid: boolean
  }

  export const NormalCurveAdornmentModel = UnivariateMeasureAdornmentModel
  .named("NormalCurveAdornmentModel")
  .props({
    type: types.optional(types.literal(kNormalCurveType), kNormalCurveType),
    labelTitle: types.optional(types.literal(kNormalCurveValueTitleKey), kNormalCurveValueTitleKey),
  })
  .volatile(() => ({
    curveParams: observable.map<string, CurveParamInstance>({}),
  }))
  .actions(self => ({
    addCurveParam(sampleMean: number, sampleStdDev: number, key="{}") {
      const newCurveParam = {
        sampleMean,
        sampleStdDev,
        isValid: true
      }
      self.curveParams.set(key, newCurveParam)
    },
    updateCurveParamValues(sampleMean: number, sampleStdDev: number, key="{}") {
      const curveParam = self.curveParams.get(key)
      if (curveParam) {
        curveParam.sampleMean = sampleMean
        curveParam.sampleStdDev = sampleStdDev
      }
      else {
        this.addCurveParam(sampleMean, sampleStdDev, key)
      }
    },
    removeCurveParam(key: string) {
      self.curveParams.delete(key)
    },
    invalidateCurveParams() {
      self.curveParams.forEach(curveParam => curveParam.isValid = false)
    }
  }))
  .views(self => ({
    get labelLines() {
      return 2  // But if it's a gaussian fit it's 3 (or 4 if showing standard error) and we do special handling
    },
    computeMean(attrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel) {
      const caseValues = self.getCaseValues(attrId, cellKey, dataConfig)
      return caseValues.length === 0 ? NaN : mean(self.getCaseValues(attrId, cellKey, dataConfig))
    },
    computeStandardDeviation(attrId: string, cellKey: Record<string, string>,
                             dataConfig: IGraphDataConfigurationModel) {
      const caseValues = self.getCaseValues(attrId, cellKey, dataConfig)
      // Cast to Number should not be necessary, but there appears to be an issue with the mathjs type signature.
      // See https://github.com/josdejong/mathjs/issues/2429 for some history, although that bug is supposedly
      // fixed, but a variant of it seems to be re-occurring.
      return caseValues.length === 0 ? NaN : Number(std(self.getCaseValues(attrId, cellKey, dataConfig)))
    },
    computeStandardError(attrId: string, cellKey: Record<string, string>,
                             dataConfig: IGraphDataConfigurationModel) {
      return this.computeStandardDeviation(attrId, cellKey, dataConfig) /
        Math.sqrt(self.getCaseCount(attrId, cellKey, dataConfig))
    },
    computeHistogram(binAlignment:number, binWidth:number, attrId: string, cellKey: Record<string, string>,
                     dataConfig: IGraphDataConfigurationModel) {
      // binAlignment is the left edge of a bin, not necessarily the first bin
      // The data values are placed in bins with the given binAlignment and binWidth.
      // Return an array of the bin centers and an array of the bin counts.
      const caseValues = self.getCaseValues(attrId, cellKey, dataConfig)
      // Create a map to store counts for each bin
      const binCounts: { [center: number]: number } = {}

      caseValues.forEach(value => {
        // Determine which bin the value belongs to
        const binIndex = Math.floor((value - binAlignment) / binWidth)
        // Calculate the center of the bin
        const binCenter = binAlignment + binIndex * binWidth + binWidth / 2

        // Increment the count for the bin
        if (binCounts[binCenter] === undefined) {
          binCounts[binCenter] = 1
        } else {
          binCounts[binCenter]++
        }
      })

      // Determine the range of bins
      const minValue = Math.min(...caseValues)
      const maxValue = Math.max(...caseValues)
      const minBinIndex = Math.floor((minValue - binAlignment) / binWidth)
      const maxBinIndex = Math.floor((maxValue - binAlignment) / binWidth)

      // Extract the bin centers and counts into an array of objects
      const results: { x:number, y:number}[] = []
      for (let binIndex = minBinIndex; binIndex <= maxBinIndex; binIndex++) {
        const binCenter = binAlignment + binIndex * binWidth + binWidth / 2
        const count = binCounts[binCenter] || 0
        results.push({ x: binCenter, y: count })
      }
      return results
    },
    computeMeasureValue(attrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel) {
      // no-op  but required for the base class
    },
    computeCurveParamValue(attrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel) {
      // We'll store the mean and standard deviation in the measures map, so we can use them to compute the normal curve
      return { sampleMean: this.computeMean(attrId, cellKey, dataConfig),
        sampleStdDev: this.computeStandardDeviation(attrId, cellKey, dataConfig) }
    },
  }))
  .views(self => ({
    getCurveParamValue(cellKey: Record<string, string>) {
      const instanceKey = self.instanceKey(cellKey)
      const curveParam = self.curveParams.get(instanceKey)
      if (curveParam?.isValid) {
        return { sampleMean: curveParam.sampleMean, sampleStdDev: curveParam.sampleStdDev }
      }
      return { sampleMean: NaN, sampleStdDev: NaN }
    }
  }))
  .actions(self => ({
    updateCategories(options: IUpdateCategoriesOptions) {
      const { dataConfig, resetPoints } = options
      const { xAttrId, yAttrId, xAttrType } = dataConfig.getCategoriesOptions()
      const attrId = xAttrId && xAttrType === "numeric" ? xAttrId : yAttrId
      dataConfig.getAllCellKeys().forEach(cellKey => {
        const instanceKey = self.instanceKey(cellKey)
        const { sampleMean, sampleStdDev } = self.computeCurveParamValue(attrId, cellKey, dataConfig)
        if (!self.curveParams.get(instanceKey) || resetPoints) {
          self.addCurveParam(sampleMean, sampleStdDev, instanceKey)
        } else {
          self.updateCurveParamValues(sampleMean, sampleStdDev, instanceKey)
        }
        // We still need to update the measure value since it has the label coordinates
        const value = Number(self.computeMeasureValue(attrId, cellKey, dataConfig))
        if (!self.measures.get(instanceKey) || resetPoints) {
          self.addMeasure(value, instanceKey)
        } else {
          self.updateMeasureValue(value, instanceKey)
        }
      })
    }
  }))

export interface INormalCurveAdornmentModelSnapshot extends SnapshotIn<typeof NormalCurveAdornmentModel> {}
export interface INormalCurveAdornmentModel extends Instance<typeof NormalCurveAdornmentModel> {}
export function isNormalCurveAdornment(adornment: IAdornmentModel): adornment is INormalCurveAdornmentModel {
  return adornment.type === kNormalCurveType
}
