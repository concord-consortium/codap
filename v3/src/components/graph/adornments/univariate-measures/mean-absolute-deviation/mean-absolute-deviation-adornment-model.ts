import { Instance, types } from "mobx-state-tree"
import { mean } from "mathjs"
import {IGraphDataConfigurationModel} from "../../../models/graph-data-configuration-model"
import {
  UnivariateMeasureAdornmentModel, IUnivariateMeasureAdornmentModel
} from "../univariate-measure-adornment-model"
import { kMeanAbsoluteDeviationValueTitleKey,
         kMeanAbsoluteDeviationType } from "./mean-absolute-deviation-adornment-types"

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
    computeMeasureRange(attrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel) {
      const caseValues = self.getCaseValues(attrId, cellKey, dataConfig)
      const mad = caseValues.reduce((acc, val) => acc + Math.abs(val - mean(caseValues)), 0) / caseValues.length
      return mad
    },
    computeMeasureValue(attrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel) {
      const caseValues = self.getCaseValues(attrId, cellKey, dataConfig)
      if (caseValues.length === 0) return NaN
      return mean(caseValues)
    }
  }))

export interface IMeanAbsoluteDeviationAdornmentModel extends Instance<typeof MeanAbsoluteDeviationAdornmentModel> {}
export function isMeanAbsoluteDeviationAdornment(adornment: IUnivariateMeasureAdornmentModel):
  adornment is IMeanAbsoluteDeviationAdornmentModel {
  return adornment.type === kMeanAbsoluteDeviationType
}
