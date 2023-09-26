import { Instance } from "mobx-state-tree"
import { median } from "mathjs"
import {
  UnivariateMeasureAdornmentModel, IUnivariateMeasureAdornmentModel
  } from "../univariate-measure-adornment-model"
import { kMedianType } from "./median-adornment-types"
import { IDataConfigurationModel } from "../../../../data-display/models/data-configuration-model"

export const MedianAdornmentModel = UnivariateMeasureAdornmentModel
  .named("MedianAdornmentModel")
  .props({
    type: "Median"
  })
  .views(self => ({
    getMeasureValue(attrId: string, cellKey: Record<string, string>, dataConfig: IDataConfigurationModel) {
      const casesInPlot = dataConfig.subPlotCases(cellKey)
      const caseValues = self.getCaseValues(attrId, casesInPlot, dataConfig)
      return median(caseValues)
    }
  }))

export interface IMedianAdornmentModel extends Instance<typeof MedianAdornmentModel> {}
export function isMedianAdornment(adornment: IUnivariateMeasureAdornmentModel): adornment is IMedianAdornmentModel {
  return adornment.type === kMedianType
}
