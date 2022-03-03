// ==========================================================================
//                                DG.Case
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
 * Represents an individual case in the collection. For the base collection (the
 * rightmost collection, the one with no child collection) there is one case
 * for each item in the data set. For all upper level collections a case is a unique
 * combination of attribute values among the data items with the same parentage.
 * Each collection manages an attribute group. An individual case is the set of
 * DataItems in the DataSet for which the attributes in the attribute group all
 * have the same values.
 *
 * @extends SC.Object
 */
DG.Case = DG.BaseModel.extend((function() {
  /** @scope DG.Case.prototype */

  /**
    Utility function to convert dates to strings while leaving
    all other values alone.
   */
  function convertValue(x, iAttr) {
    if (iAttr && (iAttr.type === 'date' && (DG.isDate(x)))) {
      return DG.formatDate(x, iAttr.precision);
    }
    else {
      return (DG.isDate(x)) ? DG.formatDate(x) : x;
    }
  }

  return {

    /**
     * Revision counter for the case.
     *  Incrementing the revision property causes change notifications to be sent.
     *  Calling beginCaseValueChanges()/endCaseValueChanges() will automatically
     *  increment the revision counter when endCaseValueChanges() is called.
     * @property {Number}
     */
    revision: 0,

    /**
     * A relational link back to the parent collection.
     * @property {DG.Collection}
     */
    collection: null,

    /**
     * A relational link back to the parent case (if any).
     * @property {DG.Case}
     */
    parent: null,

    /**
     * A relational link to the child cases of this case.
     * @property {[DG.Case]}
     */
    children: null,

      /**
       * Every case gets its attribute values from an item.
       * @type {DG.DataItem}
       */
    item: null,

    _cachedDate: null,

    /**
     * Associative array of {AttrID:value} pairs for quicker lookups.
     */
    _valuesMap: function () {
      return this.get('item').values;
    }.property(),

    /**
     * Initialization function for the case.
     */
    init: function() {
      sc_super();

      this._cachedDate = {};
      DG.Case._addCaseToItemMap(this);

      this.children = [];
      if (this.parent) {
        this.parent.children.pushObject(this);
      }
    },

    verify: function () {
      if (SC.empty(this.collection)) {
        DG.logWarn('Unattached case: ' + this.id);
      }
      if (typeof this.collection === 'number') {
        DG.logWarn('Unresolved reference to collection id, ' + this.collection +
          ', in case: ' + this.id);
      }
      if (typeof this.get('parent') === 'number') {
        DG.logWarn('Unresolved reference to parent, ' + this.get('parent') +
          ', in case: ' + this.id);
      }
    },

    /**
     * Destruction function for the case.
     */
    destroy: function() {

      DG.Case._removeCaseFromItemMap(this);

      sc_super();
    },

    beginCaseValueChanges: function() {
      this.beginPropertyChanges();
    },

    /**
     * Ends a set of property changes and increments the revision property.
     */
    endCaseValueChanges: function() {
      this.incrementProperty('revision');
      this.endPropertyChanges();
    },

    /**
     * Returns the raw value of the specified attribute for this case.
     * Dates are returned as Dates rather than converted to strings.
     * @param {Number} iAttrID ID of the attribute for which the value should be returned.
     * @returns {Number | String | null}
     */
    getRawValue: function( iAttrID) {

      if( !SC.none( iAttrID)) {

        // If we have an attribute formula, we must evaluate it.
        var tAttr = DG.Attribute.getAttributeByID( iAttrID);
        var valuesMap = this.get('_valuesMap');
        if (tAttr && tAttr.get('hasFormula') &&
          // we only do the evaluation if it's one of this case's attributes
          (this.getPath('collection.id') === tAttr.getPath('collection.id'))) {
          return tAttr.evalFormula( this);
        }

        // If we have a cached value, simply return it
        if( tAttr && valuesMap && (!SC.none(valuesMap[iAttrID])) &&
            // we only do the evaluation if it's one of this case's attributes. This is important!
            (this.getPath('collection.id') === tAttr.getPath('collection.id'))) {
          return valuesMap[iAttrID];
        }

        // one last chance if we've got a parent and it has 'getValue'
        // Need for this seems to have been brought about by a particular import of boundary file data. Can't hurt.
        var tParent = this.get('parent');
        if( tParent )
          return tParent.getRawValue( iAttrID);
      }
      // if we get here, return value is undefined
    },

    /**
     * Returns the value of the specified attribute for this case.
     * Dates are converted to strings.
     * @param {Number} iAttrID ID of the attribute for which the value should be returned.
     * @returns {Number | String | null}
     */
    getValue: function( iAttrID) {
      var rawValue = this.getRawValue(iAttrID);
      var attr = DG.Attribute.getAttributeByID( iAttrID);
      return rawValue != null ? convertValue(rawValue, attr) : rawValue;
    },

    /**
     * Returns the numeric value of the specified attribute for this case.
     * Note that the built-in isFinite() can be used with the result (rather than
     * DG.isFinite()) because nulls/undefineds/etc. have already been filtered out.
     * @param {Number} iAttrID -- ID of the attribute for which the value should be returned.
     * @param {Object} oOptInfo -- Additional information about the value can be returned to
     *                              the client via this object.
     *                  .type -- The type of the value, e.g. "string", "number", etc.
     *                  .isNominal -- True if the value is non-numeric and can be
     *                                converted to a non-empty string.
     * @returns {Number}
     */
    getNumValue: function( iAttrID, oOptInfo) {
      var value = this.getRawValue( iAttrID),
          valType = typeof value,
          tAttr = DG.Attribute.getAttributeByID( iAttrID),
          attrType = tAttr && tAttr.type;
      if (DG.isDate(value)) {
        // treat dates numerically
        value = Number(value);
        valType = "number";
      } else if (attrType === 'date') {
        if (!this._cachedDate[iAttrID]) {
          this._cachedDate[iAttrID] = DG.parseDate(value, true);
        }
        value = Number(this._cachedDate[iAttrID]);
        valType = "number";
      } else if (DG.isDateString(value)) {
        this._cachedDate[iAttrID] = DG.parseDate(value);
        value = Number(this._cachedDate[iAttrID]);
        valType = "number";
      }
      else if (attrType === 'numeric') {
        value = DG.MathUtilities.extractNumeric(value);
        valType = "number";
      }
      if( oOptInfo) {
        oOptInfo.type = valType;
        // Note: we don't consider non-primitive types (e.g. objects, arrays, etc.)
        oOptInfo.isNominal = (valType === "boolean") ||
          ((valType === "string") && !SC.empty(String(value)));
      }
      switch( valType) {
        case "number":
          return value;
        case "string":
          return (value !== "" ? Number(value) : NaN);
      }
      return NaN;
    },

   /**
     * Returns a numeric value of the specified attribute for this case where the raw value has been stripped
    *   of non-numeric characters and the first valid number.
     * @param {Number} iAttrID -- ID of the attribute for which the value should be returned.
   */
    getForcedNumericValue: function( iAttrID) {
      var tInfo = {},
          tValue = this.getNumValue( iAttrID, tInfo);
      if( tInfo.type === 'number')
        return tValue;
      else
        return DG.MathUtilities.extractNumeric( this.getRawValue( iAttrID));
    },

    /**
     * Returns the string value of the specified attribute for this case.
     * @param {Number} iAttrID ID of the attribute for which the value should be returned.
     * @param {Object} oOptInfo -- Additional information about the value can be returned to
     *                              the client via this object.
     *                  .type -- The type of the value, e.g. "string", "number", etc.
     * @returns {String}
     */
    getStrValue: function( iAttrID, oOptInfo) {
      var value = this.getValue( iAttrID),
          valType = typeof value;
      if( oOptInfo) {
        oOptInfo.type = valType;
      }
      return DG.DataUtilities.toString(value);
    },

    /**
     * Return the value that fits the attribute's type
     * @param iAttrID {Number}
     * @return {number|string|null}
     */
    getTypedValue: function( iAttrID) {
      var tAttribute = DG.Attribute.getAttributeByID( iAttrID);
      if( tAttribute) {
        switch (DG.Attribute.getAttributeByID(iAttrID).get('type')) {
          case 'numeric':
            return this.getForcedNumericValue(iAttrID);
          case 'date':
            return this.getValue(iAttrID);
          case 'nominal':
            return this.getStrValue(iAttrID);
          default:
            return this.getRawValue(iAttrID);
        }
      }
      else
        return this.getRawValue( iAttrID);
    },

    /**
     * Is there a value of the specified attribute for this case.
     * Note that a formula can return a null value, so some cases will be thought
     * to have a value for the given attribute ID, when actually they don't.
     * @param {Number} iAttrID ID of the attribute for which the value should be returned.
     * @returns {Boolean}
     */
    hasValue: function( iAttrID) {
      if (!SC.none( iAttrID)) {
        var tAttr = this.get('collection').getAttributeByID( iAttrID);
        if(tAttr && tAttr.get('hasFormula'))
          return !SC.empty( this.getValue( iAttrID));

        if( tAttr)
          return this.get('_valuesMap') && !SC.empty( this.get('_valuesMap')[iAttrID]);

        var tParent = this.get('parent');
        return tParent && tParent.hasValue( iAttrID);
      }
    },

    /**
     * Sets the value of the specified attribute for this case.
     * @param {Number} iAttrID ID of the attribute for which the value should be set.
     * @param {String} iValue Value of the newly created case value.
     */
    setValue: function(iAttrID, iValue) {
      var children = this.get('children');
      if( !this.get('_valuesMap')) return; // Looks like case has been destroyed

      this._cachedDate[iAttrID] = null;
      if (children.length === 0) {
        this.item.setValue(iAttrID, iValue);
      } else {
        children.forEach(function (child) { child.setValue(iAttrID, iValue); });
      }
    },

    /**
     Returns a copy of the case's values.
     */
    copyValues: function() {
      var valuesMap = this.get('_valuesMap'),
          attrs = this.collection.attrs,
          values = {};
      attrs.forEach(function (attr) {
        values[attr.name] = valuesMap[attr.id];
      });
      return values;
    },

    /**
     Override to handle 'values' specially.
     During runtime, the _valuesMap, which maps from attrID to value,
     is the definitive contents of the case. In this method, we copy the
     contents of the _valuesMap to the 'archivableValues' property, which
     maps from attrName to value and converts values for archival purposes.
     */
    archivableValues: function() {
      var values = {};
      var valuesMap = this.get('_valuesMap');
      var attrs = this.collection.attrs;
      attrs.forEach(function (attr, ix) {
        values[attr.name] = convertValue(valuesMap[attr.id]);
      });
      return values;
    }.property(),


    debugLog: function(iPrompt) {
      DG.log('Case ' + this.get('id'));
    },

    toArchive: function () {
      var result;
      result = {
        parent: (this.get('parent') && this.get('parent').id)  || undefined,
        guid: this.id,
        id: this.id,
        itemID: this.item.id,
        values: this.get('archivableValues')
      };
      return result;
    }
  };
})());

