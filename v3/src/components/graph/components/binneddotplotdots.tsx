import {ScaleBand, ScaleLinear, drag, select} from "d3"
import {observer} from "mobx-react-lite"
import React, {useCallback, useEffect, useRef} from "react"
import { createPortal } from "react-dom"
import { clsx } from "clsx"
import {PlotProps} from "../graphing-types"
import {usePixiDragHandlers, usePlotResponders} from "../hooks/use-plot"
import {circleAnchor} from "../../data-display/pixi/pixi-points"
import { setPointCoordinates } from "../utilities/graph-utils"
import { useInstanceIdContext } from "../../../hooks/use-instance-id-context"
import { useDotPlotDragDrop } from "../hooks/use-dot-plot-drag-drop"
import { mstReaction } from "../../../utilities/mst-reaction"
import { t } from "../../../utilities/translation/translate"
import { isFiniteNumber } from "../../../utilities/math-utils"
import { useDotPlot } from "../hooks/use-dot-plot"
import { useDotPlotResponders } from "../hooks/use-dot-plot-responders"

const screenWidthToWorldWidth = (scale: ScaleLinear<number, number>, screenWidth: number) => {
  return Math.abs(scale.invert(screenWidth) - scale.invert(0))
}

const worldWidthToScreenWidth = (scale: ScaleLinear<number, number>, worldWidth: number) => {
  return Math.abs(scale(worldWidth) - scale(0))
}

