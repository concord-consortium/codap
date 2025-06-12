// ==========================================================================
//                            DG.Attribute
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

sc_require('models/model_store');
sc_require('models/base_model');

/* global Set:true */


/** @class
 *
 * Describes the named constituent data values of a case. An attribute may be
 * 'nominal' or 'numeric', meaning the data value will either be interpreted as
 * string valued or numeric. An attribute may be a formula, meaning that the
 * attribute's corresponding data value would be computed.
 * An attribute may be editable or not. Some properties of attributes affect
 * how the corresponding values are displayed. For example, 'precision' affects
 * the formatting of numeric attributes, and 'categoryMap' affects the color's used
 * when the attribute is displayed in a graph legend.
 *
 * @extends SC.BaseModel
 */
DG.Attribute = DG.BaseModel.extend(
    /** @scope DG.Attribute.prototype */ {

      /**
       * The name of the attribute
       * @property {String}
       */
      name: '',

      /**
       * The displayable name of the attribute
       */
      _title: null,
      title: function (k, v) {
        if (!SC.none(v)) {
          this._title = v;
        }
        return this._title || this.get('name');
      }.property(),

      /**
       * The formula for the attribute
       * @property {String}
       */
      formula: '',

      /**
       * Recently formula preserved for later recovery
       * @property {String}
       */
      deletedFormula: '',

      /**
       * The map of attribute and category color values, for the attribute.
       * For special color keys and values, see:
       *   DG.ColorUtilities.getAttributeColorFromColorMap(),
       *   DG.ColorUtilities.getStrokeColorFromColorMap(),
       *   DG.ColorUtilities.getCategoryColorFromColorMap(),
       *   DG.ColorUtilities.simpleColorNames()
       * Maintains an array that specifies the order of iteration through the categories
       * @property {Object}
       */
      _categoryMap: null,
      categoryMap: function(iKey, iValue) {
        if( !SC.none( iValue)) {
          this._categoryMap = iValue;
        }
        if(SC.none( this._categoryMap) || !SC.isArray( this._categoryMap.__order) ||
              this._categoryMap.__order.length === 0 ){
          this.updateCategoryMap();
          // Default order is alphameric
          this._categoryMap.__order.sort( function( a, b) {
            if( DG.isNumeric(a) && DG.isNumeric(b))
              return a - b;
            else return a > b;
          });
        }
        return this._categoryMap;
      }.property(),

      /**
       * If false, empty categories will be displayed in categorical plots and legends
       * @property{Boolean}
       */
      blockDisplayOfEmptyCategories: true,

      /**
       * A description of/comment for the attribute
       * @property {String}
       */
      description: '',

      /**
       * Type of the attribute: 'numeric' or 'nominal'
       */
      type: null,

      /**
       * Globally unique id supporting collaboration.
       * @property {String}
       */
      cid: null,

      /**
       * A relational link back to the parent collection.
       * @property {DG.CollectionRecord}
       */
      collection: null,

      /**
       * Number of decimal places to use for display.
       * Applicable only to numeric values.
       * @property {Number}
       */
      precision: 2,

      /**
       * Currently the only significance of this string property is that it
       * shows in parentheses next to attribute names in case table column
       * headers and graph axis labels.
       * @property{String}
       */
      unit: null,

      /**
       * True if the attribute is user-editable, false otherwise.
       * By default user-created attributes are editable as well as
       * any game-created attributes marked as such.
       * @property {Boolean}
       */
      editable: true,

      /**
       * True if the attribute is hidden from the user, false otherwise.
       * By default attributes are visible.
       * @property {Boolean}
       */
      hidden: false,

      /**
       * True if the attribute is renameable, false otherwise.
       * @property {Boolean}
       */
      renameable: true,

      /**
       * True if the attribute is user-deletable, false otherwise.
       *
       * @property {Boolean}
       */
      deleteable: true,

      /**
       @private
       The DG.Formula for evaluation.
       @property   {DG.Formula}
       */
      _dgFormula: null,

      /**
       @private
       Cached values and validFlags.
       @property   {Object.<string, {isValid: boolean, value: any}>}
       */
      _cachedValues: null,

      /**
       Initialization function.
       */
      init: function () {
        sc_super();

        // Handle formula passed in as property at creation
        var formulaSource = this.get('formula');
        if (!SC.empty(formulaSource) && !this._dgFormula) {
          this.createDGFormula();
          this._dgFormula.set('source', formulaSource);
        }
        if (typeof this.collection === 'number') {
          this.collection = DG.store.find(DG.Attribute, this.collection);
        }

        this._cachedValues = {};
      },

      verify: function () {
        if (SC.empty(this.collection)) {
          DG.logWarn('Unattached attribute: ' + this.id);
        }
        if (typeof this.collection === 'number') {
          DG.logWarn('Unresolved reference to collection id, ' + this.collection +
              ', in attribute: ' + this.id);
        }
        if (!(this.collection.recordType
                && this.collection.recordType() === DG.Collection)) {
          DG.logWarn('Unexpected collection RecordType: '
              + this.collection.recordTypeString());
        }
      },

      /**
       Destruction function.
       */
      destroy: function () {
        var attrID = this.get('id');

        if (!SC.none(attrID)) {
          delete DG.Attribute.idMap[attrID];
        }

        if (this.collection) {
          this.collection.attrs.removeObject(this);
          // remove from data set
          this.collection.dataSet.deleteAttribute(this);
        }

        if (this._dgFormula)
          this.destroyDGFormula();
        sc_super();
      },

      /**
       * Return object with copies of all properties that could be transferred to another attribute
       * @return {{}}
       */
      getTransferableProperties: function() {
        return {
          name: this.get('name'),
          title: this.get('title'),
          formula: this.get('formula'),
          deletedFormula: this.get('deletedFormula'),
          categoryMap: JSON.parse(JSON.stringify( this.get('categoryMap'))),
          blockDisplayOfEmptyCategories: this.get('blockDisplayOfEmptyCategories'),
          description: this.get('description'),
          type: this.get('type'),
          precision: this.get('precision'),
          unit: this.get('unit')
          // The rest of the properties shouldn't be transferred, at least in the join situation
          // editable: this.get('editable'),
          // hidden: this.get('hidden'),
          // renameable: this.get('renameable'),
          // deleteable: this.get('deleteable'),
        };
      },

      /**
       * Iterate through the categories in the order maintained in the categoryMap
       *
       * @param iFunc has signature String, Color, Integer
       */
      forEachCategory: function( iFunc) {
        var tCategories = this.get('categoryMap');
        DG.assert(!SC.none( tCategories) && SC.isArray( tCategories.__order));
        tCategories.__order.forEach( function( iCategory, iIndex) {
          var tColor = tCategories[iCategory];
          tColor = tColor && tColor.colorString ? tColor.colorString : tColor;
          iFunc( iCategory, tColor, iIndex);
        });
      },

      /**
       Utility function for creating the DG.Formula when necessary
       and hooking up the necessary observers.
       */
      createDGFormula: function () {
        var context = DG.CollectionFormulaContext.create({
          ownerSpec: {
            type: DG.DEP_TYPE_ATTRIBUTE,
            id: this.get('id'),
            name: this.get('name')
          },
          collection: this.get('collection')
        });
        this._dgFormula = DG.Formula.create({context: context});

        this._dgFormula.addObserver('namespaceChange', this, 'namespaceDidChange');
        this._dgFormula.addObserver('dependentChange', this, 'dependentDidChange');
      },

      /**
       Update the formula context when the collection changes
       */
      collectionDidChange: function () {
        if (this.hasFormula()) {
          this._cachedValues = {};
          this.setPath('_dgFormula.context.collection', this.get('collection'));
          this._dgFormula.invalidate();
        }
      }.observes('collection'),

      /**
       Utility function for destroying the DG.Formula when necessary
       and cleanup up the necessary observers.
       */
      destroyDGFormula: function () {
        this._dgFormula.removeObserver('dependentChange', this, 'dependentDidChange');
        this._dgFormula.removeObserver('namespaceChange', this, 'namespaceDidChange');
        this._dgFormula.destroy();
        this._dgFormula = null;
      },

      /**
       * {Computed} True if the attribute has a non-empty formula.
       * @property {Boolean}
       */
      hasFormula: function () {
        return !SC.empty(this.get('formula'));
      }.property('formula').cacheable(),

      /**
       * {Computed} True if the attribute has a recently-deleted formula.
       * @property {Boolean}
       */
      hasDeletedFormula: function () {
        return !SC.empty(this.get('deletedFormula'));
      }.property('deletedFormula').cacheable(),

      /**
       * Evaluates the attribute's formula in the context of the specified namespace object.
       * @param iCase {Object}    Namespace object with property:value pairs for evaluation context
       * @return {Number | ?} Result of evaluation
       */
      evalFormula: function (iCase) {
        var tFormula = this._dgFormula,
            tReturnValue = NaN,
            tCaseID = iCase && iCase.get('id'),
            cacheEntry = this._cachedValues[tCaseID];

        // if we have a valid cache entry, use it
        if (cacheEntry && cacheEntry.isValid)
          return cacheEntry.value;

        try {
          // Client is responsible for passing _case_ and _id_
          tReturnValue = tFormula.evaluate({
            _case_: iCase,
            _id_: iCase && iCase.get('id'),
            _collectionID_: this.getPath('collection.id')
          });
          if (cacheEntry) {
            // update the existing cache entry
            cacheEntry.isValid = true;
            cacheEntry.value = tReturnValue;
          }
          else {
            // cache a new entry
            this._cachedValues[tCaseID] = {isValid: true, value: tReturnValue};
          }
        }
        catch (e) {
          // Return error objects as attribute values.
          tReturnValue = e;
        }

        return tReturnValue;
      },

      /*
       Invalidate the cached values for the specified cases, or for all cases
       if no specific cases are identified. Invalidates the attribute value
       cache along with the specified aggregate function caches as well.
       @param {DG.Case[]}   iCases - array of cases to invalidate
                                      if no cases specified, invalidate all cases
       @param {number[]}    iAggFnIndices - array of aggregate function indices
       */
      invalidateCases: function (iCases, iAggFnIndices) {
        var caseCount = iCases && iCases.length;
        if (caseCount > 0) {
          // invalidate specified cases
          iCases.forEach(function (iCase) {
            var caseID = iCase && iCase.get('id'),
                cachedValue = this._cachedValues[caseID];
            if (cachedValue)
              cachedValue.isValid = false;
          }.bind(this));
        }
        else {
          // invalidate all cases
          DG.ObjectMap.forEach(this._cachedValues, function (iCaseID, iCachedValue) {
            iCachedValue.isValid = false;
          });
        }

        // invalidate specified aggregate function caches
        if (iAggFnIndices && iAggFnIndices.length) {
          // @if (debug)
          // DG.log("DG.Attribute.invalidateCases: attribute '%@' invalidating aggregate functions [%@]",
          //         this.get('name'), iAggFnIndices.join(", "));
          // @endif
          var formulaContext = this.getPath('_dgFormula.context');
          if (formulaContext)
            formulaContext.invalidateFunctions(iAggFnIndices);
        }
      },

      /**
       Observer function called when the formula changes.
       This function creates, updates, or destroys the corresponding
       DG.Formula as needed and sets up/tears down the necessary
       observers whenever the formula changes.
       */
      formulaDidChange: function () {
        var tSource = this.get('formula');

        // Non-empty formula string -- we need a DG.Formula
        if (!SC.empty(tSource)) {
          // Create the DG.Formula if we don't have one yet
          if (!this._dgFormula)
            this.createDGFormula();
          // Update the DG.Formula with the new source
          this._dgFormula.set('source', tSource);

          // mark all cached values as invalid
          DG.ObjectMap.forEach(this._cachedValues,
              function (id, iCachedValue) {
                iCachedValue.isValid = false;
              });
        }

        // empty formula string -- no need for a DG.Formula
        else {
          if (this._dgFormula)
            this.destroyDGFormula();
          this._cachedValues = {};
        }

        // Discard old deleted formula waiting for recovery.
        this.set('deletedFormula', '');
      }.observes('formula'),

      namespaceDidChange: function () {
        // mark all cached values as invalid
        DG.ObjectMap.forEach(this._cachedValues,
            function (id, iCachedValue) {
              iCachedValue.isValid = false;
            });
      },

      /**
       Observer function called when an attribute formula notifies
       that one of its dependents has changed.
       */
      dependentDidChange: function (iNotifier, iKey) {
        this.notifyPropertyChange(iKey);
      },

      hasValues: function() {
        var hasValues = false;
        var tCollection = this.get('collection');
        if( tCollection) {
          var tAttrID = this.get('id'),
              tCases = tCollection.get('cases');
          tCases && tCases.forEach( function( iCase) {
            var tValue = iCase.getValue(tAttrID);
            if ((tValue == null) || (tValue === "")) return;
            if ((typeof tValue === "number") && !isFinite(tValue)) return;
            hasValues = true;
          }.bind( this));
        }
        return hasValues;
      }.property(),

      /**
       * Gets called when attribute is used categorically in a graph and something has changed.
       * When we find categories that are no longer used we push them to the end rather than delete them.
       * That way swapping categories by dragging on a legend will still work.
       */
      updateCategoryMap: function() {
        var ignorable = ['__order', 'stroke-color', 'stroke-transparency'];

        function validateAndFixCategoryMap(iCategoryMap, iColorIndex) {
          // A plugin can produce a category map without colors assigned. This messes up assignment to __order.
          // Also, it can happen that the __order array contains extra elements and/or is missing an element
          var tLeftOver = iCategoryMap.__order.slice();
          DG.ObjectMap.forEach( iCategoryMap, function( iCategory, iValue) {
            if( !ignorable.includes(iCategory)) {
              if (SC.none(iValue)) {
                iCategoryMap[iCategory] = DG.ColorUtilities.kKellyColors[iColorIndex];
                iColorIndex = (iColorIndex + 1) % DG.ColorUtilities.kKellyColors.length;
              }
              if( tLeftOver.includes(iCategory))
                tLeftOver.splice(tLeftOver.indexOf(iCategory), 1);
              else
                iCategoryMap.__order.push( iCategory);
            }
          });
          tLeftOver.forEach( function( iElement) {
            iCategoryMap.__order.splice(iCategoryMap.__order.indexOf(iElement), 1);
          });
        }

        var tCollection = this.get('collection');
        if( tCollection) {
          var tAttrID = this.get('id'),
              tCases = tCollection.get('cases'),
              tCategoryMap = this._categoryMap || { __order: []},
              tColorIndex = tCategoryMap.__order.length % DG.ColorUtilities.kKellyColors.length,
              tFoundCategoriesSet = new Set();
          validateAndFixCategoryMap(tCategoryMap, tColorIndex);
          tCases && tCases.forEach( function( iCase) {
            var tValue = iCase.getStrValue( tAttrID);
            if( SC.none( tCategoryMap[ String( tValue)])) {
              if( !SC.empty(tValue)) {
                tCategoryMap[tValue] = DG.ColorUtilities.kKellyColors[tColorIndex];
                tColorIndex = (tColorIndex + 1) % DG.ColorUtilities.kKellyColors.length;
                tCategoryMap.__order.push(tValue);
              }
            }
            tFoundCategoriesSet.add( tValue);
          }.bind( this));
          // Note that we are not deleting categories that may no longer be present. This is so we don't lose
          // color assignments for categories whose cases are deleted but then reappear. (Think sampler.)
          if( !this._categoryMap) {
            tCategoryMap.__order.sort( function( item1, item2) {
              if( typeof item1 === 'number' && typeof item2 === 'number')
                return item1 - item2;
              else if( item1 < item2)
                return -1;
              else if( item1 > item2)
                return 1;
              else return 0;
            });  // Default is alphabetical
          }
          // We push categories that are present but not found in cases to the end
          DG.ObjectMap.forEach( tCategoryMap, function (iCategory) {
            if(!ignorable.includes(iCategory) && !tFoundCategoriesSet.has(iCategory)) {
              var tIndex = tCategoryMap.__order.indexOf(iCategory);
              tCategoryMap.__order.splice( tIndex, 1);
              tCategoryMap.__order.push( iCategory);
            }
          });
          this.set('categoryMap', tCategoryMap);
        }
      },

      /**
       Override to update our attribute map to include attributes loaded
       from documents.
       */
      didLoadRecord: function () {
        var id = this.get('id');
        DG.Attribute.idMap[id] = this;
      },
      toArchive: function () {
        return {
          name: this.get('name'),
          type: this.type,
          title: this.get('title'),
          cid: this.get('cid'),
          defaultMin: this.defaultMin,
          defaultMax: this.defaultMax,
          description: this.get('description'),
          _categoryMap: this._categoryMap ? this.get('categoryMap') : undefined,
          blockDisplayOfEmptyCategories: this.blockDisplayOfEmptyCategories || undefined,
          editable: this.editable,
          hidden: this.hidden,
          renameable: this.renameable,
          deleteable: this.deleteable,
          formula: this.hasFormula() ? this.formula : undefined,
          deletedFormula: this.hasDeletedFormula() ? this.deletedFormula : undefined,
          guid: this.id,
          id: this.id,
          precision: this.precision,
          unit: this.unit
        };
      }
    });

