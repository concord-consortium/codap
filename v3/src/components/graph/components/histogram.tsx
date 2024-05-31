import { ScaleBand, ScaleLinear, drag, select } from "d3"
import { observer } from "mobx-react-lite"
import React, { useCallback, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { clsx } from "clsx"
import { IBarCover, PlotProps } from "../graphing-types"
import { usePixiDragHandlers, usePlotResponders } from "../hooks/use-plot"
import { setPointCoordinates } from "../utilities/graph-utils"
import { mstAutorun } from "../../../utilities/mst-autorun"
import { computeBinPlacements } from "../utilities/dot-plot-utils"
import { useDotPlot } from "../hooks/use-dot-plot"
import { useDotPlotResponders } from "../hooks/use-dot-plot-responders"
import { renderBarCovers } from "../utilities/bar-utils"
import { SubPlotCells } from "../models/sub-plot-cells"
import { useDotPlotDragDrop } from "../hooks/use-dot-plot-drag-drop"
import { isFiniteNumber } from "../../../utilities/math-utils"
import { t } from "../../../utilities/translation/translate"
import { useInstanceIdContext } from "../../../hooks/use-instance-id-context"

const screenWidthToWorldWidth = (scale: ScaleLinear<number, number>, screenWidth: number) => {
  return Math.abs(scale.invert(screenWidth) - scale.invert(0))
}

// const worldWidthToScreenWidth = (scale: ScaleLinear<number, number>, worldWidth: number) => {
//   return Math.abs(scale(worldWidth) - scale(0))
// }

export const Histogram = observer(function Histogram({ abovePointsGroupRef, pixiPoints }: PlotProps) {
  const { dataset, dataConfig, graphModel, isAnimating, layout, getPrimaryScreenCoord, getSecondaryScreenCoord,
          pointColor, pointStrokeColor, primaryAttrRole, primaryAxisScale, primaryIsBottom, primaryPlace,
          refreshPointSelection, secondaryAttrRole } = useDotPlot(pixiPoints)
  const instanceId = useInstanceIdContext()
  const barCoversRef = useRef<SVGGElement>(null)
  const pointDisplayType = "histogram"
  const binBoundariesRef = useRef<SVGGElement>(null)
  const primaryAxisScaleCopy = useRef<ScaleLinear<number, number>>(primaryAxisScale.copy())
  const kMinBinScreenWidth = 20
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
    const binBoundaryArea = select(binBoundariesRef.current)
    const binBoundaries = binBoundaryArea.selectAll<SVGPathElement, unknown>("path.draggable-bin-boundary-cover")
    binBoundaries.each(function(d, i) {
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

    const secondaryPlace = primaryIsBottom ? "left" : "bottom",
      extraPrimaryPlace = primaryIsBottom ? "top" : "rightCat",
      extraPrimaryRole = primaryIsBottom ? "topSplit" : "rightSplit",
      extraSecondaryPlace = primaryIsBottom ? "rightCat" : "top",
      extraSecondaryRole = primaryIsBottom ? "rightSplit" : "topSplit",
      extraPrimaryAxisScale = layout.getAxisScale(extraPrimaryPlace) as ScaleBand<string>,
      secondaryAxisScale = layout.getAxisScale(secondaryPlace) as ScaleBand<string>,
      extraSecondaryAxisScale = layout.getAxisScale(extraSecondaryPlace) as ScaleBand<string>,
      primaryAttrID = dataConfig?.attributeID(primaryAttrRole) ?? "",
      extraPrimaryAttrID = dataConfig?.attributeID(extraPrimaryRole) ?? "",
      numExtraPrimaryBands = Math.max(1, extraPrimaryAxisScale?.domain().length ?? 1),
      pointDiameter = 2 * graphModel.getPointRadius(),
      secondaryAttrID = dataConfig?.attributeID(secondaryAttrRole) ?? "",
      extraSecondaryAttrID = dataConfig?.attributeID(extraSecondaryRole) ?? "",
      secondaryAxisExtent = Math.abs(Number(secondaryAxisScale.range()[0] - secondaryAxisScale.range()[1])),
      fullSecondaryBandwidth = secondaryAxisScale.bandwidth?.() ?? secondaryAxisExtent,
      numExtraSecondaryBands = Math.max(1, extraSecondaryAxisScale?.domain().length ?? 1),
      secondaryBandwidth = fullSecondaryBandwidth / numExtraSecondaryBands,
      { binWidth, minBinEdge, totalNumberOfBins } = graphModel.binDetails(),
      subPlotCells = new SubPlotCells(layout, dataConfig),
      { secondaryNumericUnitLength } = subPlotCells

    // Draw lines to delineate the bins in the plot
    drawBinBoundaries()
    if (!graphModel.isBinBoundaryDragging) {
      addBinBoundaryDragHandlers()
    }

    const binPlacementProps = {
      binWidth, dataConfig, dataset, extraPrimaryAttrID, extraSecondaryAttrID, layout, minBinEdge,
      numExtraPrimaryBands, pointDiameter, primaryAttrID, primaryAxisScale, primaryPlace, secondaryAttrID,
      secondaryBandwidth, totalNumberOfBins
    }
    const { bins } = computeBinPlacements(binPlacementProps)
    const primaryScaleDiff = primaryAxisScale(binWidth) - primaryAxisScale(0)
    const getWidth = () => primaryIsBottom ? primaryScaleDiff / numExtraPrimaryBands : secondaryNumericUnitLength
    const getHeight = () => primaryIsBottom ? secondaryNumericUnitLength : -primaryScaleDiff / numExtraPrimaryBands
    const getScreenX = primaryIsBottom ? getPrimaryScreenCoord : getSecondaryScreenCoord
    const getScreenY = primaryIsBottom ? getSecondaryScreenCoord : getPrimaryScreenCoord
    const getLegendColor = dataConfig?.attributeID("legend") ? dataConfig?.getLegendColorForCase : undefined

    // build and render bar cover elements that will handle click events for the fused points
    if (dataConfig && abovePointsGroupRef?.current) {
      const uniqueBarCovers = new Map<string, IBarCover>()
      Object.keys(bins).forEach(primeCat => {
        Object.keys(bins[primeCat]).forEach(secCat => {
          Object.keys(bins[primeCat][secCat]).forEach(primeSplitCat => {
            Object.keys(bins[primeCat][secCat][primeSplitCat]).forEach(secSplitCat => {
              const cellData = bins[primeCat][secCat][primeSplitCat]
              cellData.forEach((cell, cellIndex) => {
                if (cell.length === 0) return
                const barSecondaryDimension = secondaryNumericUnitLength * cell.length
                const barWidth = primaryIsBottom
                                   ? primaryScaleDiff / numExtraPrimaryBands
                                   : barSecondaryDimension
                const barHeight = primaryIsBottom
                                    ? barSecondaryDimension
                                    : -primaryScaleDiff / numExtraPrimaryBands
                const x = primaryIsBottom
                            ? getPrimaryScreenCoord(cell[0]) - barWidth / 2
                            : getSecondaryScreenCoord(cell[0]) - secondaryNumericUnitLength / 2
                const y = primaryIsBottom
                            ? getSecondaryScreenCoord(cell[0]) - barHeight + secondaryNumericUnitLength / 2
                            : getPrimaryScreenCoord(cell[0]) - barHeight / 2
                const key = `${primeCat}-${secCat}-${primeSplitCat}-${cellIndex}`
                const cover = {
                  caseIDs: cell,
                  class: `bar-cover bar-cover-${cellIndex} histogram-bar-cover`,
                  primeCat, secCat, primeSplitCat, secSplitCat,
                  x: x.toString(), y: y.toString(),
                  width: barWidth.toString(), height: barHeight.toString()
                }
                if (!uniqueBarCovers.has(key)) uniqueBarCovers.set(key, cover)
              })
            })
          })
        })
      })
      const barCovers: IBarCover[] = Array.from(uniqueBarCovers.entries()).map(([_, cover]) => cover)
      renderBarCovers({ barCovers, barCoversRef, dataConfig, primaryAttrRole })
    }

    setPointCoordinates({
      pointRadius: graphModel.getPointRadius(),
      selectedPointRadius: graphModel.getPointRadius("select"),
      pixiPoints, selectedOnly, pointColor, pointStrokeColor, getWidth, getHeight,
      getScreenX, getScreenY, getLegendColor, getAnimationEnabled: isAnimating,
      pointDisplayType, dataset, pointsFusedIntoBars: true
    })
  }, [abovePointsGroupRef, dataConfig, dataset, getPrimaryScreenCoord, getSecondaryScreenCoord, graphModel,
      isAnimating, layout, pixiPoints, pointColor, pointStrokeColor, primaryAttrRole, primaryAxisScale,
      primaryIsBottom, primaryPlace, secondaryAttrRole])

  usePlotResponders({pixiPoints, refreshPointPositions, refreshPointSelection})
  useDotPlotResponders(refreshPointPositions)

  // when points are fused into bars, update pixiPoints and set the secondary axis scale type to linear
  useEffect(function handleFuseIntoBars() {
    return mstAutorun(
      () => {
        if (pixiPoints) {
          pixiPoints.pointsFusedIntoBars = graphModel.pointsFusedIntoBars
        }
        if (graphModel.pointsFusedIntoBars) {
          const secondaryRole = graphModel.dataConfiguration.primaryRole === "x" ? "y" : "x"
          const secondaryPlace = secondaryRole === "y" ? "left" : "bottom"
          layout.setAxisScaleType(secondaryPlace, "linear")
        }
      },
      {name: "useAxis [handleFuseIntoBars]"}, graphModel
    )
  }, [graphModel, layout, pixiPoints])

  return (
    <>
      {abovePointsGroupRef?.current && createPortal(
        <>
          <g ref={barCoversRef}/>
          <g data-testid={`bin-ticks-${instanceId}`} className="bin-ticks" ref={binBoundariesRef}/>
        </>,
        abovePointsGroupRef.current
      )}
    </>
  )
})
