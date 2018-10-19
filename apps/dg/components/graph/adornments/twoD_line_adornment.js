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

/*global pluralize:true*/

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

  lineColor: function() {
    return this.get('defaultColor');
  }.property(),

  /**
    Concatenated array of ['PropertyName','ObserverMethod'] pairs used for indicating
    which observers to add/remove from the model.
    
    @property   {Array of [{String},{String}]}  Elements are ['PropertyName','ObserverMethod']
   */
  modelPropertiesToObserve: [ ['slope', 'updateToModel'], ['intercept', 'updateToModel'],
                              ['isInterceptLocked', 'updateToModel'],
                              ['isVertical', 'updateToModel'], ['xIntercept', 'updateToModel'],
                              ['sumSquaresResiduals', 'updateToModel'],
                              ['enableMeasuresForSelection', 'enableMeasuresForSelectionDidChange']],

  /**
    The returned string should have a reasonable number of significant digits for the
      circumstances.
    @property { String read only }
  */
  equationString: function() {
    var this_ = this;

    function equationForFiniteSlopeLine() {

      var handleDateTime = function () {
            var tLower = this_.getPath('xAxisView.model.lowerBound'),
                tUpper = this_.getPath('xAxisView.model.upperBound'),
                tRange = tUpper - tLower,
                tSlopeMultiplier = 1;
            if (tRange < 120) {
              // leave in seconds
              tXVar = 'DG.ScatterPlotModel.secondsLabel'.loc();
            }
            else if (tRange < 60 * 60 * 2) { // 2 hours
              tSlopeMultiplier = 60; // per minute
              tXVar = 'DG.ScatterPlotModel.minutesLabel'.loc();

            }
            else if (tRange < 3600 * 24 * 2) { // 2 days
              tSlopeMultiplier = 3600; // per hour
              tXVar = 'DG.ScatterPlotModel.hoursLabel'.loc();
            }
            else if( tRange < 3600 * 24 * 365) { // 365 days
              tSlopeMultiplier = 3600 * 24; // per day
              tXVar = 'DG.ScatterPlotModel.daysLabel'.loc();
            }
            else {
              tSlopeMultiplier = 3600 * 24 * 365.25; // per year
              tXVar = 'DG.ScatterPlotModel.yearsLabel'.loc();
            }
            tSlope *= tSlopeMultiplier;
            tSlopeString = tSlope.toPrecision(3) + " ";
            if (tSlopeString !== "0 ") {  // Implies intercept is meaningless because 0 of x-axis is arbitrary
              tInterceptString = tSign = "";
              tSlopeString += this_.getPath('yAxisView.model.firstAttributeUnit') + ' ';
            }
          },

          getSlopeUnit = function () {
            var tYUnit = this_.getPath('yAxisView.model.firstAttributeUnit'),
                tXUnit = this_.getPath('xAxisView.model.firstAttributeUnit'),
                tSlash = (tXUnit === '') ? '' : '/',
                tSingularX = pluralize.singular( tXUnit);
            tXUnit = SC.empty( tSingularX) ? tXUnit : tSingularX;
            return (tXUnit === '' && tYUnit === '') ? '' :
                      ' ' + tYUnit + tSlash + tXUnit + ')';
          },

          getInterceptUnit = function () {
            var tYUnit = this_.getPath('yAxisView.model.firstAttributeUnit');
            return (tYUnit === '') ? '' : ' ' + tYUnit;
          };

      var kSlopeInterceptForm = 'DG.ScatterPlotModel.slopeIntercept',// y,slope,x,signInt,Int
          tIntercept = this_.getPath('model.intercept'),
          tSlope = this_.getPath('model.slope'),
          tDigits = DG.PlotUtilities.findNeededFractionDigits(
              tSlope, tIntercept,
              this_.get('xAxisView'), this_.get('yAxisView')),
          tIntNumFormat = DG.Format.number().group('').fractionDigits(0, tDigits.interceptDigits),
          tInterceptString = tIntNumFormat(tIntercept) + getInterceptUnit(),
          tSlopeNumFormat = DG.Format.number().group('').fractionDigits(0, tDigits.slopeDigits),
          tSlopeUnit = getSlopeUnit(),
          tSlopeString = (SC.empty(tSlopeUnit) ? "" : "(") + tSlopeNumFormat(tSlope) + tSlopeUnit + " ",
          tSign = (tIntercept < 0) ? " " : " + ",
          tXIsDateTime = this_.getPath('xAxisView.isDateTime'),
          tYVar = this_.getPath('yAxisView.model.firstAttributeName'),
          tXVar = this_.getPath('xAxisView.model.firstAttributeName');
      if (tXIsDateTime) {
        handleDateTime();
        return 'DG.ScatterPlotModel.slopeOnly'.loc( tSlopeString, tXVar);
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
      return kSlopeInterceptForm.loc(tYVar, tSlopeString, tXVar, tSign, tInterceptString);
    }

    function equationForInfiniteSlopeLine() {
      var tDigits = DG.PlotUtilities.findFractionDigitsForAxis( this_.get('xAxisView')),
          tXIntercept = this_.getPath( 'model.xIntercept'),
          tXVar = this_.getPath('xAxisView.model.firstAttributeName');
      return 'DG.ScatterPlotModel.infiniteSlope'.loc( tXVar,
          DG.Format.number().group('').fractionDigits( 0, tDigits)( tXIntercept));
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
    var this_ = this,
        kBackgroundOpacity = 0.6;
    if (this.myElements && (this.myElements.length > 0))
      return; // already created
    var tPaper = this.get('paper'),
        tLayer = this.getPath('paperSource.layerManager')[DG.LayerNames.kDataTip],
        tLineColor = this.get('lineColor'),
        tEquationColor = DG.color(DG.ColorUtilities.colorNameToHexColor(tLineColor)).darker(2).color;
    this.lineSeg = tPaper.line(0, 0, 0, 0)
        .attr({stroke: tLineColor, 'stroke-opacity': 0});
    this.lineSeg.animatable = true;

    function highlightEquation( iEquation, iBackgroundRect) {
      tLayer.bringToFront( iBackgroundRect);
      tLayer.bringToFront( iEquation);
      iBackgroundRect.attr('fill-opacity', 1);
    }

    this.backgrndRect = this.get('paper').rect(0, 0, 0, 0)
        .attr({fill: 'yellow', 'stroke-width': 0, 'fill-opacity': kBackgroundOpacity})
        .hover(function () {
              highlightEquation( this_.equation, this);
            },
            function () {
              this.attr('fill-opacity', kBackgroundOpacity);
            })
        .touchstart(function () {
          highlightEquation( this_.equation, this);
        })
        .touchend(function () {
          this.attr('fill-opacity', kBackgroundOpacity);
        });
    // Put the text below the hit segments in z-order so user can still hit the line
    this.equation = tPaper.text(0, 0, '')
        .attr({'stroke-opacity': 0, fill: tEquationColor })
        .addClass('dg-graph-adornment')
        .hover(function () {
              highlightEquation(this, this_.backgrndRect);
            },
            function () {
              this_.backgrndRect.attr('fill-opacity', kBackgroundOpacity);
            })
        .touchstart(function () {
          highlightEquation(this, this_.backgrndRect);
        })
        .touchend(function () {
          this_.backgrndRect.attr('fill-opacity', kBackgroundOpacity);
        });
    this.equation.animatable = true;

    // Tune up the line rendering a bit
    this.lineSeg.node.setAttribute('shape-rendering', 'geometric-precision');

    this.myElements = [this.lineSeg, this.backgrndRect, this.equation];
    this.myElements.forEach(function (iElement) {
      tLayer.push(iElement);
    });
  },

  enableMeasuresForSelectionDidChange:function() {
    // Subclasses may override
  }

});

