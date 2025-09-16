import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { isFiniteNumber } from "../../../../utilities/math-utils"
import { IAxisTicks, TickFormatter } from "../../../axis/axis-types"
import { dataDisplayGetNumericValue } from "../../../data-display/data-display-value-utils"
import { DotPlotModel } from "../dot-plot/dot-plot-model"
import { IPlotModel, IRespondToPlotChangeOptions, typesPlotType } from "../plot-model"

export const BinnedDotPlotModel = DotPlotModel
  .named("BinnedDotPlotModel")
  .props({
    type: typesPlotType("binnedDotPlot"),
    _binAlignment: types.maybe(types.number),
    _binWidth: types.maybe(types.number)
  })
  .volatile(() => ({
    dragBinIndex: -1,
    activeBinAlignment: undefined as Maybe<number>,
    activeBinWidth: undefined as Maybe<number>
  }))
  .views(self => ({
    get hasBinnedNumericAxis(): boolean {
      return true
    },
    get hasDraggableNumericAxis() {
      return false
    },
    get isBinned() {
      return true
    },
    get showFusePointsIntoBars() {
      return true
    },
    get isDraggingBinBoundary() {
      return self.dragBinIndex >= 0
    },
    get binAlignment() {
      return self.activeBinAlignment ?? self._binAlignment
    },
    get binWidth() {
      return self.activeBinWidth ?? self._binWidth
    },
    get canShowBoxPlotAndNormalCurve(): boolean {
      return false
    }
  }))
  .views(self => ({
    binWidthFromData(minValue: number, maxValue: number) {
      if (minValue === Infinity || maxValue === -Infinity || minValue === maxValue) return undefined
      const kDefaultNumberOfBins = 4

      const binRange = maxValue !== minValue
        ? (maxValue - minValue) / kDefaultNumberOfBins
        : 1 / kDefaultNumberOfBins
      // Convert to a logarithmic scale (base 10)
      const logRange = Math.log(binRange) / Math.LN10
      const significantDigit = Math.pow(10.0, Math.floor(logRange))
      // Determine the scale factor based on the significant digit
      const scaleFactor = Math.pow(10.0, logRange - Math.floor(logRange))
      const adjustedScaleFactor = scaleFactor < 2 ? 1 : scaleFactor < 5 ? 2 : 5
      return Math.max(significantDigit * adjustedScaleFactor, Number.MIN_VALUE)
    }
  }))
  .views(self => ({
    binDetails(options?: { initialize?: boolean }) {
      const { initialize = false } = options ?? {}
      const { dataset, primaryAttributeID } = self.dataConfiguration ?? {}
      const caseDataArray = self.dataConfiguration?.getCaseDataArray(0) ?? []
      const minValue = caseDataArray.reduce((min, aCaseData) => {
        const value = primaryAttributeID
                        ? dataDisplayGetNumericValue(dataset, aCaseData.caseID, primaryAttributeID)
                        : min
        return isFiniteNumber(value) ? Math.min(min, value ?? min) : min
      }, Infinity)
      const maxValue = caseDataArray.reduce((max, aCaseData) => {
        const value = primaryAttributeID
                        ? dataDisplayGetNumericValue(dataset, aCaseData.caseID, primaryAttributeID)
                        : max
        return isFiniteNumber(value) ? Math.max(max, value ?? max) : max
      }, -Infinity)
      const binWidth = initialize || !self.binWidth
        ? self.binWidthFromData(minValue, maxValue) : self.binWidth
      if (!isFinite(minValue) || !isFinite(maxValue) || binWidth == null) {
        return { binAlignment: self.binAlignment, binWidth: self.binWidth,
                  minBinEdge: 0, maxBinEdge: 0, minValue: 0, maxValue: 0, totalNumberOfBins: 0 }
      }

      const binAlignment = initialize || self.binAlignment == null
        ? Math.floor(minValue / binWidth) * binWidth
        : self.binAlignment
      const minBinEdge = binAlignment - Math.ceil((binAlignment - minValue) / binWidth) * binWidth
      // Calculate the total number of bins needed to cover the range from the minimum data value
      // to the maximum data value, adding a small constant to ensure the max value is contained.
      const totalNumberOfBins = Math.ceil((maxValue - minBinEdge) / binWidth + 0.000001)
      const maxBinEdge = minBinEdge + (totalNumberOfBins * binWidth)

      return { binAlignment, binWidth, minBinEdge, maxBinEdge, minValue, maxValue, totalNumberOfBins }
    },
  }))
  .views(self => {
    const baseMaxCellCaseCount = self.maxCellCaseCount
    return {
      maxCellCaseCount() {
        const { maxCellLength, primaryRole } = self.dataConfiguration || {}
        const { binWidth, minValue, totalNumberOfBins } = self.binDetails()
        const primarySplitRole = primaryRole === "x" ? "topSplit" : "rightSplit"
        const secondarySplitRole = primaryRole === "x" ? "rightSplit" : "topSplit"
        return binWidth != null
                ? maxCellLength?.(primarySplitRole, secondarySplitRole, binWidth, minValue, totalNumberOfBins) ?? 0
                : baseMaxCellCaseCount()
      }
    }
  })
  .views(self => ({
    binnedAxisTicks(formatter?: TickFormatter): IAxisTicks {
      const tickValues: number[] = []
      const tickLabels: string[] = []
      const { binWidth, totalNumberOfBins, minBinEdge } = self.binDetails()
      if (binWidth !== undefined) {
        let currentStart = minBinEdge
        let binCount = 0

        while (binCount < totalNumberOfBins) {
          const currentEnd = currentStart + binWidth
          if (formatter) {
            const formattedCurrentStart = formatter(currentStart)
            const formattedCurrentEnd = formatter(currentEnd)
            tickValues.push(currentStart + (binWidth / 2))
            tickLabels.push(`[${formattedCurrentStart}, ${formattedCurrentEnd})`)
          } else {
            tickValues.push(currentStart + binWidth)
            tickLabels.push(`${currentEnd}`)
          }
          currentStart += binWidth
          binCount++
        }
      }
      return { tickValues, tickLabels }
    },
    nonDraggableAxisTicks(formatter: TickFormatter): IAxisTicks {
      const tickValues: number[] = []
      const tickLabels: string[] = []
      const { binWidth, totalNumberOfBins, minBinEdge } = self.binDetails()

      if (binWidth != null) {
        let currentStart = minBinEdge
        let binCount = 0

        while (binCount < totalNumberOfBins) {
          const currentEnd = currentStart + binWidth
          const formattedCurrentStart = formatter(currentStart)
          const formattedCurrentEnd = formatter(currentEnd)
          tickValues.push(currentStart + (binWidth / 2))
          tickLabels.push(`[${formattedCurrentStart}, ${formattedCurrentEnd})`)
          currentStart += binWidth
          binCount++
        }
      }
      return { tickValues, tickLabels }
    }
  }))
  .actions(self => ({
    setDragBinIndex(index: number) {
      self.dragBinIndex = index
    },
    setBinAlignment(alignment?: number) {
      self._binAlignment = isFiniteNumber(alignment) ? alignment : undefined
      self.activeBinAlignment = undefined
    },
    setActiveBinAlignment(alignment?: number) {
      self.activeBinAlignment = isFiniteNumber(alignment) ? alignment : undefined
    },
    setBinWidth(width?: number) {
      self._binWidth = isFiniteNumber(width) ? width : undefined
      self.activeBinWidth = undefined
    },
    setActiveBinWidth(width?: number) {
      self.activeBinWidth = isFiniteNumber(width) ? width : undefined
    }
  }))
  .actions(self => ({
    respondToPlotChange({
      axisProvider, primaryPlace, isBinnedPlotChanged, primaryAttrChanged
    }: IRespondToPlotChangeOptions) {
      if (primaryAttrChanged || isBinnedPlotChanged) {
        const { binAlignment, binWidth } = self.binDetails({ initialize: true })
        if (binAlignment != null) {
          self.setBinAlignment(binAlignment)
        }
        if (binWidth != null) {
          self.setBinWidth(binWidth)
        }
      }

      // Set the domain of the primary axis to the extent of the bins
      const primaryAxis = axisProvider?.getNumericAxis(primaryPlace)
      const { maxBinEdge, minBinEdge } = self.binDetails()
      primaryAxis?.setAllowRangeToShrink(true)  // Otherwise we get slop we don't want
      primaryAxis?.setDomain(minBinEdge, maxBinEdge)
    },
    endBinBoundaryDrag(binAlignment: number, binWidth: number) {
      self.setDragBinIndex(-1)
      self.setBinAlignment(binAlignment)
      self.setBinWidth(binWidth)
    },
  }))
export interface IBinnedDotPlotModel extends Instance<typeof BinnedDotPlotModel> {}
export interface IBinnedDotPlotSnapshot extends SnapshotIn<typeof BinnedDotPlotModel> {}

export function isBinnedDotPlotModel(model?: IPlotModel): model is IBinnedDotPlotModel {
  return model?.type === "binnedDotPlot"
}
