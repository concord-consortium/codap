import { Instance } from "mobx-state-tree"
import { median } from "mathjs"
import {
  UnivariateMeasureAdornmentModel, IUnivariateMeasureAdornmentModel
  } from "../univariate-measure-adornment-model"
import { kMedianType } from "./median-adornment-types"
import { IDataConfigurationModel } from "../../../../data-display/models/data-configuration-model"
import { ICase } from "../../../../../models/data/data-set-types"

export const MedianAdornmentModel = UnivariateMeasureAdornmentModel
  .named("MedianAdornmentModel")
  .props({
    type: "Median"
  })
  .views(self => ({
    getMeasureValue(attrId: string, casesInPlot: ICase[], dataConfig: IDataConfigurationModel) {
      const caseValues = self.getCaseValues(attrId, casesInPlot, dataConfig)
      return median(caseValues)
    }
  }))

export interface IMedianAdornmentModel extends Instance<typeof MedianAdornmentModel> {}
export function isMedianAdornment(adornment: IUnivariateMeasureAdornmentModel): adornment is IMedianAdornmentModel {
  return adornment.type === kMedianType
}
