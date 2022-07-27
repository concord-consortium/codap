import React, {memo, useCallback, useEffect, useRef, useState} from "react"
import {max, range, select} from "d3"
import {plotProps, transitionDuration, worldData, defaultRadius, defaultDiameter, dragRadius} from "./graphing-types"
import {useAddListeners} from "./graph-hooks/graph-hooks"


export const DotPlotDots = memo(function DotPlotDots(props: {
  dots: plotProps,
  plotWidth: number,
  plotHeight: number,
  xMin: number,
  xMax: number,
  data: worldData[],
  setData: React.Dispatch<React.SetStateAction<worldData[]>>
  setHighlightCounter: React.Dispatch<React.SetStateAction<number>>
  dotsRef: React.RefObject<SVGSVGElement>
}) {
  const {
      data, setData, dotsRef, plotWidth, plotHeight, setHighlightCounter, xMax, xMin,
      dots: {xScale, yScale}
    } = props,
    [dragID, setDragID] = useState(-1),
    [refreshCounter, setRefreshCounter] = useState(0),
    currPos = useRef({x: 0}),
    target = useRef<any>(),
    [firstTime, setFirstTime] = useState<boolean | null>(true),
    selectedDataObjects = useRef<{ [index: number]: { x: number } }>({}),
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
        setFirstTime(false) // We never want to animate points on drag
      }
      // target.current = event.target as SVGSVGElement
      target.current = select(event.target as SVGSVGElement)
      const tItsID = Number(target.current.property('id'))
      if (target.current.node()?.nodeName === 'circle') {
        target.current.transition()
          .attr('r', dragRadius)
        setDragID(() => tItsID)
        currPos.current = {x: event.clientX}
        setData(selectPoint(data))
      }
      data.forEach(datum => {
        if (datum.selected) {
          selectedDataObjects.current[datum.id] = {x: datum.x}
        }
      })
    }, [data, firstTime, setData, setHighlightCounter]),

    onDrag = useCallback((event: MouseEvent) => {
      if (dragID >= 0) {
        const newPos = {x: event.clientX},
          dx = newPos.x - currPos.current.x
        currPos.current = newPos
        if (dx !== 0) {
          const deltaX = Number(xScale?.invert(dx)) - Number(xScale?.invert(0))
          props.setData((prevData) => {
              prevData.forEach(datum => {
                if (datum.selected) {
                  datum.x += deltaX
                }
              })
              return prevData
            }
          )
          setRefreshCounter(prevCounter => ++prevCounter)
        }
      }
    }, [props, currPos, dragID, xScale]),

    onDragEnd = useCallback(() => {
      if (dragID >= 0) {
        target.current
          .classed('dragging', false)
          .transition()
          .attr('r', defaultRadius)
        setDragID(() => -1)
        target.current = null
      }
      setData(prevData => {
        prevData.forEach(datum => {
          const sDatum = selectedDataObjects.current[datum.id]
          if (sDatum) {
            datum.x = sDatum.x
          }
        })
        return prevData
      })
      setFirstTime(true)  // So points will animate back to original positions
      setRefreshCounter(prevCounter => ++prevCounter)
    }, [dragID, setData])

  useAddListeners(window, {dragStart: onDragStart, drag: onDrag, end: onDragEnd})

  useEffect(function refreshPoints() {

      function computeBinPlacements() {
        const numBins = Math.ceil(plotWidth / defaultDiameter) + 1,
          binWidth = plotWidth / (numBins - 1),
          bins: number[][] = range(numBins).map(() => [])

        data.forEach((d: worldData) => {
          const numerator = Number(xScale?.(d.x)),
            bin = Math.ceil(numerator / binWidth)
          if (bin >= 0 && bin < numBins) {
            bins[bin].push(d.id)
            binMap[d.id] = {yIndex: bins[bin].length}
          }
        })
        const maxInBin = (max(bins, (b => b.length)) || 0) + 1,
          excessHeight = Math.max(0, maxInBin - Math.floor(yHeight / defaultDiameter)) * defaultDiameter
        overlap = excessHeight / maxInBin
      }

      const computeYCoord = (binContents: { yIndex: number }) => {
        return binContents ? yHeight - defaultRadius / 2 - binContents.yIndex * (defaultDiameter - overlap) : 0
      }

      const
        yHeight = Number(yScale?.range()[0]),
        dotsSvgElement = dotsRef.current,
        binMap: { [id: number]: { yIndex: number } } = {},
        tTransitionDuration = firstTime ? transitionDuration : 0
      let overlap = 0
      computeBinPlacements()

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
          .attr('cx', (d: { x: number }) => Number(xScale?.(d.x)))
          .attr('cy', (d: { id: number }) => {
            return computeYCoord(binMap[d.id])
          })
          .attr('r', defaultRadius)
      } else {
        selection
          .attr('cx', (d: { x: number }) => Number(xScale?.(d.x)))
          .attr('cy', (d: { id: number }) => {
              return computeYCoord(binMap[d.id])
            }
          )
      }
      select(dotsSvgElement)
        .selectAll('.dot-highlighted')
        .raise()

    }, [firstTime, dotsRef, data, xScale, yScale, xMin, xMax,
      plotWidth, plotHeight, refreshCounter, forceRefreshCounter]
  )

  /**
   * In the initial refreshPoints there are no circles. We call this once to force a refreshPoints in which
   * there are circles.
   */
  useEffect(function forceRefresh(){
    setForceRefreshCounter(prevCounter=>++prevCounter)
  },[])

  return (
    <div></div>
  )
})
/*
if (DotPlotDots) {
  (DotPlotDots as any).whyDidYouRender = {logOnDifferentValues: true, customName: 'DotPlotDots'}
}
*/

