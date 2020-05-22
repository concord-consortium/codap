// ==========================================================================
//                          DG.UnivariateStats
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

/** @class

  Encapsulates the basic univariate statistics.

 @extends SC.Object
 */
DG.UnivariateStats = SC.Object.extend(
  /** @scope DG.UnivariateStats.prototype */ {

    /**
     * How many cases
     * @property {Number}
     */
    count:0,

    /**
     * Are all values either numbers or blank?
     * @property {DG.Analysis.EAttributeType}
     */
    attributeType:null,

    /**
     * Are all numeric values integers?
     * @property {Boolean}
     */
    dataIsInteger:null,

    /**
     * Sum of values
     * @property {Number}
     */
    sum:null,

    /**
     * Sum of squares of deviations from mean
     * @property {Number}
     */
    squaredDeviations:null,

    /**
     * Smallest value
     * @property {Number}
     */
    rangeMin:null,

    /**
     * Largest value
     * @property {Number}
     */
    rangeMax:null,

    /**
     * Useful as something to notify against when either min or max has (or might have) changed
     * @property{ {min:{Number}, max:{Number}}
     */
    numericRange:function () {
      return { min:this.get( 'rangeMin' ), max:this.get( 'rangeMax' )};
    }.property( 'rangeMin', 'rangeMax' ),

    /**
     * Smallest value greater than zero
     * @property {Number}
     */
    positiveMin:null,

    /**
     * Largest value greater than zero if there is one
     * @property {Number}
     */
    positiveMax:null,

    /**
     * True if count is either undefined or zero
     * @property {Boolean}
     */
    isEmpty:function () {
      return !this.count;
    }.property( 'count' ),

    /**
     * Mean value
     * @property {Number}
     */
    mean:function () {
      return !this.isEmpty() ? this.sum / this.count : NaN;
    }.property( 'count', 'sum' ).cacheable(),

    /**
     * True if count is either undefined or zero
     * @property {Boolean}
     */
    hasRange:function () {
      return DG.isFinite( this.rangeMin ) && DG.isFinite( this.rangeMax );
    }.property( 'rangeMin', 'rangeMax' ).cacheable(),

    /**
     * Return all values to original state
     */
    reset:function () {
      this.count = 0;
      this.attributeType = null;
      this.dataIsInteger = null;
      this.sum = null;
      this.squaredDeviations = null;
      this.rangeMin = null;
      this.rangeMax = null;
      this.positiveMin = null;
      this.positiveMax = null;
  }

  } );

