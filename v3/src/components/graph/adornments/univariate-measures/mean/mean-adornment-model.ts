import { Instance } from "mobx-state-tree"
import { mean } from "mathjs"
import {
  UnivariateMeasureAdornmentModel, IUnivariateMeasureAdornmentModel
} from "../univariate-measure-adornment-model"
import { kMeanType } from "./mean-adornment-types"
import { IDataConfigurationModel } from "../../../../data-display/models/data-configuration-model"
import { ICase } from "../../../../../models/data/data-set-types"

export const MeanAdornmentModel = UnivariateMeasureAdornmentModel
  .named("MeanAdornmentModel")
  .props({
    type: "Mean"
  })
  .views(self => ({
    getMeasureValue(attrId: string, casesInPlot: ICase[], dataConfig: IDataConfigurationModel) {
      const caseValues = self.getCaseValues(attrId, casesInPlot, dataConfig)
      return mean(caseValues)
    }
  }))

export interface IMeanAdornmentModel extends Instance<typeof MeanAdornmentModel> {}
export function isMeanAdornment(adornment: IUnivariateMeasureAdornmentModel): adornment is IMeanAdornmentModel {
  return adornment.type === kMeanType
}
