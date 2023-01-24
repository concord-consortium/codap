import {select} from "d3"
import React, {memo, useCallback, useEffect, useRef, useState} from "react"
import {autorun} from "mobx"
import {appState} from "../../../models/app-state"
import {ScaleNumericBaseType} from "../../axis/axis-types"
import {CaseData, PlotProps} from "../graphing-types"
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
    secondaryAttrIDs = useRef(dataConfiguration?.yAttributeIDs || []),
    legendAttrID = dataConfiguration?.attributeID('legend') as string,
    xScale = layout.getAxisScale("bottom") as ScaleNumericBaseType,
    yScale = layout.getAxisScale("left") as ScaleNumericBaseType,
    [dragID, setDragID] = useState(''),
    currPos = useRef({x: 0, y: 0}),
    didDrag = useRef(false),
    target = useRef<any>(),
    selectedDataObjects = useRef<Record<string, { x: number, y: number }>>({}),
    plotNumRef = useRef(0)

  const onDragStart = useCallback((event: MouseEvent) => {
      dataset?.beginCaching()
      secondaryAttrIDs.current = dataConfiguration?.yAttributeIDs || []
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
          .attr('r', dragPointRadius)
        setDragID(tItsID)
        currPos.current = {x: event.clientX, y: event.clientY}

        handleClickOnDot(event, tItsID, dataset)
        // Record the current values, so we can change them during the drag and restore them when done
        const {selection} = dataConfiguration || {}
        selection?.forEach(anID => {
          selectedDataObjects.current[anID] = {
            x: dataset?.getNumeric(anID, primaryAttrID) ?? 0,
            y: dataset?.getNumeric(anID, secondaryAttrIDs.current[plotNumRef.current]) ?? 0
          }
        })
      }
    }, [dataConfiguration, dataset, primaryAttrID, secondaryAttrIDs, enableAnimation, dragPointRadius]),

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
              currY = Number(dataset?.getNumeric(anID, secondaryAttrIDs.current[plotNumRef.current]))
            if (isFinite(currX) && isFinite(currY)) {
              caseValues.push({
                __id__: anID,
                [primaryAttrID]: currX + deltaX,
                [secondaryAttrIDs.current[plotNumRef.current]]: currY + deltaY
              })
            }
          })
          caseValues.length &&
            dataset?.setCaseValues(caseValues, [primaryAttrID, secondaryAttrIDs.current[plotNumRef.current]])
        }
      }
    }, [dataConfiguration, dataset, dragID, primaryAttrID, xScale, secondaryAttrIDs, yScale]),

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
              [secondaryAttrIDs.current[plotNumRef.current]]: selectedDataObjects.current[anID].y
            })
          })
          enableAnimation.current = true // So points will animate back to original positions
          caseValues.length && dataset?.setCaseValues(caseValues,
            [primaryAttrID, secondaryAttrIDs.current[plotNumRef.current]])
          didDrag.current = false
        }
      }
    }, [dataConfiguration, dataset, dragID, primaryAttrID, secondaryAttrIDs, enableAnimation,
      selectedPointRadius])

  useDragHandlers(window, {start: onDragStart, drag: onDrag, end: onDragEnd})

  const refreshPointSelection = useCallback(() => {
    const {pointColor, pointStrokeColor} = graphModel
    dataConfiguration && setPointSelection(
      {
        dotsRef, dataConfiguration, pointRadius, selectedPointRadius,
        pointColor, pointStrokeColor, getPointColorAtIndex: graphModel.pointColorAtIndex
      })
  }, [dataConfiguration, dotsRef, pointRadius, selectedPointRadius, graphModel])

  const refreshPointPositionsD3 = useCallback((selectedOnly: boolean) => {
    const yAttrIDs = dataConfiguration?.yAttributeIDs || [],
      {pointColor, pointStrokeColor} = graphModel,
      getScreenX = (anID: string) => getScreenCoord(dataset, anID, primaryAttrID, xScale),
      getScreenY = (anID: string, plotNum = 0) => {
        return getScreenCoord(dataset, anID, yAttrIDs[plotNum], yScale)
      },
      getLegendColor = legendAttrID ? dataConfiguration?.getLegendColorForCase : undefined,
      {computedBounds} = layout,
      plotBounds = computedBounds.get('plot') as Bounds

    setPointCoordinates({
      dataset, dotsRef, pointRadius, selectedPointRadius, plotBounds, selectedOnly,
      getScreenX, getScreenY, getLegendColor, getPointColorAtIndex: graphModel.pointColorAtIndex,
      enableAnimation, pointColor, pointStrokeColor
    })
  }, [dataConfiguration, dataset, pointRadius, selectedPointRadius, dotsRef, layout, primaryAttrID,
    xScale, legendAttrID, yScale, enableAnimation, graphModel])

  const refreshPointPositionsSVG = useCallback((selectedOnly: boolean) => {
    const {joinedCaseDataArrays, selection} = dataConfiguration || {}
    const updateDot = (aCaseData: CaseData) => {
      const caseId = aCaseData.caseID,
        dot = dotsRef.current?.querySelector(`#${instanceId}_${caseId}`)
      if (dot) {
        const dotSvg = dot as SVGCircleElement
        const x = getScreenCoord(dataset, caseId, primaryAttrID, xScale)
        const y = getScreenCoord(dataset, caseId, secondaryAttrIDs.current[aCaseData.plotNum], yScale)
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
  }, [dataConfiguration, dataset, dotsRef, instanceId, primaryAttrID, xScale,
    secondaryAttrIDs, yScale])

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
    if (appState.isPerformanceMode) {
      refreshPointPositionsSVG(selectedOnly)
    } else {
      refreshPointPositionsD3(selectedOnly)
    }
  }, [refreshPointPositionsD3, refreshPointPositionsSVG])

  // respond to pointsNeedUpdating becoming false; that is when the points have been updated
  // Happens when the number of plots has changed
  useEffect(() => {
    return autorun(
      () => {
        !dataConfiguration?.pointsNeedUpdating && refreshPointPositionsD3(false)
      })
  }, [dataConfiguration?.pointsNeedUpdating, refreshPointPositionsD3])

  usePlotResponders({
    graphModel, primaryAttrID, secondaryAttrID: secondaryAttrIDs.current[0], layout, dotsRef,
    refreshPointPositions, refreshPointSelection, enableAnimation
  })

  return (
    <svg/>
  )
})
