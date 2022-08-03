import React, {memo, useCallback, useEffect, useRef, useState} from "react"
import {select} from "d3"
import {plotProps, InternalizedData, defaultRadius, dragRadius} from "./graphing-types"
import {useDragHandlers, useSelection} from "./graph-hooks/graph-hooks"
import {IDataSet} from "../../data-model/data-set"
import {getScreenCoord, setPointCoordinates} from "./graph-utils/graph_utils"

export const ScatterDots = memo(function ScatterDots(props: {
  plotProps: plotProps,
  plotWidth: number,
  plotHeight: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  worldDataRef: React.MutableRefObject<IDataSet | undefined>,
  dataRef: React.MutableRefObject<InternalizedData>,
  dotsRef: React.RefObject<SVGSVGElement>
}) {
  const {worldDataRef, dataRef, dotsRef, plotProps: {xScale, yScale}, xMax, xMin, yMax, yMin} = props,
    [dragID, setDragID] = useState(''),
    currPos = useRef({x: 0, y: 0}),
    target = useRef<any>(),
    [refreshCounter, setRefreshCounter] = useState(0),
    plotWidth = props.plotWidth,
    plotHeight = props.plotHeight,
    [firstTime, setFirstTime] = useState<boolean | null>(true),
    xAttrID = dataRef.current.xAttributeID,
    yAttrID = dataRef.current.yAttributeID,
    selectedDataObjects = useRef<{ [index: string]: { x: number, y: number } }>({}),
    [forceRefreshCounter, setForceRefreshCounter] = useState(0)

  const onDragStart = useCallback((event: MouseEvent) => {
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
    }, [firstTime, setFirstTime, xAttrID, yAttrID, worldDataRef]),

    onDrag = useCallback((event: MouseEvent) => {
      if (dragID !== '') {
        const newPos = {x: event.clientX, y: event.clientY},
          dx = newPos.x - currPos.current.x,
          dy = newPos.y - currPos.current.y
        currPos.current = newPos
        if (dx !== 0 || dy !== 0) {
          const deltaX = Number(xScale?.invert(dx)) - Number(xScale?.invert(0)),
            deltaY = Number(yScale?.invert(dy)) - Number(yScale?.invert(0))
          worldDataRef.current?.selection.forEach(anID => {
            const currX = Number(worldDataRef.current?.getNumeric(anID, xAttrID)),
              currY = Number(worldDataRef.current?.getNumeric(anID, yAttrID))
            if (isFinite(currX) && isFinite(currY)) {
              worldDataRef.current?.setCaseValues([{
                __id__: anID,
                [xAttrID]: currX + deltaX,
                [yAttrID]: currY + deltaY
              }])
            }
          })
          setRefreshCounter(prevCounter => ++prevCounter)
        }
      }
    }, [dragID, xScale, yScale, setRefreshCounter, xAttrID, yAttrID, worldDataRef]),

    onDragEnd = useCallback(() => {
      if (dragID !== '') {
        target.current
          .classed('dragging', false)
          .transition()
          .attr('r', defaultRadius)
        setDragID(() => '')
        target.current = null

        worldDataRef.current?.selection.forEach(anID => {
          worldDataRef.current?.setCaseValues([{
            __id__: anID,
            [xAttrID]: selectedDataObjects.current[anID].x,
            [yAttrID]: selectedDataObjects.current[anID].y
          }])
        })
        setFirstTime(true) // So points will animate back to original positions
        setRefreshCounter(prevCounter => ++prevCounter)
      }
    }, [dragID, xAttrID, yAttrID, worldDataRef])

  useDragHandlers(window, {start: onDragStart, drag: onDrag, end: onDragEnd})

  useEffect(function refreshPoints() {

      const getScreenX = (anID: string) => getScreenCoord(worldDataRef.current, anID, xAttrID, xScale),
        getScreenY = (anID: string) => getScreenCoord(worldDataRef.current, anID, yAttrID, yScale)

      setPointCoordinates({dotsRef, worldDataRef, firstTime, setFirstTime, getScreenX, getScreenY})
    }, [firstTime, dotsRef, xScale, yScale,
      xMin, xMax, yMin, yMax,
      plotWidth, plotHeight, refreshCounter, forceRefreshCounter, xAttrID, yAttrID, worldDataRef]
  )

  /**
   * In the initial refreshPoints there are no circles. We call this once to force a refreshPoints in which
   * there are circles.
   */
  useEffect(function forceRefresh() {
    setForceRefreshCounter(prevCounter => prevCounter)
  }, [])

  useSelection(worldDataRef, setRefreshCounter)

  return (
    <svg/>
  )
})
// (ScatterDots as any).whyDidYouRender = true
