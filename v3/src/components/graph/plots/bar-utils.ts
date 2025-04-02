import { select } from "d3"
import { handleClickOnBar } from "../../data-display/data-display-utils"
import { CellType, IBarCover } from "../graphing-types"
import { GraphLayout } from "../models/graph-layout"
import { SubPlotCells } from "../models/sub-plot-cells"
import { IGraphContentModel } from "../models/graph-content-model"

interface IRenderBarCoverProps {
  barCovers: IBarCover[]
  barCoversRef: React.RefObject<SVGGElement>
  graphModel: IGraphContentModel
  primaryAttrRole: "x" | "y"
}

export interface IBarCoverDimensionsProps {
  subPlotCells: SubPlotCells
  cellIndices: CellType
  layout: GraphLayout
  maxInCell: number
  minInCell?: number
  numInBar?: number
  primCatsCount: number
  isPercentAxis: boolean
  hasLegend: boolean
  numInSubPlot: number
}

export const barCoverDimensions = (props: IBarCoverDimensionsProps) => {
  const { subPlotCells, cellIndices, maxInCell, minInCell = 0, numInBar = 1, primCatsCount,
    isPercentAxis, hasLegend, numInSubPlot} = props
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
  const denominator = hasLegend ? numInBar : numInSubPlot
  const maxValue = (isPercentAxis ? 100 * maxInCell / denominator : maxInCell)
  const minValue = (isPercentAxis ? 100 * minInCell / denominator : minInCell)
  const secondaryCoord = secondaryNumericScale?.(maxValue) ?? 0
  const secondaryBaseCoord = secondaryNumericScale?.(minValue) ?? 0
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
  const { barCovers, barCoversRef, graphModel } = props
  const { dataConfiguration: dataConfig, showDataTip, hideDataTip } = graphModel
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
      .on("mouseover", function(event, d) {
        select(this).classed("active", true)
        showDataTip({event, caseID: d.caseIDs[0], plotNum: 0})
      })
      .on("mouseout", function(event) {
        select(this).classed("active", false)
        hideDataTip(event)
      })
      .on("click", function(event, d) {
        dataConfig && handleClickOnBar({event, dataConfig, barCover: d})
      })
    )
}

export const barCompressionFactorForCase = (caseID: string, graphModel?: IGraphContentModel) => {
  const dataConfiguration = graphModel?.dataConfiguration,
    hasLegend = !!dataConfiguration?.attributeID('legend')
  /**
   * If the axis not percent, return 1; i.e. no compression.
   * In the presence of a legend, all the cases belonging to the primary category in this sub-plot will be
   *    spread from 0 to 100%, so we compress by 100 over the number of cases in the primary category in this sub-plot
   * If there is no legend, then we compress by 100 over the number of cases in the sub-plot
   */

  const getNumPrimaryCategoryCases = () => {
    return dataConfiguration?.numPrimaryCategoryCases(caseID) ?? 1
  }

  const getNumSubPlotCases = () => {
    return dataConfiguration?.subPlotCases(dataConfiguration?.subPlotKey(caseID)).length ?? 1
  }
  return graphModel?.secondaryAxisIsPercent
    ? (hasLegend ? 100 / getNumPrimaryCategoryCases() : 100 / getNumSubPlotCases()) : 1
}