/*
  Map from { collectionID: { itemID: DG.Case }}
  Used for looking up cases from items.
 */
DG.Case._itemCaseMaps = {};

/*
  Adds a (new) case to the item case map.
 */
DG.Case._addCaseToItemMap = function(iCase) {
  var collectionID = iCase.getPath('collection.id'),
      itemID = iCase.getPath('item.id'),
      itemCaseMap = collectionID && DG.Case._itemCaseMaps[collectionID];
  if (!SC.none(itemID) && collectionID) {
    if (!itemCaseMap)
      DG.Case._itemCaseMaps[collectionID] = itemCaseMap = {};
    itemCaseMap[itemID] = iCase;
  }
};

/*
  Removes a case from the item case map.
 */
DG.Case._removeCaseFromItemMap = function(iCase) {
  var collectionID = iCase.getPath('collection.id'),
      itemID = iCase.getPath('item.id'),
      itemCaseMap = collectionID && DG.Case._itemCaseMaps[collectionID];
  if (!SC.none(itemID) && itemCaseMap) {
    delete itemCaseMap[itemID];
  }
};

/*
  Find a case (if any) that corresponds to the specified item.
 */
DG.Case.findCase = function(iCollectionID, iItemID) {
  var itemCaseMap = iCollectionID && DG.Case._itemCaseMaps[iCollectionID];
  return itemCaseMap && !SC.none(iItemID) && itemCaseMap[String(iItemID)];
};

/**
 * Creates a new case with the specified properties.
 * @param iProperties
 *    {{collection:DG.Collection|id, parent:DG.Case|id, extentStart: number}}
 *    Properties to apply to the newly-created DG.Case
 *
 * @return {DG.Case}  The newly-created DG.Case
 */
DG.Case.createCase = function( iProperties) {
  var collection = iProperties.collection,
    parent = iProperties.parent,
    newCase;
  iProperties.collection = DG.store.resolve(collection);
  if (!SC.empty(parent)) {
    iProperties.parent = DG.store.resolve(parent);
  }
  newCase = DG.Case.create(iProperties || {});
  return newCase;
};

/**
 * Destroys the specified DG.Case.
 * @param {DG.Case} iCase The case to destroy
 */
DG.Case.destroyCase = function( iCase) {
  iCase.destroy();
};
