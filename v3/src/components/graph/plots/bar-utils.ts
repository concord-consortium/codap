import { select } from "d3"
import { handleClickOnBar } from "../../data-display/data-display-utils"
import { IDataConfigurationModel } from "../../data-display/models/data-configuration-model"
import { CellType, IBarCover } from "../graphing-types"
import { GraphLayout } from "../models/graph-layout"
import { SubPlotCells } from "../models/sub-plot-cells"

interface IRenderBarCoverProps {
  barCovers: IBarCover[]
  barCoversRef: React.RefObject<SVGGElement>
  dataConfig: IDataConfigurationModel
  primaryAttrRole: "x" | "y"
}

export interface IBarCoverDimensionsProps {
  subPlotCells: SubPlotCells
  cellIndices: CellType
  layout: GraphLayout
  maxInCell: number
  minInCell?: number
  primCatsCount: number
}

export const barCoverDimensions = (props: IBarCoverDimensionsProps) => {
  const { subPlotCells, cellIndices, maxInCell, minInCell = 0, primCatsCount } = props
  const { numPrimarySplitBands, numSecondarySplitBands, primaryCellWidth, primaryIsBottom, primarySplitCellWidth,
          secondaryCellHeight, secondaryNumericScale } = subPlotCells
  const { p: primeCatIndex, ep: primeSplitCatIndex, es: secSplitCatIndex } = cellIndices
  const adjustedPrimeSplitIndex = primaryIsBottom
          ? primeSplitCatIndex
          : numPrimarySplitBands - 1 - primeSplitCatIndex
  const offsetPrimarySplit = adjustedPrimeSplitIndex * primarySplitCellWidth
  const primaryInvertedIndex = primCatsCount - 1 - primeCatIndex
  const offsetPrimary = primaryIsBottom
          ? primeCatIndex * primaryCellWidth + offsetPrimarySplit
          : primaryInvertedIndex * primaryCellWidth + offsetPrimarySplit
  const secondaryCoord = secondaryNumericScale?.(maxInCell) ?? 0
  const secondaryBaseCoord = secondaryNumericScale?.(minInCell) ?? 0
  const secondaryIndex = primaryIsBottom
          ? numSecondarySplitBands - 1 - secSplitCatIndex
          : secSplitCatIndex
  const offsetSecondary = secondaryIndex * secondaryCellHeight
  const adjustedSecondaryCoord = primaryIsBottom
          ? Math.abs(secondaryCoord / numSecondarySplitBands + offsetSecondary)
          : secondaryBaseCoord / numSecondarySplitBands + offsetSecondary
  const primaryDimension = primaryCellWidth / 2
  const secondaryDimension = Math.abs(secondaryCoord - secondaryBaseCoord) / numSecondarySplitBands
  const barWidth = primaryIsBottom ? primaryDimension : secondaryDimension
  const barHeight = primaryIsBottom ? secondaryDimension : primaryDimension
  const primaryCoord = offsetPrimary + (primaryCellWidth / 2 - primaryDimension / 2)
  const x = primaryIsBottom ? primaryCoord : adjustedSecondaryCoord
  const y = primaryIsBottom ? adjustedSecondaryCoord : primaryCoord

  return { x, y, barWidth, barHeight }
}

export const renderBarCovers = (props: IRenderBarCoverProps) => {
  const { barCovers, barCoversRef, dataConfig } = props
  select(barCoversRef.current).selectAll("rect").remove()
  select(barCoversRef.current).selectAll("rect")
    .data(barCovers)
    .join((enter) => enter.append("rect")
      .attr("class", (d) => d.class)
      .attr("data-testid", "bar-cover")
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y)
      .attr("width", (d) => d.width)
      .attr("height", (d) => d.height)
      .on("mouseover", function() { select(this).classed("active", true) })
      .on("mouseout", function() { select(this).classed("active", false) })
      .on("click", function(event, d) {
        dataConfig && handleClickOnBar({event, dataConfig, barCover: d})
      })
    )
}
