import { observer } from "mobx-react-lite"
import React, { useCallback, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { IBarCover, PlotProps } from "../graphing-types"
import { usePlotResponders } from "../hooks/use-plot"
import { setPointCoordinates } from "../utilities/graph-utils"
import { mstAutorun } from "../../../utilities/mst-autorun"
import { useChartDots } from "../hooks/use-chart-dots"
import { numericSortComparator } from "../../../utilities/data-utils"
import { barCoverDimensions, renderBarCovers } from "../utilities/bar-utils"

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

    // build and render bar cover elements that will handle click events for the fused points
    if (dataConfig && abovePointsGroupRef?.current) {
      const barCovers: IBarCover[] = []
      const bins = dataConfig?.cellMap(primarySplitAttrRole, secondarySplitAttrRole) ?? {}
      const primCatsArray = primaryAttrRole
        ? Array.from(dataConfig.categoryArrayForAttrRole(primaryAttrRole))
        : []
      const primCatsCount = primCatsArray.length
      const legendCats = dataConfig.categorySetForAttrRole("legend")?.values ?? []
      Object.entries(catMap).forEach(([primeCat, secCats]) => {
        Object.entries(secCats).forEach(([secCat, primSplitCats]) => {
          Object.entries(primSplitCats).forEach(([primeSplitCat, secSplitCats]) => {
            Object.entries(secSplitCats).forEach(([secSplitCat, cellData]) => {
              const secCatKey = secCat === "__main__" ? "" : secCat
              const exPrimeCatKey = primeSplitCat === "__main__" ? "" : primeSplitCat
              const exSecCatKey = secSplitCat === "__main__" ? "" : secSplitCat

              if (legendAttrID && legendCats?.length > 0) {
                let minInCell = 0

                // Create a map of cases grouped by legend value so we don't need to filter all cases per value when
                // creating the bar covers.
                const caseGroups = new Map()
                dataConfig.caseDataArray.forEach(aCase => {
                  const legendValue = dataset?.getStrValue(aCase.caseID, legendAttrID)
                  const primaryValue = dataset?.getStrValue(aCase.caseID, dataConfig.attributeID(primaryAttrRole))
                  const primarySplitValue =
                    dataset?.getStrValue(aCase.caseID, dataConfig.attributeID(primarySplitAttrRole))
                  const secondarySplitValue =
                    dataset?.getStrValue(aCase.caseID, dataConfig.attributeID(secondarySplitAttrRole))
                  const caseGroupKey =
                    `${legendValue}-${primaryValue}-${primarySplitValue}-${secondarySplitValue}`
                  if (!caseGroups.has(caseGroupKey)) {
                    caseGroups.set(caseGroupKey, [])
                  }
                  caseGroups.get(caseGroupKey).push(aCase)
                })

                // If the legend attribute is numeric, sort legendCats in descending order making sure to handle any NaN
                // values for cases that don't have a numeric value for the legend attribute.
                if (dataConfig.attributeType("legend") === "numeric") {
                  legendCats.sort((cat1: string, cat2: string) => {
                    return numericSortComparator({a: Number(cat1), b: Number(cat2), order: "desc"})
                  })
                }
                
                // For each legend value, create a bar cover
                legendCats.forEach((legendCat: string) => {
                  const matchingCases =
                    caseGroups.get(`${legendCat}-${primeCat}-${exPrimeCatKey}-${exSecCatKey}`) ?? []
                  const maxInCell = minInCell + matchingCases.length
                  if (maxInCell !== minInCell) {
                    const { x, y, barWidth, barHeight } = barCoverDimensions({
                      subPlotCells, cellIndices: cellData.cell, layout, primCatsCount, maxInCell, minInCell
                    })
                    const caseIDs = dataConfig.getCasesForCategoryValues(
                      primaryAttrRole, primeCat, secCat, primeSplitCat, secSplitCat, legendCat
                    )
                    barCovers.push({
                      caseIDs,
                      class: `bar-cover ${primeCat} ${secCatKey} ${exPrimeCatKey} ${exSecCatKey} ${legendCat}`,
                      primeCat, secCat, primeSplitCat, secSplitCat, legendCat,
                      x: x.toString(), y: y.toString(),
                      width: barWidth.toString(), height: barHeight.toString()
                    })
                  }
                  minInCell = maxInCell
                })
              } else {
                const maxInCell = bins[primeCat]?.[secCatKey]?.[exPrimeCatKey]?.[exSecCatKey] ?? 0
                const { x, y, barWidth, barHeight } = barCoverDimensions({
                  subPlotCells, cellIndices: cellData.cell, layout, primCatsCount, maxInCell
                })
                const caseIDs = dataConfig.getCasesForCategoryValues(
                  primaryAttrRole, primeCat, secCat, primeSplitCat, secSplitCat
                )
                barCovers.push({
                  caseIDs,
                  class: `bar-cover ${primeCat} ${secCatKey} ${exPrimeCatKey} ${exSecCatKey}`,
                  primeCat, secCat, primeSplitCat, secSplitCat,
                  x: x.toString(), y: y.toString(),
                  width: barWidth.toString(), height: barHeight.toString()
                })
              }
            })
          })
        })
      })
      renderBarCovers({ barCovers, barCoversRef, dataConfig, primaryAttrRole })
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

  return (
    <>
      {abovePointsGroupRef?.current && createPortal(
        <g ref={barCoversRef}/>,
        abovePointsGroupRef.current
      )}
    </>
  )
})
