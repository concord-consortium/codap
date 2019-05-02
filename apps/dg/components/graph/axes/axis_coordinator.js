// ==========================================================================
//                          DG.AxisCoordinator
//
//  Author:   William Finzer
//
//  Copyright (c) 2019 by The Concord Consortium, Inc. All rights reserved.
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

/** @class  When a graph is split, this object keeps numeric axis scales in synch.

  @extends SC.Object
*/
DG.AxisCoordinator = SC.Object.extend(
/** @scope DG.AxisCoordinator.prototype */ 
{
  /**
   * Owned by the graph model.
   * @property {[DG.AxisModel] }
   */
  xAxisArray: null,

  /**
   * Owned by the graph model.
   * @property {[DG.AxisModel] }
   */
  yAxisArray: null,

  /**
   * Owned by the graph model.
   * @property {[DG.AxisModel] }
   */
  y2AxisArray: null,

  _handlingChange: false,

  init: function() {
    this.xAxisArray = [];
    this.yAxisArray = [];
    this.y2AxisArray = [];
  },

  destroy: function() {

    this.xAxisArray.forEach( this.removeAxisObservers);
    this.yAxisArray.forEach( this.removeAxisObservers);
    this.yAxisArray.forEach( this.removeAxisObservers);

    this.xAxisArray = [];
    this.yAxisArray = [];
    this.y2AxisArray = [];
  },

  removeAxisObservers: function( iAxis) {
    if( iAxis) {
      iAxis.removeObserver( 'lowerBound', this, this.boundChanged);
      iAxis.removeObserver( 'upperBound', this, this.boundChanged);
    }
  },

  setAxis: function( iKey, iIndex, iAxis) {
    var tAxisArray = this.get(iKey + 'AxisArray');
    this.removeAxisObservers( tAxisArray[iIndex]);
    iAxis.addObserver( 'lowerBound', this, this.boundChanged, iKey);
    iAxis.addObserver( 'upperBound', this, this.boundChanged, iKey);
    tAxisArray[iIndex] = iAxis;
  },

  boundChanged: function( iAxis, iKey, iValue, iAxisKey) {
    if( this._handlingChange)
      return;

    var tArray = this.get( iAxisKey + 'AxisArray'),
        tValue = iAxis.get( iKey);
    this._handlingChange = true;
    tArray.forEach( function( oneAxis) {
      if( iAxis !== oneAxis)
        oneAxis.set( iKey, tValue);
    });
    this._handlingChange = false;
  }

});

