import {ScaleBand, ScaleLinear, drag, select} from "d3"
import {observer} from "mobx-react-lite"
import React, {useCallback, useEffect, useRef} from "react"
import { createPortal } from "react-dom"
import { clsx } from "clsx"
import { useInstanceIdContext } from "../../../../hooks/use-instance-id-context"
import { LogMessageFn, logModelChangeFn } from "../../../../lib/log-message"
import { isFiniteNumber } from "../../../../utilities/math-utils"
import { mstReaction } from "../../../../utilities/mst-reaction"
import { t } from "../../../../utilities/translation/translate"
import {circleAnchor} from "../../../data-display/pixi/pixi-points"
import {IPlotProps} from "../../graphing-types"
import { useBinnedPlotResponders } from "../../hooks/use-binned-plot-responders"
import { useDotPlot } from "../../hooks/use-dot-plot"
import { useDotPlotDragDrop } from "../../hooks/use-dot-plot-drag-drop"
import {usePixiDragHandlers, usePlotResponders} from "../../hooks/use-plot"
import { setPointCoordinates } from "../../utilities/graph-utils"
import { isBinnedDotPlotModel } from "./binned-dot-plot-model"

const screenWidthToWorldWidth = (scale: ScaleLinear<number, number>, screenWidth: number) => {
  return Math.abs(scale.invert(screenWidth) - scale.invert(0))
}

const worldWidthToScreenWidth = (scale: ScaleLinear<number, number>, worldWidth: number) => {
  return Math.abs(scale(worldWidth) - scale(0))
}

