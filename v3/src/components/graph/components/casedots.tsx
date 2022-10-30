import {randomUniform, select} from "d3"
import { onAction } from "mobx-state-tree"
import React, {memo, useCallback, useEffect, useRef, useState} from "react"
import {pointRadiusSelectionAddend, transitionDuration} from "../graphing-types"
import { ICase } from "../../../models/data/data-set"
import { isAddCasesAction } from "../../../models/data/data-set-actions"
import {useDragHandlers, usePlotResponders} from "../hooks/graph-hooks"
import {useDataConfigurationContext} from "../hooks/use-data-configuration-context"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {ScaleNumericBaseType, useGraphLayoutContext} from "../models/graph-layout"
import {setPointSelection} from "../utilities/graph-utils"
import {IGraphModel} from "../models/graph-model"
import {defaultPointColor} from "../../../utilities/color-utils"

export const CaseDots = memo(function CaseDots(props: {
  graphModel: IGraphModel
  plotProps: {
    dotsRef: React.RefObject<SVGSVGElement>
    enableAnimation: React.MutableRefObject<boolean>
  }
}) {
  useInstanceIdContext()
  const {dotsRef, enableAnimation} = props.plotProps,
    graphModel = props.graphModel,
    dataset = useDataSetContext(),
    dataConfiguration = useDataConfigurationContext(),
    legendAttrID = dataConfiguration?.attributeID('legend'),
    layout = useGraphLayoutContext(),
    randomPointsRef = useRef<Record<string, { x: number, y: number }>>({}),
    pointRadius = graphModel.getPointRadius(),
    selectedPointRadius = graphModel.getPointRadius('select'),
    dragPointRadius = graphModel.getPointRadius('hover-drag'),
    [dragID, setDragID] = useState(''),
    currPos = useRef({x: 0, y: 0}),
    target = useRef<any>(),
    xScale = layout.axisScale('bottom') as ScaleNumericBaseType,
    yScale = layout.axisScale('left') as ScaleNumericBaseType

  const onDragStart = useCallback((event: MouseEvent) => {
      enableAnimation.current = false // We don't want to animate points until end of drag
      target.current = select(event.target as SVGSVGElement)
      const tItsID: string = target.current.property('id')
      if (target.current.node()?.nodeName === 'circle') {
        target.current.transition()
          .attr('r', dragPointRadius)
        setDragID(tItsID)
        currPos.current = {x: event.clientX, y: event.clientY}

        const [, caseId] = tItsID.split("_")
        dataset?.selectCases([caseId])
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
          .attr('r', selectedPointRadius)
        setDragID(() => '')
        target.current = null
      }
    }, [selectedPointRadius, dragID])

  useDragHandlers(window, {start: onDragStart, drag: onDrag, end: onDragEnd})

  const refreshPointSelection = useCallback(() => {
    dataConfiguration && setPointSelection({dotsRef, dataConfiguration, pointRadius, selectedPointRadius})
  }, [dataConfiguration, dotsRef, pointRadius, selectedPointRadius])

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
    const
      selection = select(dotsRef.current).selectAll(selectedOnly ? '.graph-dot-highlighted' : '.graph-dot'),
      duration = enableAnimation.current ? transitionDuration : 0,
      onComplete = enableAnimation.current ? () => {
        enableAnimation.current = false
      } : undefined,
      [xMin, xMax] = xScale.range(),
      [yMin, yMax] = yScale.range()
    selection
      .transition()
      .duration(duration)
      .on('end', (id, i) => (i === selection.size() - 1) && onComplete?.())
      .attr('cx', (anID: string) => {
        return xMin + pointRadius + randomPointsRef.current[anID].x * (xMax - xMin - 2 * pointRadius)
      })
      .attr('cy', (anID: string) => {
        return yMax + pointRadius + randomPointsRef.current[anID].y * (yMin - yMax - 2 * pointRadius)
      })
      .style('fill', (anID: string) => {
        return (legendAttrID && anID) ? dataConfiguration?.getLegendColorForCase(anID) : defaultPointColor
      })
      .attr('r', (anID: string) => pointRadius + (dataset?.isCaseSelected(anID) ? pointRadiusSelectionAddend : 0))
  }, [dataset, legendAttrID, dataConfiguration, pointRadius, dotsRef, enableAnimation, xScale, yScale])

  useEffect(function initDistribution() {
    const {cases} = dataset || {}
    const uniform = randomUniform()

    const initCases = (_cases?: typeof cases | ICase[]) => {
      _cases?.forEach(({__id__}) => {
        randomPointsRef.current[__id__] = {x: uniform(), y: uniform()}
      })
    }

    initCases(cases)
    refreshPointPositions(false)

    const disposer = dataset && onAction(dataset, action => {
      if (isAddCasesAction(action)) {
        initCases(action.args[0])
      }
    }, true)

    return () => disposer?.()
  }, [dataset, refreshPointPositions])

  usePlotResponders({
    graphModel, dotsRef, legendAttrID, layout, refreshPointPositions, refreshPointSelection, enableAnimation
  })

  return (
    <></>
  )
})