/**
 Global map from attribute ID to attribute.
 More efficient than calling DG.store.find(DG.Attribute, attrID);
 */
DG.Attribute.idMap = {};

/**
 Retrieves an attribute by its ID using our internal map.
 @param  {Number}  iAttrID -- the ID of the attribute to be retrieved
 */
DG.Attribute.getAttributeByID = function (iAttrID) {
  return DG.Attribute.idMap[iAttrID];
};

/**
 * Creates a new attribute with the specified properties.
 * @param {Object}  iProperties List of properties to apply to the newly-created DG.Attribute.
 * @return {DG.Attribute}   The newly-created DG.Attribute
 */
DG.Attribute.createAttribute = function (iProperties) {
  var collection = DG.store.resolve(iProperties.collection),
      newAttribute, tNewColormap;

  // As part of the transition from colormap to _colormap and colormap to categoryMap,
  // we have to convert the old property that comes in from previously saved documents and plugins
  if( iProperties.colormap) {
    iProperties.categoryMap = iProperties.colormap;
    delete iProperties.colormap;
  }
  if( iProperties._colormap) {
    iProperties._categoryMap = iProperties._colormap;
    delete iProperties._colormap;
  }
  if( iProperties.categoryMap) {
    if(DG.ObjectMap.length(iProperties.categoryMap) > 0)
      iProperties._categoryMap = iProperties.categoryMap;
    delete iProperties.categoryMap;
  }

  // create collaborative id,  if not already there.
  if (!iProperties.cid) {
    iProperties.cid = DG.DataUtilities.createUniqueID();
  }

  iProperties.collection = collection;
  newAttribute = DG.Attribute.create(iProperties || {});
  if (iProperties._categoryMap) {
    tNewColormap = SC.clone(iProperties._categoryMap);
    if (iProperties._categoryMap.__order) {
      tNewColormap.__order = SC.clone(iProperties._categoryMap.__order);
    }
    else {
      tNewColormap.__order = [];
      DG.ObjectMap.forEach(tNewColormap, function (iKey) {
        if (iKey !== '__order' && !SC.empty( iKey))
          tNewColormap.__order.push(String(iKey));
      });
    }
    newAttribute.set('categoryMap', tNewColormap);
  }
  if (iProperties.type && iProperties.type === DG.Attribute.TYPE_NOMINAL) {
    iProperties.type = DG.Attribute.TYPE_CATEGORICAL;
  }

  DG.store.commitRecords();
  DG.Attribute.idMap[newAttribute.get('id')] = newAttribute;
  return newAttribute;
};

