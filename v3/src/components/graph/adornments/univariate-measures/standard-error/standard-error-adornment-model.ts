import { mean, std } from "mathjs/number"
import { Instance, SnapshotIn, types } from "mobx-state-tree"
import {IGraphDataConfigurationModel} from "../../../models/graph-data-configuration-model"
import { IAdornmentModel } from "../../adornment-models"
import { UnivariateMeasureAdornmentModel } from "../univariate-measure-adornment-model"
import { kStandardErrorValueTitleKey, kStandardErrorType } from "./standard-error-adornment-types"

export const StandardErrorAdornmentModel = UnivariateMeasureAdornmentModel
  .named("StandardErrorAdornmentModel")
  .props({
    type: types.optional(types.literal(kStandardErrorType), kStandardErrorType),
    labelTitle: types.optional(types.literal(kStandardErrorValueTitleKey), kStandardErrorValueTitleKey),
    _numStErrs: types.optional(types.number, 1)
  })
  .volatile(self => ({
    dynamicNumStErrs: undefined as number | undefined
  }))
  .actions(self => ({
    setNumStErrs(numStErrs: number) {
      self._numStErrs = numStErrs
      self.dynamicNumStErrs = undefined
      self.invalidateMeasures()
    },
    setDynamicNumStErrs(numStErrs: number | undefined) {
      self.dynamicNumStErrs = numStErrs
      self.invalidateMeasures()
    }
  }))
  .views(self => ({
    get numStErrs() {
      return self.dynamicNumStErrs ?? self._numStErrs
    },
    get hasRange() {
      return true
    },
  }))
  .views(self => ({
    computeMeasureValue(attrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel) {
      // The measure value is the standard error of the mean.
      const caseValues = self.getCaseValues(attrId, cellKey, dataConfig)
      // If there are less than two values, the adornment should not render.
      if (caseValues.length < 2) return
      return Number(std(caseValues)) / Math.sqrt(caseValues.length)
    }
  }))
  .views(self => ({
    computeMeasureRange(attrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel) {
      const caseValues = self.getCaseValues(attrId, cellKey, dataConfig)
      // If there are less than two values, the adornment should not render.
      if (caseValues.length < 2) return { min: NaN, max: NaN }
      const meanValue = mean(caseValues)
      const standardErrors = self.numStErrs * Number(self.computeMeasureValue(attrId, cellKey, dataConfig))
      const min = meanValue - standardErrors
      const max = meanValue + standardErrors
      return { min, max }
    }
  }))

export interface IStandardErrorAdornmentModelSnapshot extends SnapshotIn<typeof StandardErrorAdornmentModel> {}
export interface IStandardErrorAdornmentModel extends Instance<typeof StandardErrorAdornmentModel> {}
export function isStandardErrorAdornment(adornment: IAdornmentModel | undefined):
  adornment is IStandardErrorAdornmentModel {
  return adornment ? adornment.type === kStandardErrorType : false
}
