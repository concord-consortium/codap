import {ScaleBand, select} from "d3"
import React, {memo, useCallback, useRef} from "react"
import {defaultRadius, transitionDuration} from "../graphing-types"
import {usePlotResponders} from "../hooks/graph-hooks"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {ScaleType, useGraphLayoutContext} from "../models/graph-layout"
import {setPointSelection} from "../utilities/graph_utils"

export const ChartDots = memo(function ChartDots(props: {
  casesRef: React.MutableRefObject<string[]>,
  xAttrID: string,
  dotsRef: React.RefObject<SVGSVGElement>
  enableAnimation: React.MutableRefObject<boolean>
}) {

  useInstanceIdContext()
  const {casesRef, dotsRef, enableAnimation, xAttrID} = props,
    dataset = useDataSetContext(),
    layout = useGraphLayoutContext(),
    xScale = layout.axisScale('bottom') as ScaleType,
    yScale = layout.axisScale('left') as ScaleType,
    attribute = dataset?.attrFromID(xAttrID),
    categories = Array.from(new Set(attribute?.strValues)),
    categoriesMapRef = useRef< { [index: string]: { cell: number, numSoFar: number } }>({})

  const computeMaxOverAllCells = useCallback(() => {
    const values = attribute?.strValues,
      bins: { [index: string]: number } = {}
    values?.forEach(aValue => {
      if (bins[aValue] === undefined) {
        bins[aValue] = 0
      }
      bins[aValue]++
    })
    return Number((Object.keys(bins) as Array<keyof typeof bins>).reduce((max: number, aKey) => {
      max = Math.max(max, bins[aKey])
      return max
    }, 0))
  }, [attribute])

  const refreshPointSelection = useCallback(() => {
    setPointSelection({dotsRef, dataset})
  }, [dataset, dotsRef])

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
    const
      selection = select(dotsRef.current).selectAll(selectedOnly ? '.graph-dot-highlighted' : '.graph-dot'),
      duration = enableAnimation.current ? transitionDuration : 0,
      onComplete = enableAnimation.current ? () => {
        enableAnimation.current = false
      } : undefined,
      cellWidth = (xScale as ScaleBand<string>).bandwidth(),
      pointDiameter = 2 * defaultRadius

    const computeCellParams = () => {
        categories.forEach((cat, i) => {
          categoriesMapRef.current[cat] = {cell: i, numSoFar: 0}
        })

        const cellHeight = layout.axisLength('left'),
          maxInCell = computeMaxOverAllCells(),
          allowedPointsPerColumn = Math.max(1, Math.floor(cellHeight / pointDiameter)),
          allowedPointsPerRow = Math.max(1, Math.floor(cellWidth / pointDiameter)),
          numPointsInRow = Math.max(1, Math.min(allowedPointsPerRow,
            Math.ceil(maxInCell / allowedPointsPerColumn))),
          actualPointsPerColumn = Math.ceil(maxInCell / numPointsInRow),
          overlap = Math.max(0, ((actualPointsPerColumn + 1) * pointDiameter - cellHeight) /
            actualPointsPerColumn)
        return {numPointsInRow, overlap}
      },
      cellParams = computeCellParams(),

      buildMapOfIndicesByCase = () => {
        const indices: { [index: string]: { cell: number, row: number, column: number } } = {}
        casesRef.current.forEach(anID => {
          const cat = dataset?.getValue(anID, xAttrID),
            cell = categoriesMapRef.current[cat].cell,
            numInCell = categoriesMapRef.current[cat].numSoFar++,
            row = Math.floor(numInCell / cellParams.numPointsInRow),
            column = numInCell % cellParams.numPointsInRow
          indices[anID] = {cell, row, column}
        })
        return indices
      },
      cellIndices = buildMapOfIndicesByCase()

    selection
      .transition()
      .duration(duration)
      .on('end', (id, i) => (i === selection.size() - 1) && onComplete?.())
      .attr('cx', (anID: string) => {
        if(cellIndices[anID]) {
          const {cell, column} = cellIndices[anID]
          return (cell + 0.5) * cellWidth + (column + 0.5) * pointDiameter -
            cellParams.numPointsInRow * pointDiameter / 2
        }
        else {
          return NaN
        }
      })
      .attr('cy', (anID: string) => {
        if(cellIndices[anID]) {
          const {row} = cellIndices[anID]
          return yScale.range()[0] - (row + 0.5) * pointDiameter + row * cellParams.overlap
        }
        else {
          return NaN
        }
      })
  }, [dotsRef, enableAnimation, xScale, yScale, dataset, xAttrID, casesRef,
    layout, categories, categoriesMapRef, computeMaxOverAllCells])

  usePlotResponders({
    dataset, layout, refreshPointPositions, refreshPointSelection, enableAnimation
  })

  return (
    <></>
  )
})
