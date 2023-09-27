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
    getMeasureValue(attrId: string, cellKey: Record<string, string>, dataConfig: IDataConfigurationModel) {
      const casesInPlot = dataConfig.subPlotCases(cellKey)
      const caseValues = self.getCaseValues(attrId, casesInPlot, dataConfig)
      return mean(caseValues)
    }
  }))

export interface IMeanAdornmentModel extends Instance<typeof MeanAdornmentModel> {}
export function isMeanAdornment(adornment: IAdornmentModel): adornment is IMeanAdornmentModel {
  return adornment.type === kMeanType
}
