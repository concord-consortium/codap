import {ScaleBand, ScaleLinear, drag, select} from "d3"
import { comparer } from "mobx"
import {observer} from "mobx-react-lite"
import React, {useCallback, useEffect, useRef} from "react"
import { createPortal } from "react-dom"
import { clsx } from "clsx"
import {PlotProps} from "../graphing-types"
import {setPointSelection} from "../../data-display/data-display-utils"
import {useDataDisplayAnimation} from "../../data-display/hooks/use-data-display-animation"
import {usePixiDragHandlers, usePlotResponders} from "../hooks/use-plot"
import {useGraphDataConfigurationContext} from "../hooks/use-graph-data-configuration-context"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {useGraphContentModelContext} from "../hooks/use-graph-content-model-context"
import {useGraphLayoutContext} from "../hooks/use-graph-layout-context"
import {circleAnchor} from "../utilities/pixi-points"
import { setPointCoordinates } from "../utilities/graph-utils"
import { useInstanceIdContext } from "../../../hooks/use-instance-id-context"
import { computeBinPlacements, computePrimaryCoord, computeSecondaryCoord, adjustCoordForStacks,
         determineBinForCase} from "../utilities/dot-plot-utils"
import { useDotPlotDragDrop } from "../hooks/use-dot-plot-drag-drop"
import { AxisPlace } from "../../axis/axis-types"
import { mstReaction } from "../../../utilities/mst-reaction"
import { t } from "../../../utilities/translation/translate"
import { isFiniteNumber } from "../../../utilities/math-utils"

const screenWidthToWorldWidth = (scale: ScaleLinear<number, number>, screenWidth: number) => {
  return Math.abs(scale.invert(screenWidth) - scale.invert(0))
}

const worldWidthToScreenWidth = (scale: ScaleLinear<number, number>, worldWidth: number) => {
  return Math.abs(scale(worldWidth) - scale(0))
}