/**
 * Returns unit part of a name string.
 * By convention, a parenthesized substring at the end of a name string is
 * interpreted as a unit by CODAP.
 *
 * @param iName
 * @return unit string, if present. otherwise null.
 */
DG.Attribute.extractUnitFromNameString = function (iName) {
  if (!iName) {
    return null;
  }

  var match = /\(([^)]*)\)$/.exec(iName.trim());
  if (match) {
    return match[1];
  } else {
    return null;
  }
};

/**
 * Convert a string to a "legal" attribute name.
 */
DG.Attribute.canonicalizeName = function (iName, iCanonicalize) {
  var tName = String(SC.none(iName) ? '' : iName),
      tReg = /\([^)]*\)$/;  // Identifies parenthesized substring at end

  tName = tName.trim(); // Get rid of trailing white space
  if (iCanonicalize || ((iCanonicalize == null) && DG.canonicalizeNames)) {
    tName = tName.replace(tReg, '');  // Get rid of parenthesized units
    tName = tName.replace(/\W/g, '_');  // Replace non-word characters with underscore
  }
  // if after all this we have an empty string replace with a default name.
  if (tName.length === 0) {
    tName = 'attr';
  }
  return tName;
};
/**
 * Destroys the specified DG.Attribute.
 * @param iAttribute {DG.Attribute}  The DG.Attribute to destroy
 */
