import {max, range, ScaleBand, scaleLinear, select} from "d3"
import {observer} from "mobx-react-lite"
import React, {useCallback, useRef, useState} from "react"
import { ScaleNumericBaseType } from "../../axis/axis-types"
import {attrRoleToAxisPlace, CaseData, PlotProps} from "../graphing-types"
import {useDragHandlers, usePlotResponders} from "../hooks/use-plot"
import {appState} from "../../../models/app-state"
import {useDataConfigurationContext} from "../hooks/use-data-configuration-context"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {Bounds, useGraphLayoutContext} from "../models/graph-layout"
import {ICase} from "../../../models/data/data-set-types"
import {getScreenCoord, handleClickOnDot, setPointCoordinates, setPointSelection} from "../utilities/graph-utils"
import {useGraphModelContext} from "../models/graph-model"

export const DotPlotDots = observer(function DotPlotDots(props: PlotProps) {
  const {dotsRef, enableAnimation} = props,
    graphModel = useGraphModelContext(),
    dataConfiguration = useDataConfigurationContext(),
    dataset = useDataSetContext(),
    layout = useGraphLayoutContext(),
    primaryAttrIDRef = useRef(''),
    secondaryAttrIDRef = useRef(''),
    primaryAttrPlace = dataConfiguration?.primaryRole ?? 'x',
    primaryAxisPlace = attrRoleToAxisPlace[primaryAttrPlace] ?? 'bottom',
    primaryIsBottom = primaryAxisPlace === 'bottom',
    secondaryAttrPlace = primaryAttrPlace === 'x' ? 'y' : 'x',
    secondaryAxisPlace = attrRoleToAxisPlace[secondaryAttrPlace] ?? 'left',
    legendAttrID = dataConfiguration?.attributeID('legend'),
    primaryScaleRef = useRef<ScaleNumericBaseType>(scaleLinear()),
    primaryLength = layout.getAxisLength(primaryAxisPlace),
    [dragID, setDragID] = useState(''),
    currPos = useRef(0),
    didDrag = useRef(false),
    target = useRef<any>(),
    selectedDataObjects = useRef<Record<string, number>>({}),
    { pointColor, pointStrokeColor } = graphModel

  primaryAttrIDRef.current = dataConfiguration?.primaryAttributeID
  primaryScaleRef.current = layout.getAxisScale(primaryAxisPlace) as ScaleNumericBaseType
  secondaryAttrIDRef.current = dataConfiguration?.secondaryAttributeID


  const onDragStart = useCallback((event: any) => {
      dataset?.beginCaching()
      didDrag.current = false
      target.current = select(event.target as SVGSVGElement)
      const tItsID: string = target.current.datum()?.caseID ?? ''
      if (target.current.node()?.nodeName === 'circle') {
        enableAnimation.current = false // We don't want to animate points until end of drag
        appState.beginPerformance()
        target.current
          .property('isDragging', true)
          .transition()
          .attr('r', graphModel.getPointRadius('hover-drag'))
        setDragID(() => tItsID)
        currPos.current = primaryIsBottom ? event.clientX : event.clientY

        handleClickOnDot(event, tItsID, dataset)
        // Record the current values, so we can change them during the drag and restore them when done
        const { selection } = dataConfiguration || {}
        selection?.forEach(anID => {
          const itsValue = dataset?.getNumeric(anID, primaryAttrIDRef.current) || undefined
          if (itsValue != null) {
            selectedDataObjects.current[anID] = itsValue
          }
        })
      }
    }, [graphModel, dataConfiguration, dataset, primaryIsBottom, enableAnimation]),

    onDrag = useCallback((event: MouseEvent) => {
      if (dragID) {
        const newPos = primaryIsBottom ? event.clientX : event.clientY,
          deltaPixels = newPos - currPos.current
        currPos.current = newPos
        if (deltaPixels !== 0) {
          didDrag.current = true
          const delta = Number(primaryScaleRef.current?.invert(deltaPixels)) -
              Number(primaryScaleRef.current?.invert(0)),
            caseValues: ICase[] = [],
            { selection } = dataConfiguration || {}
          selection?.forEach(anID => {
            const currValue = Number(dataset?.getNumeric(anID, primaryAttrIDRef.current))
            if (isFinite(currValue)) {
              caseValues.push({__id__: anID, [primaryAttrIDRef.current]: currValue + delta})
            }
          })
          caseValues.length && dataset?.setCaseValues(caseValues, [primaryAttrIDRef.current])
        }
      }
    }, [dataset, dragID, primaryIsBottom, dataConfiguration]),

    onDragEnd = useCallback(() => {
      dataset?.endCaching()
      appState.endPerformance()

      if (dragID !== '') {
        target.current
          .classed('dragging', false)
          .property('isDragging', false)
          .transition()
          .attr('r', graphModel.getPointRadius('select'))
        setDragID('')
        target.current = null

        if (didDrag.current) {
          const caseValues: ICase[] = [],
            { selection } = dataConfiguration || {}
          selection?.forEach(anID => {
            caseValues.push({
              __id__: anID,
              [primaryAttrIDRef.current]: selectedDataObjects.current[anID]
            })
          })
          enableAnimation.current = true // So points will animate back to original positions
          caseValues.length && dataset?.setCaseValues(caseValues)
          didDrag.current = false
        }
      }
    }, [graphModel, dataConfiguration, dataset, dragID, enableAnimation])

  useDragHandlers(window, {start: onDragStart, drag: onDrag, end: onDragEnd})

  const refreshPointSelection = useCallback(() => {
    dataConfiguration && setPointSelection({ pointColor, pointStrokeColor,
      dotsRef, dataConfiguration, pointRadius: graphModel.getPointRadius(),
      selectedPointRadius: graphModel.getPointRadius('select') })
  }, [dataConfiguration, dotsRef, graphModel, pointColor, pointStrokeColor])

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
      const
        secondaryScale = layout.getAxisScale(secondaryAxisPlace) as ScaleBand<string>,
        pointDiameter = 2 * graphModel.getPointRadius(),
        secondaryRangeIndex = primaryIsBottom ? 0 : 1,
        secondaryMax = Number(secondaryScale?.range()[secondaryRangeIndex]),
        secondaryExtent = Math.abs(Number(secondaryScale?.range()[0] -
          secondaryScale?.range()[1])),
        secondaryBandwidth = secondaryScale?.bandwidth?.() ?? secondaryExtent,
        secondarySign = primaryIsBottom ? -1 : 1,
        baseCoord = primaryIsBottom ? secondaryMax : 0,
        binMap: Record<string, { category: string, indexInBin: number }> = {}
      let overlap = 0

      function computeBinPlacements() {
        const numBins = Math.ceil(primaryLength / pointDiameter) + 1,
          binWidth = primaryLength / (numBins - 1),
          bins: Record<string, string[][]> = {}

        dataConfiguration?.caseDataArray.forEach((aCaseData:CaseData) => {
          const anID = aCaseData.caseID,
            numerator = primaryScaleRef.current(dataset?.getNumeric(anID, primaryAttrIDRef.current) ?? -1),
            bin = Math.ceil((numerator ?? 0) / binWidth),
            category = secondaryAttrIDRef.current ? dataset?.getValue(anID, secondaryAttrIDRef.current) : '__main__'
          if (!bins[category]) {
            bins[category] = range(numBins + 1).map(() => [])
          }
          if (bin >= 0 && bin <= numBins) {
            binMap[anID] = {category, indexInBin: bins[category][bin].length}
            bins[category][bin].push(anID)
          }
        })
        const maxInBin = Object.values(bins).reduce((prevMax, aBinArray) => {
            return Math.max(prevMax, max(aBinArray, b => b.length) || 0) + 1
          }, 0),
          excessHeight = Math.max(0, maxInBin - Math.floor(secondaryBandwidth / pointDiameter)) * pointDiameter
        overlap = excessHeight / maxInBin
      }

      computeBinPlacements()

      const computeSecondaryCoord = (category: string, indexInBin: number) => {
        let catCoord = !!category && category !== '__main__' ? secondaryScale(category) ?? 0 : 0
        if (primaryIsBottom) {
          catCoord = secondaryExtent - secondaryBandwidth - catCoord
        }
        return baseCoord + secondarySign * (catCoord + pointDiameter / 2 +
          indexInBin * (pointDiameter - overlap))
      }

      const
        // Note that we can get null for either or both of the next two functions. It just means that we have
        // a circle for the case, but we're not plotting it.
        getPrimaryScreenCoord = (anID: string) => {
          return getScreenCoord(dataset, anID, primaryAttrIDRef.current, primaryScaleRef.current)
        },
        getSecondaryScreenCoord = (anID: string) => {
          return binMap[anID] ? computeSecondaryCoord(binMap[anID].category, binMap[anID].indexInBin) : null
        },
        getScreenX = primaryIsBottom ? getPrimaryScreenCoord : getSecondaryScreenCoord,
        getScreenY = primaryIsBottom ? getSecondaryScreenCoord : getPrimaryScreenCoord,
        getLegendColor = legendAttrID ? dataConfiguration?.getLegendColorForCase : undefined,
        plotBounds = layout.computedBounds.get('plot') as Bounds

      setPointCoordinates({
        dataset, pointRadius: graphModel.getPointRadius(), selectedPointRadius: graphModel.getPointRadius('select'),
        dotsRef, selectedOnly, pointColor, pointStrokeColor,
        getScreenX, getScreenY, getLegendColor, enableAnimation, plotBounds
      })
    },
    [graphModel, dataConfiguration?.caseDataArray, dataset, dotsRef, enableAnimation, layout, secondaryAxisPlace,
      legendAttrID, primaryLength, primaryIsBottom,
      dataConfiguration?.getLegendColorForCase, pointColor, pointStrokeColor])

  usePlotResponders({
    graphModel, primaryAttrID: primaryAttrIDRef.current, secondaryAttrID: secondaryAttrIDRef.current,
    legendAttrID, layout, dotsRef, refreshPointPositions, refreshPointSelection, enableAnimation
  })

  return (
    <></>
  )
})
