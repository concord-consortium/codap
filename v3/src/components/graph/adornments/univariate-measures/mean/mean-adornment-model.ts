import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { mean } from "mathjs/number"
import { UnivariateMeasureAdornmentModel } from "../univariate-measure-adornment-model"
import { kMeanType, kMeanValueTitleKey } from "./mean-adornment-types"
import {IGraphDataConfigurationModel} from "../../../models/graph-data-configuration-model"
import { IAdornmentModel } from "../../adornment-models"

export const MeanAdornmentModel = UnivariateMeasureAdornmentModel
  .named("MeanAdornmentModel")
  .props({
    type: types.optional(types.literal(kMeanType), kMeanType),
    labelTitle: types.optional(types.literal(kMeanValueTitleKey), kMeanValueTitleKey)
  })
  .views(self => ({
    computeMeasureValue(attrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel) {
      const caseValues = self.getCaseValues(attrId, cellKey, dataConfig)
      if (caseValues.length === 0) return NaN
      return mean(caseValues)
    }
  }))

export interface IMeanAdornmentModelSnapshot extends SnapshotIn<typeof MeanAdornmentModel> {}
export interface IMeanAdornmentModel extends Instance<typeof MeanAdornmentModel> {}
export function isMeanAdornment(adornment: IAdornmentModel): adornment is IMeanAdornmentModel {
  return adornment.type === kMeanType
}
