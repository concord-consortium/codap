import { Instance, types } from "mobx-state-tree"
import { mean } from "mathjs"
import { AdornmentModel, IAdornmentModel, IUpdateCategoriesOptions } from "../adornment-models"
import { kPlottedValueType } from "./plotted-value-types"

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
    }
  }))
  .actions(self => ({
    setValue(aValue: number | string) {
      self.value = aValue
    }
  }))
  .actions(self => ({
    updateCategories(options: IUpdateCategoriesOptions) {
      // const { resetPoints } = options
      // this may not be needed if it really is the case that the value will always be the same for all subplots
    }
  }))

export interface IPlottedValueModel extends Instance<typeof PlottedValueModel> {}
export function isPlottedValue(adornment: IAdornmentModel): adornment is IPlottedValueModel {
  return adornment.type === kPlottedValueType
}
