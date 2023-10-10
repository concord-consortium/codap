import { Instance, types } from "mobx-state-tree"
import { mean, std } from "mathjs"
import {
  UnivariateMeasureAdornmentModel, IUnivariateMeasureAdornmentModel
} from "../univariate-measure-adornment-model"
import { kStandardDeviationKey, kStandardDeviationType } from "./standard-deviation-adornment-types"
import { IDataConfigurationModel } from "../../../../data-display/models/data-configuration-model"

export const StandardDeviationAdornmentModel = UnivariateMeasureAdornmentModel
  .named("StandardDeviationAdornmentModel")
  .props({
    type: "Standard Deviation",
    labelTitle: types.optional(types.literal(kStandardDeviationKey), kStandardDeviationKey)
  })
  .views(self => ({
    computeMeasureRange(attrId: string, cellKey: Record<string, string>, dataConfig: IDataConfigurationModel) {
      const caseValues = self.getCaseValues(attrId, cellKey, dataConfig)
      return std(caseValues)
    },
    computeMeasureValue(attrId: string, cellKey: Record<string, string>, dataConfig: IDataConfigurationModel) {
      const caseValues = self.getCaseValues(attrId, cellKey, dataConfig)
      if (caseValues.length === 0) return NaN
      return mean(caseValues)
    }
  }))

export interface IStandardDeviationAdornmentModel extends Instance<typeof StandardDeviationAdornmentModel> {}
export function isStandardDeviationAdornment(adornment: IUnivariateMeasureAdornmentModel):
  adornment is IStandardDeviationAdornmentModel {
  return adornment.type === kStandardDeviationType
}
