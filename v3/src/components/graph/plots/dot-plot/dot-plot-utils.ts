/*
 * This file contains utility functions for dot plot components.
 */

import { ScaleBand, ScaleLinear, max, range } from "d3"
import { IDataSet } from "../../../../models/data/data-set"
import { AxisPlace } from "../../../axis/axis-types"
import { CaseData } from "../../../data-display/d3-types"
import { GraphAttrRole, kMain } from "../../../data-display/data-display-types"
import { dataDisplayGetNumericValue } from "../../../data-display/data-display-value-utils"
import { IGraphDataConfigurationModel } from "../../models/graph-data-configuration-model"
import { GraphLayout } from "../../models/graph-layout"
import { SubPlotCells } from "../../models/sub-plot-cells"
import { BinDetails } from "../binned-dot-plot/bin-details"

export interface IComputeBinPlacements {
  binDetails?: BinDetails
  dataConfig?: IGraphDataConfigurationModel
  dataset?: IDataSet
  extraPrimaryAttrID: string
  extraPrimaryRole: GraphAttrRole
  extraSecondaryAttrID: string
  extraSecondaryRole: GraphAttrRole
  layout: GraphLayout
  numExtraPrimaryBands: number
  pointDiameter: number
  primaryAttrID: string
  primaryAxisScale: ScaleLinear<number, number>
  primaryPlace: AxisPlace
  secondaryAttrID: string
  secondaryAttrRole: GraphAttrRole
  secondaryBandwidth: number
}

export type BinMap = {
  category: string
  extraCategory: string
  extraPrimaryCategory: string
  indexInBin: number
}

export interface IComputePrimaryCoord {
  anID: string
  binDetails?: BinDetails
  dataConfig?: IGraphDataConfigurationModel
  dataset?: IDataSet
  extraPrimaryAttrID: string
  extraPrimaryAxisScale: ScaleBand<string>
  extraPrimaryRole: GraphAttrRole
  numExtraPrimaryBands: number
  primaryAttrID: string
  primaryAxisScale: ScaleLinear<number, number>
}

export interface IComputeSecondaryCoord {
  baseCoord: number
  dataConfig?: IGraphDataConfigurationModel
  extraSecondaryAxisScale: ScaleBand<string>
  extraSecondaryBandwidth: number
  extraSecondaryCat: string
  indexInBin: number
  isHistogram?: boolean
  layout?: GraphLayout
  numExtraSecondaryBands: number
  overlap: number
  numPointsInRow?: number
  pointDiameter: number
  primaryIsBottom: boolean
  secondaryAxisExtent: number
  secondaryAxisScale: ScaleBand<string>
  secondaryBandwidth: number
  secondaryCat: string
  secondarySign: number
}

export interface IAdjustCoordForStacks {
  anID: string
  axisType: string,
  binForCase: number,
  binMap: Record<string, BinMap>
  bins: Record<string, Record<string, Record<string, string[][]>>>
  pointDiameter: number
  secondaryBandwidth: number
  screenCoord: number
  primaryIsBottom: boolean
  indexInBin: number
  numPointsInRow: number
}

const computeRowAndColumn = (indexInBin: number, numPointsInRow: number) => {
  const row = Math.floor(indexInBin / numPointsInRow)
  const column = indexInBin % numPointsInRow
  return { row, column }
}

/*
 * Returns a point's coordinate on the primary axis in a dot plot, binned dot plot, or histogram. It takes into
 * account the primary and extra primary axis scales, the extra primary bandwidth, and the number of bins (if any).
 */
