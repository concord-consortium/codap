// ==========================================================================
//                            DG.PlotUtilities
//
//  DG.PlotUtilities is comprised of functions generally useful in plots.
//
//  Copyright ©2013 KCP Technologies, Inc., a McGraw-Hill Education Company
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

DG.PlotUtilities = {

  kAxisColor: "#ccc",
  kRuleColor: '#ddd',   // graph background grid lines
  kRuleWidth: 1,
  kZeroLineColor: '#555',
  kZeroLineWidth: 1,
  kDefaultMovableLineColor: "steelblue",
  kLineHighlightColor: "rgba(255, 0, 0, 0.3)",
  kPlotCellFill: 'lightgoldenrodyellow',
  kPlotCellStroke: "rgba(255, 255, 255, 0)",  // transparent
  kStrokeDarkerFactor: 3,
  kPointRadiusLogBase: 2.0, // reduce point radius from max by log of (num. cases) base (LogBase).
  kPointRadiusMax: 10,
  kPointRadiusMin: 5,
  kDefaultPointOpacity: 0.85,
  kDefaultStripWidth: 4,
  kMarqueeColor: "rgba(128, 128, 128, 0.3)",
  kDotClassName: 'data-dot',
  kSelectedDotClassName: 'data-dot-selected',
  kColoredDotClassName: 'data-dot-colored',
  kSelectedColoredDotClassName: 'data-dot-colored-selected',
  kDotClassPattern: /data-dot[a-z\-]*/g, // pattern that matches all 4 Dot Class names above
  kToolTipClassName: 'data-tip',
  kToolTipShadowClassName: 'data-tip-shadow',
  kToolTipTextClassName: 'data-tip-text',
  kStripClassName: 'data-strip',
  kSelectedStripClassName: 'data-strip-selected',
  kColoredStripClassName: 'data-strip-colored',
  kSelectedColoredStripClassName: 'data-strip-colored-selected',
  kLegendKey: 'legend-key',
  kLegendKeyName: 'legend-key-name',
  kDefaultAnimationTime: 1000,  // milliseconds
  kDataTipShowTime: 500, // milliseconds delay time before data tips appear
  kHighlightShowTime: 100, // milliseconds delay time before adornment highlighting appears
  kHighlightHideTime: 250, // milliseconds delay time before various tips/highlighting disappears
  kDataHoverTransform: 's1.5',  // scale 1.5 times on hover
  kDataCreateTransform: 's2',   // scale 2 times on create


  //  DG.PlotUtilities.lineToAxisIntercepts
  //
  //  Return the two points in logical coordinates where the line with the given
  //  iSlope and iIntercept intersects the rectangle defined by the upper and lower
  //  bounds of the two axes.
  //  The returned object has the form
  //    { pt1: { x, y }, pt2: { x, y }}
  lineToAxisIntercepts: function( iSlope, iIntercept, iXAxis, iYAxis) {

    function getLogicalBoundsRect() {
      return {
        left: iXAxis.get('lowerBound'),
        top: iYAxis.get('upperBound'),
        right: iXAxis.get('upperBound'),
        bottom: iYAxis.get('lowerBound')
      };
    }

    var tX1, tY1, tX2, tY2,
      tLogicalBounds = getLogicalBoundsRect();
    // Things can get hairy for nearly horizontal or nearly vertical lines.
    // This conditional takes care of that.
    if (Math.abs( iSlope) > 1) {
      tY1 = tLogicalBounds.bottom;
      tX1 = (tY1 - iIntercept) / iSlope;
      if (tX1 < tLogicalBounds.left) {
        tX1 = tLogicalBounds.left;
        tY1 = iSlope * tX1 + iIntercept;
      }
      else if (tX1 > tLogicalBounds.right) {
        tX1 = tLogicalBounds.right;
        tY1 = iSlope * tX1 + iIntercept;
      }

      tY2 = tLogicalBounds.top;
      tX2 = (tY2 - iIntercept) / iSlope;
      if (tX2 > tLogicalBounds.right) {
        tX2 = tLogicalBounds.right;
        tY2 = iSlope * tX2 + iIntercept;
      }
      else if (tX2 < tLogicalBounds.left) {
        tX2 = tLogicalBounds.left;
        tY2 = iSlope * tX2 + iIntercept;
      }
    }
    else {
      tX1 = tLogicalBounds.left;
      tY1 = iSlope * tX1 + iIntercept;
      if (tY1 < tLogicalBounds.bottom) {
        tY1 = tLogicalBounds.bottom;
        tX1 = (tY1 - iIntercept) / iSlope;
      }
      else if (tY1 > tLogicalBounds.top) {
        tY1 = tLogicalBounds.top;
        tX1 = (tY1 - iIntercept) / iSlope;
      }

      tX2 = tLogicalBounds.right;
      tY2 = iSlope * tX2 + iIntercept;
      if (tY2 > tLogicalBounds.top) {
        tY2 = tLogicalBounds.top;
        tX2 = (tY2 - iIntercept) / iSlope;
      }
      else if (tY2 < tLogicalBounds.bottom) {
        tY2 = tLogicalBounds.bottom;
        tX2 = (tY2 - iIntercept) / iSlope;
      }
    }

    // It is helpful to keep x1 < x2
    if (tX1 > tX2) {
      var tmp = tX1;
      tX1 = tX2;
      tX2 = tmp;

      tmp = tY1;
      tY1 = tY2;
      tY2 = tmp;
    }
    return {
      pt1: { x: tX1, y: tY1 },
      pt2: { x: tX2, y: tY2 }
    };
  },

  /**
   * Return a point in screen coordinates that is closest to the given point (scrn coords)
   * and on the line (in world coords).
   * @param iPt { x: <Number> y: <Number } in screen coords
   * @param iLine { slope: <Number> intercept: <Number> } in world coordinates
   * @param iXAxis { DG.CellLinearAxisView }
   * @param iYAxis { DG.CellLinearAxisView }
   * @return { x: <Number> y: <Number> } in screen coords
   */
  closestScreenPtGivenScreenPtAndWorldLine: function( iPt, iLine, iXAxis, iYAxis) {
    var tWorldX = iXAxis.coordinateToData( iPt.x),
        tWorldY = iYAxis.coordinateToData( iPt.y),
        tWorldResX = (iLine.slope === 0) ? tWorldX :
                           (tWorldY - iLine.intercept + (tWorldX / iLine.slope)) /
                                (iLine.slope + (1 / iLine.slope)),
        tWorldResY = iLine.slope * tWorldResX + iLine.intercept;
    return { x: iXAxis.dataToCoordinate( tWorldResX),
             y: iYAxis.dataToCoordinate( tWorldResY) };
  },

  //  DG.PlotUtilities.lineIntersectsPlotArea
  //
  // Does the line with the given slope and intercept intersect the
  // plot area defined by the two axes?
  // This algorithm does not work for lines with infinite slope. Caller must check.
  lineIntersectsPlotArea: function( iSlope, iIntercept, iXAxis, iYAxis) {
    DG.assert( isFinite( iSlope));
    var tXLowerBounds = iXAxis.get('lowerBound'),
        tXUpperBounds = iXAxis.get('upperBound'),
        tYLowerBounds = iYAxis.get('lowerBound'),
        tYUpperBounds = iYAxis.get('upperBound');

    // Try each border in turn
    return DG.MathUtilities.isInRange( iSlope * tXLowerBounds + iIntercept,
                tYLowerBounds, tYUpperBounds) ||
           DG.MathUtilities.isInRange( iSlope * tXUpperBounds + iIntercept,
                tYLowerBounds, tYUpperBounds) ||
           DG.MathUtilities.isInRange( (tYLowerBounds - iIntercept) / iSlope,
                tXLowerBounds, tXUpperBounds) ||
           DG.MathUtilities.isInRange( (tYUpperBounds - iIntercept) / iSlope,
                tXLowerBounds, tXUpperBounds);
  },

  /**
   *
   * @param iPt {x:{Number}, y:{Number}}
   * @param iXAxis
   * @param iYAxis
   * @return {Boolean}
   */
  isPointInPlotArea: function( iPt, iXAxis, iYAxis) {
    return DG.MathUtilities.isInRange( iPt.x, iXAxis.get('lowerBound'), iXAxis.get('upperBound')) &&
           DG.MathUtilities.isInRange( iPt.y, iYAxis.get('lowerBound'), iYAxis.get('upperBound'));
  },

  /**
    Return the number of fraction digits that should be displayed in the
    world value for an axis coordinate so that the position will be given
    to within one screen pixel.
    @param {DG.CellLinearAxisView}
    @return {Number}
  */
  findFractionDigitsForAxis: function( iAxisView) {
    var tMiddle = (iAxisView.get('pixelMin') + iAxisView.get('pixelMax')) / 2,
        tDelta = iAxisView.coordinateToData( tMiddle) -
                            iAxisView.coordinateToData( tMiddle + 1),
        tLogDelta =  Math.floor( Math.log( Math.abs( tDelta)) / Math.LN10);
        return Math.max( -tLogDelta, 0);
  },

  /**
    Return the number of fraction digits that will work reasonably well to describe a value
    belonging to a set with the given range.
    @param {min: {Number}, max: {Number}}
    @return {Number}
  */
  findFractionDigitsForRange: function( iRange) {
    return (iRange.max - iRange.min === 0) ? 2 :
                  Math.max(-Math.floor(Math.log((iRange.max-iRange.min) / 1000)/Math.LN10), 0);
  },

  /**
    Return the number of fraction digits that should be displayed in the
    equation of a line so that it won't vary by more than a pixel from the
    actual line in the frame set by the two axes.
    This algorithm does not work for lines with infinite slope. Caller must check.
    @param {Number} The actual slope of the line
    @param {Number} Intercept of the line
    @param {DG.CellLinearAxisView}
    @param {DG.CellLinearAxisView}
    @return {{slopeDigits: {Number}, interceptDigits: {Number}}}
  */
  findNeededFractionDigits: function( iSlope, iIntercept, iXAxisView, iYAxisView) {
    var kMaxDigits = 12,  // Never try for more than this
        tXAxisModel = iXAxisView.get('model'),
        tYAxisModel = iYAxisView.get('model'),
        tCurrCoords, tTrialCoords,
        tGreatestDiff,
        tApproxIntercept, tApproxSlope,
        oInterceptDigits = 2, oSlopeDigits = 3;

    function convertToScreen( iWorldPts) {
      iWorldPts.pt1.x = iXAxisView.dataToCoordinate( iWorldPts.pt1.x);
      iWorldPts.pt1.y = iYAxisView.dataToCoordinate( iWorldPts.pt1.y);
      iWorldPts.pt2.x = iXAxisView.dataToCoordinate( iWorldPts.pt2.x);
      iWorldPts.pt2.y = iYAxisView.dataToCoordinate( iWorldPts.pt2.y);
      return iWorldPts;
    }

    function greatestDiff() {
      var tDiff;
      tDiff = Math.max( Math.abs( tTrialCoords.pt1.x - tCurrCoords.pt1.x),
                    Math.abs( tTrialCoords.pt1.y - tCurrCoords.pt1.y));
      tDiff = Math.max( tDiff, Math.abs( tTrialCoords.pt2.x - tCurrCoords.pt2.x));
      tDiff = Math.max( tDiff, Math.abs( tTrialCoords.pt2.y - tCurrCoords.pt2.y));
      return tDiff;
    }

    DG.assert( isFinite( iSlope));

    if( isNaN( iSlope) || isNaN( iIntercept)) {
      return { slopeDigits: 0, interceptDigits: 0 };
    }

    // { pt1: { x, y }, pt2: { x, y }}
    tCurrCoords = convertToScreen( DG.PlotUtilities.lineToAxisIntercepts(
                    iSlope, iIntercept, tXAxisModel, tYAxisModel));

    do {  // Intercept
      // { { roundedValue: {Number}, decPlaces: {Number} }}
      tApproxIntercept = DG.MathUtilities.roundToSignificantDigits(
                  iIntercept, oInterceptDigits);
      // Compute the approximated values
      tTrialCoords = convertToScreen( DG.PlotUtilities.lineToAxisIntercepts(
                iSlope, tApproxIntercept.roundedValue, tXAxisModel, tYAxisModel));
      tGreatestDiff = greatestDiff();
      if (tGreatestDiff > 1.0)
        oInterceptDigits += 1;
    } while ((tGreatestDiff > 1.0) && (oInterceptDigits < kMaxDigits));

    do {
      tApproxSlope = DG.MathUtilities.roundToSignificantDigits(
                  iSlope, oSlopeDigits);
      tTrialCoords = convertToScreen( DG.PlotUtilities.lineToAxisIntercepts(
                tApproxSlope.roundedValue, iIntercept, tXAxisModel, tYAxisModel));
      tGreatestDiff = greatestDiff();
      if (tGreatestDiff > 1.0)
        oSlopeDigits += 1;
    } while ((tGreatestDiff > 1.0) && (oSlopeDigits < kMaxDigits));

    // So far we've computed the number of significant digits needed. But we need to return
    //  the number of fractional digits.
    if( Math.abs(iSlope) > 1)
      oSlopeDigits = Math.max( 0, oSlopeDigits - Math.floor( Math.log( Math.abs( iSlope)) / Math.LN10) - 1);
    if( Math.abs( iIntercept) > 1)
      oInterceptDigits = Math.max( 0, oInterceptDigits - Math.floor( Math.log( Math.abs( iIntercept)) / Math.LN10) - 1);

    return { slopeDigits: oSlopeDigits, interceptDigits: oInterceptDigits };
  },

  doCreateCircleAnimation: function( iCircle) {
    iCircle.attr( { 'fill-opacity': 0, 'stroke-opacity': 0 });
    iCircle.animate({ 'fill-opacity': this.kDefaultPointOpacity, 'stroke-opacity': 1 },
      this.kDefaultAnimationTime, '<>');
//    iCircle.animate( {
//      "25%": { transform: this.kDataCreateTransform, easing: "<" },
//      "100%": { transform: "", easing: ">" }
//      }, this.kDefaultAnimationTime);
  }

};
