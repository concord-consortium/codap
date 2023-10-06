import { Instance, types } from "mobx-state-tree"
import { mean } from "mathjs"
import { UnivariateMeasureAdornmentModel } from "../univariate-measure-adornment-model"
import { kMeanType } from "./mean-adornment-types"
import { IDataConfigurationModel } from "../../../../data-display/models/data-configuration-model"
import { IAdornmentModel } from "../../adornment-models"

export const MeanAdornmentModel = UnivariateMeasureAdornmentModel
  .named("MeanAdornmentModel")
  .props({
    type: types.optional(types.literal(kMeanType), kMeanType)
  })
  .views(self => ({
    computeMeasureValue(attrId: string, cellKey: Record<string, string>, dataConfig: IDataConfigurationModel) {
      const caseValues = self.getCaseValues(attrId, cellKey, dataConfig)
      if (caseValues.length === 0) return NaN
      return mean(caseValues)
    }
  }))

export interface IMeanAdornmentModel extends Instance<typeof MeanAdornmentModel> {}
export function isMeanAdornment(adornment: IAdornmentModel): adornment is IMeanAdornmentModel {
  return adornment.type === kMeanType
}
