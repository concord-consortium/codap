import React, {memo, useCallback, useEffect, useRef, useState} from "react"
import {ScaleLinear, select} from "d3"
import {plotProps, transitionDuration, InternalizedData} from "./graphing-types"
import {useDragHandlers, useSelection} from "./graph-hooks/graph-hooks"
import {IDataSet} from "../../data-model/data-set"

export const ScatterDots = memo(function ScatterDots(props: {
  plotProps: plotProps,
  plotWidth: number,
  plotHeight: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  dataSet?: IDataSet,
  dataRef: React.MutableRefObject<InternalizedData>,
  dotsRef: React.RefObject<SVGSVGElement>
}) {
  const {dataSet, dataRef, dotsRef, plotProps: {xScale, yScale}, xMax, xMin, yMax, yMin} = props,
    defaultRadius = 5,
    dragRadius = 10,
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

        dataSet?.selectCases([tItsID])
        // Record the current values so we can change them during the drag and restore them when done
        dataSet?.selection.forEach(anID => {
          selectedDataObjects.current[anID] = {
            x: dataSet?.getNumeric(anID, xAttrID) ?? 0,
            y: dataSet?.getNumeric(anID, yAttrID) ?? 0
          }
        })
      }
    }, [firstTime, setFirstTime, xAttrID, yAttrID, dataSet]),

    onDrag = useCallback((event: MouseEvent) => {
      if (dragID !== '') {
        const newPos = {x: event.clientX, y: event.clientY},
          dx = newPos.x - currPos.current.x,
          dy = newPos.y - currPos.current.y
        currPos.current = newPos
        if (dx !== 0 || dy !== 0) {
          const deltaX = Number(xScale?.invert(dx)) - Number(xScale?.invert(0)),
            deltaY = Number(yScale?.invert(dy)) - Number(yScale?.invert(0))
          dataSet?.selection.forEach(anID => {
            const currX = dataSet.getNumeric(anID, xAttrID),
              currY = dataSet.getNumeric(anID, yAttrID)
            dataSet?.setValue(anID, xAttrID, Number(currX ?? 0) + deltaX)
            dataSet?.setValue(anID, yAttrID, Number(currY ?? 0) + deltaY)
          })
          setRefreshCounter(prevCounter => ++prevCounter)
        }
      }
    }, [dragID, xScale, yScale, setRefreshCounter, xAttrID, yAttrID, dataSet]),

    onDragEnd = useCallback(() => {
      if (dragID !== '') {
        target.current
          .classed('dragging', false)
          .transition()
          .attr('r', defaultRadius)
        setDragID(() => '')
        target.current = null

        dataSet?.selection.forEach(anID => {
          dataSet?.setValue(anID, xAttrID, selectedDataObjects.current[anID].x)
          dataSet?.setValue(anID, yAttrID, selectedDataObjects.current[anID].y)
        })
        setFirstTime(true) // So points will animate back to original positions
        setRefreshCounter(prevCounter => ++prevCounter)
      }
    }, [dragID, xAttrID, yAttrID, dataSet])

  useDragHandlers(window, {start: onDragStart, drag: onDrag, end: onDragEnd})

  useEffect(function refreshPoints() {

    const getScreenCoord = (id: string, attrID: string, scale?: ScaleLinear<number, number>) => {
      return Number(scale?.(Number(dataSet?.getNumeric(id, attrID))))
    }

      const
        dotsSvgElement = dotsRef.current,
        tTransitionDuration = firstTime ? transitionDuration : 0,
        selection = select(dotsSvgElement).selectAll('circle')
          .classed('dot-highlighted',
            (d: { id: string }) => !!(dataSet?.isCaseSelected(d.id)))
      if (tTransitionDuration > 0) {
        selection
          .transition()
          .duration(tTransitionDuration)
          .on('end', () => {
            setFirstTime(false)
          })
          .attr('cx', (anID: string) => getScreenCoord(anID, xAttrID, xScale))
          .attr('cy', (anID: string) => getScreenCoord(anID, yAttrID, yScale))
          .attr('r', defaultRadius)
      } else if (selection.size() > 0) {
        selection
          .attr('cx', (anID: string) => getScreenCoord(anID, xAttrID, xScale))
          .attr('cy', (anID: string) => getScreenCoord(anID, yAttrID, yScale))
      }
      select(dotsSvgElement)
        .selectAll('.dot-highlighted')
        .raise()
    }, [firstTime, dotsRef, xScale, yScale,
      xMin, xMax, yMin, yMax,
      plotWidth, plotHeight, refreshCounter, forceRefreshCounter, xAttrID, yAttrID, dataSet]
  )

  /**
   * In the initial refreshPoints there are no circles. We call this once to force a refreshPoints in which
   * there are circles.
   */
  useEffect(function forceRefresh() {
    setForceRefreshCounter(prevCounter => prevCounter)
  }, [])

  useSelection(dataSet, setRefreshCounter)

  return (
    <svg/>
  )
})
// (ScatterDots as any).whyDidYouRender = true
