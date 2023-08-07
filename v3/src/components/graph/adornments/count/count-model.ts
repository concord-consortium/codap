import { Instance, types } from "mobx-state-tree"
import { AdornmentModel, IAdornmentModel } from "../adornment-models"
import { kCountType } from "./count-types"

export const CountModel = AdornmentModel
  .named('CountModel')
  .props({
    type: 'Count',
    showCount: false,
    showPercent: false,
    percentType: types.optional(types.enumeration(["cell", "column", "row"]), "row"),
  })
  .views(self => ({
    percentValue(dataConfig: any, casesInPlot: number, subPlotKey: Record<string, string>) {
      const casesInRow = dataConfig?.rowCases(subPlotKey)?.length ?? 0
      const casesInColumn = dataConfig?.columnCases(subPlotKey)?.length ?? 0
      const casesInCell = dataConfig?.cellCases(subPlotKey)?.length ?? 0
      const divisor = self.percentType === "row"
        ? casesInRow
        : self.percentType === "column"
          ? casesInColumn
          : casesInCell
      const percentValue = ((casesInPlot / divisor) * 100).toFixed(2)
      return isFinite(Number(percentValue)) ? Math.round(Number(percentValue) * 100)/100 : 0
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
