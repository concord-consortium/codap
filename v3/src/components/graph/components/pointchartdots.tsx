import * as PIXI from "pixi.js"
import { mstReaction } from "../../../utilities/mst-reaction"
import React, { useCallback, useEffect } from "react"
import { PlotProps } from "../graphing-types"
import { usePlotResponders } from "../hooks/use-plot"
import { handleClickOnCase } from "../../data-display/data-display-utils"
import { setPointCoordinates } from "../utilities/graph-utils"
import { useChartDots } from "../hooks/use-chart-dots"
import { IPixiPointMetadata, PixiPointEventHandler } from "../utilities/pixi-points"

export const PointChartDots = function PointChartDots({ pixiPoints }: PlotProps) {
  const { dataset, graphModel, isAnimating, pointColor, pointPositionSpecs, pointStrokeColor, primaryIsBottom,
          refreshPointSelection } = useChartDots(pixiPoints)

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
    const { getLegendColor, primaryCellWidth, primaryHeight, primaryScreenCoord,
            secondaryScreenCoord } = pointPositionSpecs()
    const { catMap, numPointsInRow, overlap } = graphModel.cellParams(primaryCellWidth, primaryHeight)
    const cellIndices = graphModel.mapOfIndicesByCase(catMap, numPointsInRow)
    const pointRadius = graphModel.getPointRadius()

    const getPrimaryScreenCoord = (anID: string) => primaryScreenCoord({cellIndices, numPointsInRow}, anID)
    const getSecondaryScreenCoord = (anID: string) => secondaryScreenCoord({cellIndices, overlap}, anID)
    const getScreenX = primaryIsBottom ? getPrimaryScreenCoord : getSecondaryScreenCoord
    const getScreenY = primaryIsBottom ? getSecondaryScreenCoord : getPrimaryScreenCoord

    setPointCoordinates({
      dataset, pointRadius, selectedPointRadius: graphModel.getPointRadius('select'), pixiPoints, selectedOnly,
      pointColor, pointStrokeColor, getScreenX, getScreenY, getLegendColor, getAnimationEnabled: isAnimating
    })
  }, [pointPositionSpecs, primaryIsBottom, graphModel, dataset, pixiPoints, pointColor, pointStrokeColor,
      isAnimating])

  usePlotResponders({pixiPoints, refreshPointPositions, refreshPointSelection})

  const onPointClick: PixiPointEventHandler = useCallback(
    (event: PointerEvent, point: PIXI.Sprite, metadata: IPixiPointMetadata) => {
      handleClickOnCase(event, metadata.caseID, dataset)
  }, [dataset])
  
  useEffect(() => {
    if (pixiPoints) {
      pixiPoints.onPointClick = onPointClick
    }
  }, [pixiPoints, onPointClick])

  // respond to point size change because we have to change the stacking
  useEffect(function respondToGraphPointVisualAction() {
    return mstReaction(() => {
        const { pointSizeMultiplier } = graphModel.pointDescription
        return pointSizeMultiplier
      },
      () => refreshPointPositions(false),
      {name: "respondToGraphPointVisualAction"}, graphModel
    )
  }, [graphModel, refreshPointPositions])

  return (
    <></>
  )
}