export const computePrimaryCoord = (props: IComputePrimaryCoord) => {
  const { anID, binDetails, dataConfig, dataset, extraPrimaryAttrID, extraPrimaryAxisScale,
          extraPrimaryRole, numExtraPrimaryBands, primaryAttrID, primaryAxisScale } = props
  const caseValue = dataDisplayGetNumericValue(dataset, anID, primaryAttrID) ?? NaN
  const binNumber = binDetails?.getBinForValue(caseValue)
  const binMidpoint = binDetails?.getBinMidpoint(binNumber)
  const primaryValue = binMidpoint ?? caseValue
  const primaryCoord = primaryAxisScale(primaryValue) / numExtraPrimaryBands
  // Bucket overflow categories into kOther so the band scale lookup hits the OTHER position
  // rather than returning undefined and falling back to 0 (left edge).
  const extraPrimaryValue = extraPrimaryAttrID
    ? dataConfig?.categoricalValueForCaseInRole(anID, extraPrimaryRole)
        ?? dataset?.getStrValue(anID, extraPrimaryAttrID)
    : undefined
  const extraPrimaryCoord = extraPrimaryValue && extraPrimaryValue !== kMain
    ? extraPrimaryAxisScale(extraPrimaryValue) ?? 0
    : 0
  return { primaryCoord, extraPrimaryCoord }
}

/*
 * Returns a point's coordinate on the secondary axis in a dot plot, binned dot plot, or histogram. It takes into
 * account the primary and secondary axis scales, the primary and secondary bandwidths, the number of extra secondary
 * bands, the overlap between points, the point diameter, and the primaryIsBottom flag.
 */
export const computeSecondaryCoord = (props: IComputeSecondaryCoord) => {
  const { baseCoord, dataConfig, extraSecondaryAxisScale, extraSecondaryBandwidth, extraSecondaryCat, indexInBin,
          layout, numExtraSecondaryBands, overlap, numPointsInRow = 1,
          pointDiameter, primaryIsBottom, secondaryAxisExtent,
          secondaryAxisScale, secondaryBandwidth, secondaryCat, secondarySign, isHistogram = false } = props
  let catCoord = (
    !!secondaryCat && secondaryCat !== kMain
      ? secondaryAxisScale(secondaryCat) ?? 0
      : 0
    ) / numExtraSecondaryBands
  let extraCoord = !!extraSecondaryCat && extraSecondaryCat !== kMain
    ? (extraSecondaryAxisScale(extraSecondaryCat) ?? 0) : 0

  const subPlotCells = layout && new SubPlotCells(layout, dataConfig)
  const secondaryNumericUnitLength = subPlotCells ? subPlotCells.secondaryNumericUnitLength : 0
  const { row } = computeRowAndColumn(indexInBin, numPointsInRow)
  if (primaryIsBottom) {
    extraCoord = secondaryAxisExtent - extraSecondaryBandwidth - extraCoord
    catCoord = extraSecondaryBandwidth - secondaryBandwidth - catCoord
    return isHistogram
      ? baseCoord - catCoord - extraCoord - secondaryNumericUnitLength / 2 - indexInBin * secondaryNumericUnitLength
      : baseCoord - catCoord - extraCoord - pointDiameter / 2 - row * (pointDiameter - overlap)
  } else {
    return isHistogram && secondaryNumericUnitLength
      ? baseCoord + extraCoord + secondarySign *
          (catCoord + secondaryNumericUnitLength / 2 + indexInBin * secondaryNumericUnitLength)
      : baseCoord + extraCoord + secondarySign * (catCoord + pointDiameter / 2 + row * (pointDiameter - overlap))
  }
}

/*
 * Returns bins, binMap, overlap and numPointsPerRow values.
 */
