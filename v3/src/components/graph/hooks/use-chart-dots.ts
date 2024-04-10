import { useCallback } from "react"
import { useMemo } from "use-memo-one"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { setPointSelection } from "../../data-display/data-display-utils"
import { useDataDisplayAnimation } from "../../data-display/hooks/use-data-display-animation"
import { SubPlotCells } from "../models/sub-plot-cells"
import { PixiPoints } from "../utilities/pixi-points"
import { useGraphContentModelContext } from "./use-graph-content-model-context"
import { useGraphDataConfigurationContext } from "./use-graph-data-configuration-context"
import { useGraphLayoutContext } from "./use-graph-layout-context"

interface ScreenCoordContext {
  cellIndices: any
  overlap?: number
  numPointsInRow?: number
}

export const useChartDots = (pixiPoints?: PixiPoints) => {
  const graphModel = useGraphContentModelContext(),
    {isAnimating} = useDataDisplayAnimation(),
    dataConfig = useGraphDataConfigurationContext(),
    dataset = useDataSetContext(),
    layout = useGraphLayoutContext(),
    subPlotCells = useMemo(() => new SubPlotCells(layout, dataConfig), [dataConfig, layout])

  const refreshPointSelection = useCallback(() => {
    const {pointColor, pointStrokeColor} = graphModel.pointDescription
    const pointRadius = graphModel.getPointRadius()
    const selectedPointRadius = graphModel.getPointRadius('select')
    const pointsFusedIntoBars = graphModel.pointsFusedIntoBars
    dataConfig && setPointSelection({
      pixiPoints, pointColor, pointStrokeColor, dataConfiguration: dataConfig, pointRadius, selectedPointRadius,
      pointsFusedIntoBars
    })
  }, [dataConfig, graphModel, pixiPoints])

  const primaryScreenCoord = useCallback((context: ScreenCoordContext, anID: string) => {
    const pointDiameter = 2 * graphModel.getPointRadius()
    const { primaryBaseCoord, primaryCellWidth, primarySplitCellWidth, signForOffset } = subPlotCells
    const { cellIndices, numPointsInRow = 0 } = context
    if (cellIndices[anID]) {
      const { column } = cellIndices[anID],
        { p, ep } = cellIndices[anID].cell
      return primaryBaseCoord + signForOffset * ((p + 0.5) * primaryCellWidth + ep * primarySplitCellWidth) +
        (column + 0.5) * pointDiameter - numPointsInRow * pointDiameter / 2
    } else {
      return 0
    }
  }, [graphModel, subPlotCells])

  const secondaryScreenCoord = useCallback((context: ScreenCoordContext, anID: string) => {
    const pointDiameter = 2 * graphModel.getPointRadius()
    const { pointsFusedIntoBars } = graphModel
    const {
      primaryIsBottom, primaryCellHeight, signForOffset,
      secondaryBaseCoord, secondaryNumericUnitLength, secondarySplitCellWidth
    } = subPlotCells
    const { cellIndices, overlap = 0 } = context
    const cellIndex = cellIndices[anID]
    if (!cellIndex) return 0

    const { row } = cellIndices[anID]
    const { s, es } = cellIndices[anID].cell
    const barHeight = secondaryNumericUnitLength
    const baseHeight = pointsFusedIntoBars
      ? (row + .25) * barHeight - barHeight / 4
      : (row + 0.5) * pointDiameter + row * overlap
    const baseSecScreenCoord = secondaryBaseCoord -
      signForOffset * (s * primaryCellHeight + es * secondarySplitCellWidth + baseHeight)

    return primaryIsBottom && pointsFusedIntoBars
      ? baseSecScreenCoord - barHeight / 4
      : baseSecScreenCoord + (pointsFusedIntoBars ? barHeight / 4 : 0)
  }, [graphModel, subPlotCells])

  return {
    dataConfig, dataset, graphModel, isAnimating, layout,
    primaryScreenCoord, refreshPointSelection, secondaryScreenCoord, subPlotCells
  }
}
