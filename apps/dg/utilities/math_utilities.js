// ==========================================================================
//                          DG.MathUtilities
//
//  Author:   William Finzer
//
//  Copyright (c) 2014 by The Concord Consortium, Inc. All rights reserved.
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.
// ==========================================================================

DG.MathUtilities = {

  /**
   Utility function to round a real to a specified number of decimal places.
   @param{Number}
   @param{Number} integer
   @return{Number}
   */
  roundToDecimalPlaces: function (iValue, iDecimalPlaces) {
    var factor = Math.pow(10, iDecimalPlaces);
    return Math.round(iValue* factor) / factor;
  },

  /**
   Utility function to round a real to a specified number of significant
   digits.
   Return both the rounded value and the number of places to the right
   of the decimal place needed to format the string correctly.
   @param{Number}
   @param{Number} integer
   @return{ { roundedValue: {Number}, decPlaces: {Number} }}
   */
  roundToSignificantDigits: function (iValue, iSigDigits) {
    var tSign = 1,
        tAdjustedPlaces = 0,
        tLower, tUpper, tNewValue, tRoundedValue, tDecPlaces;

    DG.assert(iSigDigits > 0);
    if (isNaN(iValue)) {
      return {roundedValue: iValue, decPlaces: 0};
    }

    if (iValue === 0) {
      return {roundedValue: 0, decPlaces: 0};
    }

    if (iValue < 0) {
      tSign = -1;
      iValue = -iValue;
    }

    // First get the value in the range 10^(iSigDigits-1) to 10^iSigDigits.
    tLower = Math.pow(10, iSigDigits - 1);
    tUpper = tLower * 10;
    while (iValue > tUpper) {
      iValue = iValue / 10;
      tAdjustedPlaces++;
    }
    while (iValue < tLower) {
      iValue = iValue * 10;
      tAdjustedPlaces--;
    }

    tNewValue = Math.floor(iValue);
    if (iValue - tNewValue > 0.5)
      tNewValue++;
    var tCounter = tAdjustedPlaces;
    while( tCounter < 0) {
      tNewValue = tNewValue / 10;
      tCounter++;
    }
    if( tAdjustedPlaces < 0)
      tNewValue = tNewValue.toFixed(-tAdjustedPlaces);

    while( tCounter > 0) {
      tNewValue = tNewValue * 10;
      tCounter--;
    }

    tRoundedValue = tSign * tNewValue;
    if (tAdjustedPlaces > 0)
      tAdjustedPlaces = 0;
    tDecPlaces = -tAdjustedPlaces;
    return {roundedValue: tRoundedValue, decPlaces: tDecPlaces};
  },

  formatNumber: function( iValue, iPrecision) {
    var tNumFormat = DG.Format.number().fractionDigits(0, iPrecision);
    tNumFormat.group(''); // Don't separate with commas
    return tNumFormat(iValue);
  },

  extractNumeric: function( x) {
    if( SC.empty( x))
      return '';
    var num = Number(x);
    if( !isNaN( num))
      return num;
    if( typeof x === 'string') {
    var noNumberPatt = /[^.\d-]+/gm,
        firstNumericPatt = /(^-?\.?[\d]+(.?[\d]*)?)/gm,
        firstPass = x.replace(noNumberPatt, '');
        x = firstPass.match(firstNumericPatt);
        x = Array.isArray(x) ? x[0] : null;
    }
    return SC.empty( x) ? null : Number( x);
  },

  /** Clip to the integer range which EXCLUDES the upper value.
   *  Assumes that all values are integers.
   *  @returns integer in [iMin - iMax) range.
   */
  clipToIntegerRange: function (iInteger, iMin, iMax) {
    DG.assert(iInteger === Math.round(iInteger));
    if (iInteger < iMin) {
      return iMin;
    } else if (iInteger >= iMax) {
      return iMax - 1;
    }
    return iInteger;
  },

  /** Test for inside integer range which EXCLUDES the upper value.
   *  Assumes that all values are integers.
   *  @returns integer in [iMin - iMax) range.
   */
  isInIntegerRange: function (iInteger, iMin, iMax) {
    DG.assert(iInteger === Math.round(iInteger));
    return ( iMin <= iInteger && iInteger < iMax );
  },

  /** Clip to the real numeric range which INCLUDES the upper value.
   *  Assumes that all values are finite real numbers.
   *  @returns number in [iMin - iMax] range.
   */
  clipToRange: function (iNumber, iMin, iMax) {
    DG.assert(typeof iNumber === 'number' && isFinite(iNumber));
    if (iNumber < iMin) {
      return iMin;
    } else if (iNumber > iMax) {
      return iMax;
    }
    return iNumber;
  },

  /** Test for inside the real numeric range which INCLUDES the upper value.
   *  Assumes that all values are finite real numbers.
   *  @returns boolean true if value is in the range
   */
  isInRange: function (iNumber, iMin, iMax) {
    DG.assert(typeof iNumber === 'number');
    return isFinite(iNumber) ? ( iMin <= iNumber && iNumber <= iMax ) : false;
  },

  /**
   * Distance between two points.
   * @param {x,y} iPoint1
   * @param {x,y} iPoint2
   */
  distance: function (iPoint1, iPoint2) {
    var dx = iPoint1.x - iPoint2.x,
        dy = iPoint1.y - iPoint2.y;
    return Math.sqrt(dx * dx + dy * dy);
  },

  /**
   * Compute the median of an array of finite numeric values.
   * Warning, the input array is sorted, on the assumption that it is most
   * computationally efficient to directly modify a temporary array.  Caller
   * should make a copy of the array if this is undesired behavior.
   * @param ioArray array of numbers (will be sorted ascending)
   * @return {Number} median value or undefined if ioArray.length===0
   */
  medianOfNumericArray: function (ioArray) {

    function lessThan(a, b) {
      return a - b;
    } // for ascending numeric sort()

    function median(iSortedArray) {
      var i = (iSortedArray.length - 1) / 2, // middle index in 0-(n-1) array
          i1 = Math.floor(i),
          i2 = Math.ceil(i);
      if (i < 0) {
        return undefined; // length === 0
      } else if (i === i1) {
        return iSortedArray[i];
      } else {
        return (iSortedArray[i1] + iSortedArray[i2]) / 2;
      }
    }

    ioArray.sort(lessThan);
    return median(ioArray);
  },

  /**
   * Get the quantile
   * @param iSortedArray
   * @param iQuantile {Number} quantile [0.0-1.0] to calculate, e.g. first quartile = 0.25
   * @return {Number} median value or undefined if ioArray.length===0
   */
  quantileOfSortedArray: function (iSortedArray, iQuantile) {
    var lastIndex = iSortedArray.length - 1,
        i = lastIndex * iQuantile, // quantile's numeric-real index in 0-(n-1) array
        i1 = Math.floor(i),
        i2 = Math.ceil(i),
        fraction = i - i1;
    if (i < 0) {
      return undefined; // length === 0, or iQuantile < 0.0
    } else if (i >= lastIndex) {
      return iSortedArray[lastIndex]; // iQuantile >= 1.0
    } else if (i === i1) {
      return iSortedArray[i1]; // quantile falls on data value exactly
    } else {
      // quantile between two data values;
      // note that quantile algorithms vary on method used to get value here, there is no fixed standard.
      return (iSortedArray[i2] * fraction + iSortedArray[i1] * (1.0 - fraction));
    }
  },

  /**
   * For the given array of number, compute the quantiles
   *  [ minValue, 1/iNumQuantiles quantile, ..., maxValue]
   *  Note that the given array is modified; i.e. sorted.
   *  The returned array has iNumQuantiles + 1 members.
   * @param ioValues {number[]}
   * @param iNumQuantiles {number}
   * @returns {number[]}
   */
  nQuantileValues: function (ioValues, iNumQuantiles) {

    function lessThan(a, b) {
      return a - b;
    } // for ascending numeric sort()

    var tQValues = [];
    ioValues.sort(lessThan);
    for (var tQuantile = 0; tQuantile <= iNumQuantiles; tQuantile++) {
      tQValues.push(DG.MathUtilities.quantileOfSortedArray(ioValues, tQuantile / iNumQuantiles));
    }

    return tQValues;
  },

  tAt0975ForDf: function( iDf) {
    var foundIndex = DG.stat_constants.t_quantile_at_0975_for_df.findIndex( function( iPair) {
      return iPair[0] > iDf;
    });
    return foundIndex <= 0 ? 1.96 : DG.stat_constants.t_quantile_at_0975_for_df[ foundIndex - 1][1];
  },

  /**
   * Returns an object that has the slope and intercept
   * @param iCoordPairs {[{x: {Number}, y: {Number}}]}
   * @returns {{count: {Number}, xSum: {Number}, xSumSquaredDeviations: { Number},
   *          ySum: {Number}, ySumSquaredDeviations: {Number}, sumOfProductDiffs: {Number} }}
   */
  computeBivariateStats: function (iCoordPairs) {
    var tResult = {
          count: 0,
          xSum: 0,
          xMean: 0,
          xSumSquaredDeviations: 0,
          ySum: 0,
          yMean: 0,
          ySumSquaredDeviations: 0,
          sumOfProductDiffs: 0
        },
        tSumDiffsX = 0,
        tSumDiffsY = 0;
    // Under certain circumstances (adding new case) an empty value can sneak in here. Filter out.
    iCoordPairs = iCoordPairs.filter(function( iPair) {
      return !(SC.empty(iPair.x) || SC.empty(iPair.y));
    });
    iCoordPairs.forEach(function (iPair) {
      if (isFinite(iPair.x) && isFinite(iPair.y)) {
        tResult.count += 1;
        tResult.xSum += iPair.x;
        tResult.ySum += iPair.y;
      }
    });
    if (tResult.count > 0) {
      tResult.xMean = tResult.xSum / tResult.count;
      tResult.yMean = tResult.ySum / tResult.count;
      iCoordPairs.forEach(function (iPair) {
        var tDiffX, tDiffY;
        if (isFinite(iPair.x) && isFinite(iPair.y)) {
          tResult.sumOfProductDiffs += (iPair.x - tResult.xMean) * (iPair.y - tResult.yMean);
          tDiffX = iPair.x - tResult.xMean;
          tResult.xSumSquaredDeviations += tDiffX * tDiffX;
          tSumDiffsX += tDiffX;
          tDiffY = iPair.y - tResult.yMean;
          tResult.ySumSquaredDeviations += tDiffY * tDiffY;
          tSumDiffsY += tDiffY;
        }
      });
      // Subtract a correction factor for roundoff error.
      // See Numeric Recipes in C, section 14.1 for details.
      tResult.xSumSquaredDeviations -= (tSumDiffsX * tSumDiffsX / tResult.count);
      tResult.ySumSquaredDeviations -= (tSumDiffsY * tSumDiffsY / tResult.count);
    }
    return tResult;
  },

  /**
   * Returns the correlation coefficient for the coordinates in the array
   * @param iCoords {[{x: {Number}, y: {Number}}]}
   * @returns {Number}
   */
  correlation: function (iCoords) {
    var tResult = NaN,
        tBiStats = DG.MathUtilities.computeBivariateStats(iCoords);
    if (tBiStats.count > 1) {
      tResult = Math.sqrt(tBiStats.sumOfProductDiffs * tBiStats.sumOfProductDiffs /
          (tBiStats.xSumSquaredDeviations * tBiStats.ySumSquaredDeviations));
      if (tBiStats.sumOfProductDiffs < 0)
        tResult = -tResult;
    }
    return tResult;
  },

  /**
   * Returns the square of the correlation coefficient for the coordinates in the array
   * @param iCoords {[{x: {Number}, y: {Number}}]}
   * @returns {Number}
   */
  rSquared: function (iCoords) {
    var tResult = NaN,
        tBiStats = DG.MathUtilities.computeBivariateStats(iCoords);
    if (tBiStats.count > 1) {
      tResult = (tBiStats.sumOfProductDiffs * tBiStats.sumOfProductDiffs) /
          (tBiStats.xSumSquaredDeviations * tBiStats.ySumSquaredDeviations);
    }
    return tResult;
  },

  /**
   * Returns the slope of the lsrl fitting the coordinates
   * @param iCoords {[{x: {Number}, y: {Number}}]}
   * @param iInterceptLocked {Boolean}
   * @returns {Number}
   */
  linRegrSlope: function (iCoords, iInterceptLocked) {
    var tResult = NaN,
        tBiStats = DG.MathUtilities.computeBivariateStats(iCoords);
    if (tBiStats.count > 1) {
      if (iInterceptLocked) {
        tResult = (tBiStats.sumOfProductDiffs + tBiStats.xMean * tBiStats.ySum) /
            (tBiStats.xSumSquaredDeviations + tBiStats.xMean * tBiStats.xSum);
      }
      else {
        tResult = tBiStats.sumOfProductDiffs / tBiStats.xSumSquaredDeviations;
      }
    }
    return tResult;
  },

  /**
   * Returns the intercept of the lsrl fitting the coordinates
   * @param iCoords {[{x: {Number}, y: {Number}}]}
   * @param iInterceptLocked {Boolean}
   * @returns {Number}
   */
  linRegrIntercept: function (iCoords, iInterceptLocked) {
    var tResult = NaN,
        tBiStats = DG.MathUtilities.computeBivariateStats(iCoords),
        tSlope = tBiStats.sumOfProductDiffs / tBiStats.xSumSquaredDeviations;
    if (tBiStats.count > 1) {
      if (iInterceptLocked) {
        tResult = 0;
      }
      else {
        tResult = tBiStats.yMean - tSlope * tBiStats.xMean;
      }
    }
    return tResult;
  },

  /**
   * Returns an object that has the slope and intercept
   * @param iValues {[{x: {Number}, y: {Number}}]}
   * @param iInterceptLocked {Boolean}
   * @returns {{count: {Number}, xMean: {Number}, xSumSquaredDeviations: { Number},
   *         slope: {Number}, intercept: {Number}, sse: {Number}, mse: {Number},
   *         rSquared: {Number}, sdResiduals: {Number} }}
   */
  leastSquaresLinearRegression: function (iValues, iInterceptLocked) {
    var tSlopeIntercept = {
         count: null,
         xMean: null,
         xSumSquaredDeviations: null,
         slope: null,
         intercept: null,
         sse: 0,  // sum of squared errors
         mse: null, // mean squared error
         rSquared: null,
         sdResiduals: null
       },
        tBiStats = DG.MathUtilities.computeBivariateStats(iValues);
    if (tBiStats.count > 1) {
      if (iInterceptLocked) {
        tSlopeIntercept.slope = (tBiStats.sumOfProductDiffs + tBiStats.xMean * tBiStats.ySum) /
            (tBiStats.xSumSquaredDeviations + tBiStats.xMean * tBiStats.xSum);
        tSlopeIntercept.intercept = 0;
      }
      else {
        tSlopeIntercept.count = tBiStats.count;
        tSlopeIntercept.xMean = tBiStats.xMean;
        tSlopeIntercept.yMean = tBiStats.yMean;
        tSlopeIntercept.xSumSquaredDeviations = tBiStats.xSumSquaredDeviations;
        tSlopeIntercept.slope = tBiStats.sumOfProductDiffs / tBiStats.xSumSquaredDeviations;
        tSlopeIntercept.intercept = tBiStats.yMean - tSlopeIntercept.slope * tBiStats.xMean;
        tSlopeIntercept.rSquared = (tBiStats.sumOfProductDiffs * tBiStats.sumOfProductDiffs) /
            (tBiStats.xSumSquaredDeviations * tBiStats.ySumSquaredDeviations);
        // Now that we have the slope and intercept, we can compute the sum of squared errors
        iValues.forEach(function (iPair) {
          if (isFinite(iPair.x) && isFinite(iPair.y)) {
            var tResidual = iPair.y - (tSlopeIntercept.intercept + tSlopeIntercept.slope * iPair.x);
            tSlopeIntercept.sse += tResidual * tResidual;
          }
        });
        tSlopeIntercept.sdResiduals = Math.sqrt(tSlopeIntercept.sse / (tBiStats.count - 2));
        tSlopeIntercept.mse = tSlopeIntercept.sse / (tSlopeIntercept.count - 2);
      }
    }
    return tSlopeIntercept;
  },

  /**
   * Returns the standard errors of the slope and intercept of the lsrl fitting the coordinates
   * Note that we do not compute standard errors for the situation in which the intercept is locked.
   * @param iCoords {[{x: {Number}, y: {Number}}]}
   * @returns {seSlope:number, seIntercept:number}
   */
  linRegrSESlopeAndIntercept: function (iCoords) {
    var tResult = { seSlope: NaN, seIntercept: NaN },
       tSlopeIntercept = DG.MathUtilities.leastSquaresLinearRegression(iCoords, false);
    if (tSlopeIntercept.count > 1) {
      tResult.seSlope = Math.sqrt((tSlopeIntercept.sse / (tSlopeIntercept.count - 2)) /
                          tSlopeIntercept.xSumSquaredDeviations);
      tResult.seIntercept = Math.sqrt(tSlopeIntercept.sse / (tSlopeIntercept.count - 2)) *
          Math.sqrt(1 / tSlopeIntercept.count + Math.pow(tSlopeIntercept.xMean, 2) /
              tSlopeIntercept.xSumSquaredDeviations);
    }
    return tResult;
  },

  normal: function(x, amp, mu, sigma) {
    var exponent = -(Math.pow(x - mu, 2) / (2 * Math.pow(sigma, 2)));
    return amp * Math.exp(exponent);
  },

  /**
   * Gradient descent algorithm that fits a gaussian to points that are typically the top-middles of
   * a histogram by least squares optimizing mu and sigma. The amplitude is assumed to be fixed.
   * @param points {{x: number, y: number}[]}
   * @param amp {number}  // a fixed value for the amplitude
   * @param mu0 {number}  // initial guess for mu
   * @param sigma0 {number}  // initial guess for sigma
   * @returns {{mu: number, sigma: number}}
   */
  fitGaussianGradientDescent: function(points, amp, mu0, sigma0) {

    function sumOfSquares(points1, amp1, mu1, sigma1) {
      return points1.reduce(function(sum, p) {
        return sum + Math.pow(p.y - DG.MathUtilities.normal(p.x, amp1, mu1, sigma1), 2);
      }, 0);
    }

    // Function to compute the gradient of f at (x, y)
    function gradient(f, x, y, h) {
      h = h || 1e-3;
      var fxPlus = f(x + h, y),
        fxMinus = f(x - h, y),
        dfdx = (fxPlus - fxMinus) / (2 * h),
        fyPlus = f(x, y + h),
        fyMinus = f(x, y - h),
        dfdy = (fyPlus - fyMinus) / (2 * h);
      return [dfdx, dfdy];
    }

    // Gradient Descent function to find local minimum of f(x, y)
    function gradientDescent(f, x0, y0, numericRange) {

/*
      function logIt() {
        var log = '%@: x = %@, y = %@, dfdx = %@, dfdy = %@, prevValue = %@, newValue = %@'
           .loc(i, x.toFixed(6), y.toFixed(6),
              dfdx.toFixed(6), dfdy.toFixed(6), prevValue.toFixed(6), newValue.toFixed(6));
        console.log(log);
      }
*/

      var learningRate = 0.001,
         iterations = 1000,
         tolerance = 1e-5,
         x = x0, y = y0, prevValue = f(x, y)/*,
         logInterval = iterations / 10*/;

      for (var i = 0; i < iterations; i++) {
        var gradient_ = gradient(f, x, y, numericRange / 100),
            dfdx = gradient_[0],
            dfdy = gradient_[1];

        // Update x and y
        x -= learningRate * dfdx;
        y -= learningRate * dfdy;

        var newValue = f(x, y);
/*
        if (i % logInterval <= 1) {
          logIt();
        }
*/
        if (Math.abs(newValue - prevValue) < tolerance) {
          // logIt();
          break;
        }
        prevValue = newValue;
      }

      return [x, y];
    }

    /**
     * We define this function to pass to gradientDescent, which expects a function of two variables.
     * @param mu
     * @param sigma
     * @returns {*}
     */
    function fToMinimize(mu, sigma) {
      return sumOfSquares(points, amp, mu, sigma);
    }

    var muSigma = gradientDescent(fToMinimize, mu0, sigma0, sigma0);

    return { mu: muSigma[0], sigma: muSigma[1] };
  },

  /**
   * Is the value a finite number? Unlike the global "isFinite", returns
   * false for (null || undefined || "").  Strings or Booleans are converted
   * to Numbers in the usual way.
   * @param val
   * @return {Boolean} true if the value is finite.
   */
  isFinite: function (val) {
    return !SC.empty(val) && isFinite(val);
  },

  /**
   * Is the specified value numeric? Unlike the global "isNaN", returns
   * false for (null || undefined || "").  Strings or Booleans are converted
   * to Numbers in the usual way.
   * @param val
   * @return {Boolean} true if the value is numeric
   */
  isNumeric: function (val) {
    return !SC.empty(val) && !isNaN(val);
  },

  /**
   * Returns the numeric value for numbers and null for all other types.
   * @param   {any} val - the value whose numeric value is requested
   * @return  {Number|null}  the numeric value where possible, otherwise null
   */
  getNumeric: function (val) {
    return !SC.empty(val) && !isNaN(val) ? Number(val) : null;
  },

  /**
   * @private A private variant of Array.prototype.map that supports the index
   * property.
   */
  map: function (array, f) {
    var o = {};
    return f
        ? array.map(function (d, i) {
          o.index = i;
          return f.call(o, d);
        })
        : array.slice();
  },

  /**
   * Returns <tt>this.index</tt>. This method is provided for convenience for use
   * with scales. For example, to color bars by their index, say:
   *
   * <pre>.fillStyle(pv.Colors.category10().by(pv.index))</pre>
   *
   * This method is equivalent to <tt>function() this.index</tt>, but more
   * succinct. Note that the <tt>index</tt> property is also supported for
   * accessor functions with {@link pv.max}, {@link pv.min} and other array
   * utility methods.
   *
   * @see pv.Scale
   * @see pv.Mark#index
   */
  index: function () {
    return this.index;
  },

  /**
   * Returns the maximum value of the specified array. If the specified array is
   * not an array of numbers, an optional accessor function <tt>f</tt> can be
   * specified to map the elements to numbers. See {@link #normalize} for an
   * example. Accessor functions can refer to <tt>this.index</tt>.
   *
   * @param {array} array an array of objects, or numbers.
   * @param {function} [f] an optional accessor function.
   * @returns {number} the maximum value of the specified array.
   */
  max: function (array, f) {
    if (f === DG.MathUtilities.index) return array.length - 1;
    return Math.max.apply(null, f ? DG.MathUtilities.map(array, f) : array);
  },

  /**
   * Returns an array of numbers, starting at <tt>start</tt>, incrementing by
   * <tt>step</tt>, until <tt>stop</tt> is reached. The stop value is
   * exclusive. If only a single argument is specified, this value is interpeted
   * as the <i>stop</i> value, with the <i>start</i> value as zero. If only two
   * arguments are specified, the step value is implied to be one.
   *
   * <p>The method is modeled after the built-in <tt>range</tt> method from
   * Python. See the Python documentation for more details.
   *
   * @see <a href="http://docs.python.org/library/functions.html#range">Python range</a>
   * @param {number} [start] the start value.
   * @param {number} stop the stop value.
   * @param {number} [step] the step value.
   * @returns {number[]} an array of numbers.
   */
  range: function (start, stop, step) {
    if (arguments.length === 1) {
      stop = start;
      start = 0;
    }
    if (step === undefined) step = 1;
    if ((stop - start) / step === Infinity) throw new Error("range must be finite");
    var array = [], i = 0, j;
    stop -= (stop - start) * 1e-10; // floating point precision!
    if (step < 0) {
      while ((j = start + step * i++) > stop) {
        array.push(j);
      }
    } else {
      while ((j = start + step * i++) < stop) {
        array.push(j);
      }
    }
    return array;
  },

  /**
   Computes a good major tick value from a trial value. It will be the next
   lowest value of the form 1, 2, 5, 10, ...
   @param {Number} iTrial - a suggested tick value
   */
  goodTickValue: function( iTrial) {
    // A zero trial means that the values we're going to plot either don't
    // exist or are all zero. Return 1 as an arbitrary choice.
    if( iTrial === 0)
      return 1;

    // We move to base 10 so we can get rid of the power of ten.
    var tLogTrial = Math.log( iTrial) / Math.LN10,
        tFloor = Math.floor(tLogTrial),
        tPower = Math.pow(10.0, tFloor),

        // Whatever is left is in the range 1 to 10. Choose desired number
        tBase = Math.pow(10.0, tLogTrial - tFloor);

    if (tBase < 2) tBase = 1;
    else if (tBase < 5) tBase = 2;
    else tBase = 5;

    return Math.max( tPower * tBase, Number.MIN_VALUE);
  },

  // if a number is not an integer, if it less than 0 (we don't handle BC)
  // or greater than 10,000 we assume it does not represent a year.
  notAYear: function(num) {
    return (Math.round(num)!== num ||
      num < 0 ||
      num >= 10000
  );
}


};

DG.isFinite = DG.MathUtilities.isFinite;
DG.isNumeric = DG.MathUtilities.isNumeric;
DG.getNumeric = DG.MathUtilities.getNumeric;
