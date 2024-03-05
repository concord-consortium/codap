import {ScaleBand, ScaleLinear} from "d3"
import {observer} from "mobx-react-lite"
import React, {useCallback, useEffect} from "react"
import {mstReaction} from "../../../utilities/mst-reaction"
import {PlotProps} from "../graphing-types"
import {setPointSelection} from "../../data-display/data-display-utils"
import {useDataDisplayAnimation} from "../../data-display/hooks/use-data-display-animation"
import {usePixiDragHandlers, usePlotResponders} from "../hooks/use-plot"
import {useGraphDataConfigurationContext} from "../hooks/use-graph-data-configuration-context"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {useGraphContentModelContext} from "../hooks/use-graph-content-model-context"
import {useGraphLayoutContext} from "../hooks/use-graph-layout-context"
import {setPointCoordinates} from "../utilities/graph-utils"
import {circleAnchor, hBarAnchor, vBarAnchor} from "../utilities/pixi-points"
import { computeBinPlacements, computePrimaryCoord, computeSecondaryCoord } from "../utilities/dot-plot-utils"
import { useDotPlotDragDrop } from "../hooks/use-dot-plot-drag-drop"
import { AxisPlace } from "../../axis/axis-types"

export const FreeDotPlotDots = observer(function FreeDotPlotDots(props: PlotProps) {
  const {pixiPoints} = props,
    graphModel = useGraphContentModelContext(),
    {isAnimating} = useDataDisplayAnimation(),
    dataConfig = useGraphDataConfigurationContext(),
    dataset = useDataSetContext(),
    layout = useGraphLayoutContext(),
    primaryAttrRole = dataConfig?.primaryRole ?? 'x',
    primaryIsBottom = primaryAttrRole === 'x',
    secondaryAttrRole = primaryAttrRole === 'x' ? 'y' : 'x',
    {pointColor, pointStrokeColor} = graphModel.pointDescription,
    pointDisplayType = graphModel.pointDisplayType

  const { onDrag, onDragEnd, onDragStart } = useDotPlotDragDrop()
  usePixiDragHandlers(pixiPoints, {start: onDragStart, drag: onDrag, end: onDragEnd})

  const refreshPointSelection = useCallback(() => {
    dataConfig && setPointSelection({
      pixiPoints, dataConfiguration: dataConfig, pointRadius: graphModel.getPointRadius(),
      pointColor, pointStrokeColor, selectedPointRadius: graphModel.getPointRadius('select'),
      pointDisplayType
    })
  }, [dataConfig, graphModel, pixiPoints, pointColor, pointStrokeColor, pointDisplayType])

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
      const primaryPlace: AxisPlace = primaryIsBottom ? 'bottom' : 'left',
        secondaryPlace = primaryIsBottom ? 'left' : 'bottom',
        extraPrimaryPlace = primaryIsBottom ? 'top' : 'rightCat',
        extraPrimaryRole = primaryIsBottom ? 'topSplit' : 'rightSplit',
        extraSecondaryPlace = primaryIsBottom ? 'rightCat' : 'top',
        extraSecondaryRole = primaryIsBottom ? 'rightSplit' : 'topSplit',
        primaryAxisScale = layout.getAxisScale(primaryPlace) as ScaleLinear<number, number>,
        extraPrimaryAxisScale = layout.getAxisScale(extraPrimaryPlace) as ScaleBand<string>,
        secondaryAxisScale = layout.getAxisScale(secondaryPlace) as ScaleBand<string>,
        extraSecondaryAxisScale = layout.getAxisScale(extraSecondaryPlace) as ScaleBand<string>,
        primaryAttrID = dataConfig?.attributeID(primaryAttrRole) ?? '',
        extraPrimaryAttrID = dataConfig?.attributeID(extraPrimaryRole) ?? '',
        numExtraPrimaryBands = Math.max(1, extraPrimaryAxisScale?.domain().length ?? 1),
        pointDiameter = 2 * graphModel.getPointRadius(),
        secondaryAttrID = dataConfig?.attributeID(secondaryAttrRole) ?? '',
        extraSecondaryAttrID = dataConfig?.attributeID(extraSecondaryRole) ?? '',
        secondaryRangeIndex = primaryIsBottom ? 0 : 1,
        secondaryMax = Number(secondaryAxisScale.range()[secondaryRangeIndex]),
        secondaryAxisExtent = Math.abs(Number(secondaryAxisScale.range()[0] -
          secondaryAxisScale.range()[1])),
        fullSecondaryBandwidth = secondaryAxisScale.bandwidth?.() ?? secondaryAxisExtent,
        numExtraSecondaryBands = Math.max(1, extraSecondaryAxisScale?.domain().length ?? 1),
        secondaryBandwidth = fullSecondaryBandwidth / numExtraSecondaryBands,
        extraSecondaryBandwidth = (extraSecondaryAxisScale.bandwidth?.() ?? secondaryAxisExtent),
        secondarySign = primaryIsBottom ? -1 : 1,
        baseCoord = primaryIsBottom ? secondaryMax : 0

      const binPlacementProps = {
        dataConfig, dataset, extraPrimaryAttrID, extraSecondaryAttrID, layout, numExtraPrimaryBands,
        pointDiameter, primaryAttrID, primaryAxisScale, primaryPlace, secondaryAttrID, secondaryBandwidth
      }
      const { binMap, overlap } = computeBinPlacements(binPlacementProps)

      interface ISubPlotDetails {
        cases: string[]
        indices: Record<string, number>
      }
      const subPlotDetails = new Map<string, ISubPlotDetails>()
      dataset?.cases.forEach(aCase => {
        const subPlotKey = dataConfig?.subPlotKey(aCase.__id__) ?? {}
        const subPlotMapKey = JSON.stringify(subPlotKey)
        let details: ISubPlotDetails | undefined = subPlotDetails.get(subPlotMapKey)
        if (!details) {
          const cases = dataConfig?.subPlotCases(subPlotKey) ?? []
          const indices: Record<string, number> = {}
          cases.forEach((caseId, index) => indices[caseId] = index)
          details = { cases, indices }
          subPlotDetails.set(subPlotMapKey, details)
        }
      })

      const getSubPlotDetails = (anID: string) => {
        const subPlotKey = dataConfig?.subPlotKey(anID) ?? {}
        const subPlotMapKey = JSON.stringify(subPlotKey)
        const details: ISubPlotDetails | undefined = subPlotDetails.get(subPlotMapKey)
        return { subPlotKey, casesInCategory: details?.cases ?? [], caseIndex: details?.indices[anID] ?? -1 }
      }
    
      const getBarStaticDimension = () => {
        // This function determines how much space is available for each bar on the non-primary axis by dividing the
        // length of the non-primary axis by the number of cases in the subplot containing the most cases. This keeps
        // the bars a uniform size across subplots.
        const largestSubplotCount = Math.max(...Array.from(subPlotDetails.values()).map(sp => sp.cases.length))
        return largestSubplotCount ? secondaryBandwidth / largestSubplotCount : 0
      }
    
      const getBarValueDimension = (anID: string) => {
        const computePrimaryCoordProps = {
          anID, dataConfig, dataset, extraPrimaryAttrID, extraPrimaryAxisScale, isBinned: false,
          numExtraPrimaryBands, primaryAttrID, primaryAxisScale
        }
        const { primaryCoord } = computePrimaryCoord(computePrimaryCoordProps)
        return Math.abs(primaryCoord - primaryAxisScale(0) / numExtraPrimaryBands)
      }

      const getBarPositionInSubPlot = (anID: string) => {
        const { caseIndex, casesInCategory } = getSubPlotDetails(anID)
        const barDimension = getBarStaticDimension()
        const { category, extraCategory } = binMap[anID]
        const secondaryCoord = category && category !== '__main__' ? (secondaryAxisScale(category) ?? 0) : 0
        const extraSecondaryCoord = extraCategory && extraCategory !== '__main__'
          ? (extraSecondaryAxisScale(extraCategory) ?? 0)
          : 0
      
        // Adjusted bar position accounts for the bar's index, dimension, and additional offsets.
        const adjustedBarPosition = caseIndex >= 0 ? caseIndex * barDimension + secondaryCoord + extraSecondaryCoord : 0
      
        // Calculate the centered position by adjusting for the collective dimension of all bars in the subplot
        const collectiveDimension = barDimension * (casesInCategory.length ?? 0)
        return (adjustedBarPosition - collectiveDimension / 2) + secondaryBandwidth / 2
      }

      const getPrimaryScreenCoord = (anID: string) => {
        const computePrimaryCoordProps = {
          anID, dataConfig, dataset, extraPrimaryAttrID, extraPrimaryAxisScale, isBinned: false,
          numExtraPrimaryBands, primaryAttrID, primaryAxisScale
        }
        let { primaryCoord, extraPrimaryCoord } = computePrimaryCoord(computePrimaryCoordProps)
        if (pointDisplayType === "bars") {
          const zeroCoord = primaryAxisScale(0) / numExtraPrimaryBands
          primaryCoord = primaryIsBottom ? Math.max(primaryCoord, zeroCoord) : Math.min(primaryCoord, zeroCoord)
        }
        return primaryCoord + extraPrimaryCoord
      }
    
      const getSecondaryScreenCoord = (anID: string) => {
        // For bar graphs, the secondary coordinate will be determined simply by the order of the cases in the dataset,
        // not by any value the cases possess.
        if (pointDisplayType === "bars") return getBarPositionInSubPlot(anID)

        const { category: secondaryCat, extraCategory: extraSecondaryCat, indexInBin } = binMap[anID]
        const onePixelOffset = primaryIsBottom ? -1 : 1
        const computeSecondaryCoordProps = {
          baseCoord, extraSecondaryAxisScale, extraSecondaryBandwidth, extraSecondaryCat, indexInBin,
          numExtraSecondaryBands, overlap, pointDiameter, primaryIsBottom, secondaryAxisExtent, secondaryAxisScale,
          secondaryBandwidth, secondaryCat, secondarySign
        }
        return binMap[anID]
          ? computeSecondaryCoord(computeSecondaryCoordProps) + onePixelOffset
          : null
      }
      
      const getScreenX = primaryIsBottom ? getPrimaryScreenCoord : getSecondaryScreenCoord
      const getScreenY = primaryIsBottom ? getSecondaryScreenCoord : getPrimaryScreenCoord
      const getWidth = primaryIsBottom ? getBarValueDimension : getBarStaticDimension
      const getHeight = primaryIsBottom ? getBarStaticDimension : getBarValueDimension
      
      const getLegendColor = dataConfig?.attributeID('legend')
        ? dataConfig?.getLegendColorForCase : undefined

      const anchor = pointDisplayType === "bars"
        ? primaryIsBottom ? hBarAnchor : vBarAnchor
        : circleAnchor

      setPointCoordinates({
        pointRadius: graphModel.getPointRadius(),
        selectedPointRadius: graphModel.getPointRadius('select'),
        pixiPoints, selectedOnly, pointColor, pointStrokeColor,
        getScreenX, getScreenY, getLegendColor, getAnimationEnabled: isAnimating,
        pointDisplayType, getWidth, getHeight, anchor
      })
    },
    [graphModel, dataConfig, layout, primaryAttrRole, secondaryAttrRole, dataset, pixiPoints,
      primaryIsBottom, pointColor, pointStrokeColor, isAnimating, pointDisplayType])

  usePlotResponders({pixiPoints, refreshPointPositions, refreshPointSelection})

  // respond to point size change because we have to change the stacking
  useEffect(function respondToGraphPointVisualAction() {
    return mstReaction(() => {
        const { pointSizeMultiplier } = graphModel.pointDescription
        return pointSizeMultiplier
      },
      () => refreshPointPositions(false),
      {name: "respondToGraphPointVisualAction"}, graphModel
    )
  }, [graphModel, refreshPointPositions])

  return (
    <></>
  )
})
