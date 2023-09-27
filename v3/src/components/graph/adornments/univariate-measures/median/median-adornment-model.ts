import { Instance, types } from "mobx-state-tree"
import { median } from "mathjs"
import { UnivariateMeasureAdornmentModel } from "../univariate-measure-adornment-model"
import { kMedianType } from "./median-adornment-types"
import { IDataConfigurationModel } from "../../../../data-display/models/data-configuration-model"
import { IAdornmentModel } from "../../adornment-models"

export const MedianAdornmentModel = UnivariateMeasureAdornmentModel
  .named("MedianAdornmentModel")
  .props({
    type: types.optional(types.literal(kMedianType), kMedianType)
  })
  .views(self => ({
    getMeasureValue(attrId: string, cellKey: Record<string, string>, dataConfig: IDataConfigurationModel) {
      const casesInPlot = dataConfig.subPlotCases(cellKey)
      const caseValues = self.getCaseValues(attrId, casesInPlot, dataConfig)
      return median(caseValues)
    }
  }))

export interface IMedianAdornmentModel extends Instance<typeof MedianAdornmentModel> {}
export function isMedianAdornment(adornment: IAdornmentModel): adornment is IMedianAdornmentModel {
  return adornment.type === kMedianType
}
