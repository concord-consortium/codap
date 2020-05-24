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
  /**
   * element on top of lineSeg, transparent, thicker
   * @property { Raphael line element }
   */
  coverSeg: null,

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
                              ['equationCoords', 'updateToModel']],

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
                tSingularX;
            if (tXUnit.match(/((^[sS])|(\W[sS]))$/)) {
              tSingularX = tXUnit;
            }
            else {
              tSingularX = pluralize.singular(tXUnit);
            }
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
          tSlopeAsString = tSlopeNumFormat( tSlope),
          tSlopeString = (SC.empty(tSlopeUnit) ? "" : "(") + tSlopeAsString + tSlopeUnit + " ",
          tSign = (tIntercept < 0) ? " " : " + ",
          tXIsDateTime = this_.getPath('xAxisView.isDateTime'),
          tYVar = this_.getPath('yAxisView.model.firstAttributeName'),
          tXVar = this_.getPath('xAxisView.model.firstAttributeName');
      if (tXIsDateTime) {
        handleDateTime();
        return 'DG.ScatterPlotModel.slopeOnly'.loc( tSlopeString, tXVar);
      }
      // When the intercept string is zero, don't display it (even if the numeric value is not zero).
      if (tIntNumFormat(tIntercept) === "0")
        tInterceptString = tSign = "";
      if (tSlopeAsString === "1" && SC.empty( tSlopeUnit))
        tSlopeString = "";
      if (tSlopeAsString === "0") {
        tSlopeString = '';
        tXVar = '';
        tSign = '';
      }
      return kSlopeInterceptForm.loc(tYVar, tSlopeString, tXVar, tSign, tInterceptString);
    }

    function equationForInfiniteSlopeLine() {
      var tDigits = DG.PlotUtilities.findFractionDigitsForAxis( this_.get('xAxisView')),
          tXIntercept = this_.getPath( 'model.xIntercept'),
          tXVar = this_.getPath('xAxisView.model.firstAttributeName'),
          tXUnit = this_.getPath('xAxisView.model.firstAttributeUnit');
      return 'DG.ScatterPlotModel.infiniteSlope'.loc( tXVar,
          DG.Format.number().group('').fractionDigits( 0, tDigits)( tXIntercept),
          tXUnit);
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
        tDataTipLayer = this.getPath('paperSource.layerManager')[DG.LayerNames.kDataTip],
        tAdornmentLayer = this.getPath('paperSource.layerManager')[DG.LayerNames.kAdornments],
        tLineColor = this.get('lineColor'),
        tEquationColor = DG.color(DG.ColorUtilities.colorNameToHexColor(tLineColor)).darker(1).color,
        tOriginalCoordinates, tReturnPoint;

    this.lineSeg = tPaper.line(0, 0, 0, 0)
        .attr({stroke: tLineColor, 'stroke-opacity': 0});
    this.lineSeg.animatable = true;

    this.coverSeg = tPaper.line(0, 0, 0, 0)
        .attr({stroke: tLineColor, 'stroke-opacity': 0.001, 'stroke-width': 6 })
        .hover(highlightElements, unHighlightElements);
    this.coverSeg.animatable = false;

    function highlightElements() {
      tDataTipLayer.bringToFront( this_.backgrndRect);
      tDataTipLayer.bringToFront( this_.equation);
      this_.backgrndRect.attr('fill-opacity', 1);
      this_.lineSeg.attr('stroke-width', 2);
    }

    function unHighlightElements() {
      this_.backgrndRect.attr('fill-opacity', kBackgroundOpacity);
      this_.lineSeg.attr('stroke-width', 1);
    }

    function beginDrag( iWindowX, iWindowY) {

      function getCurrentCoords() {
        var tXCenter = this_.backgrndRect.attr('x') + this_.backgrndRect.attr('width') / 2,
            tYCenter = this_.backgrndRect.attr('y') + this_.backgrndRect.attr('height') / 2;
        return {
          proportionCenterX: tXCenter / this_.get('paper').width,
          proportionCenterY: tYCenter / this_.get('paper').height
        };
      }

      tOriginalCoordinates = this_.getPath('model.equationCoords');
      tReturnPoint = SC.none( tOriginalCoordinates) ? getCurrentCoords() : tOriginalCoordinates;
    }

    function continueDrag( idX, idY) {
      var tPaper = this_.get('paper');
      this_.setPath( 'model.equationCoords', {
        proportionCenterX: tReturnPoint.proportionCenterX + idX / tPaper.width,
        proportionCenterY: tReturnPoint.proportionCenterY + idY / tPaper.height});
    }

    function endDrag( iEvent) {
      var tOriginal = tOriginalCoordinates,
          tNew;
      DG.UndoHistory.execute(DG.Command.create({
        name: "graph.repositionEquation",
        undoString: 'DG.Undo.graph.repositionEquation',
        redoString: 'DG.Redo.graph.repositionEquation',
        log: "Moved equation from %@ to %@".fmt( tOriginal, this.getPath('model.coordinates')),
        execute: function() {
          tNew = this_.getPath('model.equationCoords');
        }.bind( this),
        undo: function() {
          this_.setPath('model.equationCoords', tOriginal);
        }.bind( this),
        redo: function() {
          this_.setPath('model.equationCoords', tNew);
        }.bind( this)
      }));
    }

    this.backgrndRect = this.get('paper').rect(0, 0, 0, 0)
        .attr({fill: 'yellow', 'stroke-width': 0, 'fill-opacity': kBackgroundOpacity, cursor: 'move'})
        .hover(highlightElements, unHighlightElements)
        .touchstart(highlightElements)
        .touchend(unHighlightElements)
        .drag( continueDrag, beginDrag, endDrag);
    // Put the text below the hit segments in z-order so user can still hit the line
    this.equation = tPaper.text(0, 0, '')
        .attr({'stroke-opacity': 0, fill: tEquationColor, cursor: 'move' })
        .addClass('dg-graph-adornment')
        .hover(highlightElements, unHighlightElements)
        .touchstart(highlightElements)
        .touchend(unHighlightElements)
        .drag( continueDrag, beginDrag, endDrag);
    this.equation.animatable = true;

    // Tune up the line rendering a bit
    this.lineSeg.node.setAttribute('shape-rendering', 'geometric-precision');

    this.myElements = [this.lineSeg, this.coverSeg, this.backgrndRect, this.equation];
    tDataTipLayer.push(this.backgrndRect);
    tDataTipLayer.push(this.equation);
    tDataTipLayer.push( this.coverSeg);
    tAdornmentLayer.push(this.lineSeg);
  },

  positionEquationAndBackground: function() {
    var this_ = this,
        tModel = this.get('model');
    if( !tModel.get('isVisible')) // Only update if we're visible
      return;
    tModel.recomputeSlopeAndInterceptIfNeeded();
    var tSlope = tModel.get('slope'),
        tIntercept = tModel.get('intercept');
    this.showElements();
    if( this.myElements === null)
      this.createElements();
    var tXAxisView = this.get( 'xAxisView'),
        tYAxisView = this.get( 'yAxisView'),
        tYLowerBound = tYAxisView.getPath('model.lowerBound'),
        tYUpperBound = tYAxisView.getPath('model.upperBound'),
        // Form of tIntercepts is { pt1: { x, y }, pt2: { x, y }} in world coordinates
        tIntercepts = (tModel.get('isVertical')) ?
            { pt1: { x: tModel.get('xIntercept'), y: tYLowerBound },
              pt2: { x: tModel.get('xIntercept'), y: tYUpperBound }} :
            DG.PlotUtilities.lineToAxisIntercepts(
                tSlope, tIntercept, tXAxisView.get('model'), tYAxisView.get('model') );

    function worldToScreen( iWorld) {
      return { x: tXAxisView.dataToCoordinate( iWorld.x),
        y: tYAxisView.dataToCoordinate( iWorld.y) };
    }

    function swapIntercepts() {
      var tSwap = tIntercepts.pt1;
      tIntercepts.pt1 = tIntercepts.pt2;
      tIntercepts.pt2 = tSwap;
    }

    function computeBestCoords() {
      var tTextAnchor = worldToScreen({ x: (tIntercepts.pt1.x + tIntercepts.pt2.x) / 2,
            y: (tIntercepts.pt1.y + tIntercepts.pt2.y) / 2 });
      tBackgrndX = tTextAnchor.x - tTextWidth / 2;
      // We don't want the equation to sit on the line
      tTextAnchor.y += 3 * tTextBox.height / 2;
      // Keep the equation inside the plot bounds
      tTextAnchor.y = Math.min( Math.max( tTextAnchor.y, tTextBox.height / 2), tPaperHeight - tTextBox.height / 2);
      this_.backgrndRect.attr({ x: tBackgrndX, y: tTextAnchor.y - tTextBox.height / 2,
        width: tTextWidth, height: tTextBox.height });
      this_.equation.attr( { x: tTextAnchor.x, y: tTextAnchor.y, 'text-anchor': 'middle'});
    }

    function computeCoordsFromModel() {
      var tBoxCenterX = tEquationCoords.proportionCenterX * tPaperWidth,
          tBoxCenterY = tEquationCoords.proportionCenterY * tPaperHeight,
          tBoxX = tBoxCenterX - tTextWidth / 2,
          tBoxY = tBoxCenterY - tTextBox.height / 2;
      this_.backgrndRect.attr({ x: tBoxX, y: tBoxY, width: tTextWidth, height: tTextBox.height});
      this_.equation.attr( { x: tBoxCenterX, y: tBoxCenterY, 'text-anchor': 'middle'});
    }

    if( tIntercepts.pt2.x < tIntercepts.pt1.x)
      swapIntercepts();

    var kPadding = 10,
        tPaperWidth = this.get('paper').width,
        tPaperHeight = this.get('paper').height,
        tLineColor = this.get('lineColor'),
        tEquationColor = DG.color(DG.ColorUtilities.colorNameToHexColor(tLineColor)).darker(1).color,
        tEquationCoords = this.getPath('model.equationCoords'),
        tScreen1 = worldToScreen( tIntercepts.pt1),
        tScreen2 = worldToScreen( tIntercepts.pt2),
        tEquation = this.get('equation').transform(''),
        tTextBox, tTextWidth, tBackgrndX;

    DG.RenderingUtilities.updateLine( this.lineSeg, tScreen1, tScreen2);
    DG.RenderingUtilities.updateLine( this.coverSeg, tScreen1, tScreen2);

    tTextBox = tEquation.attr( { text: this.get('equationString'), fill: tEquationColor }).getBBox();
    tTextWidth = tTextBox.width;
    tTextWidth += kPadding; // padding
    if( tTextWidth > tPaperWidth) {
      var tTransform = tPaperWidth / tTextWidth;
      tEquation.transform( 's' + tTransform);
      tTextWidth = tPaperWidth;
    }
    if( SC.none(tEquationCoords)) {
      computeBestCoords();
    }
    else {
      computeCoordsFromModel();
    }

    this.lineSeg.attr({ stroke: tLineColor });
  },

  enableMeasuresForSelectionDidChange:function() {
    // Subclasses may override
  }

});