DG.Attribute.destroyAttribute = function (iAttribute) {
  iAttribute.destroy();
};

/**
 * Valid Attribute types
 *
 * Empty string names an untyped attribute.
 *
 * @type {string[]}
 */
DG.Attribute.TYPE_UNSPECIFIED = 'none';
DG.Attribute.TYPE_NOMINAL = 'nominal'; // no longer used
DG.Attribute.TYPE_CATEGORICAL = 'categorical';
DG.Attribute.TYPE_NUMERIC = 'numeric';
DG.Attribute.TYPE_DATE = 'date';
DG.Attribute.TYPE_QUALITATIVE = 'qualitative';
DG.Attribute.TYPE_BOUNDARY = 'boundary';
DG.Attribute.TYPE_CHECKBOX = 'checkbox';

DG.Attribute.attributeTypes = [
  DG.Attribute.TYPE_UNSPECIFIED,
  DG.Attribute.TYPE_CATEGORICAL,
  DG.Attribute.TYPE_NUMERIC,
  DG.Attribute.TYPE_DATE,
  DG.Attribute.TYPE_QUALITATIVE,
  DG.Attribute.TYPE_BOUNDARY,
  DG.Attribute.TYPE_CHECKBOX
];

/**
 * Date precision options
 *
 * @type {string[]}
 */
DG.Attribute.DATE_PRECISION_NONE = '';
DG.Attribute.DATE_PRECISION_YEAR = 'year';
DG.Attribute.DATE_PRECISION_MONTH = 'month';
DG.Attribute.DATE_PRECISION_DAY = 'day';
DG.Attribute.DATE_PRECISION_HOUR = 'hour';
DG.Attribute.DATE_PRECISION_MINUTE = 'minute';
DG.Attribute.DATE_PRECISION_SECOND = 'second';
DG.Attribute.DATE_PRECISION_MILLISECOND = 'millisecond';

DG.Attribute.datePrecisionOptions = [
  DG.Attribute.DATE_PRECISION_NONE,
  DG.Attribute.DATE_PRECISION_YEAR,
  DG.Attribute.DATE_PRECISION_MONTH,
  DG.Attribute.DATE_PRECISION_DAY,
  DG.Attribute.DATE_PRECISION_HOUR,
  DG.Attribute.DATE_PRECISION_MINUTE,
  DG.Attribute.DATE_PRECISION_SECOND,
  DG.Attribute.DATE_PRECISION_MILLISECOND
];
