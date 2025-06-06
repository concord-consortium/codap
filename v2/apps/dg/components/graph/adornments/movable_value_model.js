// ==========================================================================
//                      DG.MovableValueModel
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

/** @class  The model for a movable line.

  @extends SC.Object
*/
DG.MovableValueModel = DG.PlotAdornmentModel.extend(
/** @scope DG.MovableValueModel.prototype */ 
{
  /**
   * Each category keeps track of the current value. If no secondary attribute, category is 'main'
   * @property {Object} Keys are categories of secondary attribute with numbers as values
   */
  values: null,

  secondaryAxisAttributeDescription: function() {
    return this.getPath('plotModel.secondaryAxisModel.attributeDescription');
  }.property(),

  init: function() {
    sc_super();
    this.createValuesObject();
  },

  createValuesObject: function() {
    var tCurrentValuesObject = this.get('values'),
        tValuesObject = {},
        tAttrDesc = this.get('secondaryAxisAttributeDescription'),
        tCellNames = tAttrDesc && tAttrDesc.get('cellNames');

    function valuesObjectIsValid() {
      var tTempCellNames = (!tCellNames || tCellNames.length === 0) ?
          [DG.MovableValueModel.kSingleCellName] : tCellNames;
      var tIsValid = tCurrentValuesObject && Object.keys(tCurrentValuesObject).every(function( iKey) {
        return tTempCellNames.indexOf(iKey) >= 0;
      });
      tIsValid = tIsValid && tTempCellNames.every( function( iName) {
        return tCurrentValuesObject.hasOwnProperty(iName);
      });
      return tIsValid;
    }

    if(valuesObjectIsValid())
      return; // because we've already got a valid one

    if( tCellNames.length === 0) {
      tValuesObject[DG.MovableValueModel.kSingleCellName] = null;
    }
    else {
      var tStartValue = tCurrentValuesObject && tCurrentValuesObject[DG.MovableValueModel.kSingleCellName];
      tCellNames.forEach(function (iName) {
        tValuesObject[iName] = tStartValue;
      });
    }
    this.set('values', tValuesObject);
    // this.recomputeValue( this.getPath('plotModel.primaryAxisModel'));
  },

  /**
   *
   * @param iCat {string}
   * @return {number} in world coordinates
   */
  getValueForCategory: function(iCat) {
    var tValuesObject = this.get('values');
    return tValuesObject[iCat];
  },

  /**
   *
   * @param iCat {string}
   * @param iValue {number}
   */
  setValueForCategory: function(iCat, iValue) {
    this.get('values')[iCat] = iValue;
    this.notifyPropertyChange('valueChange');
  },

  /**
    Go ahead and recomputeValue
  */
  handleChangedAxisAttribute: function( iAxis) {
    this.createValuesObject();
    this.recomputeValue(iAxis);
  },

  getAllValues: function() {
    return DG.ObjectMap.values( this.values);
  },

  setAllValues: function( iValue) {
    DG.ObjectMap.forEach(this.values, function (iKey) {
      this.values[iKey] = iValue;
    }.bind(this));
    this.notifyPropertyChange('valueChange');
    this._needsComputing = false;
  },

  /**
   * Use the bounds of the given axes to choose a value, but not one at the exact center.
   * The array of previous values can help in assigning values not identical to one already assigned
   * @param iAxis {DG.CellLinearAxisModel}
   * @param iPreviousValues {{category:number}}
   */
  recomputeValue: function( iAxis, iPreviousValues) {

    function inBounds(iNum) {
      return !SC.none( iNum) && iNum >= tLower && iNum <= tUpper;
    }

    var tLower = iAxis.get('lowerBound'),
        tUpper = iAxis.get('upperBound'),
        tChanged = false,
        tSavedValues = Object.assign({}, this.values);
    this.createValuesObject();  // no-op if already valid
    DG.ObjectMap.forEach(this.values, function(iKey, iValue) {
      if(iKey === DG.MovableValueModel.kSingleCellName && !tSavedValues.hasOwnProperty(iKey)) {
        iValue = tSavedValues[Object.keys(tSavedValues)[0]];
        this.values[iKey] = iValue;
      }
      var tSavedValue = tSavedValues[iKey];
      if( SC.none( iValue) && inBounds( tSavedValue)) {
        this.values[iKey] = tSavedValue;
      }
      else if( !inBounds( iValue)) {
        var tPreviousValue = iPreviousValues && iPreviousValues[iKey],
            tAnchor = SC.none(tPreviousValue) ? tLower : tPreviousValue;
        this.values[iKey] = tAnchor + (tUpper - tAnchor) / 3;
        tChanged = true;
      }
    }.bind(this));
    if( tChanged)
      this.notifyPropertyChange('valueChange');
    this._needsComputing = false;
  },

  createStorage: function() {
    var storage = sc_super();
    if( this.get('isVisible'))
      storage.values = this.get('values');
    return storage;
  },
  
  restoreStorage: function( iStorage) {
    sc_super();
    if( iStorage) {
      if (iStorage.values)
        this.set('values', iStorage.values);
      else if( iStorage.value) {
        var temp = {};
        temp[DG.MovableValueModel.kSingleCellName] = iStorage.value;
        this.set('values', temp);
      }
      this._needsComputing = false;
    }
    return this;
  }

});

DG.MovableValueModel.kSingleCellName = '_main';

DG.PlotAdornmentModel.registry.movableValue = DG.MovableValueModel;
