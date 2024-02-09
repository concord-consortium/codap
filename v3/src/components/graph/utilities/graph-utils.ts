import {extent, format} from "d3"
import {isInteger} from "lodash"
import * as PIXI from "pixi.js"
import {IPixiPointMetadata, IPixiPointsRef} from "./pixi-points"
import {IDataSet} from "../../../models/data/data-set"
import {CaseData} from "../../data-display/d3-types"
import {Point, transitionDuration} from "../../data-display/data-display-types"
import {IAxisModel, isNumericAxisModel} from "../../axis/models/axis-model"
import {ScaleNumericBaseType} from "../../axis/axis-types"
import {defaultSelectedColor, defaultSelectedStroke, defaultSelectedStrokeWidth, defaultStrokeWidth}
  from "../../../utilities/color-utils"
import {IDataConfigurationModel} from "../../data-display/models/data-configuration-model"
import { isFiniteNumber } from "../../../utilities/math-utils"
import { IGraphDataConfigurationModel } from "../models/graph-data-configuration-model"
import { GraphLayout } from "../models/graph-layout"
import t from "../../../utilities/translation/translate"

/**
 * Utility routines having to do with graph entities
 */

/**
 * This function closely follows V2's CellLinearAxisModel:_computeBoundsAndTickGap
 */
export function computeNiceNumericBounds(min: number, max: number): { min: number, max: number } {

  function computeTickGap(iMin: number, iMax: number) {
    const range = (iMin >= iMax) ? Math.abs(iMin) : iMax - iMin,
      gap = range / 5
    if (gap === 0) {
      return 1
    }
    // We move to base 10, so we can get rid of the power of ten.
    const logTrial = Math.log(gap) / Math.LN10,
      floor = Math.floor(logTrial),
      power = Math.pow(10.0, floor)

    // Whatever is left is in the range 1 to 10. Choose desired number
    let base = Math.pow(10.0, logTrial - floor)

    if (base < 2) base = 1
    else if (base < 5) base = 2
    else base = 5

    return Math.max(power * base, Number.MIN_VALUE)
  }

  const kAddend = 5,  // amount to extend scale
    kFactor = 2.5,
    bounds = {min, max}
  if (min === max && min === 0) {
    bounds.min = -10
    bounds.max = 10
  } else if (min === max && isInteger(min)) {
    bounds.min -= kAddend
    bounds.max += kAddend
  } else if (min === max) {
    bounds.min = bounds.min + 0.1 * Math.abs(bounds.min)
    bounds.max = bounds.max - 0.1 * Math.abs(bounds.max)
  } else if (min > 0 && max > 0 && min <= max / kFactor) {  // Snap to zero
    bounds.min = 0
  } else if (min < 0 && max < 0 && max >= min / kFactor) {  // Snap to zero
    bounds.max = 0
  }
  const tickGap = computeTickGap(bounds.min, bounds.max)
  if (tickGap !== 0) {
    bounds.min = (Math.floor(bounds.min / tickGap) - 0.5) * tickGap
    bounds.max = (Math.floor(bounds.max / tickGap) + 1.5) * tickGap
  } else {
    bounds.min -= 1
    bounds.max += 1
  }
  return bounds
}

export function setNiceDomain(values: number[], axisModel: IAxisModel) {
  if (isNumericAxisModel(axisModel)) {
    const [minValue, maxValue] = extent(values, d => d) as [number, number]
    const {min: niceMin, max: niceMax} = computeNiceNumericBounds(minValue, maxValue)
    axisModel.setDomain(niceMin, niceMax)
  }
}

//  Return the two points in logical coordinates where the line with the given
//  iSlope and iIntercept intersects the rectangle defined by the upper and lower
//  bounds of the two axes.
export interface IAxisIntercepts {
  pt1: Point,
  pt2: Point
}

