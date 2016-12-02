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
sc_require('components/graph/utilities/plot_utilities');

/** @class  Draws a least squares regression line.

  @extends DG.TwoDLineAdornment
*/
DG.LSRLAdornment = DG.TwoDLineAdornment.extend(
/** @scope DG.LSRLAdornment.prototype */ 
{
  defaultColor: DG.PlotUtilities.kDefaultLSRLColor,

  equationString: function() {
    var tResult = sc_super(),
        tFormat = DG.Format.number().fractionDigits( 0, 3),
        tRSquared = this.getPath('model.rSquared'),
        tRSquaredString = SC.none( tRSquared) ? '' : tFormat( tRSquared);

    return tResult + 'DG.ScatterPlotModel.rSquared'.loc( tRSquaredString) + this.get('sumResidSquaredString');
  }.property(),

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
    tTextAnchor.y += 3 * tTextBox.height / 2;
    // Keep the equation inside the plot bounds
    tTextAnchor.y = Math.min( Math.max( tTextAnchor.y, tTextBox.height / 2), tPaperHeight - tTextBox.height / 2);

    // At last set the equation attributes
    this.backgrndRect.attr({ x: tBackgrndX, y: tTextAnchor.y - tTextBox.height / 2,
      width: tTextWidth, height: tTextBox.height });
    this.equation.attr( { x: tTextAnchor.x, y: tTextAnchor.y, 'text-anchor': tAlign,
                text: this.get('equationString') });
  }

});

