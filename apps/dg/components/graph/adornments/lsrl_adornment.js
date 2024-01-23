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
/* global tinycolor */

sc_require('components/graph/adornments/twoD_line_adornment');
sc_require('components/graph/utilities/plot_utilities');

/** @class  Draws a least squares regression line.

  @extends DG.TwoDLineAdornment
*/
DG.LSRLAdornment = DG.TwoDLineAdornment.extend(
/** @scope DG.LSRLAdornment.prototype */ 
{
  defaultColor: DG.PlotUtilities.kDefaultLSRLColor,

  /**
   * This path is actually two curves, one above and one below the line.
   * At each value of x, the two y-values are the upper and lower bounds of the confidence interval
   * of the expected value of y.
   * @property { Raphael path element }
   */
  confidenceBandCurve: null,
  confidenceBandCurveCover: null,
  confidenceBandShading: null,

  lineColor: function() {

    var tLegendAttrDescription = this.getPath('model.plotModel.dataConfiguration.legendAttributeDescription');
    if(!tLegendAttrDescription || tLegendAttrDescription.isNull() || tLegendAttrDescription.get('isNumeric') ||
        tLegendAttrDescription.get('isColor')) {
      return sc_super();
    }
    var tColor = DG.ColorUtilities.calcCaseColor(this.getPath( 'model.categoryName'),
                            tLegendAttrDescription);
    tColor = tColor.colorString || tColor;
    return tColor;
  }.property(),

  _infoTip: null,
  infoTip: function () {
    if (!this._infoTip) {
      var this_ = this;
      this._infoTip = DG.InfoTip.create({
        paperSource: function () {
          return this_.get('paperSource');
        }.property(),
      });
    }
    return this._infoTip;
  }.property(),

  equationString: function() {
    var tResult = sc_super(),
        kRSquared = '<p style = "color:%@;">r<sup>2</sup> = %@</p>',
        kSeSlope = '<p style = "color:%@;">&sigma;<sub style="vertical-align: sub">slope</sub> = %@</p>',
        kSeIntercept = '<p style = "color:%@;">&sigma;<sub style="vertical-align: sub">intercept</sub> = %@</p>';
    if( !this.getPath('model.isInterceptLocked')) {
      var tColor = this.get('equationColor'),
          tFormat = DG.Format.number().fractionDigits(0, 3),
          tRSquared = this.getPath('model.rSquared'),
          tRSquaredString = SC.none(tRSquared) ? '' : tFormat(tRSquared),
          tSeSlope = this.getPath('model.seSlope'),
          tSeSlopeString = SC.none(tSeSlope) ? '' : kSeSlope.loc(tColor, tFormat(tSeSlope)),
          tSeIntercept = this.getPath('model.seIntercept'),
          tSeInterceptString = SC.none(tSeIntercept) ? '' : kSeIntercept.loc(tColor, tFormat(tSeIntercept));

      tResult = tResult + kRSquared.loc(tColor, tRSquaredString) + tSeSlopeString + tSeInterceptString +
          this.get('sumResidSquaredString');
    }
    return tResult;
  }.property(),

  updateToModel: function() {
    this.positionEquationAndBackground();
  },

  createElements: function() {
    sc_super();

    var this_ = this;

    function overScope(iEvent) {
      if(this_.getPath('model.showConfidenceBands')) {
        this_.get('infoTip').show({
          x: iEvent.offsetX - 5, y: iEvent.offsetY - 5,
          tipString: 'DG.ScatterPlotModel.LSRLCIBandInfo'.loc()
        });
      }
    }

    function outScope() {
      this_.get('infoTip').hide();
    }

    var tPaper = this.get('paper'),
       tDataTipLayer = this.getPath('paperSource.layerManager')[DG.LayerNames.kDataTip],
       tAdornmentLayer = this.getPath('paperSource.layerManager')[DG.LayerNames.kAdornments],
       tLayerForShading = this.getPath('paperSource.layerManager')[DG.LayerNames.kConnectingLines],
       tLineColor = this.get('lineColor'),
       tCurveColor = tinycolor(tLineColor).lighten(10).toHexString();
    this.confidenceBandCurve = tPaper.path( 'M,0,0')
                                     .attr({ stroke: tCurveColor, 'stroke-opacity': 0, 'stroke-dasharray': '- ' });
    this.confidenceBandCurve.animatable = true;
    this.confidenceBandCurveCover = tPaper.path( 'M,0,0')
                                .attr({ stroke: tLineColor, 'stroke-opacity': 0.001, 'stroke-width': 6 });
    this.confidenceBandCurveCover.animatable = false;
    this.confidenceBandShading = tPaper.path( 'M,0,0')
                                .attr({fill: tLineColor, 'stroke-width': 0, 'fill-opacity': 0 })
                                .hover(overScope, outScope);
    this.confidenceBandShading.animatable = true;

    this.myElements = this.myElements.concat([this.confidenceBandCurve, this.confidenceBandCurveCover,
      this.confidenceBandShading]);
    tDataTipLayer.push( this.confidenceBandCurveCover);
    tAdornmentLayer.push( this.confidenceBandCurve);
    tLayerForShading.push( this.confidenceBandShading);
  },

  positionEquationAndBackground: function() {
    sc_super();
    var kAnimationTime = DG.PlotUtilities.kDefaultAnimationTime;
    if( !this.getPath('model.showConfidenceBands')) {
      this.confidenceBandCurve.animate({'stroke-opacity': 0 }, kAnimationTime, '<>');
      this.confidenceBandCurveCover.attr({path: 'M,0,0' });
      this.confidenceBandShading.animate({'fill-opacity': 0 }, kAnimationTime, '<>');
      return;
    }

    var tCount = this.getPath('model.count'),
       tContext = {
          count: tCount,
          sumSquaresX: this.getPath('model.xSumSquaredDeviations'),
          xMean: this.getPath('model.xMean'),
          slope: this.getPath('model.slope'),
          intercept: this.getPath('model.intercept'),
          mse: this.getPath('model.mse'),
          t: DG.MathUtilities.tAt0975ForDf(tCount - 2)
    };

    function confidenceValues(iX) {
      var tYHat = tContext.intercept + tContext.slope * iX,
          tStdErrorMeanEst = 1 / tContext.count + Math.pow(iX - tContext.xMean, 2) / tContext.sumSquaresX,
          tAddend = tContext.t * Math.sqrt(tContext.mse * tStdErrorMeanEst);
      return { lower: tYHat - tAddend, upper: tYHat + tAddend};
    }

    var tXAxisView = this.getPath('paperSource.xAxisView'),
       tYAxisView = this.getPath('paperSource.yAxisView'),
       tPixelMin = tXAxisView.get('pixelMin'),
       tPixelMax = tXAxisView.get('pixelMax'),
       tUpperPoints = [],
       tLowerPoints = [],
       tUpperPath = '',
       tLowerPath = '',
       tX, tYValues, tPixelX;
    for( tPixelX = tPixelMin; tPixelX <= tPixelMax; tPixelX+=10) {
      tX = tXAxisView.coordinateToData( tPixelX);
      tYValues = confidenceValues( tX);
      tUpperPoints.push( { left: tPixelX, top: tYAxisView.dataToCoordinate(tYValues.upper) });
      tLowerPoints.unshift( { left: tPixelX, top: tYAxisView.dataToCoordinate(tYValues.lower) });
    }
    if( tUpperPoints.length > 0) {
      // Accomplish spline interpolation
      tUpperPath = 'M' + tUpperPoints[0].left + ',' + tUpperPoints[0].top +
                   DG.SvgScene.curveBasis( tUpperPoints);
      tLowerPath = 'M' + tLowerPoints[0].left + ',' + tLowerPoints[0].top +
                   DG.SvgScene.curveBasis( tLowerPoints);
    }
    // The upper path starts at the left. The lower path starts at the right. We want to connect them
    // so that we get a region we can fill.
    var tCombinedPath = tUpperPath + tLowerPath.replace('M', 'L') + ' Z';
    this.confidenceBandCurve.attr({path: tUpperPath + tLowerPath });
    this.confidenceBandCurveCover.attr({path: tUpperPath + tLowerPath });
    this.confidenceBandShading.attr({path: tCombinedPath });
    this.confidenceBandShading.animate({'fill-opacity': 0.05 }, kAnimationTime, '<>');
  }

});

