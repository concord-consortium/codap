import { ScaleBand, ScaleLinear, select } from "d3"
import { observer } from "mobx-react-lite"
import React, { useCallback, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { CellType, IBarCover, PlotProps } from "../graphing-types"
import { usePlotResponders } from "../hooks/use-plot"
import { handleClickOnBar } from "../../data-display/data-display-utils"
import { setPointCoordinates } from "../utilities/graph-utils"
import { IDataConfigurationModel } from "../../data-display/models/data-configuration-model"
import { GraphLayout } from "../models/graph-layout"
import { SubPlotCells } from "../models/sub-plot-cells"
import { mstAutorun } from "../../../utilities/mst-autorun"
import { useChartDots } from "../hooks/use-chart-dots"

interface IRenderBarCoverProps {
  barCovers: IBarCover[]
  barCoversRef: React.RefObject<SVGGElement>
  dataConfiguration: IDataConfigurationModel
  primaryAttrRole: "x" | "y"
}

interface IBarCoverDimensionsProps {
  subPlotCells: SubPlotCells
  cellIndices: CellType
  layout: GraphLayout
  maxInCell: number
  primCatsCount: number
}

const renderBarCovers = (props: IRenderBarCoverProps) => {
  const { barCovers, barCoversRef, dataConfiguration, primaryAttrRole } = props
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
        dataConfiguration && handleClickOnBar({event, dataConfiguration, primaryAttrRole, barCover: d})
      })
    )
}

const barCoverDimensions = (props: IBarCoverDimensionsProps) => {
  const { subPlotCells, cellIndices, layout, maxInCell, primCatsCount } = props
  const {
    primaryAxisPlace, primaryIsBottom, primarySplitAxisPlace,
    secondaryAxisPlace, secondaryCellHeight, numSecondarySplitBands
  } = subPlotCells
  const { p: primeCatIndex, ep: extraPrimeCatIndex, es: extraSecCatIndex } = cellIndices
  const extraPrimaryAxisScale = layout.getAxisScale(primarySplitAxisPlace) as ScaleBand<string>
  const secondaryAxisScale = layout.getAxisScale(secondaryAxisPlace) as ScaleLinear<number, number>
  const numExtraPrimaryBands = Math.max(1, extraPrimaryAxisScale?.domain().length ?? 1)
  const primaryCellWidth = layout.getAxisLength(primaryAxisPlace) / (primCatsCount ?? 1)
  const primarySubCellWidth = primaryCellWidth / numExtraPrimaryBands
  const offsetExtraPrimary = extraPrimeCatIndex * primaryCellWidth
  const primaryInvertedIndex = primCatsCount - 1 - primeCatIndex
  const offsetPrimary = primaryIsBottom
                          ? primeCatIndex * primarySubCellWidth + offsetExtraPrimary
                          : primaryInvertedIndex * primarySubCellWidth + offsetExtraPrimary
  const secondaryCoord = secondaryAxisScale(maxInCell)
  const invertedSecondaryIndex = numSecondarySplitBands - 1 - extraSecCatIndex
  const offsetSecondary = invertedSecondaryIndex * secondaryCellHeight
  const adjustedSecondaryCoord = Math.abs(secondaryCoord / numSecondarySplitBands + offsetSecondary)
  const primaryDimension = primarySubCellWidth / 2
  const secondaryDimension = Math.abs(secondaryCoord - secondaryAxisScale(0)) / numSecondarySplitBands
  const barWidth = primaryIsBottom ? primaryDimension : secondaryDimension
  const barHeight = primaryIsBottom ? secondaryDimension : primaryDimension
  const primaryCoord = offsetPrimary + (primarySubCellWidth / 2 - primaryDimension / 2)
  const x = primaryIsBottom ? primaryCoord : secondaryAxisScale(0)
  const y = primaryIsBottom ? adjustedSecondaryCoord : primaryCoord

  return { x, y, barWidth, barHeight }
}

