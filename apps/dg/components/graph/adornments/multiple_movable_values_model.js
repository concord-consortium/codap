// ==========================================================================
//                      DG.MultipleMovableValuesModel
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

sc_require('components/graph/adornments/plot_adornment_model');

/** @class  The model for a set of movable values plotted perpendicular to the primary axis.

  @extends SC.Object
*/
DG.MultipleMovableValuesModel = DG.PlotAdornmentModel.extend(
/** @scope DG.MultipleMovableValuesModel.prototype */ 
{
  /**
    The current value
    @property { [{DG.MovableValueModel} ] }
  */
  values: null,

  /**
   * @property {DG.CellLinearAxisModel}
   */
  axisModel: null,

  /**
   * @property {Boolean}
   */
  isShowingCount: false,

  /**
   * @property {Boolean}
   */
  isShowingPercent: false,

  /**
   * @property {[{count: {Number}, percent: {Number}]}
   */
  countPercents: null,

  /**
   Private cache.
   @property { Boolean }
   */
  _needsComputing: true,

  init: function() {
    sc_super();
    this.set('values', []);
    this.set('countPercents', []);
  },

  destroy: function() {
    this.beginPropertyChanges();
    while( this.values.length > 0) {
      this.removeValue();
    }
    sc_super();
  },

  /**
   *  We do not set that our values need computing because these are only re-evaluated when
   *  the axis attribute changes.
   */
  setComputingNeeded: function () {
    this._needsComputing = true;
  }.observes('plotModel', 'isShowingCount', 'isShowingPercent'),

  /**
    True if any of my values needs computing
    @return { Boolean }
  */
  isComputingNeeded: function( iAxis) {
    if( this._needsComputing)
      return true;
  },

  /**
    Pass this down to my values.
   Also compute counts and percents for each region
  */
  recomputeValue: function( iAxis) {
    var tEdges = [],
        tCountPercents = [],
        tValues = this.get('values');
    if( tValues.length > 0) {
      tValues.forEach(function (iValue) {
        tEdges.push(iValue.get('value'));
      });
      tEdges.sort(function (a, b) {
        return b - a; // reverse sort
      });
      for (var tIndex = 0; tIndex <= tEdges.length; tIndex++)
        tCountPercents.push({count: 0, percent: 0});
      var tCases = this.getPath('plotModel.cases'),
          tNumericVarID = this.getPath('plotModel.primaryVarID'),
          tTotalCount = 0;

      tCases.forEach(function (iCase) {
        var tNumericValue = iCase.getForcedNumericValue(tNumericVarID);
        if (isFinite(tNumericValue)) {
          var tBinIndex = tEdges.findIndex(function (iValue) {
            return tNumericValue > iValue;
          });
          if (tBinIndex === -1)
            tBinIndex = 0;
          else
            tBinIndex = tEdges.length - tBinIndex;
          var tCPObj = tCountPercents[tBinIndex];
          tCPObj.count++;
          tTotalCount++;
        }
      });
      tEdges.sort(function (a, b) {
        return a - b; // ascending sort
      });
      tCountPercents.forEach(function (iCPObj, iIndex) {
        iCPObj.percent = tTotalCount === 0 ? '' : 100 * iCPObj.count / tTotalCount;
        iCPObj.lower = ( iIndex === 0) ? iAxis.get('lowerBound') : tEdges[iIndex - 1];
        iCPObj.upper = ( iIndex === tEdges.length) ? iAxis.get('upperBound') : tEdges[iIndex];
      });
    }

    this.set('countPercents', tCountPercents);
    this._needsComputing = false;
  }.observes('axisModel.lowerBound', 'axisModel.upperBound'), // So that we'll recompute lower and upper when axis bounds change

  /**
    Use the bounds of the given axes to recompute slope and intercept.
  */
  recomputeValueIfNeeded: function( iAxis) {
    iAxis = iAxis || this.get('axisModel');
    if( this.isComputingNeeded( iAxis))
      this.recomputeValue( iAxis);
  },

  /**
   * Pass to my values
   */
  handleChangedAxisAttribute: function() {
    this.get('values').forEach( function( iValue) {
      iValue.handleChangedAxisAttribute( this.get('axisModel'));
    }.bind( this));
  },

  valueDidChange: function() {
    this.setComputingNeeded();
    this.notifyPropertyChange('values');
  },

  /**
   *
   * @optional iStorage {Object}
   * @return {DG.MovableValueModel}
   */
  addValue: function( iStorage) {

    var chooseGoodValue = function() {
      // Choose a value between lower and upper axis bounds not too close to an existing value
      var tAxis = this.get('axisModel'),
          tAxisLower = tAxis.get('lowerBound'),
          tLower = tAxisLower,
          tAxisUpper = tAxis.get('upperBound'),
          tUpper = tAxisUpper,
          tValues = this.get('values'),
          tMaxGap = 0,
          tIndex = 0;
      tValues.sort( function( iV1, iV2) {
        return iV1.get('value') - iV2.get('value');
      });
      while( tIndex <= tValues.length) {
        var tValue = (tIndex === tValues.length) ? tAxisUpper :
               Math.max(tAxisLower, Math.min( tAxisUpper, tValues[ tIndex].get('value'))),
            tPrevValue = (tIndex === 0) ? tAxisLower : tValues[ tIndex - 1].get('value');
        if( tValue - tPrevValue > tMaxGap) {
          tMaxGap = tValue - tPrevValue;
          tLower = tPrevValue;
          tUpper = tValue;
        }
        tIndex++;
      }
      return tLower + (tUpper - tLower) / 3;
    }.bind( this);

    var tValue = DG.MovableValueModel.create( {
                      plotModel: this.get('plotModel')
                    });
    if( iStorage) {
      tValue.restoreStorage( iStorage);
    }
    else {
      tValue.set('value', chooseGoodValue());
    }
    this.get('values').push( tValue);
    tValue.addObserver( 'value', this, 'valueDidChange');
    this.setComputingNeeded();
    this.notifyPropertyChange('values');
    return tValue;
  },

  addThisValue: function( iValue) {
    this.get('values').push( iValue);
    iValue.addObserver( 'value', this, 'valueDidChange');
    this.notifyPropertyChange('values');
  },

  removeValue: function() {
    var tValues = this.get('values');
    if( tValues && tValues.length > 0) {
      var tValue = tValues[ tValues.length - 1];
      this.removeThisValue( tValue);
      return tValue;
    }
    return null;
  },

  /**
   * Called during undo of addValue
   * @param iValue {DG.MovableValueModel}
   */
  removeThisValue: function( iValue) {
    var tValues = this.get('values'),
        tIndex = tValues.indexOf( iValue);
    DG.assert( tIndex >= 0 );
    iValue.removeObserver('value', this, 'valueDidChange');
    tValues.splice( tIndex, 1);
    this.recomputeValue(this.get('axisModel'));
    iValue.notifyPropertyChange('removed');
    this.notifyPropertyChange('values');
  },

  createStorage: function() {
    var storage = sc_super();
    storage.isShowingCount = this.isShowingCount;
    storage.isShowingPercent = this.isShowingPercent;
    storage.values = [];
    this.get('values').forEach( function( iValue) {
      storage.values.push( iValue.createStorage());
    });
    return storage;
  },
  
  restoreStorage: function( iStorage) {
    sc_super();
    this.set( 'isShowingCount', iStorage.isShowingCount);
    this.set('isShowingPercent', iStorage.isShowingPercent);
    if( iStorage && iStorage.values) {
      iStorage.values.forEach( function( iValueStorage) {
        this.addValue( iValueStorage);
      }.bind( this));
    }
  }

});
DG.PlotAdornmentModel.registry.multipleMovableValues = DG.MultipleMovableValuesModel;
