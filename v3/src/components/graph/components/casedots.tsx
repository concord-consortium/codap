import {randomUniform, select} from "d3"
import {onAction} from "mobx-state-tree"
import React, {useCallback, useEffect, useRef, useState} from "react"
import {CaseData} from "../d3-types"
import {IDotsRef} from "../graphing-types"
import {ICase} from "../../../models/data/data-set-types"
import {isAddCasesAction} from "../../../models/data/data-set-actions"
import {useDragHandlers, usePlotResponders} from "../hooks/use-plot"
import {useDataConfigurationContext} from "../hooks/use-data-configuration-context"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {useGraphLayoutContext} from "../models/graph-layout"
import {handleClickOnDot, setPointCoordinates, setPointSelection} from "../utilities/graph-utils"
import {useGraphModelContext} from "../models/graph-model"

export const CaseDots = function CaseDots(props: {
  dotsRef: IDotsRef
  enableAnimation: React.MutableRefObject<boolean>
}) {
  const {
      dotsRef,
      enableAnimation
    } = props,
    graphModel = useGraphModelContext(),
    dataset = useDataSetContext(),
    dataConfiguration = useDataConfigurationContext(),
    layout = useGraphLayoutContext(),
    legendAttrID = dataConfiguration?.attributeID('legend'),
    randomPointsRef = useRef<Record<string, { x: number, y: number }>>({}),
    dragPointRadius = graphModel.getPointRadius('hover-drag'),
    [dragID, setDragID] = useState(''),
    currPos = useRef({x: 0, y: 0}),
    target = useRef<any>()

  const onDragStart = useCallback((event: MouseEvent) => {
      enableAnimation.current = false // We don't want to animate points until end of drag
      target.current = select(event.target as SVGSVGElement)
      const aCaseData: CaseData = target.current.node().__data__
      if (aCaseData && target.current.node()?.nodeName === 'circle') {
        target.current.transition()
          .attr('r', dragPointRadius)
        setDragID(aCaseData.caseID)
        currPos.current = {x: event.clientX, y: event.clientY}
        handleClickOnDot(event, aCaseData.caseID, dataset)
      }
    }, [dragPointRadius, dataset, enableAnimation]),

    onDrag = useCallback((event: MouseEvent) => {
      if (dotsRef.current && dragID !== '') {
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
    if (!dotsRef.current) return
    const
      pointRadius = graphModel.getPointRadius(),
      selectedPointRadius = graphModel.getPointRadius('select'),
      {pointColor, pointStrokeColor} = graphModel,
      xLength = layout.getAxisMultiScale('bottom')?.length ?? 0,
      yLength = layout.getAxisMultiScale('left')?.length ?? 0,
      getScreenX = (anID: string) => {
        return pointRadius + randomPointsRef.current[anID].x * (xLength - 2 * pointRadius)
      },
      getScreenY = (anID: string) => {
        return yLength - (pointRadius + randomPointsRef.current[anID].y * (yLength - 2 * pointRadius))
      },
      getLegendColor = dataConfiguration?.attributeID('legend')
        ? dataConfiguration?.getLegendColorForCase : undefined

    setPointCoordinates({
      dataset, pointRadius, selectedPointRadius, dotsRef, selectedOnly,
      pointColor, pointStrokeColor, getScreenX, getScreenY, getLegendColor, enableAnimation
    })
  }, [dataset, dataConfiguration, graphModel, layout, dotsRef, enableAnimation])

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
    graphModel, dotsRef, layout, refreshPointPositions, refreshPointSelection, enableAnimation
  })

  return (
    <></>
  )
}
