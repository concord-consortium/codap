import {ScaleBand, select} from "d3"
import React, {memo, useCallback, useEffect, useRef} from "react"
import {PlotProps, transitionDuration} from "../graphing-types"
import {usePlotResponders} from "../hooks/graph-hooks"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {ScaleType, useGraphLayoutContext} from "../models/graph-layout"
import {computedPointRadius, setPointSelection} from "../utilities/graph_utils"
import {IGraphModel} from "../models/graph-model"

interface IProps {
  graphModel:IGraphModel
  plotProps:PlotProps
}

export const ChartDots = memo(function ChartDots(props: IProps) {
  const {casesRef, dotsRef, enableAnimation, xAttrID, yAttrID} = props.plotProps,
    graphModel = props.graphModel,
    dataset = useDataSetContext(),
    layout = useGraphLayoutContext(),
    pointSizeMultiplier = graphModel.pointSizeMultiplier,
    xAttributeType = dataset?.attrFromID(xAttrID)?.type,
    // yAttributeType = dataset?.attrFromID(yAttrID)?.type,
    primaryPlace = xAttributeType === 'categorical' ? 'bottom' : 'left',
    primaryAttributeID = primaryPlace === 'left' ? yAttrID : xAttrID,
    secondaryPlace = primaryPlace === 'left' ? 'bottom' : 'left',
    primaryScale = layout.axisScale(primaryPlace) as ScaleBand<string>,
    secondaryScale = layout.axisScale(secondaryPlace) as ScaleType,
    attribute = dataset?.attrFromID(primaryAttributeID),
    categories = Array.from(new Set(attribute?.strValues)),
    categoriesMapRef = useRef<Record<string, { cell: number, numSoFar: number }>>({})

  const computeMaxOverAllCells = useCallback(() => {
    const values = attribute?.strValues,
      bins: Record<string, number> = {}
    values?.forEach(aValue => {
      if (bins[aValue] === undefined) {
        bins[aValue] = 0
      }
      bins[aValue]++
    })
    return Object.keys(bins).reduce((max, aKey) => Math.max(max, bins[aKey]), 0)
  }, [attribute])

  const refreshPointSelection = useCallback(() => {
    setPointSelection({dotsRef, dataset})
  }, [dataset, dotsRef])

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
    const
      numPoints = select(dotsRef.current).selectAll('.graph-dot').size(),
      pointDiameter = 2 * computedPointRadius(numPoints, pointSizeMultiplier),
      selection = select(dotsRef.current).selectAll(selectedOnly ? '.graph-dot-highlighted' : '.graph-dot'),
      duration = enableAnimation.current ? transitionDuration : 0,
      cellWidth = primaryScale.bandwidth()

    const computeCellParams = () => {
        categories.forEach((cat, i) => {
          categoriesMapRef.current[cat] = {cell: i, numSoFar: 0}
        })

        const cellHeight = layout.axisLength(secondaryPlace),
          maxInCell = computeMaxOverAllCells(),
          allowedPointsPerColumn = Math.max(1, Math.floor(cellHeight / pointDiameter)),
          allowedPointsPerRow = Math.max(1, Math.floor(cellWidth / pointDiameter)),
          numPointsInRow = Math.max(1, Math.min(allowedPointsPerRow,
            Math.ceil(maxInCell / allowedPointsPerColumn))),
          actualPointsPerColumn = Math.ceil(maxInCell / numPointsInRow),
          overlap = -Math.max(0, ((actualPointsPerColumn + 1) * pointDiameter - cellHeight) /
            actualPointsPerColumn)
        return {numPointsInRow, overlap}
      },
      cellParams = computeCellParams(),

      buildMapOfIndicesByCase = () => {
        const indices: { [index: string]: { cell: number, row: number, column: number } } = {}
        casesRef.current.forEach(anID => {
          const cat = dataset?.getValue(anID, primaryAttributeID),
            cell = categoriesMapRef.current[cat].cell,
            numInCell = categoriesMapRef.current[cat].numSoFar++,
            row = Math.floor(numInCell / cellParams.numPointsInRow),
            column = numInCell % cellParams.numPointsInRow
          indices[anID] = {cell, row, column}
        })
        return indices
      },
      onComplete = enableAnimation.current ? () => {
        enableAnimation.current = false
      } : undefined,
      cellIndices = buildMapOfIndicesByCase(),
      baseCoord = primaryPlace === 'bottom' ? 0 : layout.axisLength('left'),
      signForOffset = primaryPlace === 'bottom' ? 1 : -1,
      primaryCenterKey = primaryPlace === 'bottom' ? 'cx' : 'cy',
      secondaryCenterKey = primaryPlace === 'bottom' ? 'cy' : 'cx'

    selection
      .transition()
      .duration(duration)
      .on('end', (id, i) => (i === selection.size() - 1) && onComplete?.())
      .attr(primaryCenterKey, (anID: string) => {
        if(cellIndices[anID]) {
          const {cell, column} = cellIndices[anID]
          return baseCoord + signForOffset * ((cell + 0.5) * cellWidth) + (column + 0.5) * pointDiameter -
            cellParams.numPointsInRow * pointDiameter / 2
        }
        else {
          return NaN
        }
      })
      .attr(secondaryCenterKey, (anID: string) => {
        if(cellIndices[anID]) {
          const {row} = cellIndices[anID]
          return secondaryScale.range()[0] - signForOffset * ((row + 0.5) * pointDiameter + row * cellParams.overlap)
        }
        else {
          return NaN
        }
      })
  }, [dotsRef, pointSizeMultiplier, enableAnimation, primaryScale,
    secondaryScale, dataset, casesRef, primaryPlace, secondaryPlace,
    layout, categories, categoriesMapRef, computeMaxOverAllCells, primaryAttributeID])

  useEffect(()=>{
    select(dotsRef.current).on('click', (event) => {
      const element = select(event.target as SVGSVGElement)
      if (element.node()?.nodeName === 'circle') {
        const tItsID: string = element.property('id')
        const [, caseId] = tItsID.split("_")
        dataset?.selectCases([caseId])
      }
    })
  })

  usePlotResponders({
    dataset, layout, refreshPointPositions, refreshPointSelection, enableAnimation
  })

  return (
    <></>
  )
})