export const BinnedDotPlotDots = observer(function BinnedDotPlotDots(props: PlotProps) {
  const {pixiPoints, abovePointsGroupRef} = props,
    graphModel = useGraphContentModelContext(),
    instanceId = useInstanceIdContext(),
    { isAnimating } = useDataDisplayAnimation(),
    dataConfig = useGraphDataConfigurationContext(),
    dataset = useDataSetContext(),
    layout = useGraphLayoutContext(),
    primaryAttrRole = dataConfig?.primaryRole ?? "x",
    primaryIsBottom = primaryAttrRole === "x",
    primaryPlace: AxisPlace = primaryIsBottom ? "bottom" : "left",
    primaryAxisScale = layout.getAxisScale(primaryPlace) as ScaleLinear<number, number>,
    secondaryAttrRole = primaryAttrRole === "x" ? "y" : "x",
    {pointColor, pointStrokeColor} = graphModel.pointDescription,
    pointDisplayType = graphModel.pointDisplayType,
    kMinBinScreenWidth = 20,
    binBoundariesRef = useRef<SVGGElement>(null),
    primaryAxisScaleCopy = useRef<ScaleLinear<number, number>>(primaryAxisScale.copy()),
    lowerBoundaryRef = useRef<number>(0)

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
    graphModel.applyUndoableAction(
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

  const refreshPointSelection = useCallback(() => {
    dataConfig && setPointSelection({
      pixiPoints, dataConfiguration: dataConfig, pointRadius: graphModel.getPointRadius(),
      pointColor, pointStrokeColor, selectedPointRadius: graphModel.getPointRadius("select"),
      pointDisplayType
    })
  }, [dataConfig, graphModel, pixiPoints, pointColor, pointStrokeColor, pointDisplayType])

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
    if (!dataConfig) return

    const secondaryPlace = primaryIsBottom ? "left" : "bottom",
      extraPrimaryPlace = primaryIsBottom ? "top" : "rightCat",
      extraPrimaryRole = primaryIsBottom ? "topSplit" : "rightSplit",
      extraSecondaryPlace = primaryIsBottom ? "rightCat" : "top",
      extraSecondaryRole = primaryIsBottom ? "rightSplit" : "topSplit",
      primaryAxis = graphModel.getNumericAxis(primaryPlace),
      extraPrimaryAxisScale = layout.getAxisScale(extraPrimaryPlace) as ScaleBand<string>,
      secondaryAxisScale = layout.getAxisScale(secondaryPlace) as ScaleBand<string>,
      extraSecondaryAxisScale = layout.getAxisScale(extraSecondaryPlace) as ScaleBand<string>,
      primaryAttrID = dataConfig?.attributeID(primaryAttrRole) ?? "",
      extraPrimaryAttrID = dataConfig?.attributeID(extraPrimaryRole) ?? "",
      numExtraPrimaryBands = Math.max(1, extraPrimaryAxisScale?.domain().length ?? 1),
      pointDiameter = 2 * graphModel.getPointRadius(),
      secondaryAttrID = dataConfig?.attributeID(secondaryAttrRole) ?? "",
      extraSecondaryAttrID = dataConfig?.attributeID(extraSecondaryRole) ?? "",
      secondaryRangeIndex = primaryIsBottom ? 0 : 1,
      secondaryMax = Number(secondaryAxisScale.range()[secondaryRangeIndex]),
      secondaryAxisExtent = Math.abs(Number(secondaryAxisScale.range()[0] - secondaryAxisScale.range()[1])),
      fullSecondaryBandwidth = secondaryAxisScale.bandwidth?.() ?? secondaryAxisExtent,
      numExtraSecondaryBands = Math.max(1, extraSecondaryAxisScale?.domain().length ?? 1),
      secondaryBandwidth = fullSecondaryBandwidth / numExtraSecondaryBands,
      extraSecondaryBandwidth = (extraSecondaryAxisScale.bandwidth?.() ?? secondaryAxisExtent),
      secondarySign = primaryIsBottom ? -1 : 1,
      baseCoord = primaryIsBottom ? secondaryMax : 0,
      { binWidth, maxBinEdge, minBinEdge, totalNumberOfBins } = graphModel.binDetails()

    // Set the domain of the primary axis to the extent of the bins
    primaryAxis?.setDomain(minBinEdge, maxBinEdge)

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
    const { bins, binMap } = computeBinPlacements(binPlacementProps)
    const overlap = 0

    const getPrimaryScreenCoord = (anID: string) => {
      const computePrimaryCoordProps = {
        anID, binWidth, dataset, extraPrimaryAttrID, extraPrimaryAxisScale, isBinned: true, minBinEdge,
        numExtraPrimaryBands, primaryAttrID, primaryAxisScale, totalNumberOfBins
      }
      const { primaryCoord, extraPrimaryCoord } = computePrimaryCoord(computePrimaryCoordProps)
      let primaryScreenCoord = primaryCoord + extraPrimaryCoord
      const caseValue = dataset?.getNumeric(anID, primaryAttrID) ?? -1
      const binForCase = determineBinForCase(caseValue, binWidth, minBinEdge)
      primaryScreenCoord = adjustCoordForStacks({
        anID, axisType: "primary", binForCase, binMap, bins, pointDiameter, secondaryBandwidth,
        screenCoord: primaryScreenCoord, primaryIsBottom
      })

      return primaryScreenCoord
    }
    
    const getSecondaryScreenCoord = (anID: string) => {
      const { category: secondaryCat, extraCategory: extraSecondaryCat, indexInBin } = binMap[anID]
      const onePixelOffset = primaryIsBottom ? -1 : 1
      const secondaryCoordProps = {
        baseCoord, extraSecondaryAxisScale, extraSecondaryBandwidth, extraSecondaryCat, indexInBin,
        numExtraSecondaryBands, overlap, pointDiameter, primaryIsBottom, secondaryAxisExtent,
        secondaryAxisScale, secondaryBandwidth, secondaryCat, secondarySign
      }
      let secondaryScreenCoord = computeSecondaryCoord(secondaryCoordProps) + onePixelOffset
      const casePrimaryValue = dataset?.getNumeric(anID, primaryAttrID) ?? -1
      const binForCase = determineBinForCase(casePrimaryValue, binWidth, minBinEdge)
      secondaryScreenCoord = adjustCoordForStacks({
        anID, axisType: "secondary", binForCase, binMap, bins, pointDiameter, secondaryBandwidth,
        screenCoord: secondaryScreenCoord, primaryIsBottom
      })

      return secondaryScreenCoord
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
      pointDisplayType, anchor: circleAnchor
    })
  },
  [dataConfig, primaryIsBottom, graphModel, primaryPlace, layout, primaryAttrRole, secondaryAttrRole,
   drawBinBoundaries, dataset, primaryAxisScale, pixiPoints, pointColor, pointStrokeColor, isAnimating,
   pointDisplayType, addBinBoundaryDragHandlers])

  usePlotResponders({pixiPoints, refreshPointPositions, refreshPointSelection})

  // Respond to binAlignment and binWidth changes. We include both the volatile and non-volatile versions of these
  // properties. Changes to the volatile versions occur during bin boundary dragging and result in the appropriate
  // behavior during a drag. Changes to the non-volatile versions occur when a drag ends (or the user sets the bin
  // and alignment values via the form fields) and result in the behavior required when bin boundary dragging ends.
  useEffect(function respondToGraphBinSettings() {
    return mstReaction(
      () => [graphModel._binAlignment, graphModel._binWidth, graphModel.binAlignment, graphModel.binWidth],
      () => refreshPointPositions(false),
      {name: "respondToGraphBinSettings", equals: comparer.structural}, graphModel)
  }, [dataset, graphModel, refreshPointPositions])

  // Initialize binWidth and binAlignment on the graph model if they haven't been defined yet.
  // This can happen when a CODAP document containing a graph with binned points is imported.
  useEffect(function setInitialBinSettings() {
    if (!dataConfig) return
    if (graphModel.binWidth === undefined || graphModel.binAlignment === undefined) {
      const { binAlignment, binWidth } = graphModel.binDetails({ initialize: true })
      graphModel.applyUndoableAction(() => {
        graphModel.setBinWidth(binWidth)
        graphModel.setBinAlignment(binAlignment)
      })
    }
  })

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
