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
    Utility function to round a real to a specified number of significant
    digits.
    Return both the rounded value and the number of places to the right
    of the decimal place needed to format the string correctly.
    @param{Number}
    @param{Number} integer
    @return{ { roundedValue: {Number}, decPlaces: {Number} }}
  */
  roundToSignificantDigits: function( iValue, iSigDigits) {
    var tSign = 1,
        tAdjustedPlaces = 0,
        tLower, tUpper, tNewValue, tRoundedValue, tDecPlaces;

    DG.assert( iSigDigits > 0);
    if( isNaN( iValue)) {
      return { roundedValue: iValue, decPlaces: 0 };
    }

    if( iValue === 0) {
      return { roundedValue: 0, decPlaces: 0 };
    }
  
    if( iValue < 0) {
      tSign = -1;
      iValue = -iValue;
    }
    
    // First get the value in the range 10^(iSigDigits-1) to 10^iSigDigits.
    tLower = Math.pow( 10, iSigDigits - 1);
    tUpper = tLower * 10;
    while (iValue > tUpper) {
      iValue /= 10;
      tAdjustedPlaces++;
    }
    while (iValue < tLower) {
      iValue *= 10;
      tAdjustedPlaces--;
    }
    
    tNewValue = Math.floor( iValue);
    if (iValue - tNewValue > 0.5)
      tNewValue++;
    tNewValue = tNewValue * Math.pow( 10, tAdjustedPlaces);
  
    tRoundedValue = tSign * tNewValue;
    if (tAdjustedPlaces > 0)
      tAdjustedPlaces = 0;
    tDecPlaces = -tAdjustedPlaces;
    return { roundedValue: tRoundedValue, decPlaces: tDecPlaces };
  },

  /** Clip to the integer range which EXCLUDES the upper value.
    *  Assumes that all values are integers.
    *  @returns integer in [iMin - iMax) range.
    */
  clipToIntegerRange: function( iInteger, iMin, iMax ) {
    DG.assert( iInteger === Math.round( iInteger ));
    if( iInteger < iMin ){
       return iMin;
    } else if( iInteger >= iMax ) {
       return iMax-1;
    }
    return iInteger;
  },

   /** Test for inside integer range which EXCLUDES the upper value.
    *  Assumes that all values are integers.
    *  @returns integer in [iMin - iMax) range.
    */
  isInIntegerRange: function( iInteger, iMin, iMax ) {
    DG.assert( iInteger === Math.round( iInteger ));
    return( iMin <= iInteger && iInteger < iMax );
  },

  /** Clip to the real numeric range which INCLUDES the upper value.
    *  Assumes that all values are finite real numbers.
    *  @returns number in [iMin - iMax] range.
    */
  clipToRange: function( iNumber, iMin, iMax ) {
    DG.assert( typeof iNumber === 'number' && isFinite( iNumber ));
    if( iNumber < iMin ){
       return iMin;
    } else if( iNumber > iMax ) {
       return iMax;
    }
    return iNumber;
  },

  /** Test for inside the real numeric range which INCLUDES the upper value.
    *  Assumes that all values are finite real numbers.
    *  @returns boolean true if value is in the range
    */
  isInRange: function( iNumber, iMin, iMax ) {
    DG.assert( typeof iNumber === 'number' && isFinite( iNumber ));
    return( iMin <= iNumber && iNumber <= iMax );
  },

  /**
    * Distance between two points.
    * @param {x,y} iPoint1
    * @param {x,y} iPoint2
    */
  distance: function( iPoint1, iPoint2 ) {
      var     dx = iPoint1.x - iPoint2.x,
              dy = iPoint1.y - iPoint2.y;
      return Math.sqrt( dx*dx + dy*dy );
  },

  /**
   * Compute the median of an array of finite numeric values.
   * Warning, the input array is sorted, on the assumption that it is most
   * computationally efficient to directly modify a temporary array.  Caller
   * should make a copy of the array if this is undesired behavior.
   * @param ioArray array of numbers (will be sorted ascending)
   * @return {Number} median value or undefined if ioArray.length===0
   */
  medianOfNumericArray: function( ioArray ) {

    function lessThan(a,b) { return a-b; } // for ascending numeric sort()

    function median( iSortedArray ) {
      var i = (iSortedArray.length - 1)/ 2, // middle index in 0-(n-1) array
          i1 = Math.floor(i),
          i2 = Math.ceil(i);
      if( i < 0 ) {
        return undefined; // length === 0
      } else if( i===i1 ) {
        return iSortedArray[i];
      } else {
        return (iSortedArray[i1]+iSortedArray[i2]) / 2;
      }
    }

    ioArray.sort( lessThan );
    return median( ioArray );
  },

  /**
   * Get the quantile
   * @param iArray Sorted array of finite numeric values (no non-numeric or missing values allowed)
   * @param iQuantile {Number} quantile [0.0-1.0] to calculate, e.g. first quartile = 0.25
   * @return {Number} median value or undefined if ioArray.length===0
   */
  quantileOfSortedArray: function( iSortedArray, iQuantile ) {
    var lastIndex = iSortedArray.length - 1,
        i = lastIndex * iQuantile, // quantile's numeric-real index in 0-(n-1) array
        i1 = Math.floor(i),
        i2 = Math.ceil(i),
        fraction = i - i1;
    if( i < 0 ) {
      return undefined; // length === 0, or iQuantile < 0.0
    } else if ( i >= lastIndex ) {
      return iSortedArray[lastIndex]; // iQuantile >= 1.0
    } else if( i===i1 ) {
      return iSortedArray[i1]; // quantile falls on data value exactly
    } else {
      // quantile between two data values;
      // note that quantile algorithms vary on method used to get value here, there is no fixed standard.
      return (iSortedArray[i1]*fraction + iSortedArray[i2]*(1.0-fraction));
    }
  },

  /**
   * Is the value a finite number? Unlike the global "isFinite", returns
   * false for (null || undefined || "").  Strings or Booleans are converted
   * to Numbers in the usual way.
   * @param val
   * @return {Boolean} true if the value is finite..
   */
  isFinite: function( val ) {
    return (!SC.empty(val)) && isFinite( val);
  },

  /**
   * Returns the numeric value for numbers and null for all other types.
   * @param   {any} val - the value whose numeric value is requested
   * @return  {Number|null}  the numeric value where possible, otherwise null
   */
  getNumeric: function(val) {
    return !SC.empty(val) && !isNaN(val) ? Number(val) : null;
  },

  /**
   * @private A private variant of Array.prototype.map that supports the index
   * property.
   */
  map: function(array, f) {
    var o = {};
    return f
        ? array.map(function(d, i) { o.index = i; return f.call(o, d); })
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
  index: function() { return this.index; },

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
  max: function(array, f) {
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
  range: function(start, stop, step) {
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
}



};

DG.isFinite = DG.MathUtilities.isFinite;
DG.getNumeric = DG.MathUtilities.getNumeric;
