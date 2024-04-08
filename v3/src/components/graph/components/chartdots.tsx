import {ScaleBand, ScaleLinear, select} from "d3"
import {mstReaction} from "../../../utilities/mst-reaction"
import React, {useCallback, useEffect, useRef} from "react"
import { createPortal } from "react-dom"
import {CaseData} from "../../data-display/d3-types"
import { IBarCover, PlotProps } from "../graphing-types"
import {usePlotResponders} from "../hooks/use-plot"
import {useGraphDataConfigurationContext} from "../hooks/use-graph-data-configuration-context"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {attrRoleToAxisPlace} from "../../data-display/data-display-types"
import {handleClickOnBar, setPointSelection} from "../../data-display/data-display-utils"
import {useDataDisplayAnimation} from "../../data-display/hooks/use-data-display-animation"
import {useGraphContentModelContext} from "../hooks/use-graph-content-model-context"
import {useGraphLayoutContext} from "../hooks/use-graph-layout-context"
import {setPointCoordinates} from "../utilities/graph-utils"
import { IDataConfigurationModel } from "../../data-display/models/data-configuration-model"
import { GraphLayout } from "../models/graph-layout"
import { AxisPlace } from "../../axis/axis-types"

interface IRenderBarCoverProps {
  barCovers: IBarCover[]
  barCoversRef: React.RefObject<SVGGElement>
  dataConfiguration: IDataConfigurationModel
  primaryAttrRole: "x" | "y"
}

