import {ScaleBand, select} from "d3"
import React, {memo, useCallback, useEffect} from "react"
import {PlotProps, transitionDuration} from "../graphing-types"
import {usePlotResponders} from "../hooks/graph-hooks"
import {useDataConfigurationContext} from "../hooks/use-data-configuration-context"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {useGraphLayoutContext} from "../models/graph-layout"
import {setPointSelection} from "../utilities/graph_utils"
import {IGraphModel} from "../models/graph-model"
import {attrPlaceToAxisPlace} from "../models/axis-model"

interface IProps {
  graphModel: IGraphModel
  plotProps: PlotProps
}

type BinMap = Record<string, Record<string, number>>

export const ChartDots = memo(function ChartDots(props: IProps) {
  const {graphModel, plotProps: {dotsRef, enableAnimation}} = props,
    dataConfig = useDataConfigurationContext(),
    cases = dataConfig?.cases || [],
    dataset = useDataSetContext(),
    layout = useGraphLayoutContext(),
    primaryAttrPlace = dataConfig?.primaryPlace ?? 'x',
    primaryAxisPlace = attrPlaceToAxisPlace[primaryAttrPlace] ?? 'bottom',
    primaryIsBottom = primaryAxisPlace === 'bottom',
    primaryAttrID = dataConfig?.attributeID(primaryAttrPlace),
    secondaryAttrPlace = primaryAttrPlace === 'x' ? 'y' : 'x',
    secondaryAxisPlace = attrPlaceToAxisPlace[secondaryAttrPlace] ?? 'left',
    secondaryAttrID = dataConfig?.attributeID(secondaryAttrPlace),
    primaryScale = layout.axisScale(primaryAxisPlace) as ScaleBand<string>,
    secondaryScale = layout.axisScale(secondaryAxisPlace) as ScaleBand<string>

  const computeMaxOverAllCells = useCallback(() => {
    const valuePairs = cases.map(caseID => {
        return {
          primary: (primaryAttrID && dataset?.getValue(caseID, primaryAttrID)) ?? '',
          secondary: (secondaryAttrID && dataset?.getValue(caseID, secondaryAttrID)) ?? '__main__'
        }
      }),
      bins: BinMap = {}
    valuePairs?.forEach(aValue => {
      if (bins[aValue.primary] === undefined) {
        bins[aValue.primary] = {}
      }
      if (bins[aValue.primary][aValue.secondary] === undefined) {
        bins[aValue.primary][aValue.secondary] = 0
      }
      bins[aValue.primary][aValue.secondary]++
    })
    return Object.keys(bins).reduce((hMax, hKey) => {
      return Math.max(hMax, Object.keys(bins[hKey]).reduce((vMax, vKey) => {
        return Math.max(vMax, bins[hKey][vKey])
      }, 0))
    }, 0)
  }, [cases, dataset, primaryAttrID, secondaryAttrID])

  const refreshPointSelection = useCallback(() => {
    setPointSelection({
      dotsRef, dataset, pointRadius: graphModel.getPointRadius(),
      selectedPointRadius: graphModel.getPointRadius('select')
    })
  }, [dataset, dotsRef, graphModel])

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
    // We're pretending that the primaryPlace is the bottom just to help understand the naming
    const
      primaryCategoriesArray: string[] = dataConfig ? Array.from(dataConfig.categorySetForPlace(primaryAttrPlace)) : [],
      secondaryCategoriesArray: string[] = dataConfig ?
        Array.from(dataConfig.categorySetForPlace(secondaryAttrPlace)) : [],
      pointDiameter = 2 * graphModel.getPointRadius(),
      selection = select(dotsRef.current).selectAll(selectedOnly ? '.graph-dot-highlighted' : '.graph-dot'),
      duration = enableAnimation.current ? transitionDuration : 0,
      primaryCellWidth = primaryScale.bandwidth(),
      primaryHeight = secondaryScale.bandwidth ? secondaryScale.bandwidth() :
        layout.axisLength(secondaryAxisPlace),
      categoriesMap: Record<string, Record<string, { cell: { h: number, v: number }, numSoFar: number }>> = {}

    const computeCellParams = () => {
        primaryCategoriesArray.forEach((primeCat, i) => {
          if( !categoriesMap[primeCat]) {
            categoriesMap[primeCat] = {}
          }
          secondaryCategoriesArray.forEach((secCat, j) => {
            categoriesMap[primeCat][secCat] = {cell: {h: i, v: j}, numSoFar: 0}
          })
        })

        const
          secondaryGap = 5,
          maxInCell = computeMaxOverAllCells(),
          allowedPointsPerColumn = Math.max(1, Math.floor((primaryHeight - secondaryGap) / pointDiameter)),
          primaryGap = 18,
          allowedPointsPerRow = Math.max(1, Math.floor((primaryCellWidth - primaryGap) / pointDiameter)),
          numPointsInRow = Math.max(1, Math.min(allowedPointsPerRow,
            Math.ceil(maxInCell / allowedPointsPerColumn))),
          actualPointsPerColumn = Math.ceil(maxInCell / numPointsInRow),
          overlap = -Math.max(0, ((actualPointsPerColumn + 1) * pointDiameter - primaryHeight) /
            actualPointsPerColumn)
        return {numPointsInRow, overlap}
      },
      cellParams = computeCellParams(),

      buildMapOfIndicesByCase = () => {
        const indices: Record<string, { cell: { h: number, v: number }, row: number, column: number }> = {}
        primaryAttrID && cases.forEach(anID => {
          const hCat = dataset?.getValue(anID, primaryAttrID),
            vCat = secondaryAttrID ? dataset?.getValue(anID, secondaryAttrID) : '__main__',
            mapEntry = categoriesMap[hCat][vCat],
            numInCell = mapEntry.numSoFar++,
            row = Math.floor(numInCell / cellParams.numPointsInRow),
            column = numInCell % cellParams.numPointsInRow
          indices[anID] = {cell: mapEntry.cell, row, column}
        })
        return indices
      },
      onComplete = enableAnimation.current ? () => {
        enableAnimation.current = false
      } : undefined,
      cellIndices = buildMapOfIndicesByCase(),
      baseCoord = primaryIsBottom ? 0 : layout.axisLength('left'),
      signForOffset = primaryIsBottom ? 1 : -1,
      primaryCenterKey = primaryIsBottom ? 'cx' : 'cy',
      secondaryCenterKey = primaryIsBottom ? 'cy' : 'cx'

    selection
      .transition()
      .duration(duration)
      .on('end', (id, i) => (i === selection.size() - 1) && onComplete?.())
      .attr(primaryCenterKey, (anID: string) => {
        if (cellIndices[anID]) {
          const {column} = cellIndices[anID],
            {h} = cellIndices[anID].cell
          return baseCoord + signForOffset * ((h + 0.5) * primaryCellWidth) + (column + 0.5) * pointDiameter -
            cellParams.numPointsInRow * pointDiameter / 2
        } else {
          return NaN
        }
      })
      .attr(secondaryCenterKey, (anID: string) => {
        if (cellIndices[anID]) {
          const {row} = cellIndices[anID],
            {v} = cellIndices[anID].cell
          return secondaryScale.range()[0] -
            signForOffset * (v * primaryHeight + (row + 0.5) * pointDiameter + row * cellParams.overlap)
        } else {
          return NaN
        }
      })
  }, [dataConfig, primaryAttrPlace, secondaryAttrPlace, graphModel, dotsRef,
            enableAnimation, primaryScale, primaryIsBottom, layout, secondaryAxisPlace,
            computeMaxOverAllCells, primaryAttrID, secondaryAttrID, dataset, secondaryScale])

  useEffect(() => {
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
