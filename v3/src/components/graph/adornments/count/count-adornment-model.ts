import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { AdornmentModel, IAdornmentModel } from "../adornment-models"
import { kCountType } from "./count-adornment-types"
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
  inclusiveMax: boolean
  plotHeight: number
  plotWidth: number
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
      // Percent type options are only available when there are two or more categorial attributes on perpendicular
      // axes, which creates a grid of subplots with multiple rows and columns. When percent type options are not
      // available, we default to the "cell" percent type (i.e. use `dataConfig?.cellCases.length ?? 0` as
      // the divisor)
      const categoricalAttrCount = dataConfig?.categoricalAttrCount ?? 0
      const hasPercentTypeOptions = categoricalAttrCount > 1
      const divisor = hasPercentTypeOptions && self.percentType === "row"
        ? dataConfig?.rowCases(cellKey).length ?? 0
        : hasPercentTypeOptions && self.percentType === "column"
          ? dataConfig?.columnCases(cellKey).length ?? 0
          : dataConfig?.cellCases(cellKey).length ?? 0
      const percentValue = casesInPlot / divisor
      return isFinite(percentValue) ? percentValue : 0
    },
    regionCounts(props: IRegionCountParams) {
      const { inclusiveMax, cellKey, dataConfig, plotHeight, plotWidth, scale, subPlotRegionBoundaries } = props
      const primaryAttrRole = dataConfig?.primaryRole ?? "x"
      const attrId = dataConfig?.attributeID(primaryAttrRole)
      if (!attrId) return []
      let prevWidth = 0
      let prevHeight = 0
      const counts: IRegionCount[] = []
      // Set scale copy range. The scale copy is used when computing the coordinates of each region's upper and lower
      // boundaries. We modify the range of the scale copy to match the sub plot's width and height so they are computed
      // correctly. The original scales use the entire plot's width and height, which won't work when there are multiple
      // subplots.
      const scaleCopy = scale.copy()
      if (primaryAttrRole === "x") {
        scaleCopy.range([0, plotWidth])
      } else {
        scaleCopy.range([plotHeight, 0])
      }

      for (let i = 0; i < subPlotRegionBoundaries.length - 1; i++) {
        const lowerBoundary = subPlotRegionBoundaries[i]
        const upperBoundary = subPlotRegionBoundaries[i + 1]
        const pixelMin = scaleCopy(lowerBoundary)
        const pixelMax = scaleCopy(upperBoundary)
        const casesInRange = dataConfig?.casesInRange(lowerBoundary, upperBoundary, attrId, cellKey, inclusiveMax) ?? []
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
    },
    setShowPercent(showPercent: boolean) {
      self.showPercent = showPercent
      self.isVisible = self.showCount || self.showPercent
    },
    setPercentType(percentType: string) {
      self.percentType = percentType
    }
  }))

export interface ICountAdornmentModelSnapshot extends SnapshotIn<typeof CountAdornmentModel> {}
export interface ICountAdornmentModel extends Instance<typeof CountAdornmentModel> {}
export function isCountAdornment(adornment: IAdornmentModel): adornment is ICountAdornmentModel {
  return adornment.type === kCountType
}
