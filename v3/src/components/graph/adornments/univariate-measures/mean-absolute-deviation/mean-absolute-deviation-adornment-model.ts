import { Instance, types } from "mobx-state-tree"
import { mean, mad } from "mathjs"
import {
  UnivariateMeasureAdornmentModel, IUnivariateMeasureAdornmentModel
} from "../univariate-measure-adornment-model"
import { kMeanAbsoluteDeviationKey, kMeanAbsoluteDeviationType } from "./mean-absolute-deviation-adornment-types"
import { IDataConfigurationModel } from "../../../../data-display/models/data-configuration-model"

export const MeanAbsoluteDeviationAdornmentModel = UnivariateMeasureAdornmentModel
  .named("MeanAbsoluteDeviationAdornmentModel")
  .props({
    type: "Mean Absolute Deviation",
    hasRange: true,
    labelTitle: types.optional(types.literal(kMeanAbsoluteDeviationKey), kMeanAbsoluteDeviationKey)
  })
  .views(self => ({
    computeMeasureRange(attrId: string, cellKey: Record<string, string>, dataConfig: IDataConfigurationModel) {
      const caseValues = self.getCaseValues(attrId, cellKey, dataConfig)
      return mad(caseValues)
    },
    computeMeasureValue(attrId: string, cellKey: Record<string, string>, dataConfig: IDataConfigurationModel) {
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
