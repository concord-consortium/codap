import { ScaleBand, ScaleLinear, drag, select } from "d3"
import { comparer } from "mobx"
import { useCallback, useEffect, useRef } from "react"
import { clsx } from "clsx"
import { LogMessageFn, logModelChangeFn } from "../../../lib/log-message"
import { isFiniteNumber, roundToPrecision } from "../../../utilities/math-utils"
import { mstReaction } from "../../../utilities/mst-reaction"
import { t } from "../../../utilities/translation/translate"
import { AxisPlace } from "../../axis/axis-types"
import { getDomainExtentForPixelWidth } from "../../axis/axis-utils"
import { IGraphDataConfigurationModel } from "../models/graph-data-configuration-model"
import { IGraphContentModel } from "../models/graph-content-model"
import { GraphLayout } from "../models/graph-layout"
import { IBinnedDotPlotModel } from "../plots/binned-dot-plot/binned-dot-plot-model"

export const kMinBinScreenWidth = 20

export const screenWidthToWorldWidth = (scale: ScaleLinear<number, number>, screenWidth: number) => {
  return Math.abs(getDomainExtentForPixelWidth(screenWidth, scale))
}

export const worldWidthToScreenWidth = (scale: ScaleLinear<number, number>, worldWidth: number) => {
  return Math.abs(scale(worldWidth) - scale(0))
}

interface IUseBinBoundaryDragProps {
  binnedPlot?: IBinnedDotPlotModel
  dataConfig?: IGraphDataConfigurationModel
  graphModel: IGraphContentModel
  layout: GraphLayout
  primaryAxisScale: ScaleLinear<number, number>
  primaryIsBottom: boolean
  primaryPlace: AxisPlace
}