interface IBarCoverDimensionsProps {
  cellIndices: { p: number, s: number, ep: number, es: number }
  layout: GraphLayout
  maxInCell: number
  numExtraSecondaryBands: number
  primaryAxisPlace: AxisPlace
  primaryIsBottom: boolean
  primCatsArray: string[]
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
  const { cellIndices, layout, maxInCell, numExtraSecondaryBands, primCatsArray,
    primaryAxisPlace, primaryIsBottom, secondaryAxisPlace, secondaryCellHeight } = props
  const { p: primeCatIndex, ep: extraPrimeCatIndex, es: extraSecCatIndex } = cellIndices
  const extraPrimaryPlace = primaryIsBottom ? "top" : "rightCat"
  const extraPrimaryAxisScale = layout.getAxisScale(extraPrimaryPlace) as ScaleBand<string>
  const secondaryAxisScale = layout.getAxisScale(secondaryAxisPlace) as ScaleLinear<number, number>
  const numExtraPrimaryBands = Math.max(1, extraPrimaryAxisScale?.domain().length ?? 1)
  const primaryCellWidth = layout.getAxisLength(primaryAxisPlace) / (primCatsArray.length ?? 1)
  const primarySubCellWidth = primaryCellWidth / numExtraPrimaryBands
  const offsetExtraPrimary = extraPrimeCatIndex * primaryCellWidth
  const primaryInvertedIndex = primCatsArray.length - 1 - primeCatIndex
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

export const ChartDots = function ChartDots(props: PlotProps) {
  const {abovePointsGroupRef, pixiPoints} = props,
    graphModel = useGraphContentModelContext(),
    {isAnimating} = useDataDisplayAnimation(),
    {pointColor, pointStrokeColor} = graphModel.pointDescription,
    dataConfiguration = useGraphDataConfigurationContext(),
    dataset = useDataSetContext(),
    layout = useGraphLayoutContext(),
    primaryAttrRole = dataConfiguration?.primaryRole ?? 'x',
    primaryAxisPlace = attrRoleToAxisPlace[primaryAttrRole] ?? 'bottom',
    primaryIsBottom = primaryAxisPlace === 'bottom',
    secondaryAttrRole = primaryAttrRole === 'x' ? 'y' : 'x',
    extraPrimaryAttrRole = primaryAttrRole === 'x' ? 'topSplit' : 'rightSplit',
    extraSecondaryAttrRole = primaryAttrRole === 'x' ? 'rightSplit' : 'topSplit',
    barCoversRef = useRef<SVGGElement>(null)

  const refreshPointSelection = useCallback(() => {
    dataConfiguration && setPointSelection({
      pixiPoints, pointColor, pointStrokeColor, dataConfiguration,
      pointRadius: graphModel.getPointRadius(), selectedPointRadius: graphModel.getPointRadius('select'),
      pointsFusedIntoBars: graphModel.pointsFusedIntoBars
    })
  }, [dataConfiguration, graphModel, pixiPoints, pointColor, pointStrokeColor])

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
    // We're pretending that the primaryRole is the bottom just to help understand the naming
    const
      secondaryAxisPlace = attrRoleToAxisPlace[secondaryAttrRole] ?? 'left',
      extraPrimaryAxisPlace = attrRoleToAxisPlace[extraPrimaryAttrRole] ?? 'top',
      extraSecondaryAxisPlace = attrRoleToAxisPlace[extraSecondaryAttrRole] ?? 'rightCat',
      extraPrimaryAttrID = dataConfiguration?.attributeID(extraPrimaryAttrRole) ?? '',
      extraSecondaryPlace = primaryIsBottom ? 'rightCat' : 'top',
      extraSecondaryAxisScale = layout.getAxisScale(extraSecondaryPlace) as ScaleBand<string>,
      extraSecondaryAttrID = dataConfiguration?.attributeID(extraSecondaryAttrRole) ?? '',
      numExtraSecondaryBands = Math.max(1, extraSecondaryAxisScale?.domain().length ?? 1),
      primCatsArray: string[] = (dataConfiguration && primaryAttrRole)
        ? Array.from(dataConfiguration.categoryArrayForAttrRole(primaryAttrRole)) : [],
      secCatsArray: string[] = (dataConfiguration && secondaryAttrRole)
        ? Array.from(dataConfiguration.categoryArrayForAttrRole(secondaryAttrRole)) : [],
      extraPrimCatsArray: string[] = (dataConfiguration && extraPrimaryAttrRole)
        ? Array.from(dataConfiguration.categoryArrayForAttrRole(extraPrimaryAttrRole)) : [],
      extraSecCatsArray: string[] = (dataConfiguration && extraSecondaryAttrRole)
        ? Array.from(dataConfiguration.categoryArrayForAttrRole(extraSecondaryAttrRole)) : [],
      pointDiameter = 2 * graphModel.getPointRadius(),
      primOrdinalScale = layout.getAxisScale(primaryAxisPlace) as ScaleBand<string>,
      secOrdinalScale = layout.getAxisScale(secondaryAxisPlace) as ScaleBand<string>,
      extraPrimOrdinalScale = layout.getAxisScale(extraPrimaryAxisPlace) as ScaleBand<string>,
      extraSecOrdinalScale = layout.getAxisScale(extraSecondaryAxisPlace) as ScaleBand<string>,
      primaryCellWidth = ((primOrdinalScale.bandwidth?.()) ?? 0) /
        (dataConfiguration?.numRepetitionsForPlace(primaryAxisPlace) ?? 1),
      primaryHeight = (secOrdinalScale.bandwidth ? secOrdinalScale.bandwidth()
          : (secondaryAxisPlace ? layout.getAxisLength(secondaryAxisPlace) : 0)) /
        (dataConfiguration?.numRepetitionsForPlace(secondaryAxisPlace) ?? 1),
      secondaryCellHeight = layout.getAxisLength(secondaryAxisPlace) / numExtraSecondaryBands,
      extraPrimCellWidth = (extraPrimOrdinalScale.bandwidth?.()) ?? 0,
      extraSecCellWidth = (extraSecOrdinalScale.bandwidth?.()) ?? 0,
      catMap: Record<string, Record<string, Record<string, Record<string,
        { cell: { p: number, s: number, ep: number, es: number }, numSoFar: number }>>>> = {},
      legendAttrID = dataConfiguration?.attributeID('legend'),
      getLegendColor = legendAttrID ? dataConfiguration?.getLegendColorForCase : undefined,
      secondaryAxisScale = layout.getAxisScale(secondaryAxisPlace) as ScaleLinear<number, number>

    const computeCellParams = () => {
        primCatsArray.forEach((primCat, i) => {
          if (!catMap[primCat]) {
            catMap[primCat] = {}
          }
          secCatsArray.forEach((secCat, j) => {
            if (!catMap[primCat][secCat]) {
              catMap[primCat][secCat] = {}
            }
            extraPrimCatsArray.forEach((exPrimeCat, k) => {
              if (!catMap[primCat][secCat][exPrimeCat]) {
                catMap[primCat][secCat][exPrimeCat] = {}
              }
              extraSecCatsArray.forEach((exSecCat, l) => {
                if (!catMap[primCat][secCat][exPrimeCat][exSecCat]) {
                  catMap[primCat][secCat][exPrimeCat][exSecCat] =
                    {cell: {p: i, s: j, ep: k, es: l}, numSoFar: 0}
                }
              })
            })
          })
        })

        const
          secondaryGap = graphModel.pointsFusedIntoBars ? 0 : 5,
          maxInCell = dataConfiguration?.maxOverAllCells(extraPrimaryAttrRole, extraSecondaryAttrRole) ?? 0,
          allowedPointsPerColumn = Math.max(1, Math.floor((primaryHeight - secondaryGap) / pointDiameter)),
          primaryGap = graphModel.pointsFusedIntoBars ? 0 : 18,
          allowedPointsPerRow = Math.max(1, Math.floor((primaryCellWidth - primaryGap) / pointDiameter)),
          numPointsInRow = graphModel.pointsFusedIntoBars ? 1 : Math.max(1, Math.min(allowedPointsPerRow,
            Math.ceil(maxInCell / allowedPointsPerColumn))),
          actualPointsPerColumn = Math.ceil(maxInCell / numPointsInRow),
          overlap = -Math.max(0, ((actualPointsPerColumn + 1) * pointDiameter - primaryHeight) /
            actualPointsPerColumn)
        return {numPointsInRow, overlap}
      },
      cellParams = computeCellParams(),

      buildMapOfIndicesByCase = () => {
        const indices: Record<string, {
            cell: { p: number, s: number, ep: number, es: number },
            row: number, column: number
          }> = {},
          primaryAttrID = dataConfiguration?.attributeID(primaryAttrRole) ?? '',
          secondaryAttrID = dataConfiguration?.attributeID(secondaryAttrRole) ?? ''
        primaryAttrID && (dataConfiguration?.caseDataArray || []).forEach((aCaseData: CaseData) => {
          const anID = aCaseData.caseID,
            hCat = dataset?.getStrValue(anID, primaryAttrID),
            vCat = secondaryAttrID ? dataset?.getStrValue(anID, secondaryAttrID) : '__main__',
            extraHCat = extraPrimaryAttrID ? dataset?.getStrValue(anID, extraPrimaryAttrID) : '__main__',
            extraVCat = extraSecondaryAttrID ? dataset?.getStrValue(anID, extraSecondaryAttrID) : '__main__'
          if (hCat && vCat && extraHCat && extraVCat &&
            catMap[hCat]?.[vCat]?.[extraHCat]?.[extraVCat]) {
            const mapEntry = catMap[hCat][vCat][extraHCat][extraVCat],
              numInCell = mapEntry.numSoFar++,
              row = Math.floor(numInCell / (graphModel.pointsFusedIntoBars ? 1 : cellParams.numPointsInRow)),
              column = graphModel.pointsFusedIntoBars ? 0 : numInCell % cellParams.numPointsInRow
            indices[anID] = {cell: mapEntry.cell, row, column}
          }
        })
        return indices
      },
      cellIndices = buildMapOfIndicesByCase(),
      baseCoord = primaryIsBottom ? 0 : layout.getAxisLength('left'),
      signForOffset = primaryIsBottom ? 1 : -1,
      pointRadius = graphModel.getPointRadius(),
      getPrimaryScreenCoord = (anID: string) => {
        if (cellIndices[anID]) {
          const {column} = cellIndices[anID],
            {p, ep} = cellIndices[anID].cell
          return baseCoord + signForOffset * ((p + 0.5) * primaryCellWidth + ep * extraPrimCellWidth) +
            (column + 0.5) * pointDiameter - cellParams.numPointsInRow * pointDiameter / 2
        } else {
          return 0
        }
      },
      getSecondaryScreenCoord = (anID: string) => {
        if (graphModel.pointsFusedIntoBars && cellIndices[anID]) {
          const {row} = cellIndices[anID],
            {s, es} = cellIndices[anID].cell
          const barHeight = Math.abs(secondaryAxisScale(1) - secondaryAxisScale(0)) / numExtraSecondaryBands
          const baseSecScreenCoord = secOrdinalScale.range()[0] -
            signForOffset * (s * primaryHeight + es * extraSecCellWidth +
              (row + .25) * barHeight)
          return primaryIsBottom ? baseSecScreenCoord - barHeight / 4 : baseSecScreenCoord + barHeight / 4
        } else if (cellIndices[anID] && secOrdinalScale) {
          const {row} = cellIndices[anID],
            {s, es} = cellIndices[anID].cell
          return secOrdinalScale.range()[0] -
            signForOffset * (s * primaryHeight + es * extraSecCellWidth +
              (row + 0.5) * pointDiameter + row * cellParams.overlap)
        } else {
          return 0
        }
      },
      getScreenX = primaryIsBottom ? getPrimaryScreenCoord : getSecondaryScreenCoord,
      getScreenY = primaryIsBottom ? getSecondaryScreenCoord : getPrimaryScreenCoord

      const getWidth = graphModel?.pointsFusedIntoBars
        ? () => primaryIsBottom
          ? primaryCellWidth / 2
          : (Math.abs(secondaryAxisScale(1) - secondaryAxisScale(0))) / numExtraSecondaryBands
        : undefined
      const getHeight = graphModel?.pointsFusedIntoBars
        ? () => primaryIsBottom
          ? (Math.abs(secondaryAxisScale(1) - secondaryAxisScale(0))) / numExtraSecondaryBands
          : primaryCellWidth / 2
        : undefined
      const pointDisplayType = graphModel?.pointsFusedIntoBars ? "bars" : "points"

    if (pixiPoints && dataConfiguration && graphModel?.pointsFusedIntoBars && abovePointsGroupRef?.current) {
      pixiPoints.displayType = pointDisplayType
      const barCovers: IBarCover[] = []
      const bins = dataConfiguration?.cellMap(extraPrimaryAttrRole, extraSecondaryAttrRole) ?? {}
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
                primCatsArray, primaryIsBottom, secondaryAxisPlace, secondaryCellHeight, maxInCell
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
      renderBarCovers({ barCovers, barCoversRef, dataConfiguration, primaryAttrRole })
    }

    setPointCoordinates({
      dataset, pointRadius, selectedPointRadius: graphModel.getPointRadius('select'),
      pixiPoints, selectedOnly, pointColor, pointStrokeColor, pointDisplayType,
      getScreenX, getScreenY, getLegendColor, getAnimationEnabled: isAnimating, getWidth, getHeight,
      pointsFusedIntoBars: graphModel?.pointsFusedIntoBars
    })
  }, [secondaryAttrRole, extraPrimaryAttrRole, extraSecondaryAttrRole, dataConfiguration, primaryIsBottom,
      layout, primaryAttrRole, graphModel, primaryAxisPlace, abovePointsGroupRef, dataset, pixiPoints,
      pointColor, pointStrokeColor, isAnimating])

  usePlotResponders({pixiPoints, refreshPointPositions, refreshPointSelection})
  
  useEffect(() => {
    if (pixiPoints) {
      pixiPoints.pointsFusedIntoBars = graphModel.pointsFusedIntoBars
    }
  }, [pixiPoints, graphModel.pointsFusedIntoBars])

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

  // when points are fused into bars, we need to set the secondary axis scale type to linear
  useEffect(function handleFuseIntoBars() {
    return mstReaction(
      () => graphModel.pointsFusedIntoBars,
      (pointsFusedIntoBars: boolean) => {
        if (pointsFusedIntoBars) {
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
      {graphModel?.pointsFusedIntoBars && abovePointsGroupRef?.current && createPortal(
        <g ref={barCoversRef}/>,
        abovePointsGroupRef.current
      )}
    </>
  )
}
