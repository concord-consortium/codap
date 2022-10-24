import {max, range, ScaleBand, select} from "d3"
import {observer} from "mobx-react-lite"
import React, {memo, useCallback, useRef, useState} from "react"
import {transitionDuration, PlotProps}
  from "../graphing-types"
import {useDragHandlers, usePlotResponders} from "../hooks/graph-hooks"
import {appState} from "../../app-state"
import {useDataConfigurationContext} from "../hooks/use-data-configuration-context"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {ScaleNumericBaseType, useGraphLayoutContext} from "../models/graph-layout"
import {ICase} from "../../../data-model/data-set"
import {getScreenCoord, setPointCoordinates, setPointSelection} from "../utilities/graph-utils"
import {IGraphModel} from "../models/graph-model"
import {attrPlaceToAxisPlace} from "../models/axis-model"

interface IProps {
  graphModel: IGraphModel
  plotProps: PlotProps
}

export const DotPlotDots = memo(observer(function DotPlotDots(props: IProps) {
  const {graphModel, plotProps: {dotsRef, enableAnimation}} = props,
    dataConfiguration = useDataConfigurationContext(),
    dataset = useDataSetContext(),
    layout = useGraphLayoutContext(),
    primaryAttrPlace = dataConfiguration?.primaryPlace ?? 'x',
    primaryAxisPlace = attrPlaceToAxisPlace[primaryAttrPlace] ?? 'bottom',
    primaryIsBottom = primaryAxisPlace === 'bottom',
    primaryAttrID = dataConfiguration?.attributeID(primaryAttrPlace),
    secondaryAttrPlace = primaryAttrPlace === 'x' ? 'y' : 'x',
    secondaryAxisPlace = attrPlaceToAxisPlace[secondaryAttrPlace] ?? 'left',
    secondaryAttrID = dataConfiguration?.attributeID(secondaryAttrPlace),
    legendAttrID = dataConfiguration?.attributeID('legend'),
    primaryScale = layout.axisScale(primaryAxisPlace) as ScaleNumericBaseType,
    primaryLength = layout.axisLength(primaryAxisPlace),
    secondaryScale = layout.axisScale(secondaryAxisPlace) as ScaleBand<string>,
    [dragID, setDragID] = useState(''),
    currPos = useRef(0),
    didDrag = useRef(false),
    target = useRef<any>(),
    selectedDataObjects = useRef<Record<string, number>>({}),
    pointRadius = graphModel.getPointRadius(),
    selectedPointRadius = graphModel.getPointRadius('select'),
    dragPointRadius = graphModel.getPointRadius('hover-drag')


  const onDragStart = useCallback((event: MouseEvent) => {
      dataset?.beginCaching()
      didDrag.current = false
      target.current = select(event.target as SVGSVGElement)
      const tItsID: string = target.current.property('id')
      if (target.current.node()?.nodeName === 'circle') {
        enableAnimation.current = false // We don't want to animate points until end of drag
        appState.beginPerformance()
        target.current.transition()
          .attr('r', dragPointRadius)
        setDragID(() => tItsID)
        currPos.current = primaryIsBottom ? event.clientX : event.clientY

        const [, caseId] = tItsID.split("_")
        dataset?.selectCases([caseId])
        // Record the current values so we can change them during the drag and restore them when done
        const { selection } = dataConfiguration || {}
        selection?.forEach(anID => {
          const itsValue = primaryAttrID && dataset?.getNumeric(anID, primaryAttrID) || undefined
          if (itsValue != null) {
            selectedDataObjects.current[anID] = itsValue
          }
        })
      }
    }, [dataConfiguration, dataset, dragPointRadius, primaryAttrID, primaryIsBottom, enableAnimation]),

    onDrag = useCallback((event: MouseEvent) => {
      if (dragID) {
        const newPos = primaryIsBottom ? event.clientX : event.clientY,
          deltaPixels = newPos - currPos.current
        currPos.current = newPos
        if (deltaPixels !== 0) {
          didDrag.current = true
          const delta = Number(primaryScale?.invert(deltaPixels)) - Number(primaryScale?.invert(0)),
            caseValues: ICase[] = [],
            { selection } = dataConfiguration || {}
          primaryAttrID && selection?.forEach(anID => {
            const currValue = Number(dataset?.getNumeric(anID, primaryAttrID))
            if (isFinite(currValue)) {
              caseValues.push({__id__: anID, [primaryAttrID]: currValue + delta})
            }
          })
          caseValues.length && dataset?.setCaseValues(caseValues)
        }
      }
    }, [dataset, dragID, primaryAttrID, primaryScale, primaryIsBottom, dataConfiguration]),

    onDragEnd = useCallback(() => {
      dataset?.endCaching()
      appState.endPerformance()

      if (dragID !== '') {
        target.current
          .classed('dragging', false)
          .transition()
          .attr('r', selectedPointRadius)
        setDragID('')
        target.current = null

        if (didDrag.current) {
          const caseValues: ICase[] = [],
            { selection } = dataConfiguration || {}
          primaryAttrID && selection?.forEach(anID => {
            caseValues.push({
              __id__: anID,
              [primaryAttrID]: selectedDataObjects.current[anID]
            })
          })
          enableAnimation.current = true // So points will animate back to original positions
          caseValues.length && dataset?.setCaseValues(caseValues)
          didDrag.current = false
        }
      }
    }, [dataConfiguration, dataset, selectedPointRadius, dragID, enableAnimation, primaryAttrID])

  useDragHandlers(window, {start: onDragStart, drag: onDrag, end: onDragEnd})

  const refreshPointSelection = useCallback(() => {
    dataConfiguration && setPointSelection({
      dotsRef, dataConfiguration, pointRadius: graphModel.getPointRadius(), selectedPointRadius
    })
  }, [dataConfiguration, dotsRef, graphModel, selectedPointRadius])

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
      const
        pointDiameter = 2 * pointRadius,
        secondaryRangeIndex = primaryIsBottom ? 0 : 1,
        secondaryMax = Number(secondaryScale?.range()[secondaryRangeIndex]),
        secondaryExtent = Math.abs(Number(secondaryScale?.range()[0] - secondaryScale?.range()[1])),
        secondaryBandwidth = secondaryScale.bandwidth?.() ?? secondaryExtent,
        secondarySign = primaryIsBottom ? -1 : 1,
        baseCoord = primaryIsBottom ? secondaryMax : 0,
        binMap: Record<string, { category: string, indexInBin: number }> = {}
      let overlap = 0

      function computeBinPlacements() {
        const numBins = Math.ceil(primaryLength / pointDiameter) + 1,
          binWidth = primaryLength / (numBins - 1),
          bins: Record<string, string[][]> = {}

        primaryAttrID && dataConfiguration?.cases.forEach((anID) => {
          const numerator = primaryScale?.(dataset?.getNumeric(anID, primaryAttrID) ?? -1),
            bin = Math.ceil((numerator ?? 0) / binWidth),
            category = secondaryAttrID ? dataset?.getValue(anID, secondaryAttrID) : '__main__'
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
          excessHeight = Math.max(0, maxInBin - Math.floor(secondaryMax / pointDiameter)) * pointDiameter
        overlap = excessHeight / maxInBin
      }

      computeBinPlacements()

      const computeSecondaryCoord = (category: string, indexInBin: number) => {
        let catCoord = !!category && category !== '__main__' ? secondaryScale?.(category) ?? 0 : 0
        if (primaryIsBottom) {
          catCoord = secondaryExtent - secondaryBandwidth - catCoord
        }
        return baseCoord + secondarySign * (catCoord + pointDiameter / 2 +
          indexInBin * (pointDiameter - overlap))
      }

      const
        // Note that we can get null for either or both of the next two functions. It just means that we have
        // a circle for the case but we're not plotting it.
        getPrimaryScreenCoord = (anID: string) => {
          return primaryAttrID ? getScreenCoord(dataset, anID, primaryAttrID, primaryScale) : null
        },
        getSecondaryScreenCoord = (anID: string) => {
          return binMap[anID] ? computeSecondaryCoord(binMap[anID].category, binMap[anID].indexInBin) : null
        },
        duration = enableAnimation.current ? transitionDuration : 0,
        onComplete = enableAnimation.current ? () => {
          enableAnimation.current = false
        } : undefined,
        getScreenX = primaryIsBottom ? getPrimaryScreenCoord : getSecondaryScreenCoord,
        getScreenY = primaryIsBottom ? getSecondaryScreenCoord : getPrimaryScreenCoord,
        getLegendColor = dataConfiguration?.getLegendColorForCase

      setPointCoordinates({
        dataset, pointRadius, selectedPointRadius, dotsRef, selectedOnly,
        getScreenX, getScreenY, getLegendColor, duration, onComplete
      })
    },
    [dataConfiguration?.cases, dataset, pointRadius, selectedPointRadius, dotsRef, enableAnimation,
      primaryAttrID, secondaryAttrID, primaryLength, primaryIsBottom, primaryScale, secondaryScale,
      dataConfiguration?.getLegendColorForCase])

  usePlotResponders({
    graphModel, primaryAttrID, secondaryAttrID, legendAttrID, layout, dotsRef,
    refreshPointPositions, refreshPointSelection, enableAnimation
  })

  return (
    <svg/>
  )
}))
