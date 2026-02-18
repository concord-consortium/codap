import { ScaleBand, drag, pointer, select } from "d3"
import { observer } from "mobx-react-lite"
import { useCallback, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { mstAutorun } from "../../../../utilities/mst-autorun"
import { circleAnchor } from "../../../data-display/renderer"
import { IBarCover, IPlotProps } from "../../graphing-types"
import { useBinBoundaryDrag } from "../../hooks/use-bin-boundary-drag"
import { useBinnedPlotResponders } from "../../hooks/use-binned-plot-responders"
import { useDotPlot } from "../../hooks/use-dot-plot"
import { usePlotResponders } from "../../hooks/use-plot"
import { isBinnedPlotModel } from "./histogram-model"
import { SubPlotCells } from "../../models/sub-plot-cells"
import { setPointCoordinates } from "../../utilities/graph-utils"
import { renderBarCovers } from "../bar-utils"
import { kEmptyBinDetails } from "../binned-dot-plot/bin-details"
import { computeBinPlacements } from "../dot-plot/dot-plot-utils"

const kEdgeThreshold = 6 // pixels from bar edge to trigger resize cursor/drag

export const Histogram = observer(function Histogram({ abovePointsGroupRef, renderer }: IPlotProps) {
  const { dataset, dataConfig, graphModel, isAnimating, layout, getPrimaryScreenCoord, getSecondaryScreenCoord,
          pointColor, pointStrokeColor, primaryAttrRole, primaryAxisScale, primaryIsBottom, primaryPlace,
          refreshPointSelection, secondaryAttrRole } = useDotPlot(renderer)
  const binnedPlot = isBinnedPlotModel(graphModel.plot) ? graphModel.plot : undefined
  const barCoversRef = useRef<SVGGElement>(null)
  // Track which bin boundary index the mouse is near (for drag start), -1 if not near any
  const nearBinIndexRef = useRef<number>(-1)

  const {
    handleDragBinBoundaryStart, handleDragBinBoundary, handleDragBinBoundaryEndFn,
    reattachAfterDragRef,
  } = useBinBoundaryDrag({
    binnedPlot, dataConfig, graphModel, layout, primaryAxisScale, primaryIsBottom, primaryPlace
  })

  /**
   * Given a mouse event on a bar cover, determine if the mouse is near a draggable bin boundary edge.
   * Returns the bin boundary index (for use with binDetails.getBinEdge) or -1 if not near an edge.
   */
  const getNearBinBoundaryIndex = useCallback((event: MouseEvent) => {
    if (!binnedPlot || !barCoversRef.current) return -1
    const { binWidth, minBinEdge, totalNumberOfBins } = binnedPlot.binDetails()
    if (binWidth === undefined) return -1
    const [mx, my] = pointer(event, barCoversRef.current)
    const mousePos = primaryIsBottom ? mx : my
    const numRepetitions = dataConfig?.numRepetitionsForPlace(primaryPlace) ?? 1
    const primaryLength = layout.getAxisLength(primaryPlace)
    const bandWidth = primaryLength / numRepetitions
    for (let repetition = 0; repetition < numRepetitions; repetition++) {
      for (let binNumber = 1; binNumber < totalNumberOfBins; binNumber++) {
        const boundaryPos = repetition * bandWidth +
          primaryAxisScale(minBinEdge + binNumber * binWidth) / numRepetitions
        if (Math.abs(mousePos - boundaryPos) <= kEdgeThreshold) {
          // Return the bin index to the left of this boundary (same convention as binned dot plot)
          return binNumber - 1
        }
      }
    }
    return -1
  }, [binnedPlot, dataConfig, layout, primaryAxisScale, primaryIsBottom, primaryPlace])

  const addHistogramBinDragHandlers = useCallback(() => {
    if (!barCoversRef.current || !binnedPlot) return
    const barCoverRects = select(barCoversRef.current)
      .selectAll<SVGRectElement, IBarCover>("rect.bar-cover")

    // Add mousemove handler for cursor changes
    barCoverRects
      .on("mousemove.binDrag", function(event: MouseEvent) {
        const binIdx = getNearBinBoundaryIndex(event)
        nearBinIndexRef.current = binIdx
        if (binIdx >= 0) {
          select(this).style("cursor", primaryIsBottom ? "col-resize" : "row-resize")
        } else {
          select(this).style("cursor", null)
        }
      })
      .on("mouseleave.binDrag", function() {
        nearBinIndexRef.current = -1
        select(this).style("cursor", null)
      })

    // Add D3 drag behavior, filtered to only start when near a bin edge
    barCoverRects.call(
      drag<SVGRectElement, IBarCover>()
        .filter((event: MouseEvent) => {
          const binIdx = getNearBinBoundaryIndex(event)
          nearBinIndexRef.current = binIdx
          return binIdx >= 0
        })
        .on("start", (e: MouseEvent) => handleDragBinBoundaryStart(e, nearBinIndexRef.current))
        .on("drag", (e: MouseEvent) => handleDragBinBoundary(e))
        .on("end", () => handleDragBinBoundaryEndFn.current())
    )
  }, [binnedPlot, getNearBinBoundaryIndex, handleDragBinBoundary, handleDragBinBoundaryStart,
      handleDragBinBoundaryEndFn, primaryIsBottom])

  // Tell the hook to use histogram-specific handler re-attachment after drag end
  reattachAfterDragRef.current = addHistogramBinDragHandlers

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
      binDetails = binnedPlot?.binDetails() ?? kEmptyBinDetails,
      subPlotCells = new SubPlotCells(layout, dataConfig),
      { secondaryNumericUnitLength } = subPlotCells

    const binPlacementProps = {
      binDetails, dataConfig, dataset, extraPrimaryAttrID, extraSecondaryAttrID, layout, numExtraPrimaryBands,
      pointDiameter, primaryAttrID, primaryAxisScale, primaryPlace, secondaryAttrID, secondaryBandwidth
    }
    if (!binDetails?.binWidth) return

    const { bins } = computeBinPlacements(binPlacementProps)
    const primaryScaleDiff = primaryAxisScale(binDetails.binWidth) - primaryAxisScale(0)
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
                  class: `bar-cover bar-cover-${cellIndex} draggable-bin-boundary`,
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
      renderBarCovers({ barCovers, barCoversRef, graphModel, primaryAttrRole })
    }

    // Add edge detection and drag handlers to bar covers for bin boundary resizing
    if (!binnedPlot?.isDraggingBinBoundary) {
      addHistogramBinDragHandlers()
    }

    setPointCoordinates({
      anchor: circleAnchor,
      pointRadius: graphModel.getPointRadius(),
      selectedPointRadius: graphModel.getPointRadius("select"),
      renderer, selectedOnly, pointColor, pointStrokeColor, getWidth, getHeight,
      getScreenX, getScreenY, getLegendColor, getAnimationEnabled: isAnimating,
      pointDisplayType: "bars", dataset, pointsFusedIntoBars: true
    })
  }, [abovePointsGroupRef, addHistogramBinDragHandlers, binnedPlot, dataConfig, dataset,
      getPrimaryScreenCoord, getSecondaryScreenCoord, graphModel, isAnimating, layout, renderer, pointColor,
      pointStrokeColor, primaryAttrRole, primaryAxisScale, primaryIsBottom, primaryPlace, secondaryAttrRole])

  usePlotResponders({renderer, refreshPointPositions, refreshPointSelection})
  useBinnedPlotResponders(refreshPointPositions)

  // when points are fused into bars, update renderer and set the secondary axis scale type to linear
  useEffect(function handleFuseIntoBars() {
    return mstAutorun(
      () => {
        if (renderer) {
          renderer.pointsFusedIntoBars = graphModel.pointsFusedIntoBars
        }
        if (graphModel.pointsFusedIntoBars) {
          const secondaryRole = graphModel.dataConfiguration.primaryRole === "x" ? "y" : "x"
          const secondaryPlace = secondaryRole === "y" ? "left" : "bottom"
          layout.setAxisScaleType(secondaryPlace, "linear")
        }
      },
      {name: "useAxis [handleFuseIntoBars]"}, graphModel
    )
  }, [graphModel, layout, renderer])

  return (
    <>
      {abovePointsGroupRef?.current && createPortal(
        <g ref={barCoversRef}/>,
        abovePointsGroupRef.current
      )}
    </>
  )
})
