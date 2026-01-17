import {ScaleBand, ScaleLinear} from "d3"
import {observer} from "mobx-react-lite"
import React, {useCallback, useEffect} from "react"
import {mstReaction} from "../../../../utilities/mst-reaction"
import { setNiceDomain } from "../../../axis/axis-domain-utils"
import { AxisPlace } from "../../../axis/axis-types"
import { kMain } from "../../../data-display/data-display-types"
import { circleAnchor, hBarAnchor, vBarAnchor } from "../../../data-display/renderer"
import {IPlotProps} from "../../graphing-types"
import { useDotPlot } from "../../hooks/use-dot-plot"
import { useDotPlotDragDrop } from "../../hooks/use-dot-plot-drag-drop"
import { usePixiDragHandlers, usePlotResponders } from "../../hooks/use-plot"
import { setPointCoordinates } from "../../utilities/graph-utils"
import {
  computeBinPlacements, computePrimaryCoord, computeSecondaryCoord, IComputePrimaryCoord
} from "./dot-plot-utils"

export const DotLinePlot = observer(function DotLinePlot({ pixiPoints }: IPlotProps) {
  const { dataset, dataConfig, graphModel, isAnimating, layout,
          pointColor, pointDisplayType, pointStrokeColor,
          primaryAttrRole, primaryIsBottom,
          secondaryAttrRole, refreshPointSelection } = useDotPlot(pixiPoints)
  const { onDrag, onDragEnd, onDragStart } = useDotPlotDragDrop()
  usePixiDragHandlers(pixiPoints, {start: onDragStart, drag: onDrag, end: onDragEnd})

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
      const {binMap, overlap} = computeBinPlacements(binPlacementProps)
      graphModel.setPointOverlap(overlap) // So that if we draw a normal curve, it can use the overlap

      interface ISubPlotDetails {
        cases: string[]
        indices: Record<string, number>
      }

      const subPlotDetails = new Map<string, ISubPlotDetails>()
      dataset?.items.forEach(aCase => {
        const subPlotKey = dataConfig?.subPlotKey(aCase.__id__) ?? {}
        const subPlotMapKey = JSON.stringify(subPlotKey)
        let details: ISubPlotDetails | undefined = subPlotDetails.get(subPlotMapKey)
        if (!details) {
          const cases = dataConfig?.subPlotCases(subPlotKey) ?? []
          const indices: Record<string, number> = {}
          cases.forEach((caseId, index) => indices[caseId] = index)
          details = {cases, indices}
          subPlotDetails.set(subPlotMapKey, details)
        }
      })

      const getSubPlotDetails = (anID: string) => {
        const subPlotKey = dataConfig?.subPlotKey(anID) ?? {}
        const subPlotMapKey = JSON.stringify(subPlotKey)
        const details: ISubPlotDetails | undefined = subPlotDetails.get(subPlotMapKey)
        return {subPlotKey, casesInCategory: details?.cases ?? [], caseIndex: details?.indices[anID] ?? -1}
      }

      const getBarStaticDimension = () => {
        // This function determines how much space is available for each bar on the non-primary axis by dividing the
        // length of the non-primary axis by one more than the number of cases in the subplot containing the most cases.
        // This keeps the bars a uniform size across subplots.
        const largestSubplotCount = Math.max(...Array.from(subPlotDetails.values()).map(sp => sp.cases.length))
        return largestSubplotCount ? secondaryBandwidth / (largestSubplotCount + 1) : 0
      }

      const getBarValueDimension = (anID: string) => {
        const computePrimaryCoordProps: IComputePrimaryCoord = {
          anID, dataset, extraPrimaryAttrID, extraPrimaryAxisScale,
          numExtraPrimaryBands, primaryAttrID, primaryAxisScale
        }
        const {primaryCoord} = computePrimaryCoord(computePrimaryCoordProps)
        return Math.abs(primaryCoord - primaryAxisScale(0) / numExtraPrimaryBands)
      }

      const getBarPositionInSubPlot = (anID: string) => {
        const {caseIndex, casesInCategory} = getSubPlotDetails(anID)
        const barDimension = getBarStaticDimension()
        const {category, extraCategory} = binMap[anID]
        const secondaryCoord = category && category !== kMain ? (secondaryAxisScale(category) ?? 0) : 0
        const extraSecondaryCoord = extraCategory && extraCategory !== kMain
          ? (extraSecondaryAxisScale(extraCategory) ?? 0)
          : 0

        // Adjusted bar position accounts for the bar's index, dimension, and additional offsets.
        const adjustedBarPosition = caseIndex >= 0 ? caseIndex * barDimension + secondaryCoord + extraSecondaryCoord : 0

        // Calculate the centered position by adjusting for the collective dimension of all bars in the subplot
        const collectiveDimension = barDimension * (casesInCategory.length ?? 0)
        return (adjustedBarPosition - collectiveDimension / 2) + secondaryBandwidth / 2
      }

      const getPrimaryScreenCoord = (anID: string) => {
        const computePrimaryCoordProps: IComputePrimaryCoord = {
          anID, dataset, extraPrimaryAttrID, extraPrimaryAxisScale,
          numExtraPrimaryBands, primaryAttrID, primaryAxisScale
        }
        let {primaryCoord, extraPrimaryCoord} = computePrimaryCoord(computePrimaryCoordProps)
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
        if (!binMap[anID]) return null

        const {category: secondaryCat, extraCategory: extraSecondaryCat, indexInBin} = binMap[anID]
        const onePixelOffset = primaryIsBottom ? -1 : 1
        const computeSecondaryCoordProps = {
          baseCoord, extraSecondaryAxisScale, extraSecondaryBandwidth, extraSecondaryCat, indexInBin,
          numExtraSecondaryBands, overlap, pointDiameter, primaryIsBottom, secondaryAxisExtent, secondaryAxisScale,
          secondaryBandwidth, secondaryCat, secondarySign
        }
        return computeSecondaryCoord(computeSecondaryCoordProps) + onePixelOffset
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
        pointDisplayType, getWidth, getHeight, anchor, dataset
      })
    },
    [primaryIsBottom, layout, dataConfig, primaryAttrRole, graphModel, secondaryAttrRole, dataset,
      pointDisplayType, pixiPoints, pointColor, pointStrokeColor, isAnimating])

  usePlotResponders({pixiPoints, refreshPointPositions, refreshPointSelection})

  useEffect(function respondToPlotDisplayType() {
    return mstReaction(() => graphModel.plot.displayType,
      () => {
      const primaryAxis = graphModel.getNumericAxis(primaryIsBottom ? "bottom" : "left")
      const numValues = graphModel.dataConfiguration.numericValuesForAttrRole(primaryIsBottom ? "x" : "y")
      if (primaryAxis) {
        setNiceDomain(numValues, primaryAxis, graphModel.plot.axisDomainOptions)
      }
    }, {name: "respondToPlotDisplayType"}, graphModel)
  }, [dataset, graphModel, primaryIsBottom])

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
