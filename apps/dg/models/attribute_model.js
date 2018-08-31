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
       * Temporary storage of the formula when it is frozen.
       * @property {String}
       */
      frozenFormula: '',

      /**
       * The map of attribute and category color values, for the attribute.
       * For special color keys and values, see:
       *   DG.ColorUtilities.getAttributeColorFromColorMap(),
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
      editable: false,

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
       * {Computed} True if the attribute has a frozen formula.
       * @property {Boolean}
       */
      hasFrozenFormula: function () {
        return !SC.empty(this.get('frozenFormula'));
      }.property('frozenFormula').cacheable(),

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
      }.observes('formula'),

      freezeFormula: function (iContext) {
        var tCollection = iContext.getCollectionForAttribute(this),
          tAttrName = this.get('name'),
          tFormula = '',
          tFrozenFormula = this.get('formula');

        DG.UndoHistory.execute(DG.Command.create({
          name: "caseTable.editAttributeFormula",
          undoString: 'DG.Undo.caseTable.editAttributeFormula',
          redoString: 'DG.Redo.caseTable.editAttributeFormula',
          _componentId: this.getPath('model.id'),
          _controller: function() {
            return DG.currDocumentController().componentControllersMap[this._componentId];
          },
          execute: function() {
            var tChange = {
                operation: 'createAttributes',
                collection: tCollection,
                attrPropsArray: [{ name: tAttrName, formula: tFormula }]
              },
              tResult = iContext && iContext.applyChange( tChange);
            if( tResult.success) {
              var action = "attributeEditFormula";
              this.log = "%@: { name: '%@', collection: '%@', formula: '%@' }".fmt(
                action, tAttrName, tCollection.get('name'), tFormula);
            } else {
              this.set('causedChange', false);
            }
          },
          undo: function() {
            var tChange, tResult, action; // eslint-disable-line no-unused-vars
            tChange = {
              operation: 'createAttributes',
              collection: tCollection,
              attrPropsArray: [{ name: tAttrName, formula: tFrozenFormula }]
            };

            tResult = iContext && iContext.applyChange( tChange);
            if( tResult.success) {
              action = "attributeEditFormula";
            } else {
              this.set('causedChange', false);
            }
          },
          redo: function() {
            this.execute();
          }
        }));

        this.set('formula', tFormula);
        this.set('frozenFormula', tFrozenFormula);
      },

      unfreezeFormula: function (iContext) {
        var tCollection = iContext.getCollectionForAttribute(this),
          tAttrName = this.get('name'),
          tFormula = this.get('frozenFormula'),
          tFrozenFormula = '';

        DG.UndoHistory.execute(DG.Command.create({
          name: "caseTable.editAttributeFormula",
          undoString: 'DG.Undo.caseTable.editAttributeFormula',
          redoString: 'DG.Redo.caseTable.editAttributeFormula',
          _componentId: this.getPath('model.id'),
          _controller: function() {
            return DG.currDocumentController().componentControllersMap[this._componentId];
          },
          execute: function() {
            var tChange = {
                operation: 'createAttributes',
                collection: tCollection,
                attrPropsArray: [{ name: tAttrName, formula: tFormula }]
              },
              tResult = iContext && iContext.applyChange( tChange);
            if( tResult.success) {
              var action = "attributeEditFormula";
              this.log = "%@: { name: '%@', collection: '%@', formula: '%@' }".fmt(
                action, tAttrName, tCollection.get('name'), tFormula);
            } else {
              this.set('causedChange', false);
            }
          },
          undo: function() {
            var tChange, tResult, action; // eslint-disable-line no-unused-vars
            tChange = {
              operation: 'createAttributes',
              collection: tCollection,
              attrPropsArray: [{ name: tAttrName, formula: tFrozenFormula }]
            };

            tResult = iContext && iContext.applyChange( tChange);
            if( tResult.success) {
              action = "attributeEditFormula";
            } else {
              this.set('causedChange', false);
            }
          },
          redo: function() {
            this.execute();
          }
        }));

        this.set('formula', tFormula);
        this.set('frozenFormula', tFrozenFormula);
      },

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

      /**
       * Gets called when attribute is used categorically in a graph and something has changed.
       */
      updateCategoryMap: function() {
        var tCollection = this.get('collection');
        if( tCollection) {
          var tAttrID = this.get('id'),
              tCases = tCollection.get('cases'),
              tCategoryMap = this._categoryMap || { __order: []},
              tColorIndex = tCategoryMap.__order.length % DG.ColorUtilities.kKellyColors.length,
              tCatRecord = {};
          tCases && tCases.forEach( function( iCase) {
            var tValue = iCase.getStrValue( tAttrID);
            tCatRecord[ tValue] = true;
            if( SC.none( tCategoryMap[ String( tValue)])) {
              if( !SC.empty(tValue)) {
                tCategoryMap[tValue] = DG.ColorUtilities.kKellyColors[tColorIndex];
                tColorIndex = (tColorIndex + 1) % DG.ColorUtilities.kKellyColors.length;
                tCategoryMap.__order.push(tValue);
              }
            }
          }.bind( this));
          // Delete unrecorded categories
          tCategoryMap.__order.forEach( function( iCat, iIndex) {
            if( !tCatRecord[ iCat]) {
              delete tCategoryMap[ iCat];
              tCategoryMap.__order.splice( iIndex, 1);
            }
          }.bind( this));
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
          defaultMin: this.defaultMin,
          defaultMax: this.defaultMax,
          description: this.get('description'),
          _categoryMap: this._categoryMap ? this.get('categoryMap') : undefined,
          blockDisplayOfEmptyCategories: this.blockDisplayOfEmptyCategories || undefined,
          editable: this.editable,
          hidden: this.hidden,
          formula: this.hasFormula() ? this.formula : undefined,
          guid: this.id,
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
 * Convert a string to a "legal" attribute name.
 */
DG.Attribute.canonicalizeName = function (iName, iCanonicalize) {
  var tName = String(SC.none(iName) ? '' : iName),
      tReg = /\((.*)\)/,  // Identifies first parenthesized substring
      tMatch = tReg.exec(tName),
      tNewName = tName;

  // If there is a parenthesized substring, stash it as the unit and remove it from the name
  if (tMatch && tMatch.length > 1) {
    tNewName = tName.replace(tReg, '');  // Get rid of parenthesized units
  }
  // TODO: We are eliminating all but Latin characters here. We should be more general and allow
  // non-Latin alphanumeric characters.
  tNewName = tNewName.trim(); // Get rid of trailing white space
  if (iCanonicalize || ((iCanonicalize == null) && DG.canonicalizeNames))
    tNewName = tNewName.replace(/\W/g, '_');  // Replace non-word characters with underscore
  // if after all this we have an empty string replace with a default name.
  if (tNewName.length === 0) {
    tNewName = 'attr';
  }
  return tNewName;
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

DG.Attribute.attributeTypes = [
  DG.Attribute.TYPE_UNSPECIFIED,
  DG.Attribute.TYPE_CATEGORICAL,
  DG.Attribute.TYPE_NUMERIC,
  DG.Attribute.TYPE_DATE,
  DG.Attribute.TYPE_QUALITATIVE,
  DG.Attribute.TYPE_BOUNDARY
];
