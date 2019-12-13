// ==========================================================================
//                            DG.PlotCaseArray
//
//  DG.PlotUtilities is comprised of functions generally useful in plots.
//
//  Copyright (c) 2018 by The Concord Consortium, Inc. All rights reserved.
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

/**
 * PlotCaseArray functions _like_ an array of cases, but the order is determined by a mapping of indices.
 */

DG.PlotUtilities.PlotCaseArray = SC.Object.extend( {
  /**
   * @property [DG.Case]
   */
  _cases: null,
  /**
   * @property [Number]
   */
  _map: null,

  init: function() {
    sc_super();
    this._cases = this._cases || [];
    this._map = this._map || [];
  },

  length: function() {
    return this._map.length;
  }.property( '_map'),

  at: function( iIndex) {
    return this._cases[this._map[iIndex]];
  },

  /**
   * Return the case at the given index in the original array
   * @param iIndex {Number}
   * @return {DG.Case}
   */
  unorderedAt: function( iIndex) {
    return this._cases[iIndex];
  },

  push: function( iCase) {
    this._cases.push( iCase);
    this._map.push( this._cases.length - 1);
  },

  indexOf: function( iCase) {
    return this._cases.indexOf( iCase);
  },

  /**
   * Call the given function once for each case in the order specified by the indices in the _map array.
   * @param iDoF {Function} Signature is (case, index in the original array, index in the map array)
   *      Third parameter seldom (if ever) used.
   */
  forEach: function( iDoF) {
    this._map.forEach( function( iMapValue, iIndex) {
      iDoF( this._cases[iMapValue], iMapValue, iIndex);
    }.bind( this));
  },

  /**
   *
   * @param iDoF {Function} Called once for each case with signature (case, index in mapped order, boolean
   *    for whether the invocation is that last one. Returns true if the looping should continue or false
   *    if the looping should stop
   * @param iEndF {Function} Optional. Called after all looping invocations had ended. No parameters.
   */
  forEachWithInvokeLater: function( iDoF, iEndF) {
    var tLoopIndex = 0,
        tNumCases = this.length(),
        // Get a bit happening early with two iterations.
        tFirstIncrement = Math.min(200, tNumCases / 20),
        tCountdown = (tNumCases > 1000) ? 5 : 0,
        tIncrement = tNumCases - tCountdown * tFirstIncrement,
        tContinue = true,

        loop = function () {
          var tStopIndex = tLoopIndex + (tCountdown > 0 ? tFirstIncrement : tIncrement);
          tCountdown--;
          if (tLoopIndex < tNumCases) {
            for (; tContinue && tLoopIndex < tNumCases && tLoopIndex < tStopIndex; tLoopIndex++) {
              if (iDoF)
                tContinue = iDoF(this._cases[this._map[tLoopIndex]], this._map[tLoopIndex],
                    tLoopIndex === tNumCases - 1);
            }
            if (tContinue)
              this.invokeLater(loop, 100);
          }
          else {
            if (iEndF)
              iEndF();
          }
        }.bind(this);

    loop();
  },

  map: function( iTransF) {
    var tResult = DG.PlotUtilities.PlotCaseArray.create();
    this.forEach( function( iCase, iMapIndex) {
        tResult._cases[ iMapIndex] = iTransF( iCase, iMapIndex);
        tResult._map.push( iMapIndex);
      });
    return tResult;
  },

  filter: function( iBoolF) {
    var tResult = DG.PlotUtilities.PlotCaseArray.create();
    this.forEach( function( iCase, iMapIndex) {
      if( iBoolF( iCase, iMapIndex)) {
        var tCaseIndex = tResult._cases.length;
        tResult._cases.push( iCase);
        tResult._map.push( tCaseIndex);
      }
    }.bind( this));
    return tResult;
  },

  reduce: function( iReduceFunc, accumulator) {
    return this._cases.reduce(iReduceFunc, accumulator);
  },

  toArray: function() {
    return this._cases.slice();
  }
});