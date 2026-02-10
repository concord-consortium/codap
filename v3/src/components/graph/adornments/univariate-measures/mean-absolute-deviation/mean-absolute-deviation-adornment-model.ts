import { mean } from "mathjs/number"
import { Instance, SnapshotIn, types } from "mobx-state-tree"
import {IGraphDataConfigurationModel} from "../../../models/graph-data-configuration-model"
import { IAdornmentModel } from "../../adornment-models"
import { UnivariateMeasureAdornmentModel } from "../univariate-measure-adornment-model"
import {
  kMeanAbsoluteDeviationValueTitleKey, kMeanAbsoluteDeviationType
} from "./mean-absolute-deviation-adornment-types"

export const MeanAbsoluteDeviationAdornmentModel = UnivariateMeasureAdornmentModel
  .named("MeanAbsoluteDeviationAdornmentModel")
  .props({
    type: types.optional(types.literal(kMeanAbsoluteDeviationType), kMeanAbsoluteDeviationType),
    labelTitle: types.optional(types.literal(kMeanAbsoluteDeviationValueTitleKey), kMeanAbsoluteDeviationValueTitleKey)
  })
  .views(self => ({
    get hasRange() {
      return true
    },
    computeMeasureValue(attrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel) {
      const caseValues = self.getCaseValues(attrId, cellKey, dataConfig)
      if (caseValues.length === 0) return NaN
      return mean(caseValues)
    }
  }))
  .views(self => ({
    computeMeasureRange(attrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel) {
      const caseValues = self.getCaseValues(attrId, cellKey, dataConfig)
      const mad = Number(caseValues.reduce((acc, val) => acc + Math.abs(val - mean(caseValues)), 0) / caseValues.length)
      const meanValue = Number(self.computeMeasureValue(attrId, cellKey, dataConfig))
      const min = meanValue - mad
      const max = meanValue + mad
      return { min, max }
    }
  }))

export interface IMeanAbsoluteDeviationAdornmentModelSnapshot
  extends SnapshotIn<typeof MeanAbsoluteDeviationAdornmentModel> {}
export interface IMeanAbsoluteDeviationAdornmentModel extends Instance<typeof MeanAbsoluteDeviationAdornmentModel> {}
export function isMeanAbsoluteDeviationAdornment(adornment: IAdornmentModel):
  adornment is IMeanAbsoluteDeviationAdornmentModel {
  return adornment.type === kMeanAbsoluteDeviationType
}
