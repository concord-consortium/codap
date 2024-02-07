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
import {IPixiPointMetadata} from "../utilities/pixi-types"

export const DotPlotDots = observer(function DotPlotDots(props: PlotProps) {
  const {pixiPointsRef} = props,
    graphModel = useGraphContentModelContext(),
    {isAnimating, startAnimation, stopAnimation} = useDataDisplayAnimation(),
    dataConfiguration = useGraphDataConfigurationContext(),
    dataset = useDataSetContext(),
    layout = useGraphLayoutContext(),
    primaryAttrRole = dataConfiguration?.primaryRole ?? 'x',
    primaryIsBottom = primaryAttrRole === 'x',
    secondaryAttrRole = primaryAttrRole === 'x' ? 'y' : 'x',
    {pointColor, pointStrokeColor} = graphModel.pointDescription,
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
    const {selection} = dataConfiguration || {}
    const primaryAttrID = dataConfiguration?.attributeID(dataConfiguration?.primaryRole ?? 'x') ?? ''
    selection?.forEach(anID => {
      const itsValue = dataset?.getNumeric(anID, primaryAttrID) || undefined
      if (itsValue != null) {
        selectedDataObjects.current[anID] = itsValue
      }
    })
  }, [dataset, stopAnimation, primaryIsBottom, dataConfiguration])

  const onDrag = useCallback((event: PointerEvent) => {
    const primaryPlace = primaryIsBottom ? 'bottom' : 'left'
    const primaryAxisScale = layout.getAxisScale(primaryPlace) as ScaleLinear<number, number> | undefined
    if (primaryAxisScale && dragID) {
      const newPos = primaryIsBottom ? event.clientX : event.clientY
      const deltaPixels = newPos - currPos.current
      const primaryAttrID = dataConfiguration?.attributeID(primaryAttrRole) ?? ''
      currPos.current = newPos
      if (deltaPixels !== 0) {
        didDrag.current = true
        const delta = Number(primaryAxisScale.invert(deltaPixels)) - Number(primaryAxisScale.invert(0))
        const caseValues: ICase[] = []
        const {selection} = dataConfiguration || {}
        selection?.forEach(anID => {
          const currValue = Number(dataset?.getNumeric(anID, primaryAttrID))
          if (isFinite(currValue)) {
            caseValues.push({__id__: anID, [primaryAttrID]: currValue + delta})
          }
        })
        caseValues.length && dataset?.setCaseValues(caseValues, [primaryAttrID])
      }
    }
  }, [dataset, dragID, primaryIsBottom, dataConfiguration, layout, primaryAttrRole])

  const onDragEnd = useCallback((event: PointerEvent, point: PIXI.Sprite, metadata: IPixiPointMetadata) => {
    dataset?.endCaching()
    appState.endPerformance()

    if (dragID !== '') {
      setDragID('')
      if (didDrag.current) {
        const caseValues: ICase[] = []
        const {selection} = dataConfiguration || {}
        selection?.forEach(anID => {
          caseValues.push({
            __id__: anID,
            [dataConfiguration?.attributeID(primaryAttrRole) ?? '']: selectedDataObjects.current[anID]
          })
        })
        startAnimation() // So points will animate back to original positions
        caseValues.length && dataset?.setCaseValues(caseValues)
        didDrag.current = false
      }
    }
  }, [dataset, dragID, dataConfiguration, startAnimation, primaryAttrRole])

  usePixiDragHandlers(pixiPointsRef.current, {start: onDragStart, drag: onDrag, end: onDragEnd})

  const refreshPointSelection = useCallback(() => {
    dataConfiguration && setPointSelection({
      pixiPointsRef, dataConfiguration, pointRadius: graphModel.getPointRadius(),
      pointColor, pointStrokeColor, selectedPointRadius: graphModel.getPointRadius('select')
    })
  }, [dataConfiguration, graphModel, pixiPointsRef, pointColor, pointStrokeColor])

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
        primaryAttrID = dataConfiguration?.attributeID(primaryAttrRole) ?? '',
        extraPrimaryAttrID = dataConfiguration?.attributeID(extraPrimaryRole) ?? '',
        numExtraPrimaryBands = Math.max(1, extraPrimaryAxisScale?.domain().length ?? 1),
        pointDiameter = 2 * graphModel.getPointRadius(),
        secondaryAttrID = dataConfiguration?.attributeID(secondaryAttrRole) ?? '',
        extraSecondaryAttrID = dataConfiguration?.attributeID(extraSecondaryRole) ?? '',
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
        }> = {}
      let overlap = 0

      function computeBinPlacements() {
        const
          primaryLength = layout.getAxisLength(primaryPlace) /
            numExtraPrimaryBands,
          numBins = Math.ceil(primaryLength / pointDiameter) + 1,
          binWidth = primaryLength / (numBins - 1),
          bins: Record<string, Record<string, Record<string, string[][]>>> = {}

        if (primaryAxisScale) {
          dataConfiguration?.caseDataArray.forEach((aCaseData: CaseData) => {
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

      const
        // Note that we can get null for either or both of the next two functions. It just means that we have
        // a circle for the case, but we're not plotting it.
        getPrimaryScreenCoord = (anID: string) => {
          const primaryCoord = primaryAxisScale(dataset?.getNumeric(anID, primaryAttrID) ?? -1) /
              numExtraPrimaryBands,
            extraPrimaryValue = dataset?.getStrValue(anID, extraPrimaryAttrID),
            extraPrimaryCoord = extraPrimaryValue
              ? extraPrimaryAxisScale(extraPrimaryValue ?? '__main__') ?? 0
              : 0
          return primaryCoord + extraPrimaryCoord
        },
        getSecondaryScreenCoord = (anID: string) => {
          const secondaryCat = binMap[anID].category,
            extraSecondaryCat = binMap[anID].extraCategory,
            indexInBin = binMap[anID].indexInBin,
            onePixelOffset = primaryIsBottom ? -1 : 1 // Separate circles from axis line by 1 pixel
          return binMap[anID]
            ? computeSecondaryCoord({secondaryCat, extraSecondaryCat, indexInBin}) + onePixelOffset
            : null
        },
        getScreenX = primaryIsBottom ? getPrimaryScreenCoord : getSecondaryScreenCoord,
        getScreenY = primaryIsBottom ? getSecondaryScreenCoord : getPrimaryScreenCoord,
        getLegendColor = dataConfiguration?.attributeID('legend')
          ? dataConfiguration?.getLegendColorForCase : undefined

      setPointCoordinates({
        dataset, pointRadius: graphModel.getPointRadius(),
        selectedPointRadius: graphModel.getPointRadius('select'),
        pixiPointsRef, selectedOnly, pointColor, pointStrokeColor,
        getScreenX, getScreenY, getLegendColor, getAnimationEnabled: isAnimating
      })
    },
    [graphModel, dataConfiguration, layout, primaryAttrRole, secondaryAttrRole, dataset, pixiPointsRef,
      primaryIsBottom, pointColor, pointStrokeColor, isAnimating])

  usePlotResponders({pixiPointsRef, refreshPointPositions, refreshPointSelection})

  return (
    <></>
  )
})
