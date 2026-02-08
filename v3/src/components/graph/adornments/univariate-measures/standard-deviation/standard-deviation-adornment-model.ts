import { mean, std } from "mathjs/number"
import { Instance, SnapshotIn, types } from "mobx-state-tree"
import {IGraphDataConfigurationModel} from "../../../models/graph-data-configuration-model"
import { IAdornmentModel } from "../../adornment-models"
import { UnivariateMeasureAdornmentModel } from "../univariate-measure-adornment-model"
import { kStandardDeviationValueTitleKey, kStandardDeviationType } from "./standard-deviation-adornment-types"

export const StandardDeviationAdornmentModel = UnivariateMeasureAdornmentModel
  .named("StandardDeviationAdornmentModel")
  .props({
    type: types.optional(types.literal(kStandardDeviationType), kStandardDeviationType),
    labelTitle: types.optional(types.literal(kStandardDeviationValueTitleKey), kStandardDeviationValueTitleKey)
  })
  .views(self => ({
    get hasRange() {
      return true
    },
    computeMeasureValue(attrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel) {
      const caseValues = self.getCaseValues(attrId, cellKey, dataConfig)
      // If there are less than two values, the adornment should not render.
      if (caseValues.length < 2) return
      return mean(caseValues)
    }
  }))
  .views(self => ({
    computeMeasureRange(attrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel) {
      const caseValues = self.getCaseValues(attrId, cellKey, dataConfig)
      // If there are less than two values, the adornment should not render.
      if (caseValues.length < 2) return
      const standardDeviation = Number(std(caseValues))
      const meanValue = Number(self.computeMeasureValue(attrId, cellKey, dataConfig))
      const min = meanValue - standardDeviation
      const max = meanValue + standardDeviation
      return { min, max }
    }
  }))

export interface IStandardDeviationAdornmentModelSnapshot extends SnapshotIn<typeof StandardDeviationAdornmentModel> {}
export interface IStandardDeviationAdornmentModel extends Instance<typeof StandardDeviationAdornmentModel> {}
export function isStandardDeviationAdornment(adornment: IAdornmentModel):
  adornment is IStandardDeviationAdornmentModel {
  return adornment.type === kStandardDeviationType
}
