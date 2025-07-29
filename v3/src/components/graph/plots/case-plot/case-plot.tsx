import {randomUniform} from "d3"
import * as PIXI from "pixi.js"
import React, {useCallback, useEffect, useRef, useState} from "react"
import {useDataSetContext} from "../../../../hooks/use-data-set-context"
import {mstReaction} from "../../../../utilities/mst-reaction"
import { CaseData } from "../../../data-display/d3-types"
import {handleClickOnCase, setPointSelection} from "../../../data-display/data-display-utils"
import {useDataDisplayAnimation} from "../../../data-display/hooks/use-data-display-animation"
import {IPixiPointMetadata} from "../../../data-display/pixi/pixi-points"
import { IPlotProps } from "../../graphing-types"
import {useGraphContentModelContext} from "../../hooks/use-graph-content-model-context"
import {useGraphDataConfigurationContext} from "../../hooks/use-graph-data-configuration-context"
import {useGraphLayoutContext} from "../../hooks/use-graph-layout-context"
import {usePixiDragHandlers, usePlotResponders} from "../../hooks/use-plot"
import { setPointCoordinates } from "../../utilities/graph-utils"

export const CasePlot = function CasePlot({ pixiPoints }: IPlotProps) {
  const graphModel = useGraphContentModelContext(),
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
  }, [pixiPoints, dragID])

  const onDragEnd = useCallback((event: PointerEvent, point: PIXI.Sprite, metadata: IPixiPointMetadata) => {
    if (dragID !== '') {
      setDragID(() => '')
    }
  }, [dragID])

  usePixiDragHandlers(pixiPoints, { start: onDragStart, drag: onDrag, end: onDragEnd })

  const refreshPointSelection = useCallback(() => {
    const {pointColor, pointStrokeColor} = graphModel.pointDescription,
      selectedPointRadius = graphModel.getPointRadius('select')
      dataConfiguration && setPointSelection({
        pixiPoints, dataConfiguration, pointRadius: graphModel.getPointRadius(), selectedPointRadius,
        pointColor, pointStrokeColor
      })
  }, [graphModel, dataConfiguration, pixiPoints])

  const refreshPointPositions = useCallback((selectedOnly = false) => {
    const
      pointRadius = graphModel.getPointRadius(),
      selectedPointRadius = graphModel.getPointRadius('select'),
      {pointColor, pointStrokeColor} = graphModel.pointDescription,
      xLength = layout.getAxisMultiScale('bottom')?.length ?? 0,
      yLength = layout.getAxisMultiScale('left')?.length ?? 0,
      getScreenX = (anID: string) => {
        return pointRadius + randomPointsRef.current[anID]?.x * (xLength - 2 * pointRadius)
      },
      getScreenY = (anID: string) => {
        return yLength - (pointRadius + randomPointsRef.current[anID]?.y * (yLength - 2 * pointRadius))
      },
      getLegendColor = dataConfiguration?.attributeID('legend')
        ? dataConfiguration?.getLegendColorForCase : undefined

    setPointCoordinates({
      dataset, pointRadius, selectedPointRadius, pixiPoints, selectedOnly,
      pointColor, pointStrokeColor, getScreenX, getScreenY, getLegendColor, getAnimationEnabled: isAnimating
    })
  }, [pixiPoints, graphModel, layout, dataConfiguration, dataset, isAnimating])

  useEffect(function respondToModelChangeCount() {
    return mstReaction(
      () => graphModel.changeCount,
      () => {
        randomPointsRef.current = {}
        randomlyDistributePoints(dataConfiguration?.getCaseDataArray(0))
        startAnimation()
        refreshPointPositions()
      },
      { name: "CaseDots.respondToModelChangeCount" }, graphModel)
  }, [dataConfiguration, graphModel,
      randomlyDistributePoints, refreshPointPositions, startAnimation])

  useEffect(function respondToCasesCountChange() {
    return mstReaction(
      () => dataConfiguration?.caseDataHash,
      () => {
        randomlyDistributePoints(dataConfiguration?.getCaseDataArray(0))
        startAnimation()
        refreshPointPositions()
      },
      { name: "CaseDots.respondToCasesCountChange" }, dataConfiguration)
  }, [dataConfiguration, randomlyDistributePoints, refreshPointPositions, startAnimation])

  usePlotResponders({pixiPoints, refreshPointPositions, refreshPointSelection})

  useEffect(function initDistribution() {
    randomlyDistributePoints(dataConfiguration?.getCaseDataArray(0))
  }, [dataConfiguration, randomlyDistributePoints])

  return (
    <></>
  )
}
