import {max, range, ScaleBand, ScaleLinear} from "d3"
import {observer} from "mobx-react-lite"
import React, {useCallback, useRef, useState} from "react"
import * as PIXI from "pixi.js"
import {CaseData} from "../../data-display/d3-types"
import {PlotProps} from "../graphing-types"
import {handleClickOnCase, setPointSelection} from "../../data-display/data-display-utils"
import {useDataDisplayAnimation} from "../../data-display/hooks/use-data-display-animation"
import {usePixiDragHandlers, usePlotResponders} from "../hooks/use-plot"
import {appState} from "../../../models/app-state"
import {useGraphDataConfigurationContext} from "../hooks/use-graph-data-configuration-context"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {useGraphContentModelContext} from "../hooks/use-graph-content-model-context"
import {useGraphLayoutContext} from "../hooks/use-graph-layout-context"
import {ICase} from "../../../models/data/data-set-types"
import {setPointCoordinates} from "../utilities/graph-utils"
import {circleAnchor, hBarAnchor, IPixiPointMetadata, vBarAnchor} from "../utilities/pixi-points"

export const DotPlotDots = observer(function DotPlotDots(props: PlotProps) {
  const {pixiPointsRef} = props,
    graphModel = useGraphContentModelContext(),
    {isAnimating, startAnimation, stopAnimation} = useDataDisplayAnimation(),
    dataConfig = useGraphDataConfigurationContext(),
    dataset = useDataSetContext(),
    layout = useGraphLayoutContext(),
    primaryAttrRole = dataConfig?.primaryRole ?? 'x',
    primaryIsBottom = primaryAttrRole === 'x',
    secondaryAttrRole = primaryAttrRole === 'x' ? 'y' : 'x',
    {pointColor, pointStrokeColor} = graphModel.pointDescription,
    pointDisplayType = graphModel.pointDisplayType,
    // Used for tracking drag events
    [dragID, setDragID] = useState(''),
    currPos = useRef(0),
    didDrag = useRef(false),
    selectedDataObjects = useRef<Record<string, number>>({})

  const onDragStart = useCallback((event: PointerEvent, point: PIXI.Sprite, metadata: IPixiPointMetadata) => {
    dataset?.beginCaching()
    didDrag.current = false
    const tItsID: string = metadata.caseID
    stopAnimation() // We don't want to animate points until end of drag
    appState.beginPerformance()
    setDragID(() => tItsID)
    currPos.current = primaryIsBottom ? event.clientX : event.clientY
    handleClickOnCase(event, tItsID, dataset)
    // Record the current values, so we can change them during the drag and restore them when done
    const {selection} = dataConfig || {}
    const primaryAttrID = dataConfig?.attributeID(dataConfig?.primaryRole ?? 'x') ?? ''
    selection?.forEach(anID => {
      const itsValue = dataset?.getNumeric(anID, primaryAttrID) || undefined
      if (itsValue != null) {
        selectedDataObjects.current[anID] = itsValue
      }
    })
  }, [dataset, stopAnimation, primaryIsBottom, dataConfig])

  const onDrag = useCallback((event: PointerEvent) => {
    const primaryPlace = primaryIsBottom ? 'bottom' : 'left'
    const primaryAxisScale = layout.getAxisScale(primaryPlace) as ScaleLinear<number, number> | undefined
    if (primaryAxisScale && dragID) {
      const newPos = primaryIsBottom ? event.clientX : event.clientY
      const deltaPixels = newPos - currPos.current
      const primaryAttrID = dataConfig?.attributeID(primaryAttrRole) ?? ''
      currPos.current = newPos
      if (deltaPixels !== 0) {
        didDrag.current = true
        const delta = Number(primaryAxisScale.invert(deltaPixels)) - Number(primaryAxisScale.invert(0))
        const caseValues: ICase[] = []
        const {selection} = dataConfig || {}
        selection?.forEach(anID => {
          const currValue = Number(dataset?.getNumeric(anID, primaryAttrID))
          if (isFinite(currValue)) {
            caseValues.push({__id__: anID, [primaryAttrID]: currValue + delta})
          }
        })
        caseValues.length && dataset?.setCaseValues(caseValues, [primaryAttrID])
      }
    }
  }, [dataset, dragID, primaryIsBottom, dataConfig, layout, primaryAttrRole])

  const onDragEnd = useCallback((event: PointerEvent, point: PIXI.Sprite, metadata: IPixiPointMetadata) => {
    dataset?.endCaching()
    appState.endPerformance()

    if (dragID !== '') {
      setDragID('')
      if (didDrag.current) {
        const caseValues: ICase[] = []
        const {selection} = dataConfig || {}
        selection?.forEach(anID => {
          caseValues.push({
            __id__: anID,
            [dataConfig?.attributeID(primaryAttrRole) ?? '']: selectedDataObjects.current[anID]
          })
        })
        startAnimation() // So points will animate back to original positions
        caseValues.length && dataset?.setCaseValues(caseValues)
        didDrag.current = false
      }
    }
  }, [dataset, dragID, dataConfig, startAnimation, primaryAttrRole])

  usePixiDragHandlers(pixiPointsRef.current, {start: onDragStart, drag: onDrag, end: onDragEnd})

  const refreshPointSelection = useCallback(() => {
    dataConfig && setPointSelection({
      pixiPointsRef, dataConfiguration: dataConfig, pointRadius: graphModel.getPointRadius(),
      pointColor, pointStrokeColor, selectedPointRadius: graphModel.getPointRadius('select'),
      pointDisplayType
    })
  }, [dataConfig, graphModel, pixiPointsRef, pointColor, pointStrokeColor, pointDisplayType])

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
      const primaryPlace = primaryIsBottom ? 'bottom' : 'left',
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
        baseCoord = primaryIsBottom ? secondaryMax : 0,
        binMap: Record<string, {
          category: string, extraCategory: string,
          extraPrimaryCategory: string, indexInBin: number
        }> = {},
        { plotHeight } = layout
      let overlap = 0

      function computeBinPlacements() {
        const
          primaryLength = layout.getAxisLength(primaryPlace) /
            numExtraPrimaryBands,
          numBins = Math.ceil(primaryLength / pointDiameter) + 1,
          binWidth = primaryLength / (numBins - 1),
          bins: Record<string, Record<string, Record<string, string[][]>>> = {}

        if (primaryAxisScale) {
          dataConfig?.caseDataArray.forEach((aCaseData: CaseData) => {
            const anID = aCaseData.caseID,
              numerator = primaryAxisScale(dataset?.getNumeric(anID, primaryAttrID) ?? -1) /
                numExtraPrimaryBands,
              bin = Math.ceil((numerator ?? 0) / binWidth),
              category = dataset?.getStrValue(anID, secondaryAttrID) ?? '__main__',
              extraCategory = dataset?.getStrValue(anID, extraSecondaryAttrID) ?? '__main__',
              extraPrimaryCategory = dataset?.getStrValue(anID, extraPrimaryAttrID) ?? '__main__'
            if (!bins[category]) {
              bins[category] = {}
            }
            if (!bins[category][extraCategory]) {
              bins[category][extraCategory] = {}
            }
            if (!bins[category][extraCategory][extraPrimaryCategory]) {
              bins[category][extraCategory][extraPrimaryCategory] = range(numBins + 1).map(() => [])
            }
            binMap[anID] = {
              category, extraCategory, extraPrimaryCategory,
              indexInBin: (bin >= 0 && bin <= numBins)
                ? bins[category][extraCategory][extraPrimaryCategory][bin].length : 0
            }
            if (bin >= 0 && bin <= numBins) {
              bins[category][extraCategory][extraPrimaryCategory][bin].push(anID)
            }
          })
          // Compute the length the record in bins with the most elements
          const maxInBin = max(Object.values(bins).map(anExtraBins => {
            return max(Object.values(anExtraBins).map(aBinArray => {
              return max(Object.values(aBinArray).map(aBin => {
                return max(aBin.map(innerArray => innerArray.length)) || 0
              })) || 0
            })) || 0
          })) || 0

          const excessHeight = Math.max(0,
            maxInBin - Math.floor(secondaryBandwidth / pointDiameter)) * pointDiameter
          overlap = excessHeight / maxInBin
        }
      }

      computeBinPlacements()

      const computeSecondaryCoord =
        (caseInfo: { secondaryCat: string, extraSecondaryCat: string, indexInBin: number }) => {
          const {secondaryCat, extraSecondaryCat, indexInBin} = caseInfo
          let catCoord = (!!secondaryCat && secondaryCat !== '__main__' ? secondaryAxisScale(secondaryCat) ?? 0 : 0) /
            numExtraSecondaryBands
          let extraCoord = !!extraSecondaryCat && extraSecondaryCat !== '__main__'
            ? (extraSecondaryAxisScale(extraSecondaryCat) ?? 0) : 0
          if (primaryIsBottom) {
            extraCoord = secondaryAxisExtent - extraSecondaryBandwidth - extraCoord
            catCoord = extraSecondaryBandwidth - secondaryBandwidth - catCoord
            return baseCoord - catCoord - extraCoord -
              pointDiameter / 2 - indexInBin * (pointDiameter - overlap)
          } else {
            return baseCoord + extraCoord + secondarySign * (catCoord + pointDiameter / 2 +
              indexInBin * (pointDiameter - overlap))
          }
        }

      const computePrimaryCoord = (anID: string) => {
        const primaryCoord = primaryAxisScale(dataset?.getNumeric(anID, primaryAttrID) ?? -1) / numExtraPrimaryBands
        const extraPrimaryValue = dataset?.getStrValue(anID, extraPrimaryAttrID)
        const extraPrimaryCoord = extraPrimaryValue ? extraPrimaryAxisScale(extraPrimaryValue ?? '__main__') ?? 0 : 0
        return { primaryCoord, extraPrimaryCoord }
      }

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
        const { primaryCoord } = computePrimaryCoord(anID)
        // If primaryIsBottom, we simply return the primaryCoord as the width. We can't use the value returned
        // by getPrimaryScreenCoord because it adds the extraPrimaryCoord value.
        // If primaryIsBottom is false, we return the absolute value of the difference between the plotHeight divided
        // by the number of extra primary bands and the primaryCoord -- primaryCoord is essentially the top of
        // the bar, and we need to return the height from there to the bottom of the plot.
        return primaryIsBottom
          ? primaryCoord
          : Math.abs(plotHeight / numExtraPrimaryBands - primaryCoord)
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
        const { primaryCoord, extraPrimaryCoord } = computePrimaryCoord(anID)
        return primaryCoord + extraPrimaryCoord
      }
    
      const getSecondaryScreenCoord = (anID: string) => {
        // For bar graphs, the secondary coordinate will be determined simply by the order of the cases in the dataset,
        // not by any value the cases possess.
        if (pointDisplayType === "bars") return getBarPositionInSubPlot(anID)

        const { category: secondaryCat, extraCategory: extraSecondaryCat, indexInBin } = binMap[anID]
        const onePixelOffset = primaryIsBottom ? -1 : 1
        return binMap[anID]
          ? computeSecondaryCoord({ secondaryCat, extraSecondaryCat, indexInBin }) + onePixelOffset
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
        pixiPointsRef, selectedOnly, pointColor, pointStrokeColor,
        getScreenX, getScreenY, getLegendColor, getAnimationEnabled: isAnimating,
        pointDisplayType, getWidth, getHeight, anchor
      })
    },
    [graphModel, dataConfig, layout, primaryAttrRole, secondaryAttrRole, dataset, pixiPointsRef,
      primaryIsBottom, pointColor, pointStrokeColor, isAnimating, pointDisplayType])

  usePlotResponders({pixiPointsRef, refreshPointPositions, refreshPointSelection})

  return (
    <></>
  )
})
