import {ScaleBand} from "d3"
import React, {useCallback} from "react"
import {CaseData, selectDots} from "../d3-types"
import {attrRoleToAxisPlace, PlotProps} from "../graphing-types"
import {usePlotResponders} from "../hooks/use-plot"
import {useDataConfigurationContext} from "../hooks/use-data-configuration-context"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {useGraphLayoutContext} from "../models/graph-layout"
import {setPointCoordinates, setPointSelection} from "../utilities/graph-utils"
import {useGraphModelContext} from "../models/graph-model"

type BinMap = Record<string, Record<string, Record<string, Record<string, number>>>>

export const ChartDots = function ChartDots(props: PlotProps) {
  const {dotsRef, enableAnimation} = props,
    graphModel = useGraphModelContext(),
    {pointColor, pointStrokeColor} = graphModel,
    dataConfiguration = useDataConfigurationContext(),
    dataset = useDataSetContext(),
    layout = useGraphLayoutContext(),
    primaryAttrRole = dataConfiguration?.primaryRole ?? 'x',
    primaryAxisPlace = attrRoleToAxisPlace[primaryAttrRole] ?? 'bottom',
    primaryIsBottom = primaryAxisPlace === 'bottom',
    secondaryAttrRole = primaryAttrRole === 'x' ? 'y' : 'x',
    extraPrimaryAttrRole = primaryAttrRole === 'x' ? 'topSplit' : 'rightSplit',
    extraSecondaryAttrRole = primaryAttrRole === 'x' ? 'rightSplit' : 'topSplit'

  /**
   * Compute the maximum number of points in any cell of the grid. The grid has four
   * dimensions: primary, secondary, extraPrimary, and extraSecondary.
   * (Seems like there ought to be a more straightforward way to do this.)
   */
  const computeMaxOverAllCells = useCallback(() => {
    const primAttrID = dataConfiguration?.attributeID(primaryAttrRole) ?? '',
      secAttrID = dataConfiguration?.attributeID(secondaryAttrRole) ?? '',
      extraPrimAttrID = dataConfiguration?.attributeID(extraPrimaryAttrRole) ?? '',
      extraSecAttrID = dataConfiguration?.attributeID(extraSecondaryAttrRole) ?? '',
      valueQuads = (dataConfiguration?.caseDataArray || []).map((aCaseData: CaseData) => {
        return {
          primary: (primAttrID && dataset?.getValue(aCaseData.caseID, primAttrID)) ?? '',
          secondary: (secAttrID && dataset?.getValue(aCaseData.caseID, secAttrID)) ?? '__main__',
          extraPrimary: (extraPrimAttrID && dataset?.getValue(aCaseData.caseID, extraPrimAttrID)) ?? '__main__',
          extraSecondary: (extraSecAttrID && dataset?.getValue(aCaseData.caseID, extraSecAttrID)) ?? '__main__'
        }
      }),
      bins: BinMap = {}
    valueQuads?.forEach((aValue: any) => {
      if (bins[aValue.primary] === undefined) {
        bins[aValue.primary] = {}
      }
      if (bins[aValue.primary][aValue.secondary] === undefined) {
        bins[aValue.primary][aValue.secondary] = {}
      }
      if (bins[aValue.primary][aValue.secondary][aValue.extraPrimary] === undefined) {
        bins[aValue.primary][aValue.secondary][aValue.extraPrimary] = {}
      }
      if (bins[aValue.primary][aValue.secondary][aValue.extraPrimary][aValue.extraSecondary] === undefined) {
        bins[aValue.primary][aValue.secondary][aValue.extraPrimary][aValue.extraSecondary] = 0
      }
      bins[aValue.primary][aValue.secondary][aValue.extraPrimary][aValue.extraSecondary]++
    })
    // Now find and return the maximum value in the bins
    return Object.keys(bins).reduce((hMax, hKey) => {
      return Math.max(hMax, Object.keys(bins[hKey]).reduce((vMax, vKey) => {
        return Math.max(vMax, Object.keys(bins[hKey][vKey]).reduce((epMax, epKey) => {
          return Math.max(epMax, Object.keys(bins[hKey][vKey][epKey]).reduce((esMax, esKey) => {
            return Math.max(esMax, bins[hKey][vKey][epKey][esKey])
          }, 0))
        }, 0))
      }, 0))
    }, 0)
  }, [dataset, dataConfiguration, extraPrimaryAttrRole, extraSecondaryAttrRole,
    primaryAttrRole, secondaryAttrRole])

  const refreshPointSelection = useCallback(() => {
    dataConfiguration && setPointSelection({
      pointColor, pointStrokeColor, dotsRef, dataConfiguration,
      pointRadius: graphModel.getPointRadius(), selectedPointRadius: graphModel.getPointRadius('select')
    })
  }, [dataConfiguration, dotsRef, graphModel, pointColor, pointStrokeColor])

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
    // We're pretending that the primaryRole is the bottom just to help understand the naming
    const
      secondaryAxisPlace = attrRoleToAxisPlace[secondaryAttrRole] ?? 'left',
      extraPrimaryAxisPlace = attrRoleToAxisPlace[extraPrimaryAttrRole] ?? 'top',
      extraSecondaryAxisPlace = attrRoleToAxisPlace[extraSecondaryAttrRole] ?? 'rightCat',
      extraPrimaryAttrID = dataConfiguration?.attributeID(extraPrimaryAttrRole) ?? '',
      extraSecondaryAttrID = dataConfiguration?.attributeID(extraSecondaryAttrRole) ?? '',
      primCatsArray: string[] = (dataConfiguration && primaryAttrRole)
        ? Array.from(dataConfiguration.categoryArrayForAttrRole(primaryAttrRole)) : [],
      secCatsArray: string[] = (dataConfiguration && secondaryAttrRole)
        ? Array.from(dataConfiguration.categoryArrayForAttrRole(secondaryAttrRole)) : [],
      extraPrimCatsArray: string[] = (dataConfiguration && extraPrimaryAttrRole)
        ? Array.from(dataConfiguration.categoryArrayForAttrRole(extraPrimaryAttrRole)) : [],
      extraSecCatsArray: string[] = (dataConfiguration && extraSecondaryAttrRole)
        ? Array.from(dataConfiguration.categoryArrayForAttrRole(extraSecondaryAttrRole)) : [],
      pointDiameter = 2 * graphModel.getPointRadius(),
      selection = selectDots(dotsRef.current, selectedOnly),
      primOrdinalScale = layout.getAxisScale(primaryAxisPlace) as ScaleBand<string>,
      secOrdinalScale = layout.getAxisScale(secondaryAxisPlace) as ScaleBand<string>,
      extraPrimOrdinalScale = layout.getAxisScale(extraPrimaryAxisPlace) as ScaleBand<string>,
      extraSecOrdinalScale = layout.getAxisScale(extraSecondaryAxisPlace) as ScaleBand<string>,
      primaryCellWidth = ((primOrdinalScale.bandwidth?.()) ?? 0) /
        (dataConfiguration?.numRepetitionsForPlace(primaryAxisPlace) ?? 1),
      primaryHeight = (secOrdinalScale.bandwidth ? secOrdinalScale.bandwidth()
        : (secondaryAxisPlace ? layout.getAxisLength(secondaryAxisPlace) : 0)) /
            (dataConfiguration?.numRepetitionsForPlace(secondaryAxisPlace) ?? 1),
      extraPrimCellWidth = (extraPrimOrdinalScale.bandwidth?.()) ?? 0,
      extraSecCellWidth = (extraSecOrdinalScale.bandwidth?.()) ?? 0,
      catMap: Record<string, Record<string, Record<string, Record<string,
          { cell: { p: number, s: number, ep: number, es: number }, numSoFar: number }>>>> = {},
      legendAttrID = dataConfiguration?.attributeID('legend'),
      getLegendColor = legendAttrID ? dataConfiguration?.getLegendColorForCase : undefined

    if (!selection) return

    const computeCellParams = () => {
        primCatsArray.forEach((primeCat, i) => {
          if (!catMap[primeCat]) {
            catMap[primeCat] = {}
          }
          secCatsArray.forEach((secCat, j) => {
            if (!catMap[primeCat][secCat]) {
              catMap[primeCat][secCat] = {}
            }
            extraPrimCatsArray.forEach((exPrimeCat, k) => {
              if (!catMap[primeCat][secCat][exPrimeCat]) {
                catMap[primeCat][secCat][exPrimeCat] = {}
              }
              extraSecCatsArray.forEach((exSecCat, l) => {
                if (!catMap[primeCat][secCat][exPrimeCat][exSecCat]) {
                  catMap[primeCat][secCat][exPrimeCat][exSecCat] =
                    {cell: {p: i, s: j, ep: k, es: l}, numSoFar: 0}
                }
              })
            })
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
        const indices: Record<string, { cell: { p: number, s: number, ep:number, es:number },
            row: number, column: number }> = {},
          primaryAttrID = dataConfiguration?.attributeID(primaryAttrRole) ?? '',
          secondaryAttrID = dataConfiguration?.attributeID(secondaryAttrRole) ?? ''
        primaryAttrID && (dataConfiguration?.caseDataArray || []).forEach((aCaseData: CaseData) => {
          const anID = aCaseData.caseID,
            hCat = dataset?.getStrValue(anID, primaryAttrID),
            vCat = secondaryAttrID ? dataset?.getStrValue(anID, secondaryAttrID) : '__main__',
            extraHCat = extraPrimaryAttrID ? dataset?.getStrValue(anID, extraPrimaryAttrID) : '__main__',
            extraVCat = extraSecondaryAttrID ? dataset?.getStrValue(anID, extraSecondaryAttrID) : '__main__'
          if (hCat && vCat && extraHCat && extraVCat &&
            catMap[hCat] && catMap[hCat][vCat] && catMap[hCat][vCat][extraHCat] &&
            catMap[hCat][vCat][extraHCat][extraVCat]) {
            const mapEntry = catMap[hCat][vCat][extraHCat][extraVCat],
              numInCell = mapEntry.numSoFar++,
              row = Math.floor(numInCell / cellParams.numPointsInRow),
              column = numInCell % cellParams.numPointsInRow
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
        if (cellIndices[anID] && secOrdinalScale) {
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

    setPointCoordinates({
      dataset, pointRadius, selectedPointRadius: graphModel.getPointRadius('select'),
      dotsRef, selectedOnly, pointColor, pointStrokeColor,
      getScreenX, getScreenY, getLegendColor, enableAnimation
    })
  }, [dataConfiguration, primaryAxisPlace, primaryAttrRole, secondaryAttrRole, graphModel, dotsRef,
    extraPrimaryAttrRole, extraSecondaryAttrRole, pointColor,
    enableAnimation, primaryIsBottom, layout, pointStrokeColor, computeMaxOverAllCells, dataset])

  usePlotResponders({
    graphModel, layout, dotsRef, refreshPointPositions, refreshPointSelection, enableAnimation })

  return (
    <></>
  )
}
