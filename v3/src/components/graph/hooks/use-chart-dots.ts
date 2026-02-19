import { useCallback } from "react"
import { useMemo } from "use-memo-one"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { setPointSelection } from "../../data-display/data-display-utils"
import { useDataDisplayAnimation } from "../../data-display/hooks/use-data-display-animation"
import { SubPlotCells } from "../models/sub-plot-cells"
import { PointRendererBase } from "../../data-display/renderer"
import { barCompressionFactorForCase } from "../plots/bar-utils"
import { useGraphContentModelContext } from "./use-graph-content-model-context"
import { useGraphDataConfigurationContext } from "./use-graph-data-configuration-context"
import { useGraphLayoutContext } from "./use-graph-layout-context"

interface ScreenCoordContext {
  cellIndices: any
  overlap?: number
  numPointsInRow?: number
}

export const useChartDots = (renderer?: PointRendererBase) => {
  const graphModel = useGraphContentModelContext(),
    {isAnimating} = useDataDisplayAnimation(),
    dataConfig = useGraphDataConfigurationContext(),
    dataset = useDataSetContext(),
    layout = useGraphLayoutContext(),
    // Include scale changeCounts to recreate SubPlotCells when categorical axis domains change
    // (e.g., when categories are hidden). This ensures fresh bandwidth calculations.
    bottomScaleChangeCount = layout.getAxisMultiScale('bottom')?.changeCount,
    leftScaleChangeCount = layout.getAxisMultiScale('left')?.changeCount,
    subPlotCells = useMemo(
      () => new SubPlotCells(layout, dataConfig),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [dataConfig, layout, bottomScaleChangeCount, leftScaleChangeCount]
    ),
    baselineOffset = 0.5

  const refreshPointSelection = useCallback(() => {
    const {pointColor, pointStrokeColor} = graphModel.pointDescription
    const pointRadius = graphModel.getPointRadius()
    const selectedPointRadius = graphModel.getPointRadius('select')
    dataConfig && setPointSelection({
      renderer, pointColor, pointStrokeColor, dataConfiguration: dataConfig, pointRadius, selectedPointRadius
    })
  }, [dataConfig, graphModel, renderer])

  const primaryScreenCoord = useCallback((context: ScreenCoordContext, anID: string) => {
    const pointDiameter = 2 * graphModel.getPointRadius()
    const { primaryBaseCoord, primaryCellWidth, primarySplitCellWidth, signForOffset } = subPlotCells
    const { cellIndices, numPointsInRow = 0 } = context
    if (cellIndices[anID]) {
      const { column } = cellIndices[anID],
        { p, ep } = cellIndices[anID].cell
      return primaryBaseCoord + signForOffset * ((p + baselineOffset) * primaryCellWidth + ep * primarySplitCellWidth) +
        (column + baselineOffset) * pointDiameter - numPointsInRow * pointDiameter / 2
    } else {
      return 0
    }
  }, [graphModel, subPlotCells])

  const secondaryScreenCoord = useCallback((context: ScreenCoordContext, anID: string) => {
    const pointDiameter = 2 * graphModel.getPointRadius()
    const { pointsFusedIntoBars } = graphModel
    const {
      primaryIsBottom, primaryCellHeight, signForOffset, secondaryNumericScale,
      secondaryBaseCoord, secondaryNumericUnitLength, secondarySplitCellWidth
    } = subPlotCells
    const { cellIndices, overlap = 0 } = context
    const cellIndex = cellIndices[anID]
    if (!cellIndex) return 0

    const barHeightFactor = barCompressionFactorForCase(anID, graphModel)
    const barBaseCoord = secondaryNumericScale ? secondaryNumericScale(0) : secondaryBaseCoord
    const { row } = cellIndices[anID]
    const { s, es } = cellIndices[anID].cell
    const barHeight = secondaryNumericUnitLength * barHeightFactor
    const baseHeight = pointsFusedIntoBars
      ? (row + baselineOffset) * barHeight - barHeight
      : (row + baselineOffset) * pointDiameter + row * overlap
    const baseSecScreenCoord = barBaseCoord -
      signForOffset * (s * primaryCellHeight + es * secondarySplitCellWidth + baseHeight)

    return primaryIsBottom && pointsFusedIntoBars
      ? baseSecScreenCoord - barHeight
      : baseSecScreenCoord + (pointsFusedIntoBars ? barHeight : 0)
  }, [graphModel, subPlotCells])

  return {
    dataConfig, dataset, graphModel, isAnimating, layout,
    primaryScreenCoord, refreshPointSelection, secondaryScreenCoord, subPlotCells
  }
}
