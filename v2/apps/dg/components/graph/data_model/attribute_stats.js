// ==========================================================================
//                        DG.AttributeStats
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

/** @class

    Deals with an array of attributes and maintains univariate (categorical or numeric) statistics
 for them.

 @extends SC.Object
 */
DG.AttributeStats = SC.Object.extend((function () // closure
    /** @scope DG.AttributeStats.prototype */ {

  return {

    /**
     * The attributes for this slot
     * @property {Array of DG.AttributeModel}
     */
    attributes: null,

    /**
     * A cache of computed univariate statistics
     * @property {DG.UnivariateStats}
     */
    numericStats: null,

    /**
     * A cache of computed categorical statistics
     * @property {DG.CategoricalStats}
     */
    categoricalStats: null,

    /**
     * Passed in as the number of categories that can be dealt with.
     * @property {Number}
     */
    number_of_categories_limit: null,

    number_of_categories_limitDidChange: function () {
      this._categoricalCacheIsValid = false;
    }.observes('number_of_categories_limit'),

    /**
     * @property {Array of DG.Case} Passed in through invalidateCaches
     */
    _cases: null,

    /**
     * @property {Boolean}
     */
    _numericCacheIsValid: null,

    /**
     * @property {Boolean}
     */
    _categoricalCacheIsValid: null,

    /**
     * Only gets a value if 'attributeType' is set rather than computed.
     * @property {DG.Analysis.EAttributeType}
     */
    _attributeType: null,

    /**
     * Initialize those members that require it.
     */
    init: function () {
      sc_super();
      this._cases = [];
      this.attributes = [];
      this.numericStats = DG.UnivariateStats.create();
      this._numericCacheIsValid = true; // because there is nothing to compute

      this.categoricalStats = DG.CategoricalStats.create();
      this._categoricalCacheIsValid = true; // because there is nothing to compute
    },

    setCases: function (iCases) {
      this._cases = iCases;
    },

    attributeDidChange: function () {
      var tAttributes = this.get('attributes'),
          tFirstAttr = (tAttributes.length > 0) ? tAttributes[0] : null,
          tType = SC.none(tFirstAttr) ? null : tFirstAttr.get('type');
      switch (tType) {
        case 'numeric':
          tType = DG.Analysis.EAttributeType.eNumeric;
          break;
        case 'categorical':
          tType = DG.Analysis.EAttributeType.eCategorical;
          break;
        default:
          tType = null;
      }
      this.invalidateCaches();
      this.set('attributeType', tType);
    }.observes('attributes'),

    /**
     *
     * @param iCases {Array} of DG.Case
     */
    invalidateCaches: function (iCases, iChange) {

      function isBetterMin(n1, n2) {
        return SC.none(n2) || (n1 < n2);
      }

      function isBetterMax(n1, n2) {
        return SC.none(n2) || (n1 > n2);
      }

      var tLastValue, tCaseIDs,
          processOneNumeric = function (iCase, iVarID) {
            var tInfo = {}, tValue = iCase.getNumValue(iVarID, tInfo);
            if (isFinite(tValue)) {
              this.numericStats.incrementProperty('count');
              this.numericStats.set('sum', this.numericStats.sum + tValue);
              // boolean values get converted to 0 and 1. For purposes of computing
              // ranges we wish to avoid these.
              if (tInfo.type !== 'boolean') {
                if (isBetterMin(tValue, this.numericStats.rangeMin))
                  this.numericStats.set('rangeMin', tValue);
                if (isBetterMax(tValue, this.numericStats.rangeMax))
                  this.numericStats.set('rangeMax', tValue);
                if (tValue > 0) {
                  if (isBetterMin(tValue, this.numericStats.positiveMin))
                    this.numericStats.set('positiveMin', tValue);
                  if (isBetterMax(tValue, this.numericStats.positiveMax))
                    this.numericStats.set('positiveMax', tValue);
                }
              }
              this.numericStats.setIfChanged('squaredDeviations', null);  // We can't compute this without iteration
            }
            else if (tInfo.isNominal && !isNaN(tValue)) {
              this.numericStats.setIfChanged('attributeType',
                  DG.ColorUtilities.isColorSpecString(tValue) ? DG.Analysis.EAttributeType.eColor :
                      DG.Analysis.EAttributeType.eCategorical);
            }
          }.bind(this),

          processOneCategorical = function (iCase, iVarID, iCategoryMap) {
            var tValue = iCase.getStrValue(iVarID),
                tCellMapEntry;
            if (!SC.empty(tValue)) {
              var tIndexOfValueInCatMap = iCategoryMap.__order.indexOf( tValue),
                  tCellMapLength = Object.getOwnPropertyNames(tCellMap).length,
                  tNumberOfCategoriesLimit = this.get('number_of_categories_limit');
              if (SC.none(tCellMap[tValue])) {
                var tCellNum = tIndexOfValueInCatMap >= 0 ? tIndexOfValueInCatMap : tCellMapLength;
                if(SC.none(tNumberOfCategoriesLimit) || tCellNum < tNumberOfCategoriesLimit) {
                  tCellMap[tValue] = {cases: [], cellNumber: tCellNum};
                  tCellMapEntry = tCellMap[tValue];
                  tLastValue = tValue;
                }
                else if(!SC.none(tNumberOfCategoriesLimit)) {
                  if( tCellMapLength === tNumberOfCategoriesLimit) {
                    if (tLastValue && !tCellMap[DG.PlotUtilities.kOther]) {
                      tCellMap[DG.PlotUtilities.kOther] = tCellMap[tLastValue];
                      delete tCellMap[tLastValue];
                    }
                    tCellMapEntry = tCellMap[DG.PlotUtilities.kOther];
                  }
                }
                DG.ObjectMap.forEach( tCellMap, function( iKey, iValue) {
                  var tIndex = iCategoryMap.__order.indexOf( iKey);
                  if( tIndex >= 0 && iValue.cellNumber !== tIndex) {
                    iValue.cellNumber = tIndex;
                    iCase._didDisturbCellOrder = true;
                  }
                });
              }
              else {
                tCellMapEntry = tCellMap[ tValue];
              }
              if (tCellMapEntry) tCellMapEntry.cases.push(iCase);
              this.categoricalStats.incrementProperty('count');
            }
          }.bind(this),
          tType = this.get('attributeType'),
          tCellMap = this.getPath('categoricalStats.cellMap'),
          tAttributes = this.get('attributes'),
          shouldProcessNumeric = this._numericCacheIsValid,
          shouldProcessCategorical = this._categoricalCacheIsValid &&
              (tType === DG.Analysis.EAttributeType.eCategorical),
          tVarID, tCategoryMap;

      if( iCases)
        this.setCases( iCases);// Do this first so subsequently computed stats will use the right cases
      if (iChange &&
          ((iChange.operation === 'createCase') ||
              (iChange.operation === 'createCases'))) {

        tCaseIDs = iChange.result.caseIDs || [iChange.result.caseID];

        if (shouldProcessNumeric) {
          this.numericStats.beginPropertyChanges();
        }
        if (shouldProcessCategorical) {
          this.categoricalStats.beginPropertyChanges();
          this.setIfChanged('_categoricalCacheIsValid', false);
        }
        tCaseIDs.forEach(function (iCaseID) {
          var tCase = DG.store.find(DG.Case, iCaseID);
          if (tCase) {
            tAttributes.forEach(function (iAttribute) {
              tVarID = iAttribute.get('id');
              tCategoryMap = iAttribute.get('categoryMap');
              if (shouldProcessNumeric) {
                processOneNumeric(tCase, tVarID);
              }
              if (shouldProcessCategorical)
                processOneCategorical(tCase, tVarID, tCategoryMap);
            }.bind(this));
          }
        }.bind(this));
        if (shouldProcessNumeric)
          this.numericStats.endPropertyChanges();
        if (shouldProcessCategorical) {
          tAttributes.forEach(function (iAttribute) {
            iAttribute.updateCategoryMap();
          });
          this.categoricalStats.endPropertyChanges();
        }
        return;
      } else if (iChange && iChange.operation === 'deleteCases') {
        if (shouldProcessNumeric) {
          this.numericStats.beginPropertyChanges();
          this.numericStats.reset();
        }
        if (shouldProcessCategorical) {
          this.categoricalStats.beginPropertyChanges();
          this.categoricalStats.reset();
          this._computeCategoricalStats();
        }
        this._cases.forEach(function (tCase) {
          if (tCase) {
            tAttributes.forEach(function (iAttribute) {
              tVarID = iAttribute.get('id');
              tCategoryMap = iAttribute.get('categoryMap');
              if (shouldProcessNumeric) {
                processOneNumeric(tCase, tVarID);
              }
              if (shouldProcessCategorical)
                processOneCategorical(tCase, tVarID, tCategoryMap);
              else
                this.setIfChanged('_categoricalCacheIsValid', false);
            }.bind(this));
          }
        }.bind(this));
        if (shouldProcessNumeric)
          this.numericStats.endPropertyChanges();
        if (shouldProcessCategorical) {
          this.categoricalStats.endPropertyChanges();
        }
        return;
      }

      // We're currently required to use set here so that dependents will hear about change
      this.setIfChanged('_numericCacheIsValid', false);
      this.setIfChanged('_categoricalCacheIsValid', false);
    },

    /**
     @property{{min:{Number}, max:{Number} isDataInteger:{Boolean}}}
     */
    minMax: function () {
      if (!this._numericCacheIsValid)
        this._computeNumericStats();
      var tRange = this.numericStats.get('numericRange');
      return {
        min: tRange.min,
        max: tRange.max,
        isDataInteger: this.numericStats.get('dataIsInteger')
      };
    }.property(),

    /**
     It is possible to set this property, thus implying that the attributes
     are to be treated one way or another.
     @property{DG.Analysis.EAttributeType} True if all values are numbers or blank
     */
    attributeType: function (iKey, iValue) {
      if (iValue !== undefined)
        this._attributeType = iValue;
      if (!SC.none(this._attributeType))
        return this._attributeType;

      var tAttributes = this.get('attributes');

      // We don't have a value stored, so we compute the answer
      if (tAttributes.length === 0) {
        this._attributeType = DG.Analysis.EAttributeType.eNone;
      }
      else {
        // If our first attribute has a type assigned, we return it
        switch (tAttributes[0].get('type')) {
          case 'nominal':
          case 'categorical':
            this._attributeType = DG.Analysis.EAttributeType.eCategorical;
            break;
          case 'numeric':
            this._attributeType = DG.Analysis.EAttributeType.eNumeric;
            break;
          case 'date':
            this._attributeType = DG.Analysis.EAttributeType.eDateTime;
            break;
          default:
            // Do nothing
        }
      }

      // If we still haven't got a type, determine it from the actual values, if any
      if (SC.none(this._attributeType)) {
        if (!this._numericCacheIsValid)
          this._computeNumericStats();
        this._attributeType = this.getPath('numericStats.attributeType');
      }

      return this._attributeType;
    }.property('attributes'),

    attributeTypeDidChange: function () {
      this.notifyPropertyChange('attributeType');
    }.observes('*numericStats.attributeType'),

    /**
     Run through all attributes and their values and cache computed statistics.
     @private
     */
    _computeNumericStats: function () {
      var tCases = this._cases,
          tAttributes = this.get('attributes'),
          tNumericCaseCount = 0,
          tTreatAsNumeric = this._attributeType === DG.Analysis.EAttributeType.eNumeric ||
              (tAttributes.length > 0 && tAttributes[0].get('type') === 'numeric'),
          tTreatAsDateTime = this._attributeType === DG.Analysis.EAttributeType.eDateTime ||
              (tAttributes.length > 0 && tAttributes[0].get('type') === 'date'),
          tAttributeType,
          tDataIsNumeric = true,  // True both for numbers and dates
          tDataIsDateTime = tCases.get('length') > 0,
          tFoundADateDuringDataIsDateTime = false,
          tColorValuesExist = false,
          tMin = Number.POSITIVE_INFINITY,
          tMax = Number.NEGATIVE_INFINITY,
          tPositiveMin = Number.MAX_VALUE,
          tPositiveMax = -Number.MAX_VALUE,
          tSum = 0,
          tSumDiffs = 0,
          tSumSquareDiffs = 0,
          //tDataIsInteger = true,
          tMean,
          tValues = [];

        function addCaseValueToStats(iCaseValue) {
          // We have to determine whether iCaseValue is a date.
          // If it is numeric, it is not a date
          var tValue = tTreatAsNumeric ? DG.MathUtilities.extractNumeric(iCaseValue) : Number( iCaseValue);
          tFoundADateDuringDataIsDateTime = tDataIsDateTime &&
              (tFoundADateDuringDataIsDateTime || DG.isDate(iCaseValue) || DG.isDateString( iCaseValue));
          tDataIsDateTime = tTreatAsDateTime || (tDataIsDateTime && (SC.empty(iCaseValue) || DG.isDate(iCaseValue) || DG.isDateString( iCaseValue)));
          if (tDataIsDateTime && (!SC.empty(iCaseValue))) {
            var tDate = DG.isDate( iCaseValue) ? iCaseValue : DG.createDate( iCaseValue);
            if (tDate) {tNumericCaseCount++;
              if (tDate.valueOf() < tMin) tMin = tDate.valueOf();
              if (tDate.valueOf() > tMax) tMax = tDate.valueOf();}
          } else if (!SC.empty(tValue) && (typeof iCaseValue !== 'boolean') && isFinite(tValue)) {
            tNumericCaseCount++;
            if (tValue < tMin) tMin = tValue;
            if (tValue > tMax) tMax = tValue;
            tSum += tValue;
            tValues.push(tValue);
            if (tValue > 0) {
              tPositiveMin = Math.min(tValue, tPositiveMin);
              tPositiveMax = Math.max(tValue, tPositiveMax);
            }
          }
          // Let infinity and NaN through as numbers. And don't let null be treated as categorical
          else if ((typeof iCaseValue !== 'number') && !SC.empty(iCaseValue)) {
            tValue = String(iCaseValue);
            tDataIsNumeric = tDataIsNumeric && SC.empty(tValue);
            tColorValuesExist = tColorValuesExist || DG.ColorUtilities.isColorSpecString(tValue);
          }
        }

      this.numericStats.reset();

      this.numericStats.beginPropertyChanges();
      if (SC.isArray(tCases)) {
        tAttributes.forEach(function (iAttribute) {
          var tVarID = iAttribute.get('id');
          tCases.forEach(function (iCase) {
            // We use the raw value here because Date objects will remain such
            addCaseValueToStats(iCase.getRawValue(tVarID));
          });
        });
      }
      tDataIsDateTime = tDataIsDateTime && tFoundADateDuringDataIsDateTime;

      if (tNumericCaseCount > 0) {
        this.numericStats.set('count', tNumericCaseCount);
        this.numericStats.set('sum', tSum);
        this.numericStats.set('rangeMin', tMin);
        this.numericStats.set('rangeMax', tMax);
        tMean = tSum / tNumericCaseCount;
        tValues.forEach(function (iValue) {
          var tDiff = iValue - tMean;
          tSumDiffs += tDiff;
          tSumSquareDiffs += tDiff * tDiff;
        });
        // The second term serves as a correction factor for roundoff error.
        // See Numeric Recipes in C, section 14.1 for details.
        tSumSquareDiffs -= tSumDiffs * tSumDiffs / tNumericCaseCount;
        this.numericStats.set('squaredDeviations', tSumSquareDiffs);

        if (tPositiveMin <= tPositiveMax) {
          this.numericStats.set('positiveMin', tPositiveMin);
          this.numericStats.set('positiveMax', tPositiveMax);
        }
      }
      if (tDataIsDateTime) {
        tAttributeType = DG.Analysis.EAttributeType.eDateTime;
      }
      else if (tDataIsNumeric) {
        tAttributeType = DG.Analysis.EAttributeType.eNumeric;
      }
      else if (tColorValuesExist) {
        tAttributeType = DG.Analysis.EAttributeType.eColor;
      }
      else {
        tAttributeType = DG.Analysis.EAttributeType.eCategorical;
      }
      this.numericStats.set('attributeType', tAttributeType);
      this._numericCacheIsValid = true;
      this.numericStats.endPropertyChanges();
    },

    /**
     @property{Number} The number of categorical cells
     */
    numberOfCells: function () {
      if (this.get('attributeType') === DG.Analysis.EAttributeType.eNumeric)
        return 1;
      if (!this._categoricalCacheIsValid)
        this._computeCategoricalStats();
      return this.getPath('categoricalStats.numberOfCells');
    }.property(),

    numberOfCellsDidChange: function () {
      this.notifyPropertyChange('numberOfCells');
    }.observes('*categoricalStats.numberOfCells'),

    /**
     @property{Number} The number of categorical cells
     */
    numericRange: function () {
      if (!this._numericCacheIsValid)
        this._computeNumericStats();
      return this.getPath('numericStats.numericRange');
    }.property(),

    numericRangeDidChange: function () {
      this.notifyPropertyChange('numericRange');
    }.observes('*numericStats.numericRange'),

    dataDidChange: function () {
      // We only have to deal with categorical stats if we are not numeric
      // Note that for this to work in the long run we're going to have to respond to any change
      //    in whether the attributes are numeric or not.
      if ((this.get('attributeType') === DG.Analysis.EAttributeType.eCategorical) && !this._categoricalCacheIsValid) {
        var tOldNumCells = this.categoricalStats.get('numberOfCells'),
            tNewNumCells;
        this._computeCategoricalStats();
        tNewNumCells = this.categoricalStats.get('numberOfCells');
        if (tNewNumCells !== tOldNumCells) {
          this.notifyPropertyChange('numberOfCells');
        }
      }
    }.observes('_categoricalCacheIsValid'),

    /**
     @property{Object} The names of the properties of this object are the cell names
     */
    cellMap: function () {
      if (!this._categoricalCacheIsValid)
        this._computeCategoricalStats();
      return this.categoricalStats.get('cellMap');
    }.property(),
    cellMapDidChange: function () {
      this.notifyPropertyChange('cellMap');
    }.observes('categoricalStats.cellMap'),

    /**
     @property{Object} The names of the properties of this object are the cell names
     */
    cellNames: function () {
      if (!this._categoricalCacheIsValid)
        this._computeCategoricalStats();
      return this.categoricalStats.get('cellNames');
    }.property(),
    cellNamesDidChange: function () {
      this.notifyPropertyChange('cellNames');
    }.observes('*categoricalStats.cellMap'),

    /**
     @return{Number} corresponding to given name
     */
    cellNameToCellNumber: function (iCellName) {
      if (!this._categoricalCacheIsValid)
        this._computeCategoricalStats();
      return this.categoricalStats.cellNameToCellNumber(iCellName);
    },

    /**
     Run through all attribute values and cache categorical stats.
     Note: Caller's responsibility to check for this._categoricalCacheIsValid. This routine will
            run regardless.
     @private
     */
    _computeCategoricalStats: function () {
      var tCases = this._cases,
          tAttributes = this.get('attributes'),
          tCaseCount = 0,
          tCellMap = {},
          tArrayOfKeysAndNumber = [],
          tNumCells,
          tNumberOfCategoriesLimit = this.get('number_of_categories_limit');

      function addCaseValueToStats(iCase, iCaseValue) {
        var tValue = String(iCaseValue);
        // Note that a null iCaseValue becomes "null" under string coercion
        if (!SC.none(iCaseValue) && !SC.empty(tValue)) {
          if (SC.none(tCellMap[tValue])) {
            tCellMap[tValue] = {cases: [], cellNumber: null};
          }
          tCellMap[tValue].cases.push(iCase);
          tCaseCount++;
        }
      }

      this.categoricalStats.reset();

      if (SC.isArray(tCases)) {
        tAttributes.forEach(function (iAttribute) {
          iAttribute.updateCategoryMap();

          var tVarID = iAttribute.get('id');
          tCases.forEach(function (iCase) {
            addCaseValueToStats(iCase, iCase.getValue(tVarID));
          });
          var tCellNumber = 0,
              tBlockIfEmpty = iAttribute.get('blockDisplayOfEmptyCategories');
          iAttribute.forEachCategory(function (iName, iColor, iIndex) {
            if (!tBlockIfEmpty || (tCellMap[iName] && tCellMap[iName].cases.length > 0)) {
              tCellMap[iName].cellNumber = tCellNumber++;
            }
          });
          tNumCells = tCellNumber;
          // If we have more categories than the limit, combine extra categories into kOther
          if(!SC.none(tNumberOfCategoriesLimit) && tNumCells > tNumberOfCategoriesLimit + 1) {
            // Make a sorted array for efficient identification of categories beyond limit
            DG.ObjectMap.forEach(tCellMap, function( iKey, iValue) {
              tArrayOfKeysAndNumber.push({ key: iKey, cellNumber: iValue.cellNumber});
            });
            tArrayOfKeysAndNumber.sort( function( iPair1, iPair2) {
              return iPair1.cellNumber - iPair2.cellNumber;
            });

            var tOtherEntry = { cases: [], cellNumber: null },
                tKeyNumberPairForLastEntry;
            while( tNumCells > tNumberOfCategoriesLimit) {
              tKeyNumberPairForLastEntry = tArrayOfKeysAndNumber.pop();
              tCellMap[tKeyNumberPairForLastEntry.key].cases.forEach( function( iCase) {
                tOtherEntry.cases.push( iCase);
              });
              tOtherEntry.cellNumber = tKeyNumberPairForLastEntry.cellNumber;
              delete tCellMap[tKeyNumberPairForLastEntry.key];
              tNumCells--;
            }
            tCellMap[DG.PlotUtilities.kOther] = tOtherEntry;
          }
        });

        this.categoricalStats.beginPropertyChanges();
        this.categoricalStats.set('cellMap', tCellMap);
        this.categoricalStats.set('count', tCaseCount);
        this._categoricalCacheIsValid = true;
        this.categoricalStats.endPropertyChanges();
      }
    }
  };
}()));

