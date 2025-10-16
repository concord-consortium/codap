import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { AdornmentModel, IAdornmentModel } from "../adornment-models"
import { kCountType } from "./count-adornment-types"
import {IGraphDataConfigurationModel} from "../../models/graph-data-configuration-model"
import { ScaleNumericBaseType } from "../../../axis/axis-types"
import { percentString } from "../../utilities/graph-utils"
export interface IRegionCount {
  bottomOffset: number
  count?: number
  height: number
  leftOffset: number
  percent?: string
  width: number
}
export interface IRegionCountParams {
  cellKey: Record<string, string>
  dataConfig?: IGraphDataConfigurationModel
  inclusiveMax: boolean
  plotHeight: number
  plotWidth: number
  scale?: ScaleNumericBaseType
  showCount?: boolean
  showPercent?: boolean
  subPlotRegionBoundaries: number[]
}

export const PercentTypes = ["cell", "column", "row"] as const
export type PercentType = typeof PercentTypes[number]

export const CountAdornmentModel = AdornmentModel
  .named("CountAdornmentModel")
  .props({
    type: types.optional(types.literal(kCountType), kCountType),
    showCount: false,
    showPercent: false,
    percentType: types.optional(types.enumeration(PercentTypes), "row")
  })
  .views(self => ({
    percentValue(
      casesInPlot: number, cellKey: Record<string, string>, dataConfig?: IGraphDataConfigurationModel,
      subPlotRegionBoundaries?: number[], regionIndex = 0
    ) {
      // If there are movable values present, we need to calculate the percent based on cases in each sub-plot
      // region defined by the movable values and the min and max of the primary axis.
      if (subPlotRegionBoundaries && subPlotRegionBoundaries.length > 2) {
        const primaryAttrRole = dataConfig?.primaryRole ?? "x"
        const attrId = dataConfig?.attributeID(primaryAttrRole)
        if (!attrId) return 0

        const lowerBoundary = subPlotRegionBoundaries[regionIndex]
        const upperBoundary = subPlotRegionBoundaries[regionIndex + 1]
        const casesInRange = dataConfig?.casesInRange(lowerBoundary, upperBoundary, attrId, cellKey, true) ?? []
        const totalCases = dataConfig?.filterCasesForDisplay(dataConfig?.subPlotCases(cellKey)).length ?? 0
        return totalCases > 0 ? casesInRange.length / totalCases : 0
      }

      const categoricalAttrCount = dataConfig?.categoricalAttrCount ?? 0
      const hasPercentTypeOptions = categoricalAttrCount > 1
      const rowCases = dataConfig?.filterCasesForDisplay(dataConfig?.rowCases(cellKey)) ?? []
      const columnCases = dataConfig?.filterCasesForDisplay(dataConfig?.columnCases(cellKey)) ?? []
      const cellCases = dataConfig?.filterCasesForDisplay(dataConfig?.cellCases(cellKey)) ?? []
      const divisor = hasPercentTypeOptions && self.percentType === "row" ? rowCases.length
        : hasPercentTypeOptions && self.percentType === "column" ? columnCases.length : cellCases.length
      const percentValue = casesInPlot / divisor
      return isFinite(percentValue) ? percentValue : 0
    },
    regionCounts(props: IRegionCountParams) {
      const { inclusiveMax, cellKey, dataConfig, plotHeight, plotWidth, scale, subPlotRegionBoundaries } = props
      const primaryAttrRole = dataConfig?.primaryRole ?? "x"
      const attrId = dataConfig?.attributeID(primaryAttrRole)
      if (!attrId) return []

      let width = 0
      let height = 0
      let prevWidth = 0
      let prevHeight = 0
      const counts: IRegionCount[] = []

      // Set scale copy range. The scale copy is used when computing the coordinates of each region's upper and lower
      // boundaries. We modify the range of the scale copy to match the sub plot's width and height so they are computed
      // correctly. The original scales use the entire plot's width and height, which won't work when there are multiple
      // subplots.
      const scaleCopy = scale?.copy()
      if (scaleCopy) {
        if (primaryAttrRole === "x") {
          scaleCopy.range([0, plotWidth])
        } else {
          scaleCopy.range([plotHeight, 0])
        }
      }

      for (let i = 0; i < subPlotRegionBoundaries.length - 1; i++) {
        // For case counts, use the actual boundaries (-Infinity/Infinity).
        const lowerBoundary = subPlotRegionBoundaries[i]
        const upperBoundary = subPlotRegionBoundaries[i + 1]
        const casesInRange = dataConfig?.casesInRange(lowerBoundary, upperBoundary, attrId, cellKey, inclusiveMax) ?? []
        const count = casesInRange.length

        // For pixel calculations, use the scale's domain.
        if (scaleCopy) {
          const [domainMin, domainMax] = scaleCopy.domain()
          const pixelMin = scaleCopy(Math.max(lowerBoundary === -Infinity ? domainMin : lowerBoundary, domainMin))
          const pixelMax = scaleCopy(Math.min(upperBoundary === Infinity ? domainMax : upperBoundary, domainMax))
          width = primaryAttrRole === "x" ? Math.abs(pixelMax - pixelMin) : 0
          height = primaryAttrRole === "x" ? 0 : Math.abs(pixelMax - pixelMin)
        }

        const leftOffset = prevWidth
        const bottomOffset = prevHeight
        prevWidth += width
        prevHeight += height
        counts.push({ bottomOffset, height, leftOffset, count, width })
      }

      return counts
    }
  }))
  .views(self => ({
    computeRegionCounts({
      cellKey, dataConfig, plotHeight, plotWidth, scale, subPlotRegionBoundaries, inclusiveMax
    }: IRegionCountParams) {
      const totalCases = dataConfig?.filterCasesForDisplay(dataConfig?.subPlotCases(cellKey)).length ?? 0
      if (subPlotRegionBoundaries.length < 3) {
        const percent = percentString(self.percentValue(totalCases, cellKey, dataConfig))
        return [{
          bottomOffset: 0,
          count: self.showCount ? totalCases : undefined,
          height: plotHeight,
          leftOffset: 0,
          percent: self.showPercent ? percent : undefined,
          width: plotWidth
        }]
      }

      const counts: IRegionCount[] = self.regionCounts({
        cellKey,
        dataConfig,
        inclusiveMax,
        plotHeight,
        plotWidth,
        scale,
        subPlotRegionBoundaries
      })

      return counts.map((c, i) => {
        const regionPercent = percentString(
          self.percentValue(c.count ?? 0, cellKey, dataConfig, subPlotRegionBoundaries, i)
        )
        return {
          bottomOffset: c.bottomOffset,
          count: c.count,
          height: c.height,
          leftOffset: c.leftOffset,
          percent: regionPercent,
          width: c.width
        }
      })
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
    setPercentType(percentType: PercentType) {
      self.percentType = percentType
    }
  }))

export interface ICountAdornmentModelSnapshot extends SnapshotIn<typeof CountAdornmentModel> {}
export interface ICountAdornmentModel extends Instance<typeof CountAdornmentModel> {}
export function isCountAdornment(adornment: IAdornmentModel): adornment is ICountAdornmentModel {
  return adornment.type === kCountType
}