export const DotChartBars = observer(function DotChartBars({ abovePointsGroupRef, pixiPoints }: PlotProps) {
  const { dataset, graphModel, isAnimating, layout, primaryScreenCoord, secondaryScreenCoord,
          refreshPointSelection, subPlotCells } = useChartDots(pixiPoints)
  const barCoversRef = useRef<SVGGElement>(null)

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
    const {
      dataConfig, primaryAttrRole, primaryCellWidth, primaryCellHeight, primaryIsBottom,
      primarySplitAttrRole, secondarySplitAttrRole, secondaryNumericUnitLength } = subPlotCells
    const { catMap, numPointsInRow } = graphModel.cellParams(primaryCellWidth, primaryCellHeight)
    const cellIndices = graphModel.mapOfIndicesByCase(catMap, numPointsInRow)
    const {pointColor, pointStrokeColor} = graphModel.pointDescription
    const pointRadius = graphModel.getPointRadius()
    const legendAttrID = dataConfig?.attributeID('legend')
    const getLegendColor = legendAttrID ? dataConfig?.getLegendColorForCase : undefined
    const pointDisplayType = "bars"

    const getPrimaryScreenCoord = (anID: string) => primaryScreenCoord({cellIndices, numPointsInRow}, anID)
    const getSecondaryScreenCoord = (anID: string) => secondaryScreenCoord({cellIndices}, anID)
    const getScreenX = primaryIsBottom ? getPrimaryScreenCoord : getSecondaryScreenCoord
    const getScreenY = primaryIsBottom ? getSecondaryScreenCoord : getPrimaryScreenCoord

    const getWidth = () => primaryIsBottom
      ? primaryCellWidth / 2
      : secondaryNumericUnitLength
    const getHeight = () => primaryIsBottom
      ? secondaryNumericUnitLength
      : primaryCellWidth / 2

    // build and render bar cover elements that will handle pointer events for the fused points
    if (dataConfig && abovePointsGroupRef?.current) {
      const barCovers: IBarCover[] = []
      const bins = dataConfig?.cellMap(primarySplitAttrRole, secondarySplitAttrRole) ?? {}
      const primCatsArray = primaryAttrRole
        ? Array.from(dataConfig.categoryArrayForAttrRole(primaryAttrRole))
        : []
      const primCatsCount = primCatsArray.length
      Object.entries(catMap).forEach(([primeCat, secCats]) => {
        Object.entries(secCats).forEach(([secCat, extraPrimCats]) => {
          Object.entries(extraPrimCats).forEach(([extraPrimeCat, extraSecCats]) => {
            Object.entries(extraSecCats).forEach(([extraSecCat, cellData]) => {
              const secCatKey = secCat === "__main__" ? "" : secCat
              const exPrimeCatKey = extraPrimeCat === "__main__" ? "" : extraPrimeCat
              const exSecCatKey = extraSecCat === "__main__" ? "" : extraSecCat
              const maxInCell = bins[primeCat]?.[secCatKey]?.[exPrimeCatKey]?.[exSecCatKey] ?? 0
              const { x, y, barWidth, barHeight } = barCoverDimensions({
                subPlotCells, cellIndices: cellData.cell, layout, primCatsCount, maxInCell
              })
              barCovers.push({
                class: `bar-cover ${primeCat} ${secCatKey} ${exPrimeCatKey} ${exSecCatKey}`,
                primeCat, secCat, extraPrimeCat, extraSecCat,
                x: x.toString(), y: y.toString(),
                width: barWidth.toString(), height: barHeight.toString()
              })
            })
          })
        })
      })
      renderBarCovers({ barCovers, barCoversRef, dataConfiguration: dataConfig, primaryAttrRole })
    }

    setPointCoordinates({
      dataset, pointRadius, selectedPointRadius: graphModel.getPointRadius('select'),
      pixiPoints, selectedOnly, pointColor, pointStrokeColor, pointDisplayType,
      getScreenX, getScreenY, getLegendColor, getAnimationEnabled: isAnimating, getWidth, getHeight,
      pointsFusedIntoBars: graphModel?.pointsFusedIntoBars
    })
  }, [abovePointsGroupRef, dataset, graphModel, isAnimating, layout, pixiPoints,
      primaryScreenCoord, secondaryScreenCoord, subPlotCells])

  usePlotResponders({pixiPoints, refreshPointPositions, refreshPointSelection})

  useEffect(() => {
    if (pixiPoints) {
      pixiPoints.pointsFusedIntoBars = graphModel.pointsFusedIntoBars
    }
  }, [pixiPoints, graphModel.pointsFusedIntoBars])

  // when points are fused into bars, we need to set the secondary axis scale type to linear
  useEffect(function handleFuseIntoBars() {
    return mstAutorun(
      () => {
        if (graphModel.pointsFusedIntoBars) {
          const secondaryRole = graphModel.dataConfiguration.primaryRole === "x" ? "y" : "x"
          const secondaryPlace = secondaryRole === "y" ? "left" : "bottom"
          layout.setAxisScaleType(secondaryPlace, "linear")
        }
      },
      {name: "useAxis [handleFuseIntoBars]"}, graphModel
    )
  }, [graphModel, layout])

  return (
    <>
      {abovePointsGroupRef?.current && createPortal(
        <g ref={barCoversRef}/>,
        abovePointsGroupRef.current
      )}
    </>
  )
})
