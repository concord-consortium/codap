import { observer } from "mobx-react-lite"
import { useCallback, useEffect } from "react"
import { mstReaction } from "../../../../utilities/mst-reaction"
import { handleClickOnCase } from "../../../data-display/data-display-utils"
import { circleAnchor, IPoint, IPointMetadata } from "../../../data-display/renderer"
import { IPlotProps } from "../../graphing-types"
import { useChartDots } from "../../hooks/use-chart-dots"
import { usePlotResponders } from "../../hooks/use-plot"
import { setPointCoordinates } from "../../utilities/graph-utils"

export const DotChart = observer(function DotChart({ renderer }: IPlotProps) {
  const { dataset, graphModel, isAnimating, primaryScreenCoord, secondaryScreenCoord,
          refreshPointSelection, subPlotCells } = useChartDots(renderer)

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
    const { dataConfig, primaryCellWidth, primaryCellHeight, primaryIsBottom } = subPlotCells
    const { catMap, numPointsInRow, overlap } = graphModel.cellParams(primaryCellWidth, primaryCellHeight)
    const cellIndices = graphModel.mapOfIndicesByCase(catMap, numPointsInRow)
    const {pointColor, pointStrokeColor} = graphModel.pointDescription
    const pointRadius = graphModel.getPointRadius()
    const legendAttrID = dataConfig?.attributeID('legend')
    const getLegendColor = legendAttrID ? dataConfig?.getLegendColorForCase : undefined

    const getPrimaryScreenCoord = (anID: string) => primaryScreenCoord({cellIndices, numPointsInRow}, anID)
    const getSecondaryScreenCoord = (anID: string) => secondaryScreenCoord({cellIndices, overlap}, anID)
    const getScreenX = primaryIsBottom ? getPrimaryScreenCoord : getSecondaryScreenCoord
    const getScreenY = primaryIsBottom ? getSecondaryScreenCoord : getPrimaryScreenCoord

    const anchor = circleAnchor
    setPointCoordinates({
      anchor, dataset, pointRadius, selectedPointRadius: graphModel.getPointRadius('select'), renderer, selectedOnly,
      pointColor, pointStrokeColor, getScreenX, getScreenY, getLegendColor, getAnimationEnabled: isAnimating
    })
  }, [dataset, graphModel, isAnimating, renderer, primaryScreenCoord, secondaryScreenCoord, subPlotCells])

  usePlotResponders({renderer, refreshPointPositions, refreshPointSelection})

  const onPointerClick = useCallback(
    (event: PointerEvent, _point: IPoint, metadata: IPointMetadata) => {
      handleClickOnCase(event, metadata.caseID, dataset)
  }, [dataset])

  useEffect(() => {
    if (renderer) {
      renderer.onPointerClick = onPointerClick
    }
  }, [renderer, onPointerClick])

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
})
