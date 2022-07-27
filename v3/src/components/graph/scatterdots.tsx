import React, {memo, useCallback, useEffect, useRef, useState} from "react"
import {select} from "d3"
import {plotProps, transitionDuration, worldData} from "./graphing-types"
import {useAddListeners} from "./graph-hooks/graph-hooks"


export const ScatterDots = memo(function ScatterDots(props: {
  plotProps: plotProps,
  plotWidth: number,
  plotHeight: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  // counterProps: counterProps,
  data: worldData[],
  setData: React.Dispatch<React.SetStateAction<worldData[]>>
  setHighlightCounter: React.Dispatch<React.SetStateAction<number>>
  dotsRef: React.RefObject<SVGSVGElement>
}) {
  const {data, setData, dotsRef, plotProps: {xScale, yScale}, xMax, xMin, yMax, yMin} = props,
    defaultRadius = 5,
    dragRadius = 10,
    [dragID, setDragID] = useState(-1),
    currPos = useRef({x: 0, y: 0}),
    target = useRef<any>(),
    setHighlightCounter = props.setHighlightCounter,
    [refreshCounter, setRefreshCounter] = useState(0),
    plotWidth = props.plotWidth,
    plotHeight = props.plotHeight,
    [firstTime, setFirstTime] = useState<boolean | null>(true),
    selectedDataObjects = useRef<{ [index: number]: { x: number, y: number } }>({}),
    [forceRefreshCounter, setForceRefreshCounter]=useState(0)

  const onDragStart = useCallback((event: MouseEvent) => {

      const selectPoint = (iData: worldData[]) => {
        iData.forEach((datum) => {
          if (datum.id === tItsID && !datum.selected) {
            datum.selected = true
            setHighlightCounter(prevCounter => ++prevCounter)
          }
        })
        return iData
      }

      if (firstTime) {
        setFirstTime(false) // We don't want to animate points until end of drag
      }
      target.current = select(event.target as SVGSVGElement)
      const tItsID = Number(target.current.property('id'))
      if (target.current.node()?.nodeName === 'circle') {
        target.current.transition()
          .attr('r', dragRadius)
        setDragID(() => tItsID)
        currPos.current = {x: event.clientX, y: event.clientY}
        setData(selectPoint(data))
      }
      data.forEach(datum => {
        if (datum.selected) {
          selectedDataObjects.current[datum.id] = {x: datum.x, y: datum.y}
        }
      })

      target.current.classed('dragging', true)
    }, [setData, data, setHighlightCounter, firstTime, setFirstTime]),

    onDrag = useCallback((event: MouseEvent) => {
      if (dragID >= 0) {
        const newPos = {x: event.clientX, y: event.clientY},
          dx = newPos.x - currPos.current.x,
          dy = newPos.y - currPos.current.y
        currPos.current = newPos
        if (dx !== 0 || dy !== 0) {
          const deltaX = Number(xScale?.invert(dx)) - Number(xScale?.invert(0)),
            deltaY = Number(yScale?.invert(dy)) - Number(yScale?.invert(0))
          setData((prevData) => {
              prevData.forEach(datum => {
                if (datum.selected) {
                  datum.x += deltaX
                  datum.y += deltaY
                }
              })
              return prevData
            }
          )
          setRefreshCounter(prevCounter => ++prevCounter)
        }
      }
    }, [setData, dragID, xScale, yScale, setRefreshCounter]),

    onDragEnd = useCallback(() => {
      if (dragID >= 0) {
        target.current
          .classed('dragging', false)
          .transition()
          .attr('r', defaultRadius)
        setDragID(() => -1)
        target.current = null

        setData(prevData => {
          prevData.forEach(datum => {
            const sDatum = selectedDataObjects.current[datum.id]
            if (sDatum) {
              datum.x = sDatum.x
              datum.y = sDatum.y
            }
          })
          return prevData
        })
        setFirstTime(true) // So points will animate back to original positions
        setRefreshCounter(prevCounter => ++prevCounter)
      }
    }, [dragID, setData])

  useAddListeners(window, {dragStart: onDragStart, drag: onDrag, end: onDragEnd})

  useEffect(function addListeners() {
    // console.log('In addListeners')
    // add event listeners just once
    addEventListener('mousedown', onDragStart)
    addEventListener('mousemove', onDrag)
    addEventListener('mouseup', onDragEnd)
    // On cleanup, remove event listeners
    return () => {
      removeEventListener('mousedown', onDragStart)
      removeEventListener('mousemove', onDrag)
      removeEventListener('mouseup', onDragEnd)
    }
  }, [onDragStart, onDrag, onDragEnd])

  useEffect(function refreshPoints() {
      const
        dotsSvgElement = dotsRef.current,
        tTransitionDuration = firstTime ? transitionDuration : 0

      const selection = select(dotsSvgElement).selectAll('circle')
        .classed('dot-highlighted',
          (d: { selected: boolean }) => (d.selected))
      if (tTransitionDuration > 0) {
        selection
          .transition()
          .duration(tTransitionDuration)
          .on('end', () => {
            setFirstTime(false)
          })
          .attr('cx', (d: { x: number }) => {
            return Number(xScale?.(d.x))
          })
          .attr('cy', (d: { y?: any }) => {
            return Number(yScale?.(d.y))
          })
          .attr('r', defaultRadius)
      } else if (selection.size() > 0) {
        selection
          .attr('cx', (d: { x: number }) => {
            return Number(xScale?.(d.x))
          })
          .attr('cy', (d: { y?: any }) => {
            return Number(yScale?.(d.y))
          })
      }
      select(dotsSvgElement)
        .selectAll('.dot-highlighted')
        .raise()
    }, [firstTime, dotsRef, data, xScale, yScale,
      xMin, xMax, yMin, yMax,
      plotWidth, plotHeight, refreshCounter, forceRefreshCounter]
  )

  /**
   * In the initial refreshPoints there are no circles. We call this once to force a refreshPoints in which
   * there are circles.
   */
  useEffect(function forceRefresh(){
    setForceRefreshCounter(prevCounter=>prevCounter)
  },[])

  return (
    <svg>
    </svg>
  )
})
// (ScatterDots as any).whyDidYouRender = true