export function lineToAxisIntercepts(iSlope: number, iIntercept: number,
                                     xDomain: readonly number[], yDomain: readonly number[]): IAxisIntercepts {
  let tX1, tY1, tX2, tY2
  const tLogicalBounds = {
    left: xDomain[0],
    top: yDomain[1],
    right: xDomain[1],
    bottom: yDomain[0]
  }
  if (!isFinite(iSlope)) {
    tX1 = tX2 = iIntercept
    tY1 = tLogicalBounds.bottom
    tY2 = tLogicalBounds.top
  }
  // Things can get hairy for nearly horizontal or nearly vertical lines.
  // This conditional takes care of that.
  else if (Math.abs(iSlope) > 1) {
    tY1 = tLogicalBounds.bottom
    tX1 = (tY1 - iIntercept) / iSlope
    if (tX1 < tLogicalBounds.left) {
      tX1 = tLogicalBounds.left
      tY1 = iSlope * tX1 + iIntercept
    } else if (tX1 > tLogicalBounds.right) {
      tX1 = tLogicalBounds.right
      tY1 = iSlope * tX1 + iIntercept
    }

    tY2 = tLogicalBounds.top
    tX2 = (tY2 - iIntercept) / iSlope
    if (tX2 > tLogicalBounds.right) {
      tX2 = tLogicalBounds.right
      tY2 = iSlope * tX2 + iIntercept
    } else if (tX2 < tLogicalBounds.left) {
      tX2 = tLogicalBounds.left
      tY2 = iSlope * tX2 + iIntercept
    }
  } else {
    tX1 = tLogicalBounds.left
    tY1 = iSlope * tX1 + iIntercept
    if (tY1 < tLogicalBounds.bottom) {
      tY1 = tLogicalBounds.bottom
      tX1 = (tY1 - iIntercept) / iSlope
    } else if (tY1 > tLogicalBounds.top) {
      tY1 = tLogicalBounds.top
      tX1 = (tY1 - iIntercept) / iSlope
    }

    tX2 = tLogicalBounds.right
    tY2 = iSlope * tX2 + iIntercept
    if (tY2 > tLogicalBounds.top) {
      tY2 = tLogicalBounds.top
      tX2 = (tY2 - iIntercept) / iSlope
    } else if (tY2 < tLogicalBounds.bottom) {
      tY2 = tLogicalBounds.bottom
      tX2 = (tY2 - iIntercept) / iSlope
    }
  }

  // It is helpful to keep x1 < x2
  if (tX1 > tX2) {
    let tmp = tX1
    tX1 = tX2
    tX2 = tmp

    tmp = tY1
    tY1 = tY2
    tY2 = tmp
  }
  return {
    pt1: {x: tX1, y: tY1},
    pt2: {x: tX2, y: tY2}
  }
}

export function valueLabelString(value: number) {
  const float = format('.4~r')
  return float(value)
}

