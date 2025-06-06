// ==========================================================================
//                          DG.MovablePointModel
//
//  Author:   William Finzer
//
//  Copyright (c) 2017 by The Concord Consortium, Inc. All rights reserved.
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

/** @class  DG.MovablePointModel - The model for a movable line.

  @extends DG.PlotAdornmentModel
*/
DG.MovablePointModel = DG.PlotAdornmentModel.extend(
/** @scope DG.TwoDLineModel.prototype */
{
  /**
   The current coordinates of the point in world coordinates.
   @property { { x: {Number}, y: { Number} }
   */
  coordinates: null,

  /**
    True if we need to compute a new slope and intercept to force within plot bounds
    @return { Boolean }
  */
  isComputingNeeded: function( iXAxis, iYAxis) {
    if( this._needsComputing)
      return true;

    this._needsComputing = !this.coordinates ||
        (this.coordinates.x < iXAxis.get('lowerBound')) ||
                            (this.coordinates.x > iXAxis.get('upperBound')) ||
        (this.coordinates.y < iYAxis.get('lowerBound')) ||
                            (this.coordinates.y > iYAxis.get('upperBound'));
    return this._needsComputing;
  },

  /**
    Use the bounds of the given axes to recompute default coordinates for the point.
  */
  recomputeCoordinates: function( iXAxis, iYAxis) {
    var tLowerX = iXAxis.get('lowerBound'),
        tUpperX = iXAxis.get('upperBound'),
        tLowerY = iYAxis.get('lowerBound'),
        tUpperY = iYAxis.get('upperBound');

    this.set('coordinates', {
      x: tUpperX - (tUpperX - tLowerX) / 3,
      y: tUpperY - (tUpperY - tLowerY) / 3
    });
  
    this._needsComputing = false;
  },

  /**
   Use the bounds of the given axes to recompute slope and intercept.
   */
  recomputePositionIfNeeded: function( iXAxis, iYAxis) {
    if( this.isComputingNeeded( iXAxis, iYAxis))
    {
      this.recomputeCoordinates( iXAxis, iYAxis);
    }
  },

  /**
   * @return { Object } with properties specific to a given subclass
   */
  createStorage: function() {
    var tStorage = sc_super();
    DG.ObjectMap.copy( tStorage, {
      coordinates: this.get('coordinates')
    });
    return tStorage;
  },

  /**
   * @param { Object } with properties specific to a given subclass
   */
  restoreStorage: function( iStorage) {
    sc_super();
    this.set('coordinates', iStorage.coordinates);
  }

});

