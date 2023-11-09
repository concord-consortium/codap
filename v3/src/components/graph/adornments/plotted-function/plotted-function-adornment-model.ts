import { Instance, types } from "mobx-state-tree"
import { AdornmentModel, IAdornmentModel, IUpdateCategoriesOptions } from "../adornment-models"
import { kPlottedFunctionType, kPlottedFunctionValueTitleKey, FormulaFn } from "./plotted-function-adornment-types"
import { ICase } from "../../../../models/data/data-set-types"
import { IGraphDataConfigurationModel } from "../../models/graph-data-configuration-model"

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
    expression: types.maybe(types.string),
    labelTitle: types.optional(types.literal(kPlottedFunctionValueTitleKey), kPlottedFunctionValueTitleKey),
    measures: types.map(MeasureInstance)
  })
  .views(self => ({
    getCaseValues(attrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel) {
      const dataset = dataConfig?.dataset
      const casesInPlot = dataConfig.subPlotCases(cellKey)
      const caseValues: number[] = []
      casesInPlot.forEach((c: ICase) => {
        const caseValue = Number(dataset?.getValue(c.__id__, attrId))
        if (Number.isFinite(caseValue)) {
          caseValues.push(caseValue)
        }
      })
      return caseValues
    }
  }))
  .actions(self => ({
    setExpression(expression: string) {
      self.expression = expression
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
  .actions(self => ({
    updateCategories(options: IUpdateCategoriesOptions) {
      // TODO: If the comment below will be true of the Plotted Function, like it's true for the Plotted Value,
      // remove everything from this action but the comment. We could also then remove xScale and yScale as
      // optional items in IUpdateCategoriesOptions and getUpdateCategoriesOptions.

      // Overwrite the super method to do... nothing. GraphContentModel and adornments have their own way of observing
      // actions that should trigger recalculation of basic adornments. However, formulas have more complex dependencies
      // that are not tracked by the graph content model. Rather than splitting observing between GraphContentModel and
      // FormulaManager, we just do nothing here and let the formula manager handle all the scenarios.

      const { xCats, xScale, yCats, yScale, topCats, rightCats, resetPoints, dataConfig } = options
      if (!dataConfig || !xScale || !yScale) return
      const topCatCount = topCats.length || 1
      const rightCatCount = rightCats.length || 1
      const xCatCount = xCats.length || 1
      const yCatCount = yCats.length || 1
      const columnCount = topCatCount * xCatCount
      const rowCount = rightCatCount * yCatCount
      const totalCount = rowCount * columnCount
      for (let i = 0; i < totalCount; ++i) {
        const cellKey = self.cellKey(options, i)
        const instanceKey = self.instanceKey(cellKey)
        const formulaFunction = (x: number) => x * x
        if (!self.measures.get(instanceKey) || resetPoints) {
          self.addMeasure(formulaFunction, instanceKey)
        } else {
          self.updateMeasureValue(formulaFunction, instanceKey)
        }
      }
    }
  }))

export interface IPlottedFunctionAdornmentModel extends Instance<typeof PlottedFunctionAdornmentModel> {}
export function isPlottedFunctionAdornment(adornment: IAdornmentModel): adornment is IPlottedFunctionAdornmentModel {
  return adornment.type === kPlottedFunctionType
}
