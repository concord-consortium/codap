import {select} from "d3"
import { reaction } from "mobx"
import { onAction } from "mobx-state-tree"
import React, {memo, useCallback, useContext, useEffect, useRef, useState} from "react"
import { appState } from "../../app-state"
import {plotProps, InternalizedData, defaultRadius, dragRadius, transitionDuration} from "../graphing-types"
import {useDragHandlers} from "../hooks/graph-hooks"
import { GraphLayoutContext } from "../models/graph-layout"
import { INumericAxisModel } from "../models/axis-model"
import {ICase, IDataSet} from "../../../data-model/data-set"
import { isSelectionAction, isSetCaseValuesAction } from "../../../data-model/data-set-actions"
import {getScreenCoord, setPointCoordinates, setPointSelection} from "../utilities/graph_utils"
import { prf } from "../../../utilities/profiler"

export const ScatterDots = memo(function ScatterDots(props: {
  plotProps: plotProps
  worldDataRef: React.MutableRefObject<IDataSet | undefined>
  graphData: InternalizedData
  dotsRef: React.RefObject<SVGSVGElement>
  xAxis: INumericAxisModel
  yAxis: INumericAxisModel
}) {
  const {worldDataRef, graphData, dotsRef, xAxis, yAxis} = props,
    layout = useContext(GraphLayoutContext),
    xScale = layout.axisScale("bottom"),
    yScale = layout.axisScale("left"),
    [dragID, setDragID] = useState(''),
    currPos = useRef({x: 0, y: 0}),
    didDrag = useRef(false),
    target = useRef<any>(),
    firstTime = useRef(true),
    xAttrID = graphData.xAttributeID,
    yAttrID = graphData.yAttributeID,
    selectedDataObjects = useRef<{ [index: string]: { x: number, y: number } }>({})

  const onDragStart = useCallback((event: MouseEvent) => {
    prf.measure("Graph.onDragStart", () => {
      appState.beginPerformance()
      worldDataRef.current?.beginCaching()
      firstTime.current = false // We don't want to animate points until end of drag
      didDrag.current = false
      target.current = select(event.target as SVGSVGElement)
      const tItsID: string = target.current.property('id')
      if (target.current.node()?.nodeName === 'circle') {
        target.current.transition()
          .attr('r', dragRadius)
        setDragID(tItsID)
        currPos.current = {x: event.clientX, y: event.clientY}

        worldDataRef.current?.selectCases([tItsID])
        // Record the current values so we can change them during the drag and restore them when done
        worldDataRef.current?.selection.forEach(anID => {
          selectedDataObjects.current[anID] = {
            x: worldDataRef.current?.getNumeric(anID, xAttrID) ?? 0,
            y: worldDataRef.current?.getNumeric(anID, yAttrID) ?? 0
          }
        })
      }
    })
  }, [firstTime, xAttrID, yAttrID, worldDataRef]),

  onDrag = useCallback((event: MouseEvent) => {
    prf.measure("Graph.onDrag", () => {
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
          worldDataRef.current?.selection.forEach(anID => {
            const currX = Number(worldDataRef.current?.getNumeric(anID, xAttrID)),
              currY = Number(worldDataRef.current?.getNumeric(anID, yAttrID))
            if (isFinite(currX) && isFinite(currY)) {
              caseValues.push({
                __id__: anID,
                [xAttrID]: currX + deltaX,
                [yAttrID]: currY + deltaY
              })
            }
          })
          caseValues.length && worldDataRef.current?.setCaseValues(caseValues)
        }
      }
    })
  }, [dragID, xScale, yScale, xAttrID, yAttrID, worldDataRef]),

  onDragEnd = useCallback(() => {
    prf.measure("Graph.onDragEnd", () => {
      if (dragID !== '') {
        target.current
          .classed('dragging', false)
          .transition()
          .attr('r', defaultRadius)
        setDragID(() => '')
        target.current = null

        if (didDrag.current) {
          const caseValues: ICase[] = []
          worldDataRef.current?.selection.forEach(anID => {
            caseValues.push({
              __id__: anID,
              [xAttrID]: selectedDataObjects.current[anID].x,
              [yAttrID]: selectedDataObjects.current[anID].y
            })
          })
          caseValues.length && worldDataRef.current?.setCaseValues(caseValues)
          firstTime.current = true // So points will animate back to original positions
        }
      }
      didDrag.current = false
      worldDataRef.current?.endCaching()
      appState.endPerformance()
    })
  }, [dragID, xAttrID, yAttrID, worldDataRef])

  useDragHandlers(window, {start: onDragStart, drag: onDrag, end: onDragEnd})

  const refreshPointSelection = useCallback(() => {
    prf.measure("Graph.ScatterDots[refreshPointSelection]", () => {
      setPointSelection({ dotsRef, dataset: worldDataRef.current })
    })
  }, [dotsRef, worldDataRef])

  const refreshPointPositions = useCallback(() => {
    prf.measure("Graph.ScatterDots[refreshPointPositions]", () => {
      const selectedOnly = appState.appMode === "performance",
        getScreenX = (anID: string) => getScreenCoord(worldDataRef.current, anID, xAttrID, xScale),
        getScreenY = (anID: string) => getScreenCoord(worldDataRef.current, anID, yAttrID, yScale),
        duration = firstTime.current ? transitionDuration : 0,
        onComplete = firstTime.current ? () => {
          prf.measure("Graph.ScatterDots[refreshPointPositions]", () => {
            firstTime.current = false
          })
        } : undefined

      setPointCoordinates({dotsRef, selectedOnly, getScreenX, getScreenY, duration, onComplete})
    })
  }, [dotsRef, worldDataRef, xAttrID, xScale, yAttrID, yScale])

  // respond to axis domain changes (e.g. axis dragging)
  useEffect(() => {
    refreshPointPositions()
    const disposer = reaction(
      () => [xAxis.domain, yAxis.domain],
      domains => {
        firstTime.current = false // don't animate response to axis changes
        refreshPointPositions()
      }
    )
    return () => disposer()
  }, [refreshPointPositions, xAxis, yAxis])

  // respond to axis range changes (e.g. component resizing)
  useEffect(() => {
    refreshPointPositions()
    const disposer = reaction(
      () => [layout.axisLength(xAxis.place), layout.axisLength(yAxis.place)],
      ranges => {
        firstTime.current = false // don't animate response to axis changes
        refreshPointPositions()
      }
    )
    return () => disposer()
  }, [layout, refreshPointPositions, xAxis, yAxis])

  // respond to selection and value changes
  useEffect(() => {
    const disposer = worldDataRef.current && onAction(worldDataRef.current, action => {
      if (isSelectionAction(action)) {
        refreshPointSelection()
      }
      else if (isSetCaseValuesAction(action)) {
        refreshPointPositions()
      }
    }, true)
    return () => disposer?.()
  }, [refreshPointPositions, refreshPointSelection, worldDataRef])

  return (
    <svg/>
  )
})
// (ScatterDots as any).whyDidYouRender = true
