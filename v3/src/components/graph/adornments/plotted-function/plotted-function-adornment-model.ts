import { Instance, types } from "mobx-state-tree"
import { AdornmentModel, IAdornmentModel } from "../adornment-models"
import { kPlottedFunctionType, kPlottedFunctionValueTitleKey, FormulaFn } from "./plotted-function-adornment-types"
import { Formula } from "../../../../models/formula/formula"

export const MeasureInstance = types.model("MeasureInstance", {})
  .volatile(self => ({
    formulaFunction: (x: number) => NaN,
  }))
  .actions(self => ({
    setValue(formulaFunction: FormulaFn) {
      self.formulaFunction = formulaFunction
    }
  }))

export const PlottedFunctionAdornmentModel = AdornmentModel
  .named("PlottedFunctionAdornmentModel")
  .props({
    type: types.optional(types.literal(kPlottedFunctionType), kPlottedFunctionType),
    formula: types.optional(Formula, () => Formula.create()),
    labelTitle: types.optional(types.literal(kPlottedFunctionValueTitleKey), kPlottedFunctionValueTitleKey),
    measures: types.map(MeasureInstance),
    error: ""
  })
  .views(self => ({
    get expression() {
      return self.formula.display
    }
  }))
  .actions(self => ({
    setExpression(expression: string) {
      self.formula.setDisplayFormula(expression)
    },
    setError(error: string) {
      self.error = error
    },
    addMeasure(formulaFunction: FormulaFn, key="{}") {
      const newMeasure = MeasureInstance.create()
      newMeasure.setValue(formulaFunction)
      self.measures.set(key, newMeasure)
    },
    updateMeasureValue(formulaFunction: FormulaFn, key="{}") {
      const measure = self.measures.get(key)
      if (measure) {
        measure.setValue(formulaFunction)
      }
    },
    removeMeasure(key: string) {
      self.measures.delete(key)
    }
  }))

export interface IPlottedFunctionAdornmentModel extends Instance<typeof PlottedFunctionAdornmentModel> {}
export function isPlottedFunctionAdornment(adornment: IAdornmentModel): adornment is IPlottedFunctionAdornmentModel {
  return adornment.type === kPlottedFunctionType
}