export const computeBinPlacements = (props: IComputeBinPlacements) => {
  const { binDetails, dataConfig, dataset, extraPrimaryAttrID, extraPrimaryRole, extraSecondaryAttrID,
          extraSecondaryRole, layout, numExtraPrimaryBands, pointDiameter, primaryAttrID, primaryAxisScale,
          primaryPlace, secondaryAttrID, secondaryAttrRole, secondaryBandwidth } = props
  const primaryLength = layout.getAxisLength(primaryPlace) / numExtraPrimaryBands
  const numBins = binDetails?.totalNumberOfBins || Math.ceil(primaryLength / pointDiameter) + 1
  const binWidth = binDetails?.binWidth || primaryLength / (numBins - 1)
  const primaryBandwidth = primaryLength / numBins
  const kPrimaryGap = 6
  const kSecondaryGap = 5
  const allowedPointsPerRow = Math.max(1, Math.floor((primaryBandwidth - kPrimaryGap) / pointDiameter))
  const allowedPointsPerColumn = Math.max(1, Math.floor((secondaryBandwidth - kSecondaryGap) / pointDiameter))
  let overlap = 0
  let numPointsInRow = 1
  const bins: Record<string, Record<string, Record<string, string[][]>>> = {}
  const binMap: Record<string, BinMap> = {}

  if (primaryAxisScale && pointDiameter > 0) {
    dataConfig?.getCaseDataArray(0).forEach((aCaseData: CaseData) => {
      const anID = aCaseData.caseID
      const caseValue = dataDisplayGetNumericValue(dataset, anID, primaryAttrID) ?? -1
      const numerator = primaryAxisScale(caseValue) / numExtraPrimaryBands
      const bin = binDetails?.totalNumberOfBins
        ? binDetails.getBinForValue(caseValue) ?? 0
        : Math.ceil((numerator ?? 0) / binWidth)
      // Use categoricalValueForCaseInRole so overflow values land in kOther to match the band scale's domain.
      const category = secondaryAttrID
        ? dataConfig?.categoricalValueForCaseInRole(anID, secondaryAttrRole) ?? kMain : kMain
      const extraCategory = extraSecondaryAttrID
        ? dataConfig?.categoricalValueForCaseInRole(anID, extraSecondaryRole) ?? kMain : kMain
      const extraPrimaryCategory = extraPrimaryAttrID
        ? dataConfig?.categoricalValueForCaseInRole(anID, extraPrimaryRole) ?? kMain : kMain

      if (!bins[category]) {
        bins[category] = {}
      }
      if (!bins[category][extraCategory]) {
        bins[category][extraCategory] = {}
      }
      if (!bins[category][extraCategory][extraPrimaryCategory]) {
        bins[category][extraCategory][extraPrimaryCategory] = range(numBins + 1).map(() => [])
      }

      const binInRange = bin >= 0 && bin <= numBins
      const indexInBin = binInRange
        ? bins[category][extraCategory][extraPrimaryCategory][bin].length
        : 0

      binMap[anID] = { category, extraCategory, extraPrimaryCategory, indexInBin }

      if (binInRange) {
        bins[category][extraCategory][extraPrimaryCategory][bin].push(anID)
      }
    })

    // Compute the length of the record in bins with the most elements
    const maxInBin = max(Object.values(bins).map(anExtraBins => {
      return max(Object.values(anExtraBins).map(aBinArray => {
        return max(Object.values(aBinArray).map(aBin => {
          return max(aBin.map(innerArray => innerArray.length)) || 0
        })) || 0
      })) || 0
    })) || 0

    numPointsInRow = Math.max(1, Math.min(allowedPointsPerRow, Math.ceil(maxInBin / allowedPointsPerColumn)))
    const excessHeight = Math.max(0, 1 + (maxInBin / numPointsInRow) -
      Math.floor(secondaryBandwidth / pointDiameter)) * pointDiameter
    overlap = excessHeight / (maxInBin / numPointsInRow)
  }

  return { bins, binMap, overlap, numPointsInRow }
}

/*
 * Returns information about how to stack points in a binned dot plot so they don't extend beyond their containing cell.
 */
export const calculatePointStacking = (pointCount: number, pointDiameter: number, cellSize: number) => {
  let numberOfStacks = 1
  const maxPointsPerStack = Math.max(Math.floor(cellSize / pointDiameter), 1)
  while (maxPointsPerStack < pointCount && pointCount > numberOfStacks * maxPointsPerStack) {
    numberOfStacks++
  }

  return { maxPointsPerStack, numberOfStacks }
}

/*
 * Adjusts a given coordinate value for a point according to the point's location in a binned stack of points, taking
 * into account the number of stacks in the bin and that the stack group is always centered within the bin.
 */
export const adjustCoordForStacks = (props: IAdjustCoordForStacks) => {
  const { anID, axisType, binMap, pointDiameter, screenCoord,
    indexInBin, numPointsInRow } = props
  if (!binMap[anID]) return screenCoord

  let adjustedCoord = screenCoord

  if (axisType === "primary") {
    const { column } = computeRowAndColumn(indexInBin, numPointsInRow)
    const stackShift = (column - (numPointsInRow - 1) / 2) * pointDiameter
    adjustedCoord += stackShift
  }

  return adjustedCoord
}
