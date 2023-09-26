import { Instance, types } from "mobx-state-tree"
import { mean } from "mathjs"
import { AdornmentModel, IAdornmentModel } from "../adornment-models"
import { kPlottedValueType } from "./plotted-value-types"
import { ICase } from "../../../../models/data/data-set-types"
import { IDataConfigurationModel } from "../../../data-display/models/data-configuration-model"

export const PlottedValueModel = AdornmentModel
  .named("PlottedValueModel")
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
        if (Number.isInteger(caseValue)) {
          caseValues.push(caseValue)
        }
      })
      return caseValues
    }
  }))
  .actions(self => ({
    setValue(aValue: number | string) {
      self.value = aValue
    }
  }))

export interface IPlottedValueModel extends Instance<typeof PlottedValueModel> {}
export function isPlottedValue(adornment: IAdornmentModel): adornment is IPlottedValueModel {
  return adornment.type === kPlottedValueType
}
