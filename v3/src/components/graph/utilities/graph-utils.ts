import {extent, format} from "d3"
import React from "react"
import {isInteger} from "lodash"
import {IDataSet} from "../../../models/data/data-set"
import {CaseData, selectDots} from "../../data-display/d3-types"
import {IDotsRef, Point, transitionDuration} from "../../data-display/data-display-types"
import {IAxisModel, isNumericAxisModel} from "../../axis/models/axis-model"
import {ScaleNumericBaseType} from "../../axis/axis-types"
import {defaultSelectedColor, defaultSelectedStroke, defaultSelectedStrokeWidth, defaultStrokeWidth}
  from "../../../utilities/color-utils"
import {IDataConfigurationModel} from "../../data-display/models/data-configuration-model"

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

export function equationString(slope: number, intercept: number, attrNames: {x: string, y: string}) {
  const float = format('.4~r')
  if (isFinite(slope) && slope !== 0) {
    return `<em>${attrNames.y}</em> = ${float(slope)} <em>${attrNames.x}</em> + ${float(intercept)}`
  } else {
    return `<em>${slope === 0 ? attrNames.y : attrNames.x}</em> = ${float(intercept)}`
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

export const lsrlEquationString = (
  slope: number, intercept: number, rSquared: number, attrNames: {x: string, y: string}, caseValues: Point[],
  confidenceBandsEnabled?: boolean
) => {
  const float = format(".3~r")
  const floatIntercept = format(".1~f")
  const floatSeSlope = format(".3~f")
  const linearRegression = leastSquaresLinearRegression(caseValues, false)
  const seSlope = Math.sqrt(
    (linearRegression.sse / Number(linearRegression.count) - 2) / Number(linearRegression.xSumSquaredDeviations)
  )
  const equationPart = isFinite(slope) && slope !== 0
    ? `<em>${attrNames.y}</em> = (${float(slope)}) (<em>${attrNames.x}</em>) + ${floatIntercept(intercept)}`
    : `<em>${slope === 0 ? attrNames.y : attrNames.x}</em> = ${floatIntercept(intercept)}`
  const seSlopePart = confidenceBandsEnabled ? `<br />SE<sub>slope</sub> = ${floatSeSlope(seSlope)}` : ""
  return `${equationPart}<br />r<sup>2</sup> = ${float(rSquared)}${seSlopePart}`
}

export function getScreenCoord(dataSet: IDataSet | undefined, id: string,
                               attrID: string, scale: ScaleNumericBaseType) {
  const value = dataSet?.getNumeric(id, attrID)
  return value != null && !isNaN(value) ? scale(value) : null
}

export interface ISetPointSelection {
  dotsRef: IDotsRef
  dataConfiguration: IDataConfigurationModel
  pointRadius: number,
  selectedPointRadius: number,
  pointColor: string,
  pointStrokeColor: string,
  getPointColorAtIndex?: (index: number) => string
}

export interface ISetPointCoordinates {
  dataset?: IDataSet
  dotsRef: IDotsRef
  selectedOnly?: boolean
  pointRadius: number
  selectedPointRadius: number
  pointColor: string
  pointStrokeColor: string
  getPointColorAtIndex?: (index: number) => string
  getScreenX: ((anID: string) => number | null)
  getScreenY: ((anID: string, plotNum?:number) => number | null)
  getLegendColor?: ((anID: string) => string)
  enableAnimation: React.MutableRefObject<boolean>
}

export function setPointCoordinates(props: ISetPointCoordinates) {

  const lookupLegendColor = (aCaseData: CaseData) => {
      const id = aCaseData.caseID,
        isSelected = dataset?.isCaseSelected(id),
        legendColor = getLegendColor ? getLegendColor(id) : ''
      return legendColor !== '' ? legendColor
        : isSelected ? defaultSelectedColor
          : aCaseData.plotNum && getPointColorAtIndex
            ? getPointColorAtIndex(aCaseData.plotNum) : pointColor
    },

    setPoints = () => {

      if (theSelection?.size()) {
        theSelection
          .transition()
          .duration(duration)
          .attr('cx', (aCaseData: CaseData) => getScreenX(aCaseData.caseID))
          .attr('cy', (aCaseData: CaseData) => {
            return getScreenY(aCaseData.caseID, aCaseData.plotNum)
          })
          .attr('r', (aCaseData: CaseData) => dataset?.isCaseSelected(aCaseData.caseID)
            ? selectedPointRadius : pointRadius)
          .style('fill', (aCaseData: CaseData) => lookupLegendColor(aCaseData))
          .style('stroke', (aCaseData: CaseData) =>
            (getLegendColor && dataset?.isCaseSelected(aCaseData.caseID))
            ? defaultSelectedStroke : pointStrokeColor)
          .style('stroke-width', (aCaseData: CaseData) =>
            (getLegendColor && dataset?.isCaseSelected(aCaseData.caseID))
            ? defaultSelectedStrokeWidth : defaultStrokeWidth)
      }
    }

  const
    {
      dataset, dotsRef, selectedOnly = false, pointRadius, selectedPointRadius,
      pointStrokeColor, pointColor, getPointColorAtIndex,
      getScreenX, getScreenY, getLegendColor, enableAnimation
    } = props,
    duration = enableAnimation.current ? transitionDuration : 0,

    theSelection = selectDots(dotsRef.current, selectedOnly)
  setPoints()
}


/**
 Use the bounds of the given axes to compute slope and intercept.
*/
export function computeSlopeAndIntercept(xAxis?: IAxisModel, yAxis?: IAxisModel) {
  const xLower = xAxis && isNumericAxisModel(xAxis) ? xAxis.min : 0,
    xUpper = xAxis && isNumericAxisModel(xAxis) ? xAxis.max : 0,
    yLower = yAxis && isNumericAxisModel(yAxis) ? yAxis.min : 0,
    yUpper = yAxis && isNumericAxisModel(yAxis) ? yAxis.max : 0

  // Make the default a bit steeper, so it's less likely to look like
  // it fits a typical set of points
  const adjustedXUpper = xLower + (xUpper - xLower) / 2,
    slope = (yUpper - yLower) / (adjustedXUpper - xLower),
    intercept = yLower - slope * xLower

  return {slope, intercept}
}

  /**
   * Returns an object that has the slope and intercept
   * @param iCoordPairs [{x: {Number}, y: {Number}}]
   * @returns {{count: {Number}, xSum: {Number}, xSumOfSquares: {Number}, xSumSquaredDeviations: { Number},
  *          ySum: {Number}, ySumOfSquares: {Number}, ySumSquaredDeviations: {Number}, sumOfProductDiffs: {Number} }
  */
 const computeBivariateStats = (iCoordPairs: any) => {
    const tResult: any = {
      count: 0,
      xSum: 0,
      xSumOfSquares: 0,
      xSumSquaredDeviations: 0,
      ySum: 0,
      ySumOfSquares: 0,
      ySumSquaredDeviations: 0,
      sumOfProductDiffs: 0
    }
    let tSumDiffsX = 0
    let tSumDiffsY = 0

    // Under certain circumstances (adding new case) an empty value can sneak in here. Filter out.
    iCoordPairs = iCoordPairs.filter((iPair: any) => {
      return !(!iPair.x || !iPair.y)
    })
   iCoordPairs.forEach(function (iPair: any) {
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
     iCoordPairs.forEach((iPair: any) => {
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
  const foundIndex = t_quantile_at_0975_for_df.findIndex((iPair: any) => iPair[0] > iDf)
  return foundIndex <= 0 ? 1.96 : t_quantile_at_0975_for_df[foundIndex - 1][1]
}
export interface ISlopeIntercept {
  count: number | null
  intercept: number | null
  mse: number | null // mean squared error
  rSquared: number | null
  sdResiduals: number | null
  slope: number | null
  sse: number // sum of squared errors
  sumSquaresResiduals?: number | null
  xMean: number | null
  xSumSquaredDeviations: number | null
  yMean?: number | null
}

export const leastSquaresLinearRegression = (iValues: any, iInterceptLocked: boolean) => {
  const tSlopeIntercept: ISlopeIntercept = {
    count: null,
    intercept: null,
    mse: null, // mean squared error
    rSquared: null,
    sdResiduals: null,
    slope: null,
    sse: 0,  // sum of squared errors
    xMean: null,
    xSumSquaredDeviations: null
  }
  const tBiStats = computeBivariateStats(iValues)
  if (tBiStats.count > 1) {
    if (iInterceptLocked) {
      tSlopeIntercept.slope = (tBiStats.sumOfProductDiffs + tBiStats.xMean * tBiStats.ySum) /
          (tBiStats.xSumSquaredDeviations + tBiStats.xMean * tBiStats.xSum)
      tSlopeIntercept.intercept = 0
    } else {
      tSlopeIntercept.count = tBiStats.count
      tSlopeIntercept.xMean = tBiStats.xMean
      tSlopeIntercept.yMean = tBiStats.yMean
      tSlopeIntercept.xSumSquaredDeviations = tBiStats.xSumSquaredDeviations
      tSlopeIntercept.slope = tBiStats.sumOfProductDiffs / tBiStats.xSumSquaredDeviations
      tSlopeIntercept.intercept = tBiStats.yMean - tSlopeIntercept.slope * tBiStats.xMean
      tSlopeIntercept.rSquared = (tBiStats.sumOfProductDiffs * tBiStats.sumOfProductDiffs) /
          (tBiStats.xSumSquaredDeviations * tBiStats.ySumSquaredDeviations)

      // Now that we have the slope and intercept, we can compute the sum of squared errors
      iValues.forEach(function (iPair: any) {
        if (isFinite(iPair.x) && isFinite(iPair.y)) {
          const tResidual = iPair.y - (Number(tSlopeIntercept.intercept) + Number(tSlopeIntercept.slope) * iPair.x)
          tSlopeIntercept.sse += tResidual * tResidual
        }
      })
      tSlopeIntercept.sdResiduals = Math.sqrt(tSlopeIntercept.sse / (tBiStats.count - 2))
      tSlopeIntercept.mse = tSlopeIntercept.sse / (Number(tSlopeIntercept.count) - 2)
    }
  }
  return tSlopeIntercept
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
