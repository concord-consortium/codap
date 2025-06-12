// ==========================================================================
//                          DG.MovableLineModel
//
//  Author:   William Finzer
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

sc_require('components/graph/adornments/twoD_line_model');

/** @class  DG.MovableLineModel - The model for a movable line.

  @extends DG.TwoDLineModel
*/
DG.MovableLineModel = DG.TwoDLineModel.extend(
/** @scope DG.TwoDLineModel.prototype */
{
  /**
    True if we need to compute a new slope and intercept to force within plot bounds
    @return { Boolean }
  */
  isComputingNeeded: function( iXAxis, iYAxis) {
    iXAxis = iXAxis || this.getPath('plotModel.xAxis');
    iYAxis = iYAxis || this.getPath('plotModel.yAxis');
    if( this._needsComputing)
      return true;
    if( this.isVertical) {
      this._needsComputing = (this.xIntercept < iXAxis.get('lowerBound')) ||
                              (this.xIntercept > iXAxis.get('upperBound'));
    }
    else {
      this._needsComputing = !DG.PlotUtilities.lineIntersectsPlotArea(
                  this.slope, this.intercept, iXAxis, iYAxis);
    }
    return this._needsComputing;
  },

  /**
   * If we are showing squares, we must recompute the sum of squares of residuals
   */
  slopeOrInterceptChanged: function() {
    var tSlope = this.get('slope'),
        tInter = this.get('intercept'),
        tSumSquares = 0;
    if( this.get('showSumSquares')) {
      if( this.get('isVertical'))
          tSumSquares = Infinity;
      else {
        this.getCoordinates().forEach(function (iCoordinates) {
          var tLineY = tInter + tSlope * iCoordinates.x,
              tResid = iCoordinates.y - tLineY;
          tSumSquares += tResid * tResid;
        });
      }
      this.set('sumSquaresResiduals', tSumSquares);
    }
  }.observes('slope', 'intercept', 'showSumSquares'),

  /**
    Use the bounds of the given axes to recompute slope and intercept.
  */
  recomputeSlopeAndIntercept: function( iXAxis, iYAxis) {
    iXAxis = iXAxis || this.getPath('plotModel.xAxis');
    iYAxis = iYAxis || this.getPath('plotModel.yAxis');
    var tLowerX = iXAxis.get('lowerBound'),
        tUpperX = iXAxis.get('upperBound'),
        tLowerY = iYAxis.get('lowerBound'),
        tUpperY = iYAxis.get('upperBound');
  
    // [wff 040817 ] Making the default a bit steeper so it's less likely to
    // look like it fits a typical set of points
    tUpperX = tLowerX + (tUpperX - tLowerX) / 2;

    if( !this.get('isInterceptLocked')) {
      this.beginPropertyChanges();
        this.set('slope', (tUpperY - tLowerY) / (tUpperX - tLowerX));
        this.set('intercept', tLowerY - this.slope * tLowerX);
        this.set('isVertical', false);
        this.set('xIntercept', null);
      this.endPropertyChanges();
    }
    else {
      this.forceThroughOriginAndPoint( { x: tUpperX, y: (tUpperY + tLowerY) /2 });
    }
    this._needsComputing = false;
  },

  /**
    Change the intercept but not the slope.
  */
  forceThroughPoint: function( iPoint) {
    if( this.isVertical) {
      this.set('xIntercept', iPoint.x);
    }
    else {
      var tSlope = this.get('slope'),
          tIntercept = iPoint.y - tSlope * iPoint.x;
      this.set('intercept', tIntercept);
    }
  },

  /**
   * Treat the situation in which the two points have the same x-coord as a special case.
   * If the intercept is locked, ignore the first point and force the line to go through the
   * second point and the origin.
  */
  forceThroughPoints: function( iPt1, iPt2) {
    if( iPt1.x === iPt2.x) {
      this.beginPropertyChanges();
        this.set('isVertical', true);
        this.set('xIntercept', iPt1.x);
        this.set('slope', null);
        this.set('intercept', null);
      this.endPropertyChanges();
    }
    else {
      var tSlope = (iPt2.y - iPt1.y) / (iPt2.x - iPt1.x);
      this.beginPropertyChanges();
        this.set('slope', tSlope);
        this.set('intercept', iPt1.y - tSlope * iPt1.x);
        this.set('isVertical', false);
        this.set('xIntercept', null);
      this.endPropertyChanges();
    }
  },

  /**
   * This routine is used when the intercept is locked.
  */
  forceThroughOriginAndPoint: function( iPt) {
    this.forceThroughPoints( iPt, { x: 0, y: 0 });
  },

  /**
   * @return { Object } with properties specific to a given subclass
   */
  createStorage: function() {
    var tStorage = sc_super();
    DG.ObjectMap.copy( tStorage, {
      intercept: this.get('intercept'),
      slope: this.get('slope'),
      isVertical: this.get('isVertical'),
      xIntercept: this.get('xIntercept')
    });
    return tStorage;
  },

  /**
   * @param { Object } with properties specific to a given subclass
   */
  restoreStorage: function( iStorage) {
    sc_super();
    this.set('intercept', iStorage.intercept);
    this.set('slope', iStorage.slope);
    this.set('isVertical', iStorage.isVertical);
    this.set('xIntercept', iStorage.xIntercept);
    this._needsComputing = false;
  }

});