export function percentString(value: number) {
  return new Intl.NumberFormat("default", {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

function roundToSignificantDigits(value: number, sigDigits: number) {
  if (isNaN(value) || value === 0) {
    return { roundedValue: value, decPlaces: 0 }
  }

  const sign = value < 0 ? -1 : 1
  value = Math.abs(value)

  // Get the value in the range 10^(iSigDigits-1) to 10^iSigDigits.
  const lower = Math.pow(10, sigDigits - 1)
  const upper = lower * 10
  let adjustedPlaces = 0
  while (value > upper) {
    value = value / 10
    adjustedPlaces++
  }
  while (value < lower) {
    value = value * 10
    adjustedPlaces--
  }

  let newValue = Math.floor(value)
  if (value - newValue > 0.5) {
    newValue++
  }

  let counter = adjustedPlaces
  while (counter < 0) {
    newValue = newValue / 10
    counter++
  }

  if (adjustedPlaces < 0) {
    newValue = Number(newValue.toFixed(-adjustedPlaces))
  }

  while (counter > 0) {
    newValue = newValue * 10
    counter--
  }

  const roundedValue = sign * newValue
  const decPlaces = -adjustedPlaces

  return { roundedValue, decPlaces }
}

export function findNeededFractionDigits(slope: number, intercept: number, layout: GraphLayout) {
  const xScale = layout.getAxisScale("bottom") as ScaleNumericBaseType
  const yScale = layout.getAxisScale("left") as ScaleNumericBaseType
  const xDomain = xScale.domain()
  const yDomain = yScale.domain()
  const kMaxDigits = 12  // Never try for more than this
  let currCoords: IAxisIntercepts = {pt1: {x: 0, y: 0}, pt2: {x: 0, y: 0}}
  let trialCoords: IAxisIntercepts = {pt1: {x: 0, y: 0}, pt2: {x: 0, y: 0}}
  let tGreatestDiff = 0
  let interceptDigits = 2
  let slopeDigits = (slope < 0.001 && slope !== 0) ? Math.abs(Math.floor(Math.log10(Math.abs(slope)))) + 1 : 3

  function convertToScreen(iWorldPts: IAxisIntercepts) {
    return {
      pt1: { x: xScale(iWorldPts.pt1.x), y: yScale(iWorldPts.pt1.y) },
      pt2: { x: xScale(iWorldPts.pt2.x), y: yScale(iWorldPts.pt2.y) }
    }
  }

  function greatestDiff() {
    return Math.max(
      Math.abs(trialCoords.pt1.x - currCoords.pt1.x),
      Math.abs(trialCoords.pt1.y - currCoords.pt1.y),
      Math.abs(trialCoords.pt2.x - currCoords.pt2.x),
      Math.abs(trialCoords.pt2.y - currCoords.pt2.y)
    )
  }

  if (!isFiniteNumber(slope) || !isFiniteNumber(intercept)) {
    return { slopeDigits: 0, interceptDigits: 0 }
  }

  currCoords = convertToScreen(lineToAxisIntercepts(slope, intercept, xDomain, yDomain))

  function computeDigits(digits: number, isSlope: boolean) {
    do {
      const roundedValue = roundToSignificantDigits(isSlope ? slope : intercept, digits).roundedValue
      const slopeValue = isSlope ? roundedValue : slope
      const interceptValue = isSlope ? intercept : roundedValue
      trialCoords = convertToScreen(lineToAxisIntercepts(slopeValue, interceptValue, xDomain, yDomain))
      tGreatestDiff = greatestDiff()
      if (tGreatestDiff > 1.0) {
        digits += 1
      }
    } while (tGreatestDiff > 1.0 && digits < kMaxDigits)
    return digits
  }

  interceptDigits = computeDigits(interceptDigits, false)
  slopeDigits = computeDigits(slopeDigits, true)

  // So far we've computed the number of significant digits needed. But we need to return
  // the number of fractional digits.
  if (Math.abs(slope) > 1) {
    slopeDigits = Math.max(0, slopeDigits - Math.floor(Math.log(Math.abs(slope)) / Math.LN10) - 1)
  }
  if (Math.abs(intercept) > 1) {
    interceptDigits = Math.max(0, interceptDigits - Math.floor(Math.log(Math.abs(intercept)) / Math.LN10) - 1)
  }

  return { slopeDigits, interceptDigits }
}

function formatEquationValue(value: number, digits: number) {
  const exponent = `e${digits}`
  const roundedValue = Math.round(parseFloat(`${value}${exponent}`))
  // Use D3's format() to add comma separators to the value.
  return format(",")(Number(`${roundedValue}e-${digits}`))
}

interface IEquationString {
  attrNames: { x: string, y: string }
  intercept: number
  layout: GraphLayout
  slope: number
  sumOfSquares?: number
}

export function equationString({ slope, intercept, attrNames, sumOfSquares, layout }: IEquationString) {
  const slopeIsFinite = isFinite(slope) && slope !== 0
  const neededFractionDigits = findNeededFractionDigits(slopeIsFinite ? slope : 0, intercept, layout)
  const formattedIntercept = formatEquationValue(intercept, neededFractionDigits.interceptDigits)
  const formattedSlope = slopeIsFinite ? formatEquationValue(slope, neededFractionDigits.slopeDigits) : 0
  const squaresMaxDec = !sumOfSquares || sumOfSquares > 100 ? 0 : 3
  const formattedSumOfSquares = formatEquationValue(sumOfSquares || 0, squaresMaxDec)
  const xAttrString = attrNames.x.length > 1 ? `(<em>${attrNames.x}</em>)` : `<em>${attrNames.x}</em>`
  const interceptString = intercept !== 0 ? ` ${intercept > 0 ? "+" : ""} ${formattedIntercept}` : ""
  const squaresPart = isFiniteNumber(sumOfSquares)
    ? `<br />${t("DG.ScatterPlotModel.sumSquares")} = ${formattedSumOfSquares}`
    : ""

  return slopeIsFinite
    ? `<em>${attrNames.y}</em> = ${formattedSlope} ${xAttrString}${interceptString}${squaresPart}`
    : `<em>${slope === 0 ? attrNames.y : attrNames.x}</em> = ${formattedIntercept}`
}

interface ILsrlEquationString {
  attrNames: { x: string, y: string }
  caseValues: Point[]
  color?: string
  intercept: number
  interceptLocked?: boolean
  layout: GraphLayout
  rSquared?: number
  showConfidenceBands?: boolean
  slope: number
  sumOfSquares?: number
}

export const lsrlEquationString = (props: ILsrlEquationString) => {
  const { slope, intercept, attrNames, caseValues, showConfidenceBands, rSquared, color, interceptLocked=false,
          sumOfSquares, layout } = props
  const linearRegression = leastSquaresLinearRegression(caseValues, interceptLocked)
  const { count=0, sse=0, xSumSquaredDeviations=0 } = linearRegression
  const seSlope = Math.sqrt((sse / (count - 2)) / xSumSquaredDeviations)
  const slopeIsFinite = isFinite(slope) && slope !== 0
  const neededFractionDigits = findNeededFractionDigits(slopeIsFinite ? slope : 0, intercept, layout)
  const formattedIntercept = formatEquationValue(intercept, neededFractionDigits.interceptDigits)
  const formattedSlope = formatEquationValue(slope, neededFractionDigits.slopeDigits)
  const formattedSumOfSquares = formatEquationValue(sumOfSquares || 0, sumOfSquares && sumOfSquares > 100 ? 0 : 3)
  const formattedRSquared = formatEquationValue(rSquared || 0, 3)
  const formattedSeSlope = formatEquationValue(seSlope, 3)
  const xAttrString = attrNames.x.length > 1 ? `(<em>${attrNames.x}</em>)` : `<em>${attrNames.x}</em>`
  const interceptString = intercept !== 0 ? ` ${intercept > 0 ? "+" : ""} ${formattedIntercept}` : ""
  const equationPart = slopeIsFinite
    ? `<em>${attrNames.y}</em> = ${formattedSlope} ${xAttrString}${interceptString}`
    : `<em>${slope === 0 ? attrNames.y : attrNames.x}</em> = ${formattedIntercept}`
  const seSlopePart = showConfidenceBands && !interceptLocked ? `<br />SE<sub>slope</sub> = ${formattedSeSlope}` : ""
  const squaresPart = isFiniteNumber(sumOfSquares)
    ? `<br />${t("DG.ScatterPlotModel.sumSquares")} = ${formattedSumOfSquares}`
    : ""
  const rSquaredPart = rSquared == null ? "" : `<br />r<sup>2</sup> = ${formattedRSquared}`
  const style = color ? ` style="color: ${color}"` : ""

  return `<span${style}>${equationPart}${rSquaredPart}${seSlopePart}${squaresPart}</span>`
}


export function getScreenCoord(dataSet: IDataSet | undefined, id: string,
                               attrID: string, scale: ScaleNumericBaseType) {
  const value = dataSet?.getNumeric(id, attrID)
  return value != null && !isNaN(value) ? scale(value) : null
}

export interface ISetPointSelection {
  pixiPointsRef: IPixiPointsRef
  dataConfiguration: IDataConfigurationModel
  pointRadius: number,
  selectedPointRadius: number,
  pointColor: string,
  pointStrokeColor: string,
  getPointColorAtIndex?: (index: number) => string
}

export interface ISetPointCoordinates {
  dataset?: IDataSet
  pixiPointsRef: IPixiPointsRef
  selectedOnly?: boolean
  pointRadius: number
  selectedPointRadius: number
  pointColor: string
  pointStrokeColor: string
  getPointColorAtIndex?: (index: number) => string
  getScreenX: ((anID: string) => number | null)
  getScreenY: ((anID: string, plotNum?:number) => number | null)
  getLegendColor?: ((anID: string) => string)
  getAnimationEnabled: () => boolean
}

export function setPointCoordinates(props: ISetPointCoordinates) {
  const {
    dataset, pixiPointsRef, selectedOnly = false, pointRadius, selectedPointRadius, pointStrokeColor,
    pointColor, getPointColorAtIndex, getScreenX, getScreenY, getLegendColor, getAnimationEnabled
  } = props


  const lookupLegendColor = (caseData: CaseData): string => {
    const { caseID } = caseData
    const legendColor = getLegendColor?.(caseID)
    if (legendColor) {
      return legendColor
    }
    if (dataset?.isCaseSelected(caseID)) {
      return defaultSelectedColor
    }
    if (caseData.plotNum && getPointColorAtIndex) {
      return getPointColorAtIndex(caseData.plotNum)
    }
    return pointColor
  }

  const setPoints = () => {
    // Do we really need to calculate legend color here? If this function is called both while resizing
    // the graph and while updating legend colors, we could possibly split it into two different functions.
    const pixiPoints = pixiPointsRef?.current
    if (pixiPoints) {
      pixiPoints.transition(() => {
        pixiPoints.forEachPoint((point: PIXI.Sprite, metadata: IPixiPointMetadata) => {
          const { caseID, plotNum } = metadata
          pixiPoints.setPointStyle(point, {
            radius: dataset?.isCaseSelected(caseID) ? selectedPointRadius : pointRadius,
            fill: lookupLegendColor(metadata),
            stroke: getLegendColor && dataset?.isCaseSelected(caseID) ? defaultSelectedStroke : pointStrokeColor,
            strokeWidth: getLegendColor && dataset?.isCaseSelected(caseID)
              ? defaultSelectedStrokeWidth : defaultStrokeWidth
          })
          pixiPoints.setPointPosition(point, getScreenX(caseID) || 0, getScreenY(caseID, plotNum) || 0)
        }, { selectedOnly })
      }, { duration: getAnimationEnabled() ? transitionDuration : 0 })
    }
  }

  setPoints()
}


/**
 Use the bounds of the given axes to compute slope and intercept.
*/
export function computeSlopeAndIntercept(xAxis?: IAxisModel, yAxis?: IAxisModel, interceptLocked=false) {
  const xLower = xAxis && isNumericAxisModel(xAxis) ? xAxis.min : 0,
    xUpper = xAxis && isNumericAxisModel(xAxis) ? xAxis.max : 0,
    yLower = yAxis && isNumericAxisModel(yAxis) ? yAxis.min : 0,
    yUpper = yAxis && isNumericAxisModel(yAxis) ? yAxis.max : 0

  // Make the default a bit steeper, so it's less likely to look like
  // it fits a typical set of points
  const adjustedXUpper = xLower + (xUpper - xLower) / 2,
    slope = (yUpper - yLower) / (adjustedXUpper - xLower),
    intercept = interceptLocked ? 0 : yLower - slope * xLower

  return {slope, intercept}
}

  /**
   * Returns an object that has the slope and intercept
   * @returns {count: {Number}, xSum: {Number}, xSumOfSquares: {Number}, xSumSquaredDeviations: { Number},
   *          ySum: {Number}, ySumOfSquares: {Number}, ySumSquaredDeviations: {Number}, sumOfProductDiffs: {Number} }
   * @param iCoordPairs
   */
 const computeBivariateStats = (iCoordPairs: Point[]) => {
   const tResult = {
     count: 0,
     xMean: 0,
     xSum: 0,
     xSumOfSquares: 0,
     xSumSquaredDeviations: 0,
     yMean: 0,
     ySum: 0,
     ySumOfSquares: 0,
     ySumSquaredDeviations: 0,
     sumOfProductDiffs: 0
   }
   let tSumDiffsX = 0
   let tSumDiffsY = 0

   // Under certain circumstances (adding new case) an empty value can sneak in here. Filter out.
   iCoordPairs = iCoordPairs.filter((iPair: Point) => {
     return isFinite(iPair.x) && isFinite(iPair.y)
   })
   iCoordPairs.forEach(function (iPair: Point) {
     if (isFinite(iPair.x) && isFinite(iPair.y)) {
       tResult.count += 1
       tResult.xSum += iPair.x
       tResult.xSumOfSquares += (iPair.x * iPair.x)
       tResult.ySum += iPair.y
       tResult.ySumOfSquares += (iPair.y * iPair.y)
     }
   })
   if (tResult.count > 0) {
     tResult.xMean = tResult.xSum / tResult.count
     tResult.yMean = tResult.ySum / tResult.count
     iCoordPairs.forEach((iPair: Point) => {
       let tDiffX = 0
       let tDiffY = 0
       if (isFinite(iPair.x) && isFinite(iPair.y)) {
         tResult.sumOfProductDiffs += (iPair.x - tResult.xMean) * (iPair.y - tResult.yMean)
         tDiffX = iPair.x - tResult.xMean
         tResult.xSumSquaredDeviations += tDiffX * tDiffX
         tSumDiffsX += tDiffX
         tDiffY = iPair.y - tResult.yMean
         tResult.ySumSquaredDeviations += tDiffY * tDiffY
         tSumDiffsY += tDiffY
       }
     })
     // Subtract a correction factor for roundoff error.
     // See Numeric Recipes in C, section 14.1 for details.
     tResult.xSumSquaredDeviations -= (tSumDiffsX * tSumDiffsX / tResult.count)
     tResult.ySumSquaredDeviations -= (tSumDiffsY * tSumDiffsY / tResult.count)
   }
   return tResult
 }

 const t_quantile_at_0975_for_df = [
  [1, 12.7062],
  [2, 4.30265],
  [3, 3.18245],
  [4, 2.77645],
  [5, 2.57058],
  [6, 2.44691],
  [7, 2.36462],
  [8, 2.306],
  [9, 2.26216],
  [10, 2.22814],
  [11, 2.20099],
  [12, 2.17881],
  [13, 2.16037],
  [14, 2.14479],
  [15, 2.13145],
  [16, 2.11991],
  [17, 2.10982],
  [18, 2.10092],
  [19, 2.09302],
  [20, 2.08596],
  [21, 2.07961],
  [22, 2.07387],
  [23, 2.06866],
  [24, 2.0639],
  [25, 2.05954],
  [26, 2.05553],
  [27, 2.05183],
  [28, 2.04841],
  [29, 2.04523],
  [30, 2.04227],
  [40, 2.02108],
  [50, 2.00856],
  [60, 2.0003],
  [70, 1.99444],
  [80, 1.99006],
  [90, 1.98667],
  [100, 1.98397],
  [200, 1.9719],
  [500, 1.96472],
  [1000, 1.96234],
  [2000, 1.96115],
  [10000, 1.9602],
  [100000, 1.95999]
]

 export const tAt0975ForDf = (iDf: number) => {
  const foundIndex = t_quantile_at_0975_for_df.findIndex((iPair: number[]) => iPair[0] > iDf)
  return foundIndex <= 0 ? 1.96 : t_quantile_at_0975_for_df[foundIndex - 1][1]
}
export interface IRegression {
  count?: number
  intercept?: number
  mse?: number // mean squared error
  rSquared?: number
  sdResiduals?: number
  slope?: number
  sse?: number // sum of squared errors
  sumSquaresResiduals?: number
  xMean?: number
  xSumSquaredDeviations?: number
  yMean?: number
}

export const leastSquaresLinearRegression = (iValues: Point[], iInterceptLocked: boolean) => {
  const tRegression: IRegression = {}
  const tBiStats = computeBivariateStats(iValues)
  if (tBiStats.count > 1) {
    if (iInterceptLocked) {
      tRegression.slope = (tBiStats.sumOfProductDiffs + tBiStats.xMean * tBiStats.ySum) /
          (tBiStats.xSumSquaredDeviations + tBiStats.xMean * tBiStats.xSum)
      tRegression.intercept = 0
    } else {
      tRegression.count = tBiStats.count
      tRegression.xMean = tBiStats.xMean
      tRegression.yMean = tBiStats.yMean
      tRegression.xSumSquaredDeviations = tBiStats.xSumSquaredDeviations
      tRegression.slope = tBiStats.sumOfProductDiffs / tBiStats.xSumSquaredDeviations
      tRegression.intercept = tBiStats.yMean - tRegression.slope * tBiStats.xMean
      tRegression.rSquared = (tBiStats.sumOfProductDiffs * tBiStats.sumOfProductDiffs) /
          (tBiStats.xSumSquaredDeviations * tBiStats.ySumSquaredDeviations)

      // Now that we have the slope and intercept, we can compute the sum of squared errors
      iValues.forEach(function (iPair: Point) {
        if (isFinite(iPair.x) && isFinite(iPair.y)) {
          const tResidual = iPair.y - (Number(tRegression.intercept) + Number(tRegression.slope) * iPair.x)
          tRegression.sse = tRegression.sse
            ? tRegression.sse += tResidual * tResidual
            : tResidual * tResidual
        }
      })
      tRegression.sdResiduals = Math.sqrt(Number(tRegression.sse) / (tBiStats.count - 2))
      tRegression.mse = Number(tRegression.sse) / (Number(tRegression.count) - 2)
    }
  }
  return tRegression
}

interface ISumOfSquares {
  cellKey: Record<string, string>
  dataConfig: IGraphDataConfigurationModel
  intercept: number
  slope: number
  defaultVal?: number
}

export const calculateSumOfSquares = ({ cellKey, dataConfig, intercept, slope }: ISumOfSquares) => {
  const dataset = dataConfig?.dataset
  const caseData = dataset?.cases
  const xAttrID = dataConfig?.attributeID("x") ?? ""
  const yAttrID = dataConfig?.attributeID("y") ?? ""
  let sumOfSquares = 0
  caseData?.forEach((datum: any) => {
    const fullCaseData = dataConfig?.dataset?.getCase(datum.__id__, { numeric: false })
    if (fullCaseData && dataConfig?.isCaseInSubPlot(cellKey, fullCaseData)) {
      const x = dataset?.getNumeric(datum.__id__, xAttrID) ?? NaN
      const y = dataset?.getNumeric(datum.__id__, yAttrID) ?? NaN
      if (slope == null || intercept == null) return
      const lineY = slope * x + intercept
      const residual = y - lineY
      if (isFinite(residual)) {
        sumOfSquares += residual * residual
      }
    }
  })
  return sumOfSquares
}

// This is a modified version of CODAP V2's SvgScene.pathBasis which was extracted from protovis
export const pathBasis = (p0: Point, p1: Point, p2: Point, p3: Point) => {
  /**
   * Matrix to transform basis (b-spline) control points to bezier control
   * points. Derived from FvD 11.2.8.
   */
  const basis = [
    [ 1/6, 2/3, 1/6,   0 ],
    [   0, 2/3, 1/3,   0 ],
    [   0, 1/3, 2/3,   0 ],
    [   0, 1/6, 2/3, 1/6 ]
  ]

  /**
   * Returns the point that is the weighted sum of the specified control points,
   * using the specified weights. This method requires that there are four
   * weights and four control points.
   */
  const weight = (w: number[]) => {
    return {
      x: w[0] * p0.x + w[1] * p1.x + w[2] * p2.x + w[3] * p3.x,
      y: w[0] * p0.y  + w[1] * p1.y  + w[2] * p2.y  + w[3] * p3.y
    }
  }

  const b1 = weight(basis[1])
  const b2 = weight(basis[2])
  const b3 = weight(basis[3])

  return `C${b1.x},${b1.y},${b2.x},${b2.y},${b3.x},${b3.y}`
}

// This is a modified version of CODAP V2's SvgScene.curveBasis which was extracted from protovis
export const curveBasis = (points: Point[]) => {
  if (points.length <= 2) return ""
  let path = "",
      p0 = points[0],
      p1 = p0,
      p2 = p0,
      p3 = points[1]
  path += pathBasis(p0, p1, p2, p3)
  for (let i = 2; i < points.length; i++) {
    p0 = p1
    p1 = p2
    p2 = p3
    p3 = points[i]
    path += pathBasis(p0, p1, p2, p3)
  }
  /* Cycle through to get the last point. */
  path += pathBasis(p1, p2, p3, p3)
  path += pathBasis(p2, p3, p3, p3)
  return path
}
