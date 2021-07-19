// ==========================================================================
//                          DG.TwoDLineModel
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

sc_require('components/graph/adornments/plot_adornment_model');

/** @class  DG.TwoDLineModel - The model for a movable line.

  @extends DG.PlotAdornmentModel
*/
DG.TwoDLineModel = DG.PlotAdornmentModel.extend(
/** @scope DG.TwoDLineModel.prototype */ 
{
  /**
    The current slope of the line.
    @property { Number }
  */
  slope: null,

  /**
    The current intercept of the line.
    @property { Number }
  */
  intercept: null,

  /**
    True if the line is vertical
    @property { Boolean }
  */
  isVertical: false,

  /**
    If the line is vertical, it intersects the x-axis at this world value.
    @property { Number }
  */
  xIntercept: null,

  /**
   * Set by my plotModel when squares of residuals are showing
   */
  showSumSquares: false,

  /**
   * @property {Number}
   */
  sumSquaresResiduals: null,

  /**
   * Coordinates of the center of the equation rectangle as a proportion of the plot frame
   * @property {{proportionCenterX: {Number}, proportionCenterY: {Number}}}
   */
  equationCoords: null,

  /**
    Is the intercept locked at the origin?
    @property { Boolean }
  */
  isInterceptLocked: function( iKey, iLocked) {
    if( iLocked !== undefined) {
      this._interceptLocked = iLocked;
      if( iLocked)
        this.set('intercept', 0);
      this.setComputingNeeded();
    }
    return this._interceptLocked;
  }.property(),

  /**
    Use the bounds of the given axes to recompute slope and intercept.
  */
  toggleInterceptLocked: function() {
    this.set('isInterceptLocked', !this._interceptLocked);
  },

  /**
    Private cache.
    @property { Boolean }
  */
  _interceptLocked: null,

  /**
    Provide reasonable defaults.
  */
  init: function() {
    sc_super();
    this.slope = 1;
    this.isVertical = false;
    this.xIntercept = null;
    this._interceptLocked = false;
    this._needsComputing = true;
  },

  /**
   Use the bounds of the given axes to recompute slope and intercept.
   */
  recomputeSlopeAndInterceptIfNeeded: function( iXAxis, iYAxis, iForSelection) {
    if( this.isComputingNeeded( iXAxis, iYAxis))
    {
      this.recomputeSlopeAndIntercept( iXAxis, iYAxis, iForSelection);
      this._needsComputing = false;
    }
  },

  /**
   * @return { [{x:{Number}, y: {Number} legend: {String|Number}}] } with properties specific to a given subclass
   * @param {Boolean}
   */
  getCoordinates: function() {
    var tValues = [],
        tCases = this.get('cases'),
        tXVarID = this.getPath('plotModel.xVarID'),
        tYVarID = this.getPath('plotModel.yVarID'),
        tlegendVarID = this.getPath('plotModel.legendVarID'),
        tLegendIsNumeric = this.getPath('plotModel.dataConfiguration.legendAttributeDescription.isNumeric');
    if( !SC.none(tCases)) {
      tCases.forEach(function (iCase) {
        var tXValue = iCase.getForcedNumericValue(tXVarID),
            tYValue = iCase.getForcedNumericValue(tYVarID),
            tLegendValue = tLegendIsNumeric ? null : iCase.getValue( tlegendVarID);
        if (isFinite(tXValue) && isFinite(tYValue)) {
          tValues.push({x: tXValue, y: tYValue, legend: tLegendValue});
        }
      });
    }
    return tValues;
  },

  createStorage: function() {
    var tStorage = sc_super();
    DG.ObjectMap.copy( tStorage, {
      isInterceptLocked: this.get('isInterceptLocked'),
      equationCoords: this.get('equationCoords')
    });
    return tStorage;
  },

  /**
   * @param { Object } with properties specific to a given subclass
   */
  restoreStorage: function( iStorage) {
    sc_super();
    if( iStorage) {
      this.set('isInterceptLocked', iStorage.isInterceptLocked);
      if( iStorage.equationCoords)
        this.set('equationCoords', iStorage.equationCoords);
    }
  }

});