export function useBinBoundaryDrag({
  binnedPlot, dataConfig, graphModel, layout, primaryAxisScale, primaryIsBottom, primaryPlace
}: IUseBinBoundaryDragProps) {
  const binBoundariesRef = useRef<SVGGElement>(null)
  const primaryAxisScaleCopy = useRef<ScaleLinear<number, number>>(primaryAxisScale.copy())
  const lowerBoundaryRef = useRef<number>(0)
  const binWidthDragPrecision = useRef<number>(2)
  const logFn = useRef<Maybe<LogMessageFn>>()
  const handleDragBinBoundaryEndFn = useRef<() => void>(() => {})
  // Consumer can set this to override post-drag-end behavior (e.g., histogram re-attaches its
  // own edge-detection handlers instead of redrawing boundary lines)
  const reattachAfterDragRef = useRef<(() => void) | undefined>()

  const drawBinBoundaries = useCallback(() => {
    if (!dataConfig || !isFiniteNumber(binnedPlot?.binAlignment) || !isFiniteNumber(binnedPlot?.binWidth)) return
    const secondaryPlace = primaryIsBottom ? "left" : "bottom"
    const secondaryAxisScale = layout.getAxisScale(secondaryPlace) as ScaleBand<string>
    const secondaryAxisExtent = Math.abs(secondaryAxisScale.range()[0] - secondaryAxisScale.range()[1])
    const { binWidth, minBinEdge, totalNumberOfBins } = binnedPlot.binDetails()
    const binBoundariesArea = select(binBoundariesRef.current)

    if (binWidth === undefined) return

    binBoundariesArea.selectAll("path").remove()
    const numRepetitions = dataConfig.numRepetitionsForPlace(primaryPlace)
    const primaryLength = layout.getAxisLength(primaryPlace)
    const bandWidth = primaryLength / numRepetitions
    for (let repetition = 0; repetition < numRepetitions; repetition++) {
      for (let binNumber = 1; binNumber < totalNumberOfBins; binNumber++) {
        const primaryBoundaryOrigin = repetition * bandWidth +
          primaryAxisScale(minBinEdge + binNumber * binWidth) / numRepetitions
        const lineCoords = primaryIsBottom
          ? `M ${primaryBoundaryOrigin},0 L ${primaryBoundaryOrigin},${secondaryAxisExtent}`
          : `M 0,${primaryBoundaryOrigin} L ${secondaryAxisExtent},${primaryBoundaryOrigin}`
        const boundaryClasses = clsx(
          "draggable-bin-boundary",
          {dragging: binNumber - 1 === binnedPlot.dragBinIndex},
          {lower: binNumber === binnedPlot.dragBinIndex}
        )
        const boundaryCoverClasses = clsx(
          "draggable-bin-boundary-cover",
          {vertical: primaryIsBottom},
          {horizontal: !primaryIsBottom}
        )
        binBoundariesArea.append("path")
          .attr("class", boundaryClasses)
          .attr("d", lineCoords)
        binBoundariesArea.append("path")
          .attr("class", boundaryCoverClasses)
          .attr("d", lineCoords)
          .append("title")
          .text(`${t("DG.BinnedPlotModel.dragBinTip")}`)
      }
    }
  }, [binnedPlot, dataConfig, layout, primaryAxisScale, primaryIsBottom, primaryPlace])

  const handleDragBinBoundaryStart = useCallback((event: MouseEvent, binIndex: number) => {
    if (!dataConfig || !isFiniteNumber(binnedPlot?.binAlignment) || !isFiniteNumber(binnedPlot?.binWidth)) return
    logFn.current = logModelChangeFn(
      "dragBinBoundary from { alignment: %@, width: %@ } to { alignment: %@, width: %@ }",
      () => ({ alignment: binnedPlot.binAlignment, width: binnedPlot.binWidth }))
    primaryAxisScaleCopy.current = primaryAxisScale.copy()
    binnedPlot.setDragBinIndex(binIndex)
    const binDetails = binnedPlot.binDetails()
    if (binDetails.binWidth) {
      const newBinAlignment = binDetails.getBinEdge(binIndex) ?? 0
      // Store the screen coordinate of the boundary being dragged to pixel precision
      lowerBoundaryRef.current = Math.round(primaryAxisScale(newBinAlignment))
      // During drag, bin widths are rounded based on the world precision of a single pixel
      const worldPixelWidth = screenWidthToWorldWidth(primaryAxisScaleCopy.current, 1)
      const worldPixelWidthStr = worldPixelWidth.toExponential()
      // Extract mantissa and exponent
      const [_, expStr2] = worldPixelWidthStr.split('e')
      const exponent = parseInt(expStr2, 10)
      // Precision = one mantissa decimal - exponent
      // For 0.15: mantissa "1.5" (1 decimal), exponent -1 → 1 - (-1) = 2 ✓
      binWidthDragPrecision.current = 1 - exponent
      binnedPlot.setActiveBinAlignment(newBinAlignment)
    }
  }, [binnedPlot, dataConfig, primaryAxisScale])

  const handleDragBinBoundary = useCallback((event: MouseEvent) => {
    if (!dataConfig || !binnedPlot) return
    const dragValue = primaryIsBottom ? event.x : event.y
    const screenBinWidth = Math.max(kMinBinScreenWidth, Math.abs(dragValue - lowerBoundaryRef.current))
    const worldBinWidth = screenWidthToWorldWidth(primaryAxisScaleCopy.current, screenBinWidth)
    binnedPlot.setActiveBinWidth(roundToPrecision(worldBinWidth, binWidthDragPrecision.current))
  }, [binnedPlot, dataConfig, primaryIsBottom])

  const addBinBoundaryDragHandlers = useCallback(() => {
    const binBoundariesArea = select(binBoundariesRef.current)
    const binBoundaryCovers = binBoundariesArea.selectAll<SVGPathElement, unknown>("path.draggable-bin-boundary-cover")
    // Each repetition (split sub-plot) has (totalNumberOfBins - 1) boundary covers.
    // D3's index `i` counts across all repetitions, so use modulo to get the bin index within each.
    const boundariesPerRepetition = Math.max(1, (binnedPlot?.binDetails().totalNumberOfBins ?? 1) - 1)
    binBoundaryCovers.each(function(d, i) {
      const binIndex = i % boundariesPerRepetition
      select(this).call(
        drag<SVGPathElement, unknown>()
          .on("start", (e) => handleDragBinBoundaryStart(e, binIndex))
          .on("drag", (e) => handleDragBinBoundary(e))
          .on("end", handleDragBinBoundaryEndFn.current)
      )
    })
  }, [binnedPlot, handleDragBinBoundary, handleDragBinBoundaryStart])

  handleDragBinBoundaryEndFn.current = useCallback(() => {
    if (!binnedPlot) return
    binnedPlot.setDragBinIndex(-1)
    if (reattachAfterDragRef.current) {
      reattachAfterDragRef.current()
    } else {
      drawBinBoundaries()
      addBinBoundaryDragHandlers()
    }
    binnedPlot.applyModelChange(
      () => {
        if (binnedPlot.binAlignment != null && binnedPlot.binWidth != null) {
          binnedPlot.endBinBoundaryDrag(binnedPlot.binAlignment, binnedPlot.binWidth)
          // Update axis domain as part of the same undo entry (skipped during drag)
          const { totalNumberOfBins, minBinEdge } = binnedPlot.binDetails()
          if (isFiniteNumber(minBinEdge) && isFiniteNumber(totalNumberOfBins)) {
            const axisModel = graphModel.getNumericAxis(primaryPlace)
            axisModel?.setAllowRangeToShrink(true)
            axisModel?.setDomain(minBinEdge, minBinEdge + binnedPlot.binWidth * totalNumberOfBins)
          }
        }
        lowerBoundaryRef.current = 0
      }, {
        undoStringKey: "DG.Undo.graph.dragBinBoundary",
        redoStringKey: "DG.Redo.graph.dragBinBoundary",
        log: logFn.current
      }
    )
  }, [addBinBoundaryDragHandlers, binnedPlot, drawBinBoundaries, graphModel, primaryPlace])

  // If the pixel width of binWidth would be less than kMinBinScreenWidth, set it to kMinBinScreenWidth.
  // Skip during drag to avoid creating incremental undo entries.
  useEffect(function enforceMinBinPixelWidth() {
    return mstReaction(
      () => binnedPlot?.binWidth,
      () => {
        if (binnedPlot?.binWidth && primaryAxisScale && !binnedPlot.isDraggingBinBoundary) {
          if (worldWidthToScreenWidth(primaryAxisScale, binnedPlot.binWidth) < kMinBinScreenWidth) {
            const newBinWidth = screenWidthToWorldWidth(primaryAxisScale, kMinBinScreenWidth)
            binnedPlot.setBinWidth(newBinWidth)
          }
        }
      }, {name: "enforceMinBinPixelWidth"}, binnedPlot
    )
  }, [binnedPlot, primaryAxisScale])

  // When binWidth or binAlignment changes we may need to adjust the primaryAxisScale's domain.
  // During drag, only update the D3 scale (visual) — skip the MST axis model update to avoid
  // creating incremental undo entries. The axis model is updated in the drag end handler.
  useEffect(function respondToBinChange() {
    return mstReaction(
      () => {
        return { width: binnedPlot?.binWidth, alignment: binnedPlot?.binAlignment }
      },
      ({ width }) => {
        const { totalNumberOfBins, minBinEdge } = binnedPlot?.binDetails() || {}
        if (!isFiniteNumber(width) || !isFiniteNumber(minBinEdge) || !isFiniteNumber(totalNumberOfBins)) {
          return
        }
        const newDomain = [minBinEdge, minBinEdge + width * totalNumberOfBins]
        primaryAxisScale.domain(newDomain)
        if (!binnedPlot?.isDraggingBinBoundary) {
          const axisModel = graphModel.getNumericAxis(primaryPlace)
          axisModel?.setAllowRangeToShrink(true)
          axisModel?.setDomain(newDomain[0], newDomain[1])
        }
      }, {name: "respondToBinChange", equals: comparer.structural}, binnedPlot
    )
  }, [binnedPlot, graphModel, primaryAxisScale, primaryPlace])

  return {
    binBoundariesRef, drawBinBoundaries, addBinBoundaryDragHandlers,
    handleDragBinBoundaryStart, handleDragBinBoundary, handleDragBinBoundaryEndFn,
    reattachAfterDragRef,
  }
}
