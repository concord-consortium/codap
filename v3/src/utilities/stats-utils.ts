export type XYValues = Array<{ x: number, y: number }>

/**
 * Returns an object that has fundamental stats useful for computing bivariate stats functions
 * @param xyValues {[{x: {Number}, y: {Number}}]}
 * @returns {{count: {Number}, xSum: {Number}, xSumSquaredDeviations: {Number},
 *          ySum: {Number}, ySumSquaredDeviations: {Number}, sumOfProductDiffs: {Number} }}
 */
export function computeBivariateStats(xyValues: XYValues) {
  const result = {
    count: 0,
    xSum: 0,
    xMean: 0,
    xSumSquaredDeviations: 0,
    ySum: 0,
    yMean: 0,
    ySumSquaredDeviations: 0,
    sumOfProductDiffs: 0
  }
  let xSumDiffs = 0
  let ySumDiffs = 0

  xyValues.forEach(({ x, y }) => {
    if (isFinite(x) && isFinite(y)) {
      result.count += 1
      result.xSum += x
      result.ySum += y
    }
  })
  if (result.count > 0) {
    result.xMean = result.xSum / result.count
    result.yMean = result.ySum / result.count
    xyValues.forEach(({ x, y }) => {
      let xDiff, yDiff
      if (isFinite(x) && isFinite(y)) {
        result.sumOfProductDiffs += (x - result.xMean) * (y - result.yMean)
        xDiff = x - result.xMean
        result.xSumSquaredDeviations += xDiff * xDiff
        xSumDiffs += xDiff
        yDiff = y - result.yMean
        result.ySumSquaredDeviations += yDiff * yDiff
        ySumDiffs += yDiff
      }
    })
    // Subtract a correction factor for round-off error.
    // See Numeric Recipes in C, section 14.1 for details.
    result.xSumSquaredDeviations -= (xSumDiffs * xSumDiffs / result.count)
    result.ySumSquaredDeviations -= (ySumDiffs * ySumDiffs / result.count)
  }
  return result
}

/**
 * Returns the correlation coefficient for the coordinates in the array
 * @param xyValues {[{x: {Number}, y: {Number}}]}
 * @returns {Number}
 */
export function correlation(xyValues: XYValues) {
  let result = NaN
  const { count, sumOfProductDiffs, xSumSquaredDeviations, ySumSquaredDeviations } = computeBivariateStats(xyValues)
  if (count > 1) {
    result = Math.sqrt(sumOfProductDiffs * sumOfProductDiffs / (xSumSquaredDeviations * ySumSquaredDeviations))
    if (sumOfProductDiffs < 0) result = -result
  }
  return result
}

/**
 * Returns the square of the correlation coefficient for the coordinates in the array
 * @param iCoords {[{x: {Number}, y: {Number}}]}
 * @returns {Number}
 */
export function rSquared(xyValues: XYValues) {
  let result = NaN
  const { count, sumOfProductDiffs, xSumSquaredDeviations, ySumSquaredDeviations } = computeBivariateStats(xyValues)
  if (count > 1) {
    result = (sumOfProductDiffs * sumOfProductDiffs) / (xSumSquaredDeviations * ySumSquaredDeviations)
  }
  return result
}

/**
 * Returns the slope of the lsrl fitting the coordinates
 * @param iCoords {[{x: {Number}, y: {Number}}]}
 * @param iInterceptLocked {Boolean}
 * @returns {Number}
 */
export function linRegrSlope(xyValues: XYValues, interceptLocked = false) {
  const { count, sumOfProductDiffs, xMean, xSum, xSumSquaredDeviations, ySum } = computeBivariateStats(xyValues)
  if (count > 1) {
    return (interceptLocked)
            ? (sumOfProductDiffs + xMean * ySum) / (xSumSquaredDeviations + xMean * xSum)
            : sumOfProductDiffs / xSumSquaredDeviations
  }
  return NaN
}

/**
 * Returns the intercept of the lsrl fitting the coordinates
 * @param iCoords {[{x: {Number}, y: {Number}}]}
 * @param iInterceptLocked {Boolean}
 * @returns {Number}
 */
