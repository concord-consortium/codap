import React, {memo, useCallback, useEffect, useRef, useState} from "react"
import {select} from "d3"
import {plotProps, InternalizedData, defaultRadius, dragRadius, transitionDuration} from "../graphing-types"
import {useDragHandlers, useSelection} from "../hooks/graph-hooks"
import { appState } from "../../app-state"
import {ICase, IDataSet} from "../../../data-model/data-set"
import {getScreenCoord, setPointCoordinates} from "../utilities/graph_utils"
import { prf } from "../../../utilities/profiler"

export const ScatterDots = memo(function ScatterDots(props: {
  plotProps: plotProps,
  plotWidth: number,
  plotHeight: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  worldDataRef: React.MutableRefObject<IDataSet | undefined>,
  graphData: InternalizedData,
  dotsRef: React.RefObject<SVGSVGElement>
}) {
  const {worldDataRef, graphData, dotsRef, plotProps: {xScale, yScale}, xMax, xMin, yMax, yMin} = props,
    [dragID, setDragID] = useState(''),
    currPos = useRef({x: 0, y: 0}),
    target = useRef<any>(),
    [refreshCounter, setRefreshCounter] = useState(0),
    plotWidth = props.plotWidth,
    plotHeight = props.plotHeight,
    [firstTime, setFirstTime] = useState<boolean | null>(true),
    xAttrID = graphData.xAttributeID,
    yAttrID = graphData.yAttributeID,
    selectedDataObjects = useRef<{ [index: string]: { x: number, y: number } }>({}),
    [forceRefreshCounter, setForceRefreshCounter] = useState(0)

  const onDragStart = useCallback((event: MouseEvent) => {
    prf.measure("Graph.dragDotsStart", () => {
      appState.beginPerformance()
      worldDataRef.current?.beginCaching()
      if (firstTime) {
        setFirstTime(false) // We don't want to animate points until end of drag
      }
      target.current = select(event.target as SVGSVGElement)
      const tItsID: string = target.current.property('id')
      if (target.current.node()?.nodeName === 'circle') {
        target.current.transition()
          .attr('r', dragRadius)
        setDragID(() => tItsID)
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
  }, [firstTime, setFirstTime, xAttrID, yAttrID, worldDataRef]),

  onDrag = useCallback((event: MouseEvent) => {
    prf.measure("Graph.dragDots", () => {
      if (dragID !== '') {
        const newPos = {x: event.clientX, y: event.clientY},
          dx = newPos.x - currPos.current.x,
          dy = newPos.y - currPos.current.y
        currPos.current = newPos
        if (dx !== 0 || dy !== 0) {
          const deltaX = Number(xScale?.invert(dx)) - Number(xScale?.invert(0)),
            deltaY = Number(yScale?.invert(dy)) - Number(yScale?.invert(0)),
            caseValues: ICase[] = []
          worldDataRef.current?.selection.forEach(anID => {
            const currX = Number(worldDataRef.current?.getNumeric(anID, xAttrID)),
              currY = Number(worldDataRef.current?.getNumeric(anID, yAttrID))
            if (isFinite(currX) && isFinite(currY)) {
              // console.log("ScatterDots.onDrag [setCaseValues]")
              caseValues.push({
                __id__: anID,
                [xAttrID]: currX + deltaX,
                [yAttrID]: currY + deltaY
              })
            }
          })
          caseValues.length && worldDataRef.current?.setCaseValues(caseValues)
          setRefreshCounter(prevCounter => ++prevCounter)
        }
      }
    })
  }, [dragID, xScale, yScale, setRefreshCounter, xAttrID, yAttrID, worldDataRef]),

  onDragEnd = useCallback(() => {
    prf.measure("Graph.dragDotsEnd", () => {
      if (dragID !== '') {
        target.current
          .classed('dragging', false)
          .transition()
          .attr('r', defaultRadius)
        setDragID(() => '')
        target.current = null

        const caseValues: ICase[] = []
        worldDataRef.current?.selection.forEach(anID => {
          caseValues.push({
            __id__: anID,
            [xAttrID]: selectedDataObjects.current[anID].x,
            [yAttrID]: selectedDataObjects.current[anID].y
          })
        })
        caseValues.length && worldDataRef.current?.setCaseValues(caseValues)
        setFirstTime(true) // So points will animate back to original positions
        setRefreshCounter(prevCounter => ++prevCounter)
      }
      worldDataRef.current?.endCaching()
      appState.endPerformance()
    })
  }, [dragID, xAttrID, yAttrID, worldDataRef])

  useDragHandlers(window, {start: onDragStart, drag: onDrag, end: onDragEnd})

  useEffect(function refreshPoints() {
    prf.measure("Graph.refreshPoints", () => {
      const getScreenX = (anID: string) => getScreenCoord(worldDataRef.current, anID, xAttrID, xScale),
        getScreenY = (anID: string) => getScreenCoord(worldDataRef.current, anID, yAttrID, yScale),
        duration = firstTime ? transitionDuration : 0,
        onComplete = firstTime ? () => {
          prf.measure("Graph.refreshPoints[onComplete]", () => {
            setFirstTime(false)
          })
        } : undefined

      setPointCoordinates({dotsRef, worldDataRef, getScreenX, getScreenY, duration, onComplete})
    })
  }, [firstTime, dotsRef, xScale, yScale, xMin, xMax, yMin, yMax,
      plotWidth, plotHeight, refreshCounter, forceRefreshCounter, xAttrID, yAttrID, worldDataRef]
  )

  /**
   * In the initial refreshPoints there are no circles. We call this once to force a refreshPoints in which
   * there are circles.
   */
  useEffect(function forceRefresh() {
    prf.measure("Graph.forceRefresh", () => {
      setForceRefreshCounter(prevCounter => prevCounter)
    })
  }, [])

  useSelection(worldDataRef, setRefreshCounter)

  return (
    <svg/>
  )
})
// (ScatterDots as any).whyDidYouRender = true
