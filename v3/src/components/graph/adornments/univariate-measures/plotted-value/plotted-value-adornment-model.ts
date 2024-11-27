import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { IAdornmentModel } from "../../adornment-models"
import { kPlottedValueType, kPlottedValueValueTitleKey } from "./plotted-value-adornment-types"
import { UnivariateMeasureAdornmentModel } from "../univariate-measure-adornment-model"
import { Formula } from "../../../../../models/formula/formula"

export const PlottedValueAdornmentModel = UnivariateMeasureAdornmentModel
  .named("PlottedValueAdornmentModel")
  .props({
    type: types.optional(types.literal(kPlottedValueType), kPlottedValueType),
    formula: types.optional(Formula, () => Formula.create()),
    labelTitle: types.optional(types.literal(kPlottedValueValueTitleKey), kPlottedValueValueTitleKey),
    error: ""
  })
  .views(self => ({
    get expression() {
      return self.formula.display
    }
  }))
  .actions(self => ({
    setExpression(expression: string) {
      self.formula.setDisplayExpression(expression)
    },
    setError(error: string) {
      self.error = error
    },
    updateCategories() {
      // Overwrite the super method to do... nothing. GraphContentModel and adornments have their own way of observing
      // actions that should trigger recalculation of basic adornments. However, formulas have more complex dependencies
      // that are not tracked by the graph content model. Rather than splitting observing between GraphContentModel and
      // FormulaManager, we just do nothing here and let the formula manager handle all the scenarios.
    }
  }))

export interface IPlottedValueAdornmentModelSnapshot extends SnapshotIn<typeof PlottedValueAdornmentModel> {}
export interface IPlottedValueAdornmentModel extends Instance<typeof PlottedValueAdornmentModel> {}
export function isPlottedValueAdornment(adornment: IAdornmentModel): adornment is IPlottedValueAdornmentModel {
  return adornment.type === kPlottedValueType
}
