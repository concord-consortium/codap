import { Instance, types } from "mobx-state-tree"
import { AdornmentModel, IAdornmentModel } from "../adornment-models"
import { kCountType } from "./count-types"
import { IDataConfigurationModel } from "../../../data-display/models/data-configuration-model"

export const CountModel = AdornmentModel
  .named('CountModel')
  .props({
    type: 'Count',
    showCount: false,
    showPercent: false,
    percentType: types.optional(types.enumeration(["cell", "column", "row"]), "row"),
  })
  .views(self => ({
    percentValue(casesInPlot: number, cellKey: Record<string, string>, dataConfig?: IDataConfigurationModel) {
      const divisor = self.percentType === "row"
        ? dataConfig?.rowCases(cellKey)?.length ?? 0
        : self.percentType === "column"
          ? dataConfig?.columnCases(cellKey)?.length ?? 0
          : dataConfig?.cellCases(cellKey)?.length ?? 0
      const percentValue = casesInPlot / divisor
      return isFinite(percentValue) ? percentValue : 0
    }
  }))
  .actions(self => ({
    setShowCount(showCount: boolean) {
      self.showCount = showCount
      self.isVisible = self.showCount || self.showPercent
    },
    setShowPercent(showPercent: boolean) {
      self.showPercent = showPercent
      self.isVisible = self.showCount || self.showPercent
    },
    setPercentType(percentType: string) {
      self.percentType = percentType
    }
  }))

export interface ICountModel extends Instance<typeof CountModel> {}
export function isCount(adornment: IAdornmentModel): adornment is ICountModel {
  return adornment.type === kCountType
}
