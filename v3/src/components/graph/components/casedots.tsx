import {randomUniform, select} from "d3"
import {onAction} from "mobx-state-tree"
import React, {memo, useCallback, useEffect, useRef, useState} from "react"
import {pointRadiusSelectionAddend, transitionDuration} from "../graphing-types"
import { ScaleNumericBaseType } from "../../axis/axis-types"
import {ICase} from "../../../models/data/data-set"
import {isAddCasesAction} from "../../../models/data/data-set-actions"
import {useDragHandlers, usePlotResponders} from "../hooks/use-plot"
import {useDataConfigurationContext} from "../hooks/use-data-configuration-context"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {Bounds, useGraphLayoutContext} from "../models/graph-layout"
import {handleClickOnDot, setPointSelection} from "../utilities/graph-utils"
import {defaultSelectedStroke, defaultSelectedStrokeWidth, defaultStrokeWidth} from "../../../utilities/color-utils"
import {useGraphModelContext} from "../models/graph-model"

export const CaseDots = memo(function CaseDots(props: {
    dotsRef: React.RefObject<SVGSVGElement>
    enableAnimation: React.MutableRefObject<boolean>
}) {
  useInstanceIdContext()
  const {dotsRef, enableAnimation} = props,
    graphModel = useGraphModelContext(),
    dataset = useDataSetContext(),
    dataConfiguration = useDataConfigurationContext(),
    legendAttrID = dataConfiguration?.attributeID('legend'),
    layout = useGraphLayoutContext(),
    randomPointsRef = useRef<Record<string, { x: number, y: number }>>({}),
    dragPointRadius = graphModel.getPointRadius('hover-drag'),
    [dragID, setDragID] = useState(''),
    currPos = useRef({x: 0, y: 0}),
    target = useRef<any>(),
    xScale = layout.getAxisScale('bottom') as ScaleNumericBaseType,
    yScale = layout.getAxisScale('left') as ScaleNumericBaseType

  const onDragStart = useCallback((event: MouseEvent) => {
      enableAnimation.current = false // We don't want to animate points until end of drag
      target.current = select(event.target as SVGSVGElement)
      const tItsID: string = target.current.property('id')
      if (target.current.node()?.nodeName === 'circle') {
        target.current.transition()
          .attr('r', dragPointRadius)
        setDragID(tItsID)
        currPos.current = {x: event.clientX, y: event.clientY}
        handleClickOnDot(event, tItsID, dataset)
      }
    }, [dragPointRadius, dataset, enableAnimation]),

    onDrag = useCallback((event: MouseEvent) => {
      if (dragID !== '') {
        const newPos = {x: event.clientX, y: event.clientY},
          dx = newPos.x - currPos.current.x,
          dy = newPos.y - currPos.current.y
        currPos.current = newPos
        if (dx !== 0 || dy !== 0) {
          const selectedDots = select(dotsRef.current).selectAll('.graph-dot-highlighted')
          selectedDots
            .each((d, i, nodes) => {
              const element = select(nodes[i])
              element
                .attr('cx', Number(element.attr('cx')) + dx)
                .attr('cy', Number(element.attr('cy')) + dy)
            })
        }
      }
    }, [dragID, dotsRef]),

    onDragEnd = useCallback(() => {
      if (dragID !== '') {
        target.current
          .classed('dragging', false)
          .transition()
          .attr('r', graphModel.getPointRadius('select'))
        setDragID(() => '')
        target.current = null
      }
    }, [dragID, graphModel])

  useDragHandlers(window, {start: onDragStart, drag: onDrag, end: onDragEnd})

  const refreshPointSelection = useCallback(() => {
    const {pointColor, pointStrokeColor} = graphModel,
      selectedPointRadius = graphModel.getPointRadius('select')
    dataConfiguration && setPointSelection({
      dotsRef, dataConfiguration, pointRadius: graphModel.getPointRadius(), selectedPointRadius,
      pointColor, pointStrokeColor
    })
  }, [dataConfiguration, graphModel, dotsRef])

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
    const
      pointRadius = graphModel.getPointRadius(),
      {computedBounds} = layout,
      bounds = computedBounds.get('plot') as Bounds,
      transform = `translate(${bounds.left}, ${bounds.top})`,
      dotsSelection = select(dotsRef.current).selectAll(selectedOnly ? '.graph-dot-highlighted' : '.graph-dot'),
      duration = enableAnimation.current ? transitionDuration : 0,
      onComplete = enableAnimation.current ? () => {
        enableAnimation.current = false
      } : undefined,
      [xMin, xMax] = layout.getAxisScale('bottom')?.range() ?? [0, 1],
      [yMin, yMax] = layout.getAxisScale('left')?.range() ?? [0, 1]
    dotsSelection
      .attr('transform', transform)
      .transition()
      .duration(duration)
      .on('end', (id, i) => (i === dotsSelection.size() - 1) && onComplete?.())
      .attr('cx', (anID: string) => {
        return xMin + pointRadius + randomPointsRef.current[anID].x * (xMax - xMin - 2 * pointRadius)
      })
      .attr('cy', (anID: string) => {
        return yMax + pointRadius + randomPointsRef.current[anID].y * (yMin - yMax - 2 * pointRadius)
      })
      .style('fill', (anID: string) => {
        return (legendAttrID && anID && dataConfiguration?.getLegendColorForCase(anID)) ?? graphModel.pointColor
      })
      .style('stroke', (id: string) => (legendAttrID && dataset?.isCaseSelected(id)) ?
        defaultSelectedStroke : graphModel.pointStrokeColor)
      .style('stroke-width', (id: string) => (legendAttrID && dataset?.isCaseSelected(id)) ?
        defaultSelectedStrokeWidth : defaultStrokeWidth)
      .attr('r', (anID: string) => pointRadius + (dataset?.isCaseSelected(anID) ? pointRadiusSelectionAddend : 0))
  }, [dataset, legendAttrID, dataConfiguration, graphModel,
    layout, dotsRef, enableAnimation, xScale, yScale])

  useEffect(function initDistribution() {
    const {cases} = dataset || {}
    const uniform = randomUniform()

    const initCases = (_cases?: typeof cases | ICase[]) => {
      _cases?.forEach(({__id__}) => {
        randomPointsRef.current[__id__] = {x: uniform(), y: uniform()}
      })
    }

    initCases(cases)
    const disposer = dataset && onAction(dataset, action => {
      if (isAddCasesAction(action)) {
        initCases(action.args[0])
      }
    }, true)

    return () => disposer?.()
  }, [dataset])

  usePlotResponders({
    graphModel, dotsRef, legendAttrID, layout, refreshPointPositions, refreshPointSelection, enableAnimation
  })

  return (
    <></>
  )
})
