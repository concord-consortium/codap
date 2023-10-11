import { Instance, types } from "mobx-state-tree"
import { mean } from "mathjs"
import { IAdornmentModel } from "../../adornment-models"
import { kPlottedValueType, kPlottedValueValueTitleKey } from "./plotted-value-adornment-types"
import { IDataConfigurationModel } from "../../../../data-display/models/data-configuration-model"
import { UnivariateMeasureAdornmentModel } from "../univariate-measure-adornment-model"

export const PlottedValueAdornmentModel = UnivariateMeasureAdornmentModel
  .named("PlottedValueAdornmentModel")
  .props({
    type: "Plotted Value",
    expression: types.maybe(types.string),
    labelTitle: types.optional(types.literal(kPlottedValueValueTitleKey), kPlottedValueValueTitleKey)
  })
  .views(self => ({
    evalFnString(fnString: string, caseValues: number[]) {
      if (Number.isFinite(Number(self.expression))) return Number(self.expression)
      if (caseValues.length === 0) return NaN
      // As a proof-of-concept placeholder, we for now always return the mean of case values no matter
      // what the fnString values is.
      return mean(caseValues)
    },
  }))
  .views(self => ({
    computeMeasureValue(attrId: string, cellKey: Record<string, string>, dataConfig: IDataConfigurationModel) {
      if (!self.expression) return NaN
      const caseValues = self.getCaseValues(attrId, cellKey, dataConfig)
      return self.evalFnString(self.expression, caseValues)
    }
  }))
  .actions(self => ({
    setExpression(expression: string) {
      self.expression = expression
    }
  }))

export interface IPlottedValueAdornmentModel extends Instance<typeof PlottedValueAdornmentModel> {}
export function isPlottedValueAdornment(adornment: IAdornmentModel): adornment is IPlottedValueAdornmentModel {
  return adornment.type === kPlottedValueType
}
