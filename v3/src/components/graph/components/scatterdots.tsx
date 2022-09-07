import {select} from "d3"
import React, {memo, useCallback, useRef, useState} from "react"
import {appState} from "../../app-state"
import {defaultRadius, dragRadius, transitionDuration} from "../graphing-types"
import {useDragHandlers, usePlotResponders} from "../hooks/graph-hooks"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {ScaleNumericBaseType, useGraphLayoutContext} from "../models/graph-layout"
import {INumericAxisModel} from "../models/axis-model"
import {ICase} from "../../../data-model/data-set"
import {getScreenCoord, setPointCoordinates, setPointSelection} from "../utilities/graph_utils"

export const ScatterDots = memo(function ScatterDots(props: {
  casesRef: React.MutableRefObject<string[]>
  xAttrID: string
  yAttrID: string
  dotsRef: React.RefObject<SVGSVGElement>
  xAxisModel: INumericAxisModel
  yAxisModel: INumericAxisModel
  enableAnimation: React.MutableRefObject<boolean>
}) {
  const {casesRef, xAttrID, yAttrID, dotsRef, xAxisModel, yAxisModel, enableAnimation} = props,
    instanceId = useInstanceIdContext(),
    dataset = useDataSetContext(),
    layout = useGraphLayoutContext(),
    xScale = layout.axisScale("bottom") as ScaleNumericBaseType,
    yScale = layout.axisScale("left") as ScaleNumericBaseType,
    [dragID, setDragID] = useState(''),
    currPos = useRef({x: 0, y: 0}),
    didDrag = useRef(false),
    target = useRef<any>(),
    selectedDataObjects = useRef<{ [index: string]: { x: number, y: number } }>({})

  const onDragStart = useCallback((event: MouseEvent) => {
      dataset?.beginCaching()
      enableAnimation.current = false // We don't want to animate points until end of drag
      didDrag.current = false
      target.current = select(event.target as SVGSVGElement)
      const tItsID: string = target.current.property('id')
      if (target.current.node()?.nodeName === 'circle') {
        appState.beginPerformance()
        target.current.transition()
          .attr('r', dragRadius)
        setDragID(tItsID)
        currPos.current = {x: event.clientX, y: event.clientY}

        const [, caseId] = tItsID.split("_")
        dataset?.selectCases([caseId])
        // Record the current values so we can change them during the drag and restore them when done
        dataset?.selection.forEach(anID => {
          selectedDataObjects.current[anID] = {
            x: dataset?.getNumeric(anID, xAttrID) ?? 0,
            y: dataset?.getNumeric(anID, yAttrID) ?? 0
          }
        })
      }
    }, [dataset, xAttrID, yAttrID, enableAnimation]),

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
            caseValues: ICase[] = []
          dataset?.selection.forEach(anID => {
            const currX = Number(dataset?.getNumeric(anID, xAttrID)),
              currY = Number(dataset?.getNumeric(anID, yAttrID))
            if (isFinite(currX) && isFinite(currY)) {
              caseValues.push({
                __id__: anID,
                [xAttrID]: currX + deltaX,
                [yAttrID]: currY + deltaY
              })
            }
          })
          caseValues.length && dataset?.setCaseValues(caseValues)
        }
      }
    }, [dataset, dragID, xAttrID, xScale, yAttrID, yScale]),

    onDragEnd = useCallback(() => {
      dataset?.endCaching()
      appState.endPerformance()

      if (dragID !== '') {
        target.current
          .classed('dragging', false)
          .transition()
          .attr('r', defaultRadius)
        setDragID(() => '')
        target.current = null

        if (didDrag.current) {
          const caseValues: ICase[] = []
          dataset?.selection.forEach(anID => {
            caseValues.push({
              __id__: anID,
              [xAttrID]: selectedDataObjects.current[anID].x,
              [yAttrID]: selectedDataObjects.current[anID].y
            })
          })
          enableAnimation.current = true // So points will animate back to original positions
          caseValues.length && dataset?.setCaseValues(caseValues)
          didDrag.current = false
        }
      }
    }, [dataset, dragID, xAttrID, yAttrID, enableAnimation])

  useDragHandlers(window, {start: onDragStart, drag: onDrag, end: onDragEnd})

  const refreshPointSelection = useCallback(() => {
    setPointSelection({dotsRef, dataset})
  }, [dataset, dotsRef])

  const refreshPointPositionsD3 = useCallback((selectedOnly: boolean) => {
    const
      getScreenX = (anID: string) => getScreenCoord(dataset, anID, xAttrID, xScale),
      getScreenY = (anID: string) => getScreenCoord(dataset, anID, yAttrID, yScale),
      duration = enableAnimation.current ? transitionDuration : 0,
      onComplete = enableAnimation.current ? () => {
        enableAnimation.current = false
      } : undefined

    setPointCoordinates({dotsRef, selectedOnly, getScreenX, getScreenY, duration, onComplete})
  }, [dataset, dotsRef, xAttrID, xScale, yAttrID, yScale, enableAnimation])

  const refreshPointPositionsSVG = useCallback((selectedOnly: boolean) => {
    const updateDot = (caseId: string) => {
      const dot = dotsRef.current?.querySelector(`#${instanceId}_${caseId}`)
      if (dot) {
        const dotSvg = dot as SVGCircleElement
        const x = getScreenCoord(dataset, caseId, xAttrID, xScale)
        const y = getScreenCoord(dataset, caseId, yAttrID, yScale)
        if (x != null && isFinite(x) && y != null && isFinite(y)) {
          dotSvg.setAttribute("cx", `${x}`)
          dotSvg.setAttribute("cy", `${y}`)
        }
      }
    }
    if (selectedOnly) {
      dataset?.selection.forEach(caseId => updateDot(caseId))
    } else {
      casesRef.current.forEach((anID) => updateDot(anID))
    }
  }, [casesRef, dataset, dotsRef, instanceId, xAttrID, xScale, yAttrID, yScale])

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
    if (appState.isPerformanceMode) {
      refreshPointPositionsSVG(selectedOnly)
    } else {
      refreshPointPositionsD3(selectedOnly)
    }
  }, [refreshPointPositionsD3, refreshPointPositionsSVG])

  usePlotResponders({
    dataset, xAxisModel, yAxisModel, xAttrID, yAttrID, layout,
    refreshPointPositions, refreshPointSelection, enableAnimation
  })

  return (
    <svg/>
  )
})
// (ScatterDots as any).whyDidYouRender = true
