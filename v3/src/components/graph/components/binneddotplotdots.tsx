import {ScaleBand, ScaleLinear, select} from "d3"
import {observer} from "mobx-react-lite"
import React, {useCallback, useRef} from "react"
import {PlotProps} from "../graphing-types"
import {setPointSelection} from "../../data-display/data-display-utils"
import {useDataDisplayAnimation} from "../../data-display/hooks/use-data-display-animation"
import {usePixiDragHandlers, usePlotResponders} from "../hooks/use-plot"
import {useGraphDataConfigurationContext} from "../hooks/use-graph-data-configuration-context"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {useGraphContentModelContext} from "../hooks/use-graph-content-model-context"
import {useGraphLayoutContext} from "../hooks/use-graph-layout-context"
import {circleAnchor} from "../utilities/pixi-points"
import {setPointCoordinates} from "../utilities/graph-utils"
import { useInstanceIdContext } from "../../../hooks/use-instance-id-context"
import { computeBinPlacements, computePrimaryCoord, computeSecondaryCoord, adjustCoordForStacks,
         determineBinForCase} from "../utilities/dot-plot-utils"
import { useDotPlotDragDrop } from "../hooks/use-dot-plot-drag-drop"
import { AxisPlace } from "../../axis/axis-types"

export const BinnedDotPlotDots = observer(function BinnedDotPlotDots(props: PlotProps) {
  const {pixiPointsRef} = props,
    graphModel = useGraphContentModelContext(),
    instanceId = useInstanceIdContext(),
    {isAnimating} = useDataDisplayAnimation(),
    dataConfig = useGraphDataConfigurationContext(),
    dataset = useDataSetContext(),
    layout = useGraphLayoutContext(),
    primaryAttrRole = dataConfig?.primaryRole ?? "x",
    primaryIsBottom = primaryAttrRole === "x",
    secondaryAttrRole = primaryAttrRole === "x" ? "y" : "x",
    {pointColor, pointStrokeColor} = graphModel.pointDescription,
    pointDisplayType = graphModel.pointDisplayType,
    binTicksRef = useRef<SVGGElement>(null)

  const { onDrag, onDragEnd, onDragStart } = useDotPlotDragDrop()
  usePixiDragHandlers(pixiPointsRef.current, {start: onDragStart, drag: onDrag, end: onDragEnd})

  const refreshPointSelection = useCallback(() => {
    dataConfig && setPointSelection({
      pixiPointsRef, dataConfiguration: dataConfig, pointRadius: graphModel.getPointRadius(),
      pointColor, pointStrokeColor, selectedPointRadius: graphModel.getPointRadius("select"),
      pointDisplayType
    })
  }, [dataConfig, graphModel, pixiPointsRef, pointColor, pointStrokeColor, pointDisplayType])

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
    if (!dataConfig) return
    const primaryPlace: AxisPlace = primaryIsBottom ? "bottom" : "left",
      secondaryPlace = primaryIsBottom ? "left" : "bottom",
      extraPrimaryPlace = primaryIsBottom ? "top" : "rightCat",
      extraPrimaryRole = primaryIsBottom ? "topSplit" : "rightSplit",
      extraSecondaryPlace = primaryIsBottom ? "rightCat" : "top",
      extraSecondaryRole = primaryIsBottom ? "rightSplit" : "topSplit",
      primaryAxisScale = layout.getAxisScale(primaryPlace) as ScaleLinear<number, number>,
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
      { binWidth, maxBinEdge, minBinEdge, totalNumberOfBins  } = dataConfig.binDetails()

    // Set the domain of the primary axis to the extent of the bins
    primaryAxisScale.domain([minBinEdge, maxBinEdge])

    // Draw lines to delineate the bins in the plot
    const binTicksArea = select(binTicksRef.current)
    binTicksArea.selectAll("path").remove()
    for (let i = 0; i <= totalNumberOfBins; i++) {
      const primaryTickOrigin = primaryAxisScale(minBinEdge + i * binWidth)
      const tickSize = secondaryAxisExtent
      const lineCoords = primaryIsBottom
        ? `M ${primaryTickOrigin},0 L ${primaryTickOrigin},${tickSize}`
        : `M 0,${primaryTickOrigin} L ${tickSize},${primaryTickOrigin}`
      binTicksArea.append("path")
        .attr("d", lineCoords)
        .attr("stroke", "#73bfca")
    }

    const binPlacementProps = {
      dataConfig, dataset, extraPrimaryAttrID, extraSecondaryAttrID, layout, numExtraPrimaryBands,
      pointDiameter, primaryAttrID, primaryAxisScale, primaryPlace, secondaryAttrID, secondaryBandwidth,
      totalNumberOfBins, binWidth
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
      const binForCase = determineBinForCase(caseValue, totalNumberOfBins, binWidth)
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
      const binForCase = determineBinForCase(casePrimaryValue, totalNumberOfBins, binWidth)
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
      pixiPointsRef, selectedOnly, pointColor, pointStrokeColor,
      getScreenX, getScreenY, getLegendColor, getAnimationEnabled: isAnimating,
      pointDisplayType, anchor: circleAnchor
    })
  },
  [graphModel, dataConfig, layout, primaryAttrRole, secondaryAttrRole, dataset, pixiPointsRef,
    primaryIsBottom, pointColor, pointStrokeColor, isAnimating, pointDisplayType])

  usePlotResponders({pixiPointsRef, refreshPointPositions, refreshPointSelection})

  return (
    <>
      <g data-testid={`bin-ticks-${instanceId}`} className="bin-ticks" ref={binTicksRef}/>
    </>
  )
})
