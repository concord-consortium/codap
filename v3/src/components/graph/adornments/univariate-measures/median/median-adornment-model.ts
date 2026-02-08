import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { median } from "mathjs/number"
import {IGraphDataConfigurationModel} from "../../../models/graph-data-configuration-model"
import { UnivariateMeasureAdornmentModel } from "../univariate-measure-adornment-model"
import { kMedianType, kMedianValueTitleKey } from "./median-adornment-types"
import { IAdornmentModel } from "../../adornment-models"

export const MedianAdornmentModel = UnivariateMeasureAdornmentModel
  .named("MedianAdornmentModel")
  .props({
    type: types.optional(types.literal(kMedianType), kMedianType),
    labelTitle: types.optional(types.literal(kMedianValueTitleKey), kMedianValueTitleKey)
  })
  .views(self => ({
    computeMeasureValue(attrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel) {
      const caseValues = self.getCaseValues(attrId, cellKey, dataConfig)
      if (caseValues.length === 0) return NaN
      return median(caseValues)
    }
  }))

export interface IMedianAdornmentModelSnapshot extends SnapshotIn<typeof MedianAdornmentModel> {}
export interface IMedianAdornmentModel extends Instance<typeof MedianAdornmentModel> {}
export function isMedianAdornment(adornment: IAdornmentModel): adornment is IMedianAdornmentModel {
  return adornment.type === kMedianType
}
