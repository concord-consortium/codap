// ==========================================================================
//                      DG.TwoDLineAdornment
//
//  Author:   William Finzer
//
//  Copyright (c) 2016 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('components/graph/adornments/plot_adornment');

/** @class  Draws a line.

  @extends DG.PlotAdornment
*/
DG.TwoDLineAdornment = DG.PlotAdornment.extend(
/** @scope DG.TwoDLineAdornment.prototype */
{
  /**
    The line itself is a single line element
    @property { Raphael line element }
  */
  lineSeg: null,

  equation: null,

  backgrndRect:null,

  /**
    Concatenated array of ['PropertyName','ObserverMethod'] pairs used for indicating
    which observers to add/remove from the model.
    
    @property   {Array of [{String},{String}]}  Elements are ['PropertyName','ObserverMethod']
   */
  modelPropertiesToObserve: [ ['slope', 'updateToModel'], ['intercept', 'updateToModel'],
                              ['isInterceptLocked', 'updateToModel'],
                              ['isVertical', 'updateToModel'], ['xIntercept', 'updateToModel'],
                              ['sumSquaresResiduals', 'updateToModel']],

  /**
    The returned string should have a reasonable number of significant digits for the
      circumstances.
    @property { String read only }
  */
  equationString: function() {
    var this_ = this;

    function equationForFiniteSlopeLine() {
      var tIntercept = this_.getPath('model.intercept'),
        tSlope = this_.getPath('model.slope'),
        tDigits = DG.PlotUtilities.findNeededFractionDigits(
                tSlope, tIntercept,
                this_.get('xAxisView'), this_.get('yAxisView')),
        tIntNumFormat = DG.Format.number().fractionDigits( 0, tDigits.interceptDigits),
        tInterceptString = tIntNumFormat( tIntercept),
        tSlopeNumFormat = DG.Format.number().fractionDigits( 0, tDigits.slopeDigits),
        tSlopeString = tSlopeNumFormat( tSlope) + " ",
        tSign = (tIntercept < 0) ? " " : " + ",
        tYVar = this_.getPath('yAxisView.model.firstAttributeName'),
        tXVar = this_.getPath('xAxisView.model.firstAttributeName'),
        tFirstTerm;
      // When the intercept string is zero, don't display it (even if the numeric value is not zero).
      if( tInterceptString === "0")
        tInterceptString = tSign = "";
      // Note that a space has been added to the number part of the slope.
      if( tSlopeString === "1 ")
        tSlopeString = "";
      if( tSlopeString === "0 ") {
        tFirstTerm = '';
        tSign = '';
      }
      else
        tFirstTerm = tSlopeString + tXVar;
      return tYVar + " = " + tFirstTerm + tSign + tInterceptString;
    }

    function equationForInfiniteSlopeLine() {
      var tDigits = DG.PlotUtilities.findFractionDigitsForAxis( this_.get('xAxisView')),
          tXIntercept = this_.getPath( 'model.xIntercept'),
          tXVar = this_.getPath('xAxisView.model.firstAttributeName');
      return tXVar + " = " + DG.Format.number().fractionDigits( 0, tDigits)( tXIntercept);
    }

    if( this.getPath( 'model.isVertical'))
      return equationForInfiniteSlopeLine();
    else
      return equationForFiniteSlopeLine();

  }.property('model.intercept', 'model.slope', 'model.isVertical', 'model.xIntercept',
              'xAxisView.model.firstAttributeName', 'yAxisView.model.firstAttributeName' ).cacheable(),

  sumResidSquaredString: function() {
    var tResult = '';
    if( this.getPath('model.showSumSquares')) {
      var tSumSquares = this.getPath('model.sumSquaresResiduals'),
          tMaxDec = tSumSquares > 100 ? 0 : 3,
          tFormat = DG.Format.number().fractionDigits(0, tMaxDec),
          tSquaresString = SC.none(tSumSquares) ? '' : tFormat(tSumSquares);
      tResult = ', ' + 'DG.ScatterPlotModel.sumSquares'.loc() + tSquaresString;
    }
    return tResult;
  }.property()

});