export const BinnedDotPlot = observer(function BinnedDotPlot({pixiPoints, abovePointsGroupRef}: IPlotProps) {
  const { dataset, dataConfig, getPrimaryScreenCoord, getSecondaryScreenCoord, graphModel, isAnimating, layout,
          pointColor, pointDisplayType, pointStrokeColor, primaryAxisScale, primaryIsBottom, primaryPlace,
          refreshPointSelection } = useDotPlot(pixiPoints)
  const binnedPlot = isBinnedDotPlotModel(graphModel.plot) ? graphModel.plot : undefined
  const instanceId = useInstanceIdContext()
  const kMinBinScreenWidth = 20
  const primaryAxisModel = graphModel.getNumericAxis(primaryPlace)
  const binBoundariesRef = useRef<SVGGElement>(null)
  const primaryAxisScaleCopy = useRef<ScaleLinear<number, number>>(primaryAxisScale.copy())
  const lowerBoundaryRef = useRef<number>(0)
  const logFn = useRef<Maybe<LogMessageFn>>()
  const handleDragBinBoundaryEndFn = useRef<() => void>(() => {})

  const { onDrag, onDragEnd, onDragStart } = useDotPlotDragDrop()
  usePixiDragHandlers(pixiPoints, {start: onDragStart, drag: onDrag, end: onDragEnd})

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
    const { binWidth, minBinEdge } = binnedPlot.binDetails()
    if (binWidth !== undefined) {
      const newBinAlignment = minBinEdge + binIndex * binWidth
      lowerBoundaryRef.current = primaryAxisScale(newBinAlignment)
      binnedPlot.setActiveBinAlignment(newBinAlignment)
    }
  }, [binnedPlot, dataConfig, primaryAxisScale])

  const handleDragBinBoundary = useCallback((event: MouseEvent) => {
    if (!dataConfig || !binnedPlot) return
    const dragValue = primaryIsBottom ? event.x : event.y
    const screenBinWidth = Math.max(kMinBinScreenWidth, Math.abs(dragValue - lowerBoundaryRef.current))
    const worldBinWidth = screenWidthToWorldWidth(primaryAxisScaleCopy.current, screenBinWidth)
    binnedPlot.setActiveBinWidth(worldBinWidth)
  }, [binnedPlot, dataConfig, primaryIsBottom])

  const addBinBoundaryDragHandlers = useCallback(() => {
    const binBoundariesArea = select(binBoundariesRef.current)
    const binBoundaryCovers = binBoundariesArea.selectAll<SVGPathElement, unknown>("path.draggable-bin-boundary-cover")
    binBoundaryCovers.each(function(d, i) {
      select(this).call(
        drag<SVGPathElement, unknown>()
          .on("start", (e) => handleDragBinBoundaryStart(e, i))
          .on("drag", (e) => handleDragBinBoundary(e))
          .on("end", handleDragBinBoundaryEndFn.current)
      )
    })
  }, [handleDragBinBoundary, handleDragBinBoundaryStart])

  handleDragBinBoundaryEndFn.current = useCallback(() => {
    if (!binnedPlot) return
    binnedPlot.setDragBinIndex(-1)
    drawBinBoundaries()
    addBinBoundaryDragHandlers()
    binnedPlot.applyModelChange(
      () => {
        if (binnedPlot.binAlignment && binnedPlot.binWidth) {
          binnedPlot.endBinBoundaryDrag(binnedPlot.binAlignment, binnedPlot.binWidth)
        }
        lowerBoundaryRef.current = 0
      }, {
        undoStringKey: "DG.Undo.graph.dragBinBoundary",
        redoStringKey: "DG.Redo.graph.dragBinBoundary",
        log: logFn.current
      }
    )
  }, [addBinBoundaryDragHandlers, binnedPlot, drawBinBoundaries])

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
    if (!dataConfig || !binnedPlot) return

    // Draw lines to delineate the bins in the plot
    drawBinBoundaries()
    if (!binnedPlot.isDraggingBinBoundary) {
      addBinBoundaryDragHandlers()
    }

    const getScreenX = primaryIsBottom ? getPrimaryScreenCoord : getSecondaryScreenCoord
    const getScreenY = primaryIsBottom ? getSecondaryScreenCoord : getPrimaryScreenCoord

    const getLegendColor = dataConfig?.attributeID("legend")
      ? dataConfig?.getLegendColorForCase : undefined

    setPointCoordinates({
      pointRadius: graphModel.getPointRadius(),
      selectedPointRadius: graphModel.getPointRadius("select"),
      pixiPoints, selectedOnly, pointColor, pointStrokeColor,
      getScreenX, getScreenY, getLegendColor, getAnimationEnabled: isAnimating,
      pointDisplayType, anchor: circleAnchor, dataset
    })
  }, [addBinBoundaryDragHandlers, binnedPlot, dataConfig, dataset, drawBinBoundaries,
      getPrimaryScreenCoord, getSecondaryScreenCoord, graphModel, isAnimating,
      pixiPoints, pointColor, pointDisplayType, pointStrokeColor, primaryIsBottom])

  usePlotResponders({pixiPoints, refreshPointPositions, refreshPointSelection})
  useBinnedPlotResponders(refreshPointPositions)

  // If the pixel width of graphModel.binWidth would be less than kMinBinPixelWidth, set it to kMinBinPixelWidth.
  useEffect(function enforceMinBinPixelWidth() {
    return mstReaction(
      () => binnedPlot?.binWidth,
      () => {
        if (binnedPlot?.binWidth && primaryAxisScale) {
          if (worldWidthToScreenWidth(primaryAxisScale, binnedPlot.binWidth) < kMinBinScreenWidth) {
            const newBinWidth = screenWidthToWorldWidth(primaryAxisScale, kMinBinScreenWidth)
            binnedPlot.setBinWidth(newBinWidth)
          }
        }
      }, {name: "enforceMinBinPixelWidth"}, binnedPlot
    )
  }, [binnedPlot, primaryAxisScale])

  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  primaryAxisModel?.labelsAreRotated  // Observe labelsAreRotated to force re-render
  return (
    abovePointsGroupRef?.current && createPortal(
      <><g data-testid={`bin-ticks-${instanceId}`} className="bin-ticks" ref={binBoundariesRef}/></>,
      abovePointsGroupRef.current
    )
  )
})
