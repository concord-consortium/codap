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

  defaultColor: 'black',

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

      var handleDateTime = function() {
        var tLower = this_.getPath('xAxisView.model.lowerBound'),
            tUpper = this_.getPath('xAxisView.model.upperBound'),
            tRange = tUpper - tLower;
        if( tRange < 120) {
          // leave in seconds
          tXVar = 'DG.ScatterPlotModel.secondsLabel'.loc();
        }
        else if( tRange < 60 * 60 * 2) { // 2 hours
          tSlope *= 60; // per minute
          tXVar = 'DG.ScatterPlotModel.minutesLabel'.loc();
        }
        else if( tRange < 3600 * 24 * 2) { // 2 days
          tSlope *= 3600; // per hour
          tXVar = 'DG.ScatterPlotModel.hoursLabel'.loc();
        }
        else {
          tSlope *= 3600 * 24; // per day
          tXVar = 'DG.ScatterPlotModel.daysLabel'.loc();
        }
        tSlopeString = tSlopeNumFormat(tSlope) + " ";
        tInterceptString = tSign = "";
      }.bind( this);

      var kSlopeInterceptForm = 'DG.ScatterPlotModel.slopeIntercept',// y,slope,x,signInt,Int
          tIntercept = this_.getPath('model.intercept'),
          tSlope = this_.getPath('model.slope'),
          tDigits = DG.PlotUtilities.findNeededFractionDigits(
              tSlope, tIntercept,
              this_.get('xAxisView'), this_.get('yAxisView')),
          tIntNumFormat = DG.Format.number().fractionDigits(0, tDigits.interceptDigits),
          tInterceptString = tIntNumFormat(tIntercept),
          tSlopeNumFormat = DG.Format.number().fractionDigits(0, tDigits.slopeDigits),
          tSlopeString = tSlopeNumFormat(tSlope) + " ",
          tSign = (tIntercept < 0) ? " " : " + ",
          tXIsDateTime = this_.getPath('xAxisView.isDateTime'),
          tYVar = this_.getPath('yAxisView.model.firstAttributeName'),
          tXVar = this_.getPath('xAxisView.model.firstAttributeName');
      if( tXIsDateTime) {
        handleDateTime();
      }
      // When the intercept string is zero, don't display it (even if the numeric value is not zero).
      if (tInterceptString === "0")
        tInterceptString = tSign = "";
      // Note that a space has been added to the number part of the slope.
      if (tSlopeString === "1 ")
        tSlopeString = "";
      if (tSlopeString === "0 ") {
        tSlopeString = '';
        tXVar = '';
        tSign = '';
      }
      return kSlopeInterceptForm.loc( tYVar, tSlopeString, tXVar, tSign, tInterceptString);
    }

    function equationForInfiniteSlopeLine() {
      var tDigits = DG.PlotUtilities.findFractionDigitsForAxis( this_.get('xAxisView')),
          tXIntercept = this_.getPath( 'model.xIntercept'),
          tXVar = this_.getPath('xAxisView.model.firstAttributeName');
      return 'DG.ScatterPlotModel.infiniteSlope'.loc( tXVar,
          DG.Format.number().fractionDigits( 0, tDigits)( tXIntercept));
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
      tResult = 'DG.ScatterPlotModel.sumSquares'.loc(tSquaresString);
    }
    return tResult;
  }.property(),

  createElements: function() {
    if( this.myElements && (this.myElements.length > 0))
      return; // already created
    var tPaper = this.get('paper'),
        tLayer = this.getPath('paperSource.layerManager')[DG.LayerNames.kDataTip],
        tDefaultColor = this.get('defaultColor');
    this.lineSeg = tPaper.line( 0, 0, 0, 0)
        .attr({ stroke: tDefaultColor, 'stroke-opacity': 0 });
    this.lineSeg.animatable = true;

    this.backgrndRect = this.get('paper').rect(0, 0, 0, 0)
        .attr({ fill: 'yellow', 'stroke-width': 0, 'fill-opacity': 0.8 });
    // Put the text below the hit segments in z-order so user can still hit the line
    this.equation = tPaper.text( 0, 0, '')
        .attr({ 'stroke-opacity': 0, fill: tDefaultColor })
        .addClass('graph-adornment');
    this.equation.animatable = true;

    // Tune up the line rendering a bit
    this.lineSeg.node.setAttribute('shape-rendering', 'geometric-precision');

    this.myElements = [ this.lineSeg, this.backgrndRect, this.equation ];
    this.myElements.forEach( function( iElement) {
      tLayer.push( iElement);
    });
  }

});

