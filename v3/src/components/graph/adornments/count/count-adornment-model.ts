import { Instance, types } from "mobx-state-tree"
import { AdornmentModel, IAdornmentModel } from "../adornment-models"
import { kCountType } from "./count-adornment-types"
import { withUndoRedoStrings } from "../../../../models/history/codap-undo-types"
import {IGraphDataConfigurationModel} from "../../models/graph-data-configuration-model"
import { ScaleNumericBaseType } from "../../../axis/axis-types"

export interface IRegionCount {
  bottomOffset: number
  count: number
  height: number
  leftOffset: number
  width: number
}
export interface IRegionCountParams {
  cellKey: Record<string, string>
  dataConfig?: IGraphDataConfigurationModel
  scale: ScaleNumericBaseType
  subPlotRegionBoundaries: number[]
}

export const CountAdornmentModel = AdornmentModel
  .named("CountAdornmentModel")
  .props({
    type: types.optional(types.literal(kCountType), kCountType),
    showCount: false,
    showPercent: false,
    percentType: types.optional(types.enumeration(["cell", "column", "row"]), "cell")
  })
  .views(self => ({
    percentValue(casesInPlot: number, cellKey: Record<string, string>, dataConfig?: IGraphDataConfigurationModel) {
      // Percent type options are only available when there are exactly two categorial attributes on perpendicular
      // axes, which creates a grid of subplots with multiple rows and columns. When percent type options are not
      // available, we default to the "cell" percent type (i.e. use `dataConfig?.allPlottedCases.length ?? 0` as
      // the divisor)
      const hasPercentTypeOptions = dataConfig?.hasExactlyTwoPerpendicularCategoricalAttrs
      const divisor = hasPercentTypeOptions && self.percentType === "row"
        ? dataConfig?.rowCases(cellKey).length ?? 0
        : hasPercentTypeOptions && self.percentType === "column"
          ? dataConfig?.columnCases(cellKey).length ?? 0
          : dataConfig?.allPlottedCases().length ?? 0
      const percentValue = casesInPlot / divisor
      return isFinite(percentValue) ? percentValue : 0
    },
    regionCounts(props: IRegionCountParams) {
      const { cellKey, dataConfig, scale, subPlotRegionBoundaries } = props
      const primaryAttrRole = dataConfig?.primaryRole ?? "x"
      const attrId = dataConfig?.attributeID(primaryAttrRole)
      if (!attrId) return []
      let prevWidth = 0
      let prevHeight = 0
      const counts: IRegionCount[] = []
  
      for (let i = 0; i < subPlotRegionBoundaries.length - 1; i++) {
        const lowerBoundary = subPlotRegionBoundaries[i]
        const upperBoundary = subPlotRegionBoundaries[i + 1]
        const pixelMin = scale(lowerBoundary)
        const pixelMax = scale(upperBoundary)
        const casesInRange = dataConfig?.casesInRange(lowerBoundary, upperBoundary, attrId, cellKey) ?? []
        const count = casesInRange.length
        const width = primaryAttrRole === "x" ? Math.abs(pixelMax - pixelMin) : 0
        const height = primaryAttrRole === "x" ? 0 : Math.abs(pixelMax - pixelMin)
        const leftOffset = prevWidth
        const bottomOffset = prevHeight
        prevWidth += width
        prevHeight += height
        counts.push({ bottomOffset, height, leftOffset, count, width })
      }
  
      return counts
    }
  }))
  .actions(self => ({
    setShowCount(showCount: boolean) {
      self.showCount = showCount
      self.isVisible = self.showCount || self.showPercent
      const undoString = showCount ? "DG.Undo.graph.showCount" : "DG.Undo.graph.hideCount"
      const redoString = showCount ? "DG.Redo.graph.showCount" : "DG.Redo.graph.hideCount"
      withUndoRedoStrings(undoString, redoString)
    },
    setShowPercent(showPercent: boolean) {
      self.showPercent = showPercent
      self.isVisible = self.showCount || self.showPercent
      const undoString = showPercent ? "DG.Undo.graph.showPercent" : "DG.Undo.graph.hidePercent"
      const redoString = showPercent ? "DG.Redo.graph.showPercent" : "DG.Redo.graph.hidePercent"
      withUndoRedoStrings(undoString, redoString)
    },
    setPercentType(percentType: string) {
      self.percentType = percentType
    }
  }))

export interface ICountAdornmentModel extends Instance<typeof CountAdornmentModel> {}
export function isCountAdornment(adornment: IAdornmentModel): adornment is ICountAdornmentModel {
  return adornment.type === kCountType
}