export function linRegrIntercept(xyValues: XYValues, interceptLocked = false) {
  const { count, sumOfProductDiffs, xMean, xSumSquaredDeviations, yMean } = computeBivariateStats(xyValues)
  // compute the slope for the non-intercept-locked case
  const slope = sumOfProductDiffs / xSumSquaredDeviations
  if (count > 1) {
    return interceptLocked ? 0 : yMean - slope * xMean
  }
  return NaN
}

/**
 * Returns an object that has the slope and intercept
 * @param iValues {[{x: {Number}, y: {Number}}]}
 * @param iInterceptLocked {Boolean}
 * @returns {{count: {Number}, xMean: {Number}, xSumSquaredDeviations: { Number},
 *         slope: {Number}, intercept: {Number}, sse: {Number}, mse: {Number},
 *         rSquared: {Number}, sdResiduals: {Number} }}
 */
interface LSRResult {
  count: number | null
  xMean: number | null
  xSumSquaredDeviations: number | null
  yMean: number | null
  ySumSquaredDeviations: number | null
  slope: number | null
  intercept: number | null
  sumSquaredErrors: number
  meanSquaredError: number | null
  rSquared: number | null
  sdResiduals: number | null
}
export function leastSquaresLinearRegression(xyValues: XYValues, interceptLocked = false): LSRResult {
  const result: LSRResult = {
    count: null,
    xMean: null,
    xSumSquaredDeviations: null,
    yMean: null,
    ySumSquaredDeviations: null,
    slope: null,
    intercept: null,
    sumSquaredErrors: 0,
    meanSquaredError: null,
    rSquared: null,
    sdResiduals: null
  }
  const {
    count, xSum, xMean, xSumSquaredDeviations, ySum, yMean, ySumSquaredDeviations, sumOfProductDiffs
  } = computeBivariateStats(xyValues)
  if (count > 1) {
    result.count = count
    result.xMean = xMean
    result.xSumSquaredDeviations = xSumSquaredDeviations
    result.yMean = yMean
    result.ySumSquaredDeviations = ySumSquaredDeviations
    if (interceptLocked) {
      result.slope = (sumOfProductDiffs + xMean * ySum) / (xSumSquaredDeviations + xMean * xSum)
      result.intercept = 0
    }
    else {
      result.slope = sumOfProductDiffs / xSumSquaredDeviations
      result.intercept = yMean - result.slope * xMean
    }
    // Now that we have the slope and intercept, we can compute the sum of squared errors
    let ySumSquaredValues = 0
    xyValues.forEach(({ x, y }) => {
      if (isFinite(x) && isFinite(y) && result.slope != null && result.intercept != null) {
        const tResidual = y - (result.intercept + result.slope * x)
        result.sumSquaredErrors += tResidual * tResidual
        ySumSquaredValues += y * y
      }
    })
    result.rSquared = interceptLocked
      // since intercept is 0 when locked, denominator is total sum of squares
      ? result.rSquared = 1 - result.sumSquaredErrors / ySumSquaredValues
      : (sumOfProductDiffs * sumOfProductDiffs) / (xSumSquaredDeviations * ySumSquaredDeviations)
    result.sdResiduals = Math.sqrt(result.sumSquaredErrors / (count - 2))
    result.meanSquaredError = result.sumSquaredErrors / (count - 2)
  }
  return result
}

/**
 * Returns the standard errors of the slope and intercept of the lsrl fitting the coordinates
 * Note that we do not compute standard errors for the situation in which the intercept is locked.
 * @param iCoords {[{x: {Number}, y: {Number}}]}
 * @returns {seSlope:number, seIntercept:number}
 */
interface StdErrLSRResult {
  stdErrSlope: number
  stdErrIntercept: number
}
export function linRegrStdErrSlopeAndIntercept(xyValues: XYValues): StdErrLSRResult {
  const result = { stdErrSlope: NaN, stdErrIntercept: NaN }
  const { count, sumSquaredErrors, xMean, xSumSquaredDeviations } = leastSquaresLinearRegression(xyValues)
  if (!count || xMean == null || xSumSquaredDeviations == null) return result
  if (count > 1) {
    result.stdErrSlope = Math.sqrt((sumSquaredErrors / (count - 2)) / xSumSquaredDeviations)
    result.stdErrIntercept = Math.sqrt(sumSquaredErrors / (count - 2)) *
                              Math.sqrt(1 / count + Math.pow(xMean, 2) / xSumSquaredDeviations)
  }
  return result
}
