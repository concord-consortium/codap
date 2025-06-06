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

/** @class  The model for a set of movable valueModels plotted perpendicular to the primary axis.

 @extends SC.Object
 */
DG.MultipleMovableValuesModel = DG.PlotAdornmentModel.extend(
    /** @scope DG.MultipleMovableValuesModel.prototype */
    {
      /**
       An array of the movable value models
       @property { Object } Properties are category names, values are DG.MovableValueModel
       */
      valueModels: null,

      /**
       * @property {DG.CellLinearAxisModel}
       */
      axisModel: null,

      secondaryAxisAttributeDescription: function () {
        return this.getPath('plotModel.secondaryAxisModel.attributeDescription');
      }.property(),

      /**
       * @property {Boolean}
       */
      isShowingCount: false,

      /**
       * @property {Boolean}
       */
      isShowingPercent: false,

      /**
       * @property {{category: [{count: {Number}, percent: {Number}]}}
       */
      countPercentsObject: null,

      /**
       Private cache.
       @property { Boolean }
       */
      _needsComputing: true,

      init: function () {
        sc_super();
        this.set('valueModels', []);
        this.set('countPercentsObject', {});
      },

      destroy: function () {
        this.beginPropertyChanges();
        while (this.valueModels.length > 0) {
          this.removeValue();
        }
        sc_super();
      },

      /**
       *  We do not set that our valueModels need computing because these are only re-evaluated when
       *  the axis attribute changes.
       */
      setComputingNeeded: function () {
        this._needsComputing = true;
      }.observes('plotModel', 'isShowingCount', 'isShowingPercent'),

      /**
       True if any of my valueModels needs computing
       @return { Boolean }
       */
      isComputingNeeded: function (iAxis) {
        if (this._needsComputing)
          return true;
      },

      /**
       Pass this down to my valueModels.
       Also compute counts and percents for each region
       */
      recomputeValue: function (iAxis) {
        var tValueModels = this.get('valueModels'),
            tSplitAttributeDescription = this.getPath('secondaryAxisAttributeDescription'),
            tSplitVarID = tSplitAttributeDescription && tSplitAttributeDescription.getPath('attribute.id'),
            tNumericVarID = this.getPath('plotModel.primaryVarID'),
            tCases = this.get('cases'),
            tCountPercentsObject = this.get('countPercentsObject'),
            tCellNames = this.getPath('secondaryAxisAttributeDescription.cellNames'),
            tAssignedValues;
        DG.ObjectMap.forEach(tCountPercentsObject, function(iKey, iValue){
          delete tCountPercentsObject[iKey];
        });
        tValueModels.forEach( function(iValueModel) {
          iValueModel.recomputeValue(this.get('axisModel'), tAssignedValues);
          tAssignedValues = iValueModel.get('values');
        }.bind(this));
        if(!tCellNames || tCellNames.length === 0)
          tCellNames = [DG.MovableValueModel.kSingleCellName];
        if( tValueModels.length > 0) {
          tCellNames.forEach(function (iName) {
            var tEdges = [],
                tCountPercentsArray = [];
            tValueModels.forEach(function (iValueModel) {
              tEdges.push(iValueModel.getValueForCategory(iName));
            });
            tEdges.sort(function (a, b) {
              return b - a; // reverse sort
            });
            for (var tIndex = 0; tIndex <= tEdges.length; tIndex++)
              tCountPercentsArray.push({count: 0, percent: 0});
            var tTotalCount = 0;

            tCases.forEach(function (iCase) {
              var tNumericValue = iCase.getForcedNumericValue(tNumericVarID),
                  tCategoricalValue = tSplitVarID && iCase.getValue(tSplitVarID);
              if(SC.none(tCategoricalValue))
                tCategoricalValue = DG.MovableValueModel.kSingleCellName;
              if (isFinite(tNumericValue) && tCategoricalValue === iName) {
                var tBinIndex = tEdges.findIndex(function (iValue) {
                  return tNumericValue > iValue;
                });
                if (tBinIndex === -1)
                  tBinIndex = 0;
                else
                  tBinIndex = tEdges.length - tBinIndex;
                var tCPObj = tCountPercentsArray[tBinIndex];
                tCPObj.count++;
                tTotalCount++;
              }
            });
            tEdges.sort(function (a, b) {
              return a - b; // ascending sort
            });
            tCountPercentsArray.forEach(function (iCPObj, iIndex) {
              iCPObj.percent = tTotalCount === 0 ? '' : 100 * iCPObj.count / tTotalCount;
              iCPObj.lower = (iIndex === 0) ? iAxis.get('lowerBound') : tEdges[iIndex - 1];
              iCPObj.upper = (iIndex === tEdges.length) ? iAxis.get('upperBound') : tEdges[iIndex];
            });
            tCountPercentsObject[iName] = tCountPercentsArray;
          }.bind(this));
        }

        this._needsComputing = false;
      }.observes('axisModel.lowerBound', 'axisModel.upperBound'), // So that we'll recompute lower and upper when axis bounds change

      /**
       Use the bounds of the given axes to recompute slope and intercept.
       */
      recomputeValueIfNeeded: function (iAxis) {
        iAxis = iAxis || this.get('axisModel');
        if (this.isComputingNeeded(iAxis))
          this.recomputeValue(iAxis);
      },

      /**
       * Pass to my valueModels
       */
      handleChangedAxisAttribute: function () {
        this.get('valueModels').forEach(function (iValue) {
          iValue.handleChangedAxisAttribute(this.get('axisModel'));
        }.bind(this));
      },

      valueDidChange: function () {
        this.setComputingNeeded();
        this.notifyPropertyChange('valueChange');
      },

      /**
       *
       * @optional iStorage {Object}
       * @return {DG.MovableValueModel}
       */
      addValue: function (iStorage) {
        var this_ = this;

        function getAllValues() {
          var tAllValues = [];
          this_.get('valueModels').forEach(function (iAdorn) {
            tAllValues = tAllValues.concat(iAdorn.getAllValues());
          });
          return tAllValues;
        }

        var chooseGoodValue = function () {
          // Choose a value between lower and upper axis bounds not too close to an existing value
          var tAxis = this.get('axisModel'),
              tAxisLower = tAxis.get('lowerBound'),
              tLower = tAxisLower,
              tAxisUpper = tAxis.get('upperBound'),
              tUpper = tAxisUpper,
              tValues = getAllValues(),
              tMaxGap = 0,
              tIndex = 0;
          tValues.sort();
          while (tIndex <= tValues.length) {
            var tValue = (tIndex === tValues.length) ? tAxisUpper :
                Math.max(tAxisLower, Math.min(tAxisUpper, tValues[tIndex])),
                tPrevValue = (tIndex === 0) ? tAxisLower : tValues[tIndex - 1];
            if (tValue - tPrevValue > tMaxGap) {
              tMaxGap = tValue - tPrevValue;
              tLower = tPrevValue;
              tUpper = tValue;
            }
            tIndex++;
          }
          return tLower + (tUpper - tLower) / 3;
        }.bind(this);

        var tValue = DG.MovableValueModel.create({
          plotModel: this.get('plotModel')
        });
        if (iStorage) {
          tValue.restoreStorage(iStorage);
        } else {
          tValue.setAllValues(chooseGoodValue());
        }
        this.get('valueModels').push(tValue);
        tValue.addObserver('valueChange', this, 'valueDidChange');
        this.setComputingNeeded();
        this.notifyPropertyChange('valueModels');
        return tValue;
      },

      addThisValue: function (iValue) {
        this.get('valueModels').push(iValue);
        iValue.addObserver('valueChange', this, 'valueDidChange');
        this.setComputingNeeded();
        this.notifyPropertyChange('valueModels');
      },

      removeValue: function () {
        var tValues = this.get('valueModels');
        if (tValues && tValues.length > 0) {
          var tValue = tValues[tValues.length - 1];
          this.removeThisValue(tValue);
          return tValue;
        }
        return null;
      },

      /**
       * Called during undo of addValue
       * @param iValue {DG.MovableValueModel}
       */
      removeThisValue: function (iValue) {
        var tValues = this.get('valueModels'),
            tIndex = tValues.indexOf(iValue);
        DG.assert(tIndex >= 0);
        iValue.removeObserver('valueChange', this, 'valueDidChange');
        tValues.splice(tIndex, 1);
        this.recomputeValue(this.get('axisModel'));
        iValue.notifyPropertyChange('removed');
        this.setComputingNeeded();
        this.notifyPropertyChange('valueModels');
      },

      createStorage: function () {
        var storage = sc_super();
        storage.isShowingCount = this.isShowingCount;
        storage.isShowingPercent = this.isShowingPercent;
        storage.valueModels = [];
        this.get('valueModels').forEach(function (iValue) {
          storage.valueModels.push(iValue.createStorage());
        });
        return storage;
      },

      restoreStorage: function (iStorage) {
        sc_super();
        this.set('isShowingCount', iStorage.isShowingCount);
        this.set('isShowingPercent', iStorage.isShowingPercent);
        if (iStorage && iStorage.valueModels) {
          iStorage.valueModels.forEach(function (iValueStorage) {
            this.addValue(iValueStorage);
          }.bind(this));
        }
      }

    });
DG.PlotAdornmentModel.registry.multipleMovableValues = DG.MultipleMovableValuesModel;
