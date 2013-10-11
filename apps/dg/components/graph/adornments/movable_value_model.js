// ==========================================================================
//                      DG.MovableValueModel
//
//  Author:   William Finzer
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

sc_require('components/graph/adornments/plot_adornment_model');

/** @class  The model for a movable line.

  @extends SC.Object
*/
DG.MovableValueModel = DG.PlotAdornmentModel.extend(
/** @scope DG.MovableValueModel.prototype */ 
{
  /**
    The current value
    @property { Number }
  */
  value: 1,

  /**
    Private cache.
    @property { Boolean }
  */
  _needsComputing: true,
  
  /**
    True if we need to compute a new value to force within plot bounds
    @return { Boolean }
  */
  isComputingNeeded: function( iAxis) {
    if( this._needsComputing)
      return true;
    this._needsComputing = (this.value < iAxis.get('lowerBound')) || 
                            (this.value > iAxis.get('upperBound'));
    return this._needsComputing;
  },

  /**
    Force a recomputation at next opportunity.
   */
  setComputingNeeded: function() {
    this._needsComputing = true;
  },

  /**
    Use the bounds of the given axes to choose a value, but not one at the exact center.
  */
  recomputeValue: function( iAxis) {
    var tLower = iAxis.get('lowerBound'),
        tUpper = iAxis.get('upperBound');
  
    this.set('value', tLower + (tUpper - tLower) / 3);
    this._needsComputing = false;
  },

  /**
    Use the bounds of the given axes to recompute slope and intercept.
  */
  recomputeValueIfNeeded: function( iAxis) {
    if( this.isComputingNeeded( iAxis))
      this.recomputeValue( iAxis);
  },

  createStorage: function() {
    var storage = sc_super();
    if( this.get('isVisible'))
      storage.value = this.get('value');
    return storage;
  },
  
  restoreStorage: function( iStorage) {
    sc_super();
    if( iStorage && iStorage.value)
      this.set('value', iStorage.value);
  }

});
DG.PlotAdornmentModel.registry.movableValue = DG.MovableValueModel;
