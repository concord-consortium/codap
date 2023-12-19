import {randomUniform, select} from "d3"
import {mstReaction} from "../../../utilities/mst-reaction"
import React, {useCallback, useEffect, useRef, useState} from "react"
import {CaseData} from "../../data-display/d3-types"
import {IDotsRef} from "../../data-display/data-display-types"
import {handleClickOnCase, setPointSelection} from "../../data-display/data-display-utils"
import {useDataDisplayAnimation} from "../../data-display/hooks/use-data-display-animation"
import {useDragHandlers, usePlotResponders} from "../hooks/use-plot"
import {useGraphDataConfigurationContext} from "../hooks/use-graph-data-configuration-context"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {useGraphContentModelContext} from "../hooks/use-graph-content-model-context"
import {useGraphLayoutContext} from "../hooks/use-graph-layout-context"
import {setPointCoordinates} from "../utilities/graph-utils"
import {IPixiPointsRef} from "../utilities/pixi-points"

export const CaseDots = function CaseDots(props: {
  dotsRef: IDotsRef,
  pixiPointsRef: IPixiPointsRef
}) {
  const {
      dotsRef, pixiPointsRef
    } = props,
    graphModel = useGraphContentModelContext(),
    {isAnimating, startAnimation, stopAnimation} = useDataDisplayAnimation(),
    dataset = useDataSetContext(),
    dataConfiguration = useGraphDataConfigurationContext(),
    layout = useGraphLayoutContext(),
    randomPointsRef = useRef<Record<string, { x: number, y: number }>>({}),
    dragPointRadius = graphModel.getPointRadius('hover-drag'),
    [dragID, setDragID] = useState(''),
    currPos = useRef({x: 0, y: 0}),
    target = useRef<any>()

  const randomlyDistributePoints = useCallback((cases?: CaseData[]) => {
    const uniform = randomUniform()
      const points = randomPointsRef.current
      cases?.forEach(({caseID}) => {
        if (!points[caseID]) {
          points[caseID] = {x: uniform(), y: uniform()}
        }
      })
  }, []),

  onDragStart = useCallback((event: MouseEvent) => {
    stopAnimation() // We don't want to animate points until end of drag
    target.current = select(event.target as SVGSVGElement)
    const aCaseData: CaseData = target.current.node().__data__
    if (aCaseData && target.current.node()?.nodeName === 'circle') {
      target.current.transition()
        .attr('r', dragPointRadius)
      setDragID(aCaseData.caseID)
      currPos.current = {x: event.clientX, y: event.clientY}
      handleClickOnCase(event, aCaseData.caseID, dataset)
    }
  }, [stopAnimation, dragPointRadius, dataset]),

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

  useDragHandlers(dotsRef.current, {start: onDragStart, drag: onDrag, end: onDragEnd})

  const refreshPointSelection = useCallback(() => {
    const {pointColor, pointStrokeColor} = graphModel.pointDescription,
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
      {pointColor, pointStrokeColor} = graphModel.pointDescription,
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
      dataset, pointRadius, selectedPointRadius, dotsRef, pixiPointsRef, selectedOnly,
      pointColor, pointStrokeColor, getScreenX, getScreenY, getLegendColor, getAnimationEnabled: isAnimating
    })
  }, [dotsRef, pixiPointsRef, graphModel, layout, dataConfiguration, dataset, isAnimating])

  useEffect(function initDistribution() {
    const cases = dataConfiguration?.caseDataArray
    randomlyDistributePoints(cases)
    const disposer = dataConfiguration?.onAction(action => {
      if (['addCases', 'removeCases'].includes(action.name)) {
        randomlyDistributePoints(dataConfiguration?.caseDataArray)
      }
    }) || (() => true)
    return () => disposer?.()
  }, [dataConfiguration, dataset, randomlyDistributePoints])

  useEffect(function respondToModelChangeCount() {
    return mstReaction(
      () => graphModel.changeCount,
      () => {
        randomPointsRef.current = {}
        randomlyDistributePoints(dataConfiguration?.caseDataArray)
        startAnimation()
        refreshPointPositions(false)
      },
      { name: "CaseDots.respondToModelChangeCount" }, graphModel)
  }, [dataConfiguration?.caseDataArray, graphModel,
      randomlyDistributePoints, refreshPointPositions, startAnimation])

  usePlotResponders({dotsRef, refreshPointPositions, refreshPointSelection})

  return (
    <></>
  )
}
