import {select} from "d3"
import React, {useCallback, useRef, useState} from "react"
import {appState} from "../../../models/app-state"
import {ScaleNumericBaseType} from "../../axis/axis-types"
import {CaseData, PlotProps} from "../graphing-types"
import {useDragHandlers, usePlotResponders} from "../hooks/use-plot"
import {useDataConfigurationContext} from "../hooks/use-data-configuration-context"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {Bounds, useGraphLayoutContext} from "../models/graph-layout"
import {ICase} from "../../../models/data/data-set-types"
import {getScreenCoord, handleClickOnDot, setPointCoordinates, setPointSelection} from "../utilities/graph-utils"
import {useGraphModelContext} from "../models/graph-model"

export const ScatterDots = function ScatterDots(props: PlotProps) {
  const {dotsRef, enableAnimation} = props,
    graphModel = useGraphModelContext(),
    instanceId = useInstanceIdContext(),
    dataConfiguration = useDataConfigurationContext(),
    dataset = useDataSetContext(),
    primaryAttrIDRef = useRef(''),
    secondaryAttrIDsRef = useRef<string[]>([]),
    pointRadiusRef = useRef(0),
    selectedPointRadiusRef = useRef(0),
    dragPointRadiusRef = useRef(0),
    layout = useGraphLayoutContext(),
    legendAttrID = dataConfiguration?.attributeID('legend') as string,
    xScaleRef = useRef<ScaleNumericBaseType>(),
    yScaleRef = useRef<ScaleNumericBaseType>(),
    [dragID, setDragID] = useState(''),
    currPos = useRef({x: 0, y: 0}),
    didDrag = useRef(false),
    target = useRef<any>(),
    selectedDataObjects = useRef<Record<string, { x: number, y: number }>>({}),
    plotNumRef = useRef(0)

  primaryAttrIDRef.current = dataConfiguration?.primaryAttributeID
  secondaryAttrIDsRef.current = dataConfiguration?.yAttributeIDs || []
  pointRadiusRef.current = graphModel.getPointRadius()
  selectedPointRadiusRef.current = graphModel.getPointRadius('select')
  dragPointRadiusRef.current = graphModel.getPointRadius('hover-drag')

  xScaleRef.current = layout.getAxisScale("bottom") as ScaleNumericBaseType
  yScaleRef.current = layout.getAxisScale("left") as ScaleNumericBaseType

  const onDragStart = useCallback((event: MouseEvent) => {
      dataset?.beginCaching()
      secondaryAttrIDsRef.current = dataConfiguration?.yAttributeIDs || []
      enableAnimation.current = false // We don't want to animate points until end of drag
      didDrag.current = false
      target.current = select(event.target as SVGSVGElement)
      const tItsID = target.current.datum()?.caseID ?? ''
      plotNumRef.current = target.current.datum()?.plotNum ?? 0
      if (target.current.node()?.nodeName === 'circle') {
        appState.beginPerformance()
        target.current
          .property('isDragging', true)
          .transition()
          .attr('r', dragPointRadiusRef.current)
        setDragID(tItsID)
        currPos.current = {x: event.clientX, y: event.clientY}

        handleClickOnDot(event, tItsID, dataset)
        // Record the current values, so we can change them during the drag and restore them when done
        const {selection} = dataConfiguration || {}
        selection?.forEach(anID => {
          selectedDataObjects.current[anID] = {
            x: dataset?.getNumeric(anID, primaryAttrIDRef.current) ?? 0,
            y: dataset?.getNumeric(anID, secondaryAttrIDsRef.current[plotNumRef.current]) ?? 0
          }
        })
      }
    }, [dataConfiguration, dataset, enableAnimation]),

    onDrag = useCallback((event: MouseEvent) => {
      if (dragID !== '') {
        const newPos = {x: event.clientX, y: event.clientY},
          dx = newPos.x - currPos.current.x,
          dy = newPos.y - currPos.current.y
        currPos.current = newPos
        if (dx !== 0 || dy !== 0) {
          didDrag.current = true
          const deltaX = Number(xScaleRef.current?.invert(dx)) - Number(xScaleRef.current?.invert(0)),
            deltaY = Number(yScaleRef.current?.invert(dy)) - Number(yScaleRef.current?.invert(0)),
            caseValues: ICase[] = [],
            {selection} = dataConfiguration || {}
          selection?.forEach(anID => {
            const currX = Number(dataset?.getNumeric(anID, primaryAttrIDRef.current)),
              currY = Number(dataset?.getNumeric(anID, secondaryAttrIDsRef.current[plotNumRef.current]))
            if (isFinite(currX) && isFinite(currY)) {
              caseValues.push({
                __id__: anID,
                [primaryAttrIDRef.current]: currX + deltaX,
                [secondaryAttrIDsRef.current[plotNumRef.current]]: currY + deltaY
              })
            }
          })
          caseValues.length &&
          dataset?.setCaseValues(caseValues,
            [primaryAttrIDRef.current, secondaryAttrIDsRef.current[plotNumRef.current]])
        }
      }
    }, [dataConfiguration, dataset, dragID]),

    onDragEnd = useCallback(() => {
      dataset?.endCaching()
      appState.endPerformance()

      if (dragID !== '') {
        target.current
          .classed('dragging', false)
          .property('isDragging', false)
          .transition()
          .attr('r', selectedPointRadiusRef.current)
        setDragID(() => '')
        target.current = null

        if (didDrag.current) {
          const caseValues: ICase[] = [],
            {selection} = dataConfiguration || {}
          selection?.forEach(anID => {
            caseValues.push({
              __id__: anID,
              [primaryAttrIDRef.current]: selectedDataObjects.current[anID].x,
              [secondaryAttrIDsRef.current[plotNumRef.current]]: selectedDataObjects.current[anID].y
            })
          })
          enableAnimation.current = true // So points will animate back to original positions
          caseValues.length && dataset?.setCaseValues(caseValues,
            [primaryAttrIDRef.current, secondaryAttrIDsRef.current[plotNumRef.current]])
          didDrag.current = false
        }
      }
    }, [dataConfiguration, dataset, dragID, enableAnimation,])

  useDragHandlers(window, {start: onDragStart, drag: onDrag, end: onDragEnd})

  const refreshPointSelection = useCallback(() => {
    const {pointColor, pointStrokeColor} = graphModel
    dataConfiguration && setPointSelection(
      {
        dotsRef, dataConfiguration, pointRadius: pointRadiusRef.current,
        selectedPointRadius: selectedPointRadiusRef.current,
        pointColor, pointStrokeColor, getPointColorAtIndex: graphModel.pointColorAtIndex
      })
  }, [dataConfiguration, dotsRef, graphModel])

  const refreshPointPositionsD3 = useCallback((selectedOnly: boolean) => {
    const yAttrIDs = dataConfiguration?.yAttributeIDs || [],
      {pointColor, pointStrokeColor} = graphModel,
      hasY2Attribute = dataConfiguration?.hasY2Attribute,
      v2Scale = layout.getAxisScale("rightNumeric") as ScaleNumericBaseType,
      numberOfPlots = dataConfiguration?.numberOfPlots || 1,
      getScreenX = (anID: string) => xScaleRef.current &&
        getScreenCoord(dataset, anID, primaryAttrIDRef.current, xScaleRef.current) || 0,
      getScreenY = (anID: string, plotNum = 0) => {
        const verticalScale = hasY2Attribute && plotNum === numberOfPlots - 1 ? v2Scale : yScaleRef.current
        return verticalScale && getScreenCoord(dataset, anID, yAttrIDs[plotNum], verticalScale) || 0
      },
      getLegendColor = legendAttrID ? dataConfiguration?.getLegendColorForCase : undefined,
      {computedBounds} = layout,
      plotBounds = computedBounds.get('plot') as Bounds

    setPointCoordinates({
      dataset, dotsRef, pointRadius: pointRadiusRef.current, selectedPointRadius: selectedPointRadiusRef.current,
      plotBounds, selectedOnly, getScreenX, getScreenY, getLegendColor,
      getPointColorAtIndex: graphModel.pointColorAtIndex, enableAnimation, pointColor, pointStrokeColor
    })
  }, [dataConfiguration, dataset, dotsRef, layout,
    legendAttrID, enableAnimation, graphModel])

  const refreshPointPositionsSVG = useCallback((selectedOnly: boolean) => {
    const {joinedCaseDataArrays, selection} = dataConfiguration || {}
    const updateDot = (aCaseData: CaseData) => {
      const caseId = aCaseData.caseID,
        dot = dotsRef.current?.querySelector(`#${instanceId}_${caseId}`)
      if (dot) {
        const dotSvg = dot as SVGCircleElement
        const x = xScaleRef.current && getScreenCoord(dataset, caseId, primaryAttrIDRef.current, xScaleRef.current)
        const y = yScaleRef.current &&
          getScreenCoord(dataset, caseId, secondaryAttrIDsRef.current[aCaseData.plotNum], yScaleRef.current)
        if (x != null && isFinite(x) && y != null && isFinite(y)) {
          dotSvg.setAttribute("cx", `${x}`)
          dotSvg.setAttribute("cy", `${y}`)
        }
      }
    }
    if (selectedOnly) {
      selection?.forEach(caseId => updateDot({plotNum: 0, caseID: caseId}))
    } else {
      joinedCaseDataArrays?.forEach((aCaseData) => updateDot(aCaseData))
    }
  }, [dataConfiguration, dataset, dotsRef, instanceId])

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
    if (appState.isPerformanceMode) {
      refreshPointPositionsSVG(selectedOnly)
    } else {
      refreshPointPositionsD3(selectedOnly)
    }
  }, [refreshPointPositionsD3, refreshPointPositionsSVG])

  usePlotResponders({
    graphModel, primaryAttrID: primaryAttrIDRef.current, secondaryAttrID: secondaryAttrIDsRef.current[0],
    layout, dotsRef, refreshPointPositions, refreshPointSelection, enableAnimation
  })

  return (
    <svg/>
  )
}
