import {select} from "d3"
import React, {memo, useCallback, useContext, useRef, useState} from "react"
import {observer} from "mobx-react-lite"
import {plotProps, InternalizedData, defaultRadius, dragRadius}
  from "../graphing-types"
import {useDragHandlers} from "../hooks/graph-hooks"
import { appState } from "../../app-state"
import {IDataSet} from "../../../data-model/data-set"
import {useDotPlotDots} from "../hooks/use-dot-plot-dots"
import {INumericAxisModel} from "../models/axis-model"
import { GraphLayoutContext } from "../models/graph-layout"

export const DotPlotDots = memo(observer(function DotPlotDots(props: {
  dots: plotProps,
  axisModel: INumericAxisModel,
  worldDataRef: React.MutableRefObject<IDataSet | undefined>,
  graphData: InternalizedData,
  dotsRef: React.RefObject<SVGSVGElement>
}) {
  const { worldDataRef, graphData, dotsRef, axisModel } = props,
    layout = useContext(GraphLayoutContext),
    xScale = layout.axisScale(axisModel.place),
    [dragID, setDragID] = useState<string>(),
    [, setRefreshCounter] = useState(0),
    currPos = useRef({x: 0}),
    target = useRef<any>(),
    [firstTime, setFirstTime] = useState<boolean | null>(true),
    selectedDataObjects = useRef<Record<string, { x: number }>>({})

  const onDragStart = useCallback((event: MouseEvent) => {
      appState.beginPerformance()
      if (firstTime) {
        setFirstTime(false) // We never want to animate points on drag
      }
      const xAttrID = graphData.xAttributeID
      target.current = select(event.target as SVGSVGElement)
      const tItsID: string = target.current.property('id')
      if (target.current.node()?.nodeName === 'circle') {
        target.current.transition()
          .attr('r', dragRadius)
        setDragID(() => tItsID)
        currPos.current = {x: event.clientX}
        worldDataRef.current?.selectCases([tItsID])
        // Record the current values so we can change them during the drag and restore them when done
        worldDataRef.current?.selection.forEach(anID => {
          selectedDataObjects.current[anID] = {
            x: worldDataRef.current?.getNumeric(anID, xAttrID) ?? NaN
          }
        })
      }
    }, [firstTime, setFirstTime, worldDataRef, graphData.xAttributeID]),

    onDrag = useCallback((event: MouseEvent) => {
      const xAttrID = graphData.xAttributeID
      if (dragID) {
        const newPos = {x: event.clientX},
          dx = newPos.x - currPos.current.x
        currPos.current = newPos
        if (dx !== 0) {
          const deltaX = Number(xScale?.invert(dx)) - Number(xScale?.invert(0))
          worldDataRef.current?.selection.forEach(anID => {
            const currX = worldDataRef.current?.getNumeric(anID, xAttrID)
            const newX = currX != null ? currX + deltaX : undefined
            worldDataRef.current?.setCaseValues([{ __id__: anID , [xAttrID]: newX }])
          })
          setRefreshCounter(prevCounter => ++prevCounter)
        }
      }
    }, [currPos, dragID, xScale, worldDataRef, graphData.xAttributeID]),

    onDragEnd = useCallback(() => {
      const xAttrID = graphData.xAttributeID
      if (dragID) {
        target.current
          .classed('dragging', false)
          .transition()
          .attr('r', defaultRadius)
        setDragID(undefined)
        target.current = null
      }
      worldDataRef.current?.selection.forEach(anID => {
        worldDataRef.current?.
          setCaseValues([{ __id__: anID , [xAttrID]: selectedDataObjects.current[anID].x }])
      })
      setFirstTime(true)  // So points will animate back to original positions
      setRefreshCounter(prevCounter => ++prevCounter)
      appState.endPerformance()
    }, [dragID, worldDataRef, graphData.xAttributeID])

  useDragHandlers(window, {start: onDragStart, drag: onDrag, end: onDragEnd})

  useDotPlotDots({
    axisModel,
    attributeID: graphData.xAttributeID,
    dataset: worldDataRef.current,
    cases: graphData.cases,
    dotsRef,
    firstTime: [firstTime, setFirstTime]
  })

  return (
    <svg/>
  )
}))
/*
if (DotPlotDots) {
  (DotPlotDots as any).whyDidYouRender = {logOnDifferentValues: true, customName: 'DotPlotDots'}
}
*/
