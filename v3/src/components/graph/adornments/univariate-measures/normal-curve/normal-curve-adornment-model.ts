import { Instance, types } from "mobx-state-tree"
import { mean, std } from "mathjs"
import {IGraphDataConfigurationModel} from "../../../models/graph-data-configuration-model"
import { UnivariateMeasureAdornmentModel, IUnivariateMeasureAdornmentModel }
  from "../univariate-measure-adornment-model"
import { kNormalCurveValueTitleKey, kNormalCurveType } from "./normal-curve-adornment-types"

export const NormalCurveAdornmentModel = UnivariateMeasureAdornmentModel
  .named("NormalCurveAdornmentModel")
  .props({
    type: types.optional(types.literal(kNormalCurveType), kNormalCurveType),
    labelTitle: types.optional(types.literal(kNormalCurveValueTitleKey), kNormalCurveValueTitleKey),
  })
  .views(self => ({
    computeMean(attrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel) {
      return mean(self.getCaseValues(attrId, cellKey, dataConfig))
    },
    computeStandardDeviation(attrId: string, cellKey: Record<string, string>,
                             dataConfig: IGraphDataConfigurationModel) {
      return Number(std(self.getCaseValues(attrId, cellKey, dataConfig)))
    },
    computeStandardError(attrId: string, cellKey: Record<string, string>,
                             dataConfig: IGraphDataConfigurationModel) {
      return this.computeStandardDeviation(attrId, cellKey, dataConfig) /
        Math.sqrt(self.getCaseCount(attrId, cellKey, dataConfig))
    },
  }))

export interface INormalCurveAdornmentModel extends Instance<typeof NormalCurveAdornmentModel> {}
export function isNormalCurveAdornment(adornment: IUnivariateMeasureAdornmentModel):
  adornment is INormalCurveAdornmentModel {
  return adornment.type === kNormalCurveType
}