export const BinnedDotPlotDots = observer(function BinnedDotPlotDots(props: PlotProps) {
  const {pixiPoints, abovePointsGroupRef} = props
  const { dataset, dataConfig, getPrimaryScreenCoord, getSecondaryScreenCoord, graphModel, isAnimating, layout,
          pointColor, pointDisplayType, pointStrokeColor, primaryAxisScale, primaryIsBottom, primaryPlace,
          refreshPointSelection } = useDotPlot(pixiPoints)
  const instanceId = useInstanceIdContext()
  const kMinBinScreenWidth = 20
  const binBoundariesRef = useRef<SVGGElement>(null)
  const primaryAxisScaleCopy = useRef<ScaleLinear<number, number>>(primaryAxisScale.copy())
  const lowerBoundaryRef = useRef<number>(0)

  const { onDrag, onDragEnd, onDragStart } = useDotPlotDragDrop()
  usePixiDragHandlers(pixiPoints, {start: onDragStart, drag: onDrag, end: onDragEnd})

  const drawBinBoundaries = useCallback(() => {
    if (!dataConfig || !isFiniteNumber(graphModel.binAlignment) || !isFiniteNumber(graphModel.binWidth)) return
    const secondaryPlace = primaryIsBottom ? "left" : "bottom"
    const secondaryAxisScale = layout.getAxisScale(secondaryPlace) as ScaleBand<string>
    const secondaryAxisExtent = Math.abs(secondaryAxisScale.range()[0] - secondaryAxisScale.range()[1])
    const { binWidth, minBinEdge, totalNumberOfBins } = graphModel.binDetails()
    const binBoundariesArea = select(binBoundariesRef.current)

    binBoundariesArea.selectAll("path").remove()
    for (let i = 1; i < totalNumberOfBins; i++) {
      const primaryBoundaryOrigin = primaryAxisScale(minBinEdge + i * binWidth)
      const lineCoords = primaryIsBottom
        ? `M ${primaryBoundaryOrigin},0 L ${primaryBoundaryOrigin},${secondaryAxisExtent}`
        : `M 0,${primaryBoundaryOrigin} L ${secondaryAxisExtent},${primaryBoundaryOrigin}`
      const boundaryClasses = clsx(
        "draggable-bin-boundary",
        {dragging: i - 1 === graphModel.dragBinIndex},
        {lower: i === graphModel.dragBinIndex}
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
  }, [dataConfig, graphModel, layout, primaryAxisScale, primaryIsBottom])

  const handleDragBinBoundaryStart = useCallback((event: MouseEvent, binIndex: number) => {
    if (!dataConfig || !isFiniteNumber(graphModel.binAlignment) || !isFiniteNumber(graphModel.binWidth)) return
    primaryAxisScaleCopy.current = primaryAxisScale.copy()
    graphModel.setDragBinIndex(binIndex)
    const { binWidth, minBinEdge } = graphModel.binDetails()
    const newBinAlignment = minBinEdge + binIndex * binWidth
    lowerBoundaryRef.current = primaryAxisScale(newBinAlignment)
    graphModel.setDynamicBinAlignment(newBinAlignment)
  }, [dataConfig, graphModel, primaryAxisScale])

  const handleDragBinBoundary = useCallback((event: MouseEvent) => {
    if (!dataConfig) return
    const dragValue = primaryIsBottom ? event.x : event.y
    const screenBinWidth = Math.max(kMinBinScreenWidth, Math.abs(dragValue - lowerBoundaryRef.current))
    const worldBinWidth = screenWidthToWorldWidth(primaryAxisScaleCopy.current, screenBinWidth)
    graphModel.setDynamicBinWidth(worldBinWidth)
  }, [dataConfig, graphModel, primaryIsBottom])

  const handleDragBinBoundaryEnd = useCallback(() => {
    graphModel.applyModelChange(
      () => {
        if (graphModel.binAlignment && graphModel.binWidth) {
          graphModel.endBinBoundaryDrag(graphModel.binAlignment, graphModel.binWidth)
        }
        lowerBoundaryRef.current = 0
      }, {
        undoStringKey: "DG.Undo.graph.dragBinBoundary",
        redoStringKey: "DG.Redo.graph.dragBinBoundary"
      }
    )
  }, [graphModel])

  const addBinBoundaryDragHandlers = useCallback(() => {
    const binBoundariesArea = select(binBoundariesRef.current)
    const binBoundaryCovers = binBoundariesArea.selectAll<SVGPathElement, unknown>("path.draggable-bin-boundary-cover")
    binBoundaryCovers.each(function(d, i) {
      select(this).call(
        drag<SVGPathElement, unknown>()
          .on("start", (e) => handleDragBinBoundaryStart(e, i))
          .on("drag", (e) => handleDragBinBoundary(e))
          .on("end", handleDragBinBoundaryEnd)
      )
    })
  }, [handleDragBinBoundary, handleDragBinBoundaryEnd, handleDragBinBoundaryStart])

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
    if (!dataConfig) return

    const primaryAxis = graphModel.getNumericAxis(primaryPlace)
    const { maxBinEdge, minBinEdge } = graphModel.binDetails()

    // Set the domain of the primary axis to the extent of the bins
    primaryAxis?.setDomain(minBinEdge, maxBinEdge)

    // Draw lines to delineate the bins in the plot
    drawBinBoundaries()
    if (!graphModel.isBinBoundaryDragging) {
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
  }, [addBinBoundaryDragHandlers, dataConfig, dataset, drawBinBoundaries, getPrimaryScreenCoord,
      getSecondaryScreenCoord, graphModel, isAnimating, pixiPoints, pointColor, pointDisplayType, pointStrokeColor,
      primaryIsBottom, primaryPlace])

  usePlotResponders({pixiPoints, refreshPointPositions, refreshPointSelection})
  useDotPlotResponders(refreshPointPositions)

  // If the pixel width of graphModel.binWidth would be less than kMinBinPixelWidth, set it to kMinBinPixelWidth.
  useEffect(function enforceMinBinPixelWidth() {
    return mstReaction(
      () => graphModel.binWidth,
      () => {
        if (graphModel.binWidth && primaryAxisScale) {
          if (worldWidthToScreenWidth(primaryAxisScale, graphModel.binWidth) < kMinBinScreenWidth) {
            const newBinWidth = screenWidthToWorldWidth(primaryAxisScale, kMinBinScreenWidth)
            graphModel.setBinWidth(newBinWidth)
          }
        }
      }, {name: "enforceMinBinPixelWidth"}, graphModel
    )
  }, [graphModel, primaryAxisScale])

  return (
    abovePointsGroupRef?.current && createPortal(
      <><g data-testid={`bin-ticks-${instanceId}`} className="bin-ticks" ref={binBoundariesRef}/></>,
      abovePointsGroupRef.current
    )
  )
})
