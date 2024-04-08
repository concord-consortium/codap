import { ScaleBand, ScaleLinear, select } from "d3"
import React, { useCallback, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { CellType, IBarCover, PlotProps } from "../graphing-types"
import { usePlotResponders } from "../hooks/use-plot"
import { handleClickOnBar } from "../../data-display/data-display-utils"
import { setPointCoordinates } from "../utilities/graph-utils"
import { IDataConfigurationModel } from "../../data-display/models/data-configuration-model"
import { GraphLayout } from "../models/graph-layout"
import { AxisPlace } from "../../axis/axis-types"
import { mstAutorun } from "../../../utilities/mst-autorun"
import { useChartDots } from "../hooks/use-chart-dots"

interface IRenderBarCoverProps {
  barCovers: IBarCover[]
  barCoversRef: React.RefObject<SVGGElement>
  dataConfiguration: IDataConfigurationModel
  primaryAttrRole: "x" | "y"
}

interface IBarCoverDimensionsProps {
  cellIndices: CellType
  layout: GraphLayout
  extraPrimaryAxisPlace: AxisPlace
  maxInCell: number
  numExtraSecondaryBands: number
  primaryAxisPlace: AxisPlace
  primaryIsBottom: boolean
  primCatsCount: number
  secondaryAxisPlace: AxisPlace
  secondaryCellHeight: number
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
  const { cellIndices, extraPrimaryAxisPlace, layout, maxInCell, numExtraSecondaryBands, primCatsCount,
          primaryAxisPlace, primaryIsBottom, secondaryAxisPlace, secondaryCellHeight } = props
  const { p: primeCatIndex, ep: extraPrimeCatIndex, es: extraSecCatIndex } = cellIndices
  const extraPrimaryAxisScale = layout.getAxisScale(extraPrimaryAxisPlace) as ScaleBand<string>
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
  const invertedSecondaryIndex = numExtraSecondaryBands - 1 - extraSecCatIndex
  const offsetSecondary = invertedSecondaryIndex * secondaryCellHeight
  const adjustedSecondaryCoord = Math.abs(secondaryCoord / numExtraSecondaryBands + offsetSecondary)
  const primaryDimension = primarySubCellWidth / 2
  const secondaryDimension = Math.abs(secondaryCoord - secondaryAxisScale(0)) / numExtraSecondaryBands
  const barWidth = primaryIsBottom ? primaryDimension : secondaryDimension
  const barHeight = primaryIsBottom ? secondaryDimension : primaryDimension
  const primaryCoord = offsetPrimary + (primarySubCellWidth / 2 - primaryDimension / 2)
  const x = primaryIsBottom ? primaryCoord : secondaryAxisScale(0)
  const y = primaryIsBottom ? adjustedSecondaryCoord : primaryCoord

  return { x, y, barWidth, barHeight }
}

export const BarChartDots = function BarChartDots({ abovePointsGroupRef, pixiPoints }: PlotProps) {
  const { dataConfig, dataset, extraPrimaryAttrRole, extraSecondaryAttrRole, graphModel, isAnimating, layout,
          pointColor, pointPositionSpecs, pointStrokeColor, primaryAttrRole, primaryAxisPlace, primaryIsBottom,
          refreshPointSelection } = useChartDots(pixiPoints)
  const barCoversRef = useRef<SVGGElement>(null)

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
    const { extraPrimaryAxisPlace, getLegendColor, numExtraSecondaryBands, primaryCellWidth,
            primaryHeight, primaryScreenCoord, secondaryAxisPlace, secondaryAxisScale, secondaryCellHeight,
            secondaryScreenCoord } = pointPositionSpecs()
    const { catMap, numPointsInRow } = graphModel.cellParams(primaryCellWidth, primaryHeight)
    const cellIndices = graphModel.mapOfIndicesByCase(catMap, numPointsInRow)
    const pointRadius = graphModel.getPointRadius()
    const pointDisplayType = "bars"
    
    const getPrimaryScreenCoord = (anID: string) => primaryScreenCoord({cellIndices, numPointsInRow}, anID)
    const getSecondaryScreenCoord = (anID: string) => secondaryScreenCoord({cellIndices}, anID)
    const getScreenX = primaryIsBottom ? getPrimaryScreenCoord : getSecondaryScreenCoord
    const getScreenY = primaryIsBottom ? getSecondaryScreenCoord : getPrimaryScreenCoord

    const getWidth = () => primaryIsBottom
      ? primaryCellWidth / 2
      : (Math.abs(secondaryAxisScale(1) - secondaryAxisScale(0))) / numExtraSecondaryBands
    const getHeight = () => primaryIsBottom
      ? (Math.abs(secondaryAxisScale(1) - secondaryAxisScale(0))) / numExtraSecondaryBands
      : primaryCellWidth / 2

    // build and render bar cover elements that will handle pointer events for the fused points
    if (dataConfig && abovePointsGroupRef?.current) {
      const barCovers: IBarCover[] = []
      const bins = dataConfig?.cellMap(extraPrimaryAttrRole, extraSecondaryAttrRole) ?? {}
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
                cellIndices: cellData.cell, primaryAxisPlace, layout, numExtraSecondaryBands,
                primCatsCount, primaryIsBottom, secondaryAxisPlace, secondaryCellHeight, maxInCell,
                extraPrimaryAxisPlace
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
  }, [pointPositionSpecs, primaryIsBottom, layout, graphModel, dataConfig, abovePointsGroupRef, dataset,
      pixiPoints, pointColor, pointStrokeColor, isAnimating, extraPrimaryAttrRole, extraSecondaryAttrRole,
      primaryAttrRole, primaryAxisPlace])

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
}
