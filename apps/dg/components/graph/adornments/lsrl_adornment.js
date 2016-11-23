// ==========================================================================
//                      DG.LSRLAdornment
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

sc_require('components/graph/adornments/twoD_line_adornment');

/** @class  Draws a least squares regression line.

  @extends DG.TwoDLineAdornment
*/
DG.LSRLAdornment = DG.TwoDLineAdornment.extend(
/** @scope DG.LSRLAdornment.prototype */ 
{
  equationString: function() {
    var tResult = sc_super(),
        tFormat = DG.Format.number().fractionDigits( 0, 3),
        tRSquared = this.getPath('model.rSquared'),
        tRSquaredString = SC.none( tRSquared) ? '' : tFormat( tRSquared);

    return tResult + 'DG.ScatterPlotModel.rSquared'.loc() + tRSquaredString + this.get('sumResidSquaredString');
  }.property(),

  /**
    Make the pieces of the line. This only needs to be done once.
  */
  createElements: function() {
    if( this.myElements && (this.myElements.length > 0))
      return; // already created
    var tPaper = this.get('paper'),
        tLayer = this.get('layer');
    this.lineSeg = tPaper.line( 0, 0, 0, 0)
              .attr({ stroke: DG.PlotUtilities.kDefaultLSRLColor,
                      'stroke-opacity': 0 });
    this.lineSeg.animatable = true;

    this.backgrndRect = this.get('paper').rect(0, 0, 0, 0)
        .attr({ fill: 'white', 'stroke-width': 0, 'fill-opacity': 0.6 });
    // Put the text below the hit segments in z-order so user can still hit the line
    this.equation = tPaper.text( 0, 0, '')
        .attr({ font: 'caption', opacity: 0, stroke: DG.PlotUtilities.kDefaultLSRLColor });
    this.equation.animatable = true;

    // Tune up the line rendering a bit
    this.lineSeg.node.setAttribute('shape-rendering', 'geometric-precision');

    this.myElements = [ this.lineSeg, this.backgrndRect, this.equation ];
    this.myElements.forEach( function( iElement) {
      tLayer.push( iElement);
    });
    return this.myElements;
  },

  updateToModel: function() {
    var tModel = this.get('model');
    if( !tModel.get('isVisible')) // Only update if we're visible
        return;
    tModel.recomputeSlopeAndInterceptIfNeeded();
    var tSlope = tModel.get('slope'),
        tIntercept = tModel.get('intercept');
    if( !isFinite( tSlope) || !isFinite( tIntercept)) {
      this.hideElements();
      return;
    }
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

    if( tIntercepts.pt2.x < tIntercepts.pt1.x)
      swapIntercepts();

    var tTextAnchor = worldToScreen({ x: (tIntercepts.pt1.x + tIntercepts.pt2.x) / 2,
                                      y: (tIntercepts.pt1.y + tIntercepts.pt2.y) / 2 }),
        tPaperWidth = this.get('paper').width,
        tPaperHeight = this.get('paper').height,
        tTextBox, tTextWidth, tAlign, tBackgrndX;

    DG.RenderingUtilities.updateLine( this.lineSeg,
                worldToScreen( tIntercepts.pt1), worldToScreen( tIntercepts.pt2));

    tTextBox = this.equation.attr( { text: this.get('equationString') }).getBBox();
    tTextWidth = tTextBox.width;
    tTextWidth += 10; // padding
    if( tTextAnchor.x < tPaperWidth / 2) {
      tAlign = 'start';
      tTextAnchor.x = Math.min( tTextAnchor.x, tPaperWidth - tTextWidth);
      tBackgrndX = tTextAnchor.x;
    }
    else {
      tAlign = 'end';
      tTextAnchor.x = Math.max( tTextAnchor.x, tTextWidth);
      tBackgrndX = tTextAnchor.x - tTextBox.width;
    }
    // We don't want the equation to sit on the line
    tTextAnchor.y += tTextBox.height / 2;
    // Keep the equation inside the plot bounds
    tTextAnchor.y = Math.min( Math.max( tTextAnchor.y, tTextBox.height / 2), tPaperHeight - tTextBox.height / 2);

    // At last set the equation attributes
    this.backgrndRect.attr({ x: tBackgrndX, y: tTextAnchor.y - tTextBox.height / 2,
      width: tTextWidth, height: tTextBox.height });
    this.equation.attr( { x: tTextAnchor.x, y: tTextAnchor.y, 'text-anchor': tAlign,
                text: this.get('equationString') });
  }

});

