import { ScaleBand, ScaleLinear } from "d3"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { attrRoleToAxisPlace } from "../../data-display/data-display-types"
import { setPointSelection } from "../../data-display/data-display-utils"
import { useDataDisplayAnimation } from "../../data-display/hooks/use-data-display-animation"
import { PixiPoints } from "../utilities/pixi-points"
import { useGraphContentModelContext } from "./use-graph-content-model-context"
import { useGraphDataConfigurationContext } from "./use-graph-data-configuration-context"
import { useGraphLayoutContext } from "./use-graph-layout-context"

interface ScreenCoordContext {
  cellIndices: any
  overlap?: number
  numPointsInRow?: number
  secOrdinalScale?: ScaleBand<string>
}

export const useChartDots = (pixiPoints?: PixiPoints) => {
  const graphModel = useGraphContentModelContext(),
    {isAnimating} = useDataDisplayAnimation(),
    {pointColor, pointStrokeColor} = graphModel.pointDescription,
    pointRadius = graphModel.getPointRadius(),
    selectedPointRadius = graphModel.getPointRadius('select'),
    pointsFusedIntoBars = graphModel.pointsFusedIntoBars,
    dataConfig = useGraphDataConfigurationContext(),
    dataset = useDataSetContext(),
    layout = useGraphLayoutContext(),
    primaryAttrRole = dataConfig?.primaryRole ?? 'x',
    primaryAxisPlace = attrRoleToAxisPlace[primaryAttrRole] ?? 'bottom',
    primaryIsBottom = primaryAxisPlace === 'bottom',
    secondaryAttrRole: keyof typeof attrRoleToAxisPlace = primaryAttrRole === 'x' ? 'y' : 'x',
    extraPrimaryAttrRole: keyof typeof attrRoleToAxisPlace = primaryAttrRole === 'x' ? 'topSplit' : 'rightSplit',
    extraSecondaryAttrRole: keyof typeof attrRoleToAxisPlace = primaryAttrRole === 'x' ? 'rightSplit' : 'topSplit'

  const refreshPointSelection = () => {
    dataConfig && setPointSelection({
      pixiPoints, pointColor, pointStrokeColor, dataConfiguration: dataConfig, pointRadius, selectedPointRadius,
      pointsFusedIntoBars
    })
  }

  const pointPositionSpecs = () => {
    // We're pretending that the primaryRole is the bottom just to help understand the naming
    const secondaryAxisPlace = attrRoleToAxisPlace[secondaryAttrRole] ?? 'left',
      extraPrimaryAxisPlace = attrRoleToAxisPlace[extraPrimaryAttrRole] ?? 'top',
      extraSecondaryAxisPlace = attrRoleToAxisPlace[extraSecondaryAttrRole] ?? 'rightCat',
      extraSecondaryPlace = primaryIsBottom ? 'rightCat' : 'top',
      extraSecondaryAxisScale = layout.getAxisScale(extraSecondaryPlace) as ScaleBand<string>,
      numExtraSecondaryBands = Math.max(1, extraSecondaryAxisScale?.domain().length ?? 1),
      pointDiameter = 2 * graphModel.getPointRadius(),
      primOrdinalScale = layout.getAxisScale(primaryAxisPlace) as ScaleBand<string>,
      secOrdinalScale = layout.getAxisScale(secondaryAxisPlace) as ScaleBand<string>,
      extraPrimOrdinalScale = layout.getAxisScale(extraPrimaryAxisPlace) as ScaleBand<string>,
      extraSecOrdinalScale = layout.getAxisScale(extraSecondaryAxisPlace) as ScaleBand<string>,
      primaryCellWidth = ((primOrdinalScale.bandwidth?.()) ?? 0) /
        (dataConfig?.numRepetitionsForPlace(primaryAxisPlace) ?? 1),
      primaryHeight = (secOrdinalScale.bandwidth ? secOrdinalScale.bandwidth()
          : (secondaryAxisPlace ? layout.getAxisLength(secondaryAxisPlace) : 0)) /
        (dataConfig?.numRepetitionsForPlace(secondaryAxisPlace) ?? 1),
      secondaryCellHeight = layout.getAxisLength(secondaryAxisPlace) / numExtraSecondaryBands,
      extraPrimCellWidth = (extraPrimOrdinalScale.bandwidth?.()) ?? 0,
      extraSecCellWidth = (extraSecOrdinalScale.bandwidth?.()) ?? 0,
      legendAttrID = dataConfig?.attributeID('legend'),
      getLegendColor = legendAttrID ? dataConfig?.getLegendColorForCase : undefined,
      secondaryAxisScale = layout.getAxisScale(secondaryAxisPlace) as ScaleLinear<number, number>,
      baseCoord = primaryIsBottom ? 0 : layout.getAxisLength('left'),
      signForOffset = primaryIsBottom ? 1 : -1

    const primaryScreenCoord = (context: ScreenCoordContext, anID: string) => {
      const { cellIndices, numPointsInRow = 0 } = context
      if (cellIndices[anID]) {
        const { column } = cellIndices[anID],
          { p, ep } = cellIndices[anID].cell
        return baseCoord + signForOffset * ((p + 0.5) * primaryCellWidth + ep * extraPrimCellWidth) +
          (column + 0.5) * pointDiameter - numPointsInRow * pointDiameter / 2
      } else {
        return 0
      }
    }

    const secondaryScreenCoord = (context: ScreenCoordContext, anID: string) => {
      const { cellIndices, overlap = 0 } = context
      const cellIndex = cellIndices[anID]
      if (!cellIndex) return 0

      const { row } = cellIndices[anID]
      const { s, es } = cellIndices[anID].cell
      const barHeight = graphModel.pointsFusedIntoBars
        ? Math.abs(secondaryAxisScale(1) - secondaryAxisScale(0)) / numExtraSecondaryBands
        : 0
      const baseHeight = graphModel.pointsFusedIntoBars
        ? (row + .25) * barHeight - barHeight / 4
        : (row + 0.5) * pointDiameter + row * overlap
      const baseSecScreenCoord = secOrdinalScale.range()[0] -
        signForOffset * (s * primaryHeight + es * extraSecCellWidth + baseHeight)
    
      return primaryIsBottom && graphModel.pointsFusedIntoBars
        ? baseSecScreenCoord - barHeight / 4
        : baseSecScreenCoord + (graphModel.pointsFusedIntoBars ? barHeight / 4 : 0)
    }

    return {
      extraPrimaryAxisPlace, getLegendColor, numExtraSecondaryBands, primaryCellWidth, primaryHeight,
      primaryScreenCoord, secondaryAxisPlace, secondaryAxisScale, secondaryCellHeight, secondaryScreenCoord
    }
  }

  return {
    dataConfig, dataset, extraPrimaryAttrRole, extraSecondaryAttrRole, graphModel, isAnimating, layout,
    pointColor, pointPositionSpecs, pointStrokeColor, primaryAttrRole, primaryAxisPlace, primaryIsBottom,
    refreshPointSelection, secondaryAttrRole
  }
}
