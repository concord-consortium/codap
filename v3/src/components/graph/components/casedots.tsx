import {randomUniform} from "d3"
import {mstReaction} from "../../../utilities/mst-reaction"
import React, {useCallback, useEffect, useRef, useState} from "react"
import * as PIXI from "pixi.js"
import {CaseData} from "../../data-display/d3-types"
import {handleClickOnCase, setPointSelection} from "../../data-display/data-display-utils"
import {useDataDisplayAnimation} from "../../data-display/hooks/use-data-display-animation"
import {usePixiDragHandlers, usePlotResponders} from "../hooks/use-plot"
import {useGraphDataConfigurationContext} from "../hooks/use-graph-data-configuration-context"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {useGraphContentModelContext} from "../hooks/use-graph-content-model-context"
import {useGraphLayoutContext} from "../hooks/use-graph-layout-context"
import {setPointCoordinates} from "../utilities/graph-utils"
import {IPixiPointsRef} from "../utilities/pixi-points"
import { IPixiPointMetadata } from "../utilities/pixi-types"

export const CaseDots = function CaseDots(props: {
  pixiPointsRef: IPixiPointsRef
}) {
  const {
      pixiPointsRef
    } = props,
    graphModel = useGraphContentModelContext(),
    {isAnimating, startAnimation, stopAnimation} = useDataDisplayAnimation(),
    dataset = useDataSetContext(),
    dataConfiguration = useGraphDataConfigurationContext(),
    layout = useGraphLayoutContext(),
    randomPointsRef = useRef<Record<string, { x: number, y: number }>>({}),
    [dragID, setDragID] = useState(''),
    currPos = useRef({x: 0, y: 0})

  const randomlyDistributePoints = useCallback((cases?: CaseData[]) => {
    const uniform = randomUniform()
      const points = randomPointsRef.current
      cases?.forEach(({caseID}) => {
        if (!points[caseID]) {
          points[caseID] = {x: uniform(), y: uniform()}
        }
      })
  }, [])

  const onDragStart = useCallback((event: PointerEvent, point: PIXI.Sprite, metadata: IPixiPointMetadata) => {
    stopAnimation() // We don't want to animate points until end of drag
    setDragID(metadata.caseID)
    currPos.current = { x: event.clientX, y: event.clientY }
    handleClickOnCase(event, metadata.caseID, dataset)
  }, [stopAnimation, dataset])

  const onDrag = useCallback((event: PointerEvent, point: PIXI.Sprite, metadata: IPixiPointMetadata) => {
    const pixiPoints = pixiPointsRef.current
    if (pixiPoints && dragID !== '') {
      const newPos = { x: event.clientX, y: event.clientY }
      const dx = newPos.x - currPos.current.x
      const dy = newPos.y - currPos.current.y
      currPos.current = newPos
      if (dx !== 0 || dy !== 0) {
        pixiPoints.forEachSelectedPoint((selectedPoint) => {
          selectedPoint.x += dx
          selectedPoint.y += dy
        })
      }
    }
  }, [pixiPointsRef, dragID])

  const onDragEnd = useCallback((event: PointerEvent, point: PIXI.Sprite, metadata: IPixiPointMetadata) => {
    if (dragID !== '') {
      setDragID(() => '')
    }
  }, [dragID])

  usePixiDragHandlers(pixiPointsRef.current, { start: onDragStart, drag: onDrag, end: onDragEnd })

  const refreshPointSelection = useCallback(() => {
    const {pointColor, pointStrokeColor} = graphModel.pointDescription,
      selectedPointRadius = graphModel.getPointRadius('select')
    dataConfiguration && setPointSelection({
      pixiPointsRef, dataConfiguration, pointRadius: graphModel.getPointRadius(), selectedPointRadius,
      pointColor, pointStrokeColor
    })
  }, [graphModel, dataConfiguration, pixiPointsRef])

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
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
      dataset, pointRadius, selectedPointRadius, pixiPointsRef, selectedOnly,
      pointColor, pointStrokeColor, getScreenX, getScreenY, getLegendColor, getAnimationEnabled: isAnimating
    })
  }, [pixiPointsRef, graphModel, layout, dataConfiguration, dataset, isAnimating])

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

  usePlotResponders({pixiPointsRef, refreshPointPositions, refreshPointSelection})

  return (
    <></>
  )
}
