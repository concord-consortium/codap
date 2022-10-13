import {select} from "d3"
import React, {memo, useCallback, useRef, useState} from "react"
import {appState} from "../../app-state"
import {hoverRadiusFactor, PlotProps, transitionDuration} from "../graphing-types"
import {useDragHandlers, usePlotResponders} from "../hooks/graph-hooks"
import {useDataConfigurationContext} from "../hooks/use-data-configuration-context"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {ScaleNumericBaseType, useGraphLayoutContext} from "../models/graph-layout"
import {ICase} from "../../../data-model/data-set"
import {getScreenCoord, setPointCoordinates, setPointSelection} from "../utilities/graph-utils"
import {IGraphModel} from "../models/graph-model"

interface IProps {
  graphModel:IGraphModel
  plotProps:PlotProps
}

export const ScatterDots = memo(function ScatterDots(props: IProps) {
  const {graphModel, plotProps: {dotsRef, xAxisModel, yAxisModel, enableAnimation}} = props,
    instanceId = useInstanceIdContext(),
    dataConfig = useDataConfigurationContext(),
    dataset = useDataSetContext(),
    pointRadius = graphModel.getPointRadius(),
    selectedPointRadius = graphModel.getPointRadius('select'),
    layout = useGraphLayoutContext(),
    primaryAttrID = dataConfig?.attributeID('x'),
    secondaryAttrID = dataConfig?.attributeID('y'),
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
          .attr('r', pointRadius * hoverRadiusFactor)
        setDragID(tItsID)
        currPos.current = {x: event.clientX, y: event.clientY}

        const [, caseId] = tItsID.split("_")
        dataset?.selectCases([caseId])
        // Record the current values so we can change them during the drag and restore them when done
        const { selection } = dataConfig || {}
        primaryAttrID && secondaryAttrID && selection?.forEach(anID => {
          selectedDataObjects.current[anID] = {
            x: dataset?.getNumeric(anID, primaryAttrID) ?? 0,
            y: dataset?.getNumeric(anID, secondaryAttrID) ?? 0
          }
        })
      }
    }, [dataConfig, dataset, pointRadius, primaryAttrID, secondaryAttrID, enableAnimation]),

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
            { selection } = dataConfig || {}
          primaryAttrID && secondaryAttrID && selection?.forEach(anID => {
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
          caseValues.length && dataset?.setCaseValues(caseValues)
        }
      }
    }, [dataConfig, dataset, dragID, primaryAttrID, xScale, secondaryAttrID, yScale]),

    onDragEnd = useCallback(() => {
      dataset?.endCaching()
      appState.endPerformance()

      if (dragID !== '') {
        target.current
          .classed('dragging', false)
          .transition()
          .attr('r', pointRadius)
        setDragID(() => '')
        target.current = null

        if (didDrag.current) {
          const caseValues: ICase[] = [],
            { selection } = dataConfig || {}
          primaryAttrID && secondaryAttrID && selection?.forEach(anID => {
            caseValues.push({
              __id__: anID,
              [primaryAttrID]: selectedDataObjects.current[anID].x,
              [secondaryAttrID]: selectedDataObjects.current[anID].y
            })
          })
          enableAnimation.current = true // So points will animate back to original positions
          caseValues.length && dataset?.setCaseValues(caseValues)
          didDrag.current = false
        }
      }
    }, [dataConfig, dataset, pointRadius, dragID, primaryAttrID, secondaryAttrID, enableAnimation])

  useDragHandlers(window, {start: onDragStart, drag: onDrag, end: onDragEnd})

  const refreshPointSelection = useCallback(() => {
    setPointSelection({dotsRef, dataset, pointRadius, selectedPointRadius})
  }, [dataset, dotsRef, pointRadius, selectedPointRadius])

  const refreshPointPositionsD3 = useCallback((selectedOnly: boolean) => {
    const
      getScreenX = (anID: string) => primaryAttrID ? getScreenCoord(dataset, anID, primaryAttrID, xScale) : null,
      getScreenY = (anID: string) => secondaryAttrID ? getScreenCoord(dataset, anID, secondaryAttrID, yScale) : null,
      duration = enableAnimation.current ? transitionDuration : 0,
      onComplete = enableAnimation.current ? () => {
        enableAnimation.current = false
      } : undefined

    setPointCoordinates({dataset, dotsRef, pointRadius, selectedPointRadius, selectedOnly,
      getScreenX, getScreenY, duration, onComplete})
  }, [dataset, pointRadius, selectedPointRadius, dotsRef, primaryAttrID, xScale,
            secondaryAttrID, yScale, enableAnimation])

  const refreshPointPositionsSVG = useCallback((selectedOnly: boolean) => {
    const { cases, selection } = dataConfig || {}
    const updateDot = (caseId: string) => {
      const dot = dotsRef.current?.querySelector(`#${instanceId}_${caseId}`)
      if (dot) {
        const dotSvg = dot as SVGCircleElement
        const x = primaryAttrID ? getScreenCoord(dataset, caseId, primaryAttrID, xScale) : null
        const y = secondaryAttrID ? getScreenCoord(dataset, caseId, secondaryAttrID, yScale) : null
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
  }, [dataConfig, dataset, dotsRef, instanceId, primaryAttrID, xScale, secondaryAttrID, yScale])

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
    if (appState.isPerformanceMode) {
      refreshPointPositionsSVG(selectedOnly)
    } else {
      refreshPointPositionsD3(selectedOnly)
    }
  }, [refreshPointPositionsD3, refreshPointPositionsSVG])

  usePlotResponders({
    dataset, xAxisModel, yAxisModel, primaryAttrID, secondaryAttrID, layout,
    refreshPointPositions, refreshPointSelection, enableAnimation
  })

  return (
    <svg/>
  )
})
