import {select} from "d3"
import React, {memo, useCallback, useRef, useState} from "react"
import {appState} from "../../app-state"
import {ScaleNumericBaseType} from "../../axis/axis-types"
import {PlotProps} from "../graphing-types"
import {useDragHandlers, usePlotResponders} from "../hooks/use-plot"
import {useDataConfigurationContext} from "../hooks/use-data-configuration-context"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {Bounds, useGraphLayoutContext} from "../models/graph-layout"
import {ICase} from "../../../models/data/data-set"
import {getScreenCoord, handleClickOnDot, setPointCoordinates, setPointSelection} from "../utilities/graph-utils"
import {useGraphModelContext} from "../models/graph-model"

export const ScatterDots = memo(function ScatterDots(props: PlotProps) {
  const {dotsRef, enableAnimation} = props,
    graphModel = useGraphModelContext(),
    instanceId = useInstanceIdContext(),
    dataConfiguration = useDataConfigurationContext(),
    dataset = useDataSetContext(),
    pointRadius = graphModel.getPointRadius(),
    selectedPointRadius = graphModel.getPointRadius('select'),
    dragPointRadius = graphModel.getPointRadius('hover-drag'),
    layout = useGraphLayoutContext(),
    primaryAttrID = dataConfiguration?.attributeID('x') as string,
    secondaryAttrID = dataConfiguration?.attributeID('y') as string,
    legendAttrID = dataConfiguration?.attributeID('legend') as string,
    xScale = layout.getAxisScale("bottom") as ScaleNumericBaseType,
    yScale = layout.getAxisScale("left") as ScaleNumericBaseType,
    [dragID, setDragID] = useState(''),
    currPos = useRef({x: 0, y: 0}),
    didDrag = useRef(false),
    target = useRef<any>(),
    selectedDataObjects = useRef<Record<string, { x: number, y: number }>>({})

  const onDragStart = useCallback((event: MouseEvent) => {
      dataset?.beginCaching()
      enableAnimation.current = false // We don't want to animate points until end of drag
      didDrag.current = false
      target.current = select(event.target as SVGSVGElement)
      const tItsID = target.current.property('id')
      if (target.current.node()?.nodeName === 'circle') {
        appState.beginPerformance()
        target.current
          .property('isDragging', true)
          .transition()
          .attr('r', dragPointRadius)
        setDragID(tItsID)
        currPos.current = {x: event.clientX, y: event.clientY}

        handleClickOnDot(event, tItsID, dataset)
        // Record the current values, so we can change them during the drag and restore them when done
        const {selection} = dataConfiguration || {}
        selection?.forEach(anID => {
          selectedDataObjects.current[anID] = {
            x: dataset?.getNumeric(anID, primaryAttrID) ?? 0,
            y: dataset?.getNumeric(anID, secondaryAttrID) ?? 0
          }
        })
      }
    }, [dataConfiguration, dataset, primaryAttrID, secondaryAttrID, enableAnimation,
      dragPointRadius]),

    onDrag = useCallback((event: MouseEvent) => {
      if (dragID !== '') {
        const newPos = {x: event.clientX, y: event.clientY},
          dx = newPos.x - currPos.current.x,
          dy = newPos.y - currPos.current.y
        currPos.current = newPos
        if (dx !== 0 || dy !== 0) {
          didDrag.current = true
          const deltaX = Number(xScale.invert(dx)) - Number(xScale.invert(0)),
            deltaY = Number(yScale.invert(dy)) - Number(yScale.invert(0)),
            caseValues: ICase[] = [],
            {selection} = dataConfiguration || {}
          selection?.forEach(anID => {
            const currX = Number(dataset?.getNumeric(anID, primaryAttrID)),
              currY = Number(dataset?.getNumeric(anID, secondaryAttrID))
            if (isFinite(currX) && isFinite(currY)) {
              caseValues.push({
                __id__: anID,
                [primaryAttrID]: currX + deltaX,
                [secondaryAttrID]: currY + deltaY
              })
            }
          })
          caseValues.length && dataset?.setCaseValues(caseValues, [primaryAttrID, secondaryAttrID])
        }
      }
    }, [dataConfiguration, dataset, dragID, primaryAttrID, xScale, secondaryAttrID, yScale]),

    onDragEnd = useCallback(() => {
      dataset?.endCaching()
      appState.endPerformance()

      if (dragID !== '') {
        target.current
          .classed('dragging', false)
          .property('isDragging', false)
          .transition()
          .attr('r', selectedPointRadius)
        setDragID(() => '')
        target.current = null

        if (didDrag.current) {
          const caseValues: ICase[] = [],
            {selection} = dataConfiguration || {}
          selection?.forEach(anID => {
            caseValues.push({
              __id__: anID,
              [primaryAttrID]: selectedDataObjects.current[anID].x,
              [secondaryAttrID]: selectedDataObjects.current[anID].y
            })
          })
          enableAnimation.current = true // So points will animate back to original positions
          caseValues.length && dataset?.setCaseValues(caseValues, [primaryAttrID, secondaryAttrID])
          didDrag.current = false
        }
      }
    }, [dataConfiguration, dataset, dragID, primaryAttrID, secondaryAttrID, enableAnimation,
      selectedPointRadius])

  useDragHandlers(window, {start: onDragStart, drag: onDrag, end: onDragEnd})

  const refreshPointSelection = useCallback(() => {
    const {pointColor, pointStrokeColor } = graphModel
    dataConfiguration && setPointSelection(
      {dotsRef, dataConfiguration, pointRadius, selectedPointRadius, pointColor, pointStrokeColor})
  }, [dataConfiguration, dotsRef, pointRadius, selectedPointRadius, graphModel])

  const refreshPointPositionsD3 = useCallback((selectedOnly: boolean) => {
    const {pointColor, pointStrokeColor } = graphModel,
      getScreenX = (anID: string) => getScreenCoord(dataset, anID, primaryAttrID, xScale),
      getScreenY = (anID: string) => getScreenCoord(dataset, anID, secondaryAttrID, yScale),
      getLegendColor = legendAttrID ? dataConfiguration?.getLegendColorForCase : undefined,
      {computedBounds} = layout,
      plotBounds = computedBounds.get('plot') as Bounds

    setPointCoordinates({
      dataset, dotsRef, pointRadius, selectedPointRadius, plotBounds, selectedOnly,
      getScreenX, getScreenY, getLegendColor, enableAnimation, pointColor, pointStrokeColor
    })
  }, [dataset, pointRadius, selectedPointRadius, dotsRef, layout, primaryAttrID,
    xScale, secondaryAttrID, legendAttrID, yScale, enableAnimation, dataConfiguration, graphModel])

  const refreshPointPositionsSVG = useCallback((selectedOnly: boolean) => {
    const {cases, selection} = dataConfiguration || {}
    const updateDot = (caseId: string) => {
      const dot = dotsRef.current?.querySelector(`#${instanceId}_${caseId}`)
      if (dot) {
        const dotSvg = dot as SVGCircleElement
        const x = getScreenCoord(dataset, caseId, primaryAttrID, xScale)
        const y = getScreenCoord(dataset, caseId, secondaryAttrID, yScale)
        if (x != null && isFinite(x) && y != null && isFinite(y)) {
          dotSvg.setAttribute("cx", `${x}`)
          dotSvg.setAttribute("cy", `${y}`)
        }
      }
    }
    if (selectedOnly) {
      selection?.forEach(caseId => updateDot(caseId))
    } else {
      cases?.forEach(anID => updateDot(anID))
    }
  }, [dataConfiguration, dataset, dotsRef, instanceId, primaryAttrID, xScale, secondaryAttrID, yScale])

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
    if (appState.isPerformanceMode) {
      refreshPointPositionsSVG(selectedOnly)
    } else {
      refreshPointPositionsD3(selectedOnly)
    }
  }, [refreshPointPositionsD3, refreshPointPositionsSVG])

  usePlotResponders({
    graphModel, primaryAttrID, secondaryAttrID, layout, dotsRef,
    refreshPointPositions, refreshPointSelection, enableAnimation
  })

  return (
    <svg/>
  )
})
