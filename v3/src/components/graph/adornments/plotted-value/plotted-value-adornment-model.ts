import { Instance, types } from "mobx-state-tree"
import { mean } from "mathjs"
import { AdornmentModel, IAdornmentModel } from "../adornment-models"
import { kPlottedValueType } from "./plotted-value-adornment-types"
import { ICase } from "../../../../models/data/data-set-types"
import { IDataConfigurationModel } from "../../../data-display/models/data-configuration-model"
import { withUndoRedoStrings } from "../../../../models/history/codap-undo-types"

export const PlottedValueAdornmentModel = AdornmentModel
  .named("PlottedValueAdornmentModel")
  .props({
    type: "Plotted Value",
    value: types.maybe(types.union(types.number, types.string))
  })
  .views(self => ({
    evalFnString(fnString: string, caseValues: number[]) {
      // This is just a proof-of-concept placeholder for function strings. It will always return
      // the mean of caseValues no matter what the string value is.
      return mean(caseValues)
    },
    getCaseValues(attrId: string, cellKey: Record<string, string>, dataConfig: IDataConfigurationModel) {
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
    setValue(aValue: number | string) {
      self.value = aValue
      withUndoRedoStrings("DG.Undo.graph.changePlotValue", "DG.Redo.graph.changePlotValue")
    }
  }))

export interface IPlottedValueAdornmentModel extends Instance<typeof PlottedValueAdornmentModel> {}
export function isPlottedValue(adornment: IAdornmentModel): adornment is IPlottedValueAdornmentModel {
  return adornment.type === kPlottedValueType
}
