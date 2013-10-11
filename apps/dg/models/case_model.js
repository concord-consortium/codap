// ==========================================================================
//                                DG.Case
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

sc_require('models/dg_record');

/** @class

  Represents an individual case in the collection.

  @extends DG.Record
*/
DG.Case = DG.Record.extend(
/** @scope DG.Case.prototype */ {

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
   * @property {DG.CollectionRecord}
   */
  collection: SC.Record.toOne("DG.CollectionRecord", {
    inverse: "cases", isMaster: NO
  }),
  
  /**
   * A relational link back to the parent case (if any).
   * @property {DG.Case}
   */
  parent: SC.Record.toOne("DG.Case", {
    inverse: "children", isOwner: NO, isMaster: NO
  }),

  /**
   * A relational link to the child cases of this case.
   * @property {Array of DG.Case}
   */
  children: SC.Record.toMany("DG.Case", {
    inverse: "parent", isOwner: NO, isMaster: YES
  }),

  /**
   * Private cache of 'id' property for quicker lookups.
   * Set by DG.Case.createCase().
   */
  _id: null,
  
  /**
   * Associative array of {AttrID:value} pairs for quicker lookups.
   */
  _valuesMap: null,

  /**
   * An object whose properties represent the values of the case.
   * @property {Object}
   */
  values: SC.Record.attr(Object, { defaultValue: {} }),

  /**
   * Initialization function for the case.
   */
  init: function() {
    sc_super();
    this._valuesMap = {};
  },
  
  /**
   * Destruction function for the case.
   */
  destroy: function() {
    this._valuesMap = null;
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
   * Returns the value of the specified attribute for this case.
   * @param {Number} iAttrID ID of the attribute for which the value should be returned.
   * @returns {Number | String | null}
   */
  getValue: function( iAttrID) {
    var returnValue;  // default to undefined
    if( !SC.none( iAttrID)) {
      var tAttr = DG.Attribute.getAttributeByID( iAttrID);
      // If we have an attribute formula, we must evaluate it.
      if (tAttr && tAttr.get('hasFormula')) {
        returnValue = tAttr.evalFormula( this);
      }
      // No attribute formula; extract the value directly
      else if( this._valuesMap && (this._valuesMap[iAttrID] !== undefined)) {
        returnValue = this._valuesMap[iAttrID];
      }
      else {
        // one last chance if we've got a parent
        var tParent = this.get('parent');
        if( !SC.none( tParent))
          returnValue = tParent.getValue( iAttrID);
      }
    }
    return returnValue;
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
    var value = this.getValue( iAttrID),
        valType = typeof value;
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
    switch( valType) {
    case "number":
    case "string":
    case "boolean":
      return String( value);
    }
    return "";
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
    var tAttr = DG.Attribute.getAttributeByID( iAttrID);
      if(tAttr && tAttr.get('hasFormula'))
        return true;

      if( this._valuesMap && !SC.empty( this._valuesMap[iAttrID]))
        return true;

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
    if( !this._valuesMap) return; // Looks like case has been destroyed
    this._valuesMap[iAttrID] = iValue;
  },
  
  /**
    Override to handle 'values' specially.
    During runtime, the _valuesMap, which maps from attrID to value,
    is the definitive contents of the case. In this method, we copy
    the contents of the _valuesMap to the 'values' property, which
    maps from attrName to value, for archival purposes.
   */
  toArchive: function() {
    var values = {};
    DG.ObjectMap.
        forEach( this._valuesMap,
                function( iKey, iValue) {
                  var attr = DG.Attribute.getAttributeByID( iKey),
                      propName = attr && attr.get('name');
                  if( iValue !== undefined)
                    values[ propName] = iValue;
                });
    // Note that in the absence of a doPostArchive() method, we don't
    // have an opportunity to clear the 'values' between saves.
    this.set('values', values);
    return sc_super();
  },
  
  /**
    Override to update the _valuesMap when records are loaded.
    During runtime, the _valuesMap, which maps from attrID to value,
    is the definitive contents of the case. In this method, we copy
    the contents of the 'values' property (which maps from attrName
    to value) to the _valuesMap. It is expected to be called during
    the load/restore process.
   */
  didLoadRecord: function() {
    var collection = this.get('collection'),
        valuesMap = {};
    DG.ObjectMap.
        forEach( this.get('values'),
                function( iKey, iValue) {
                  if( iValue !== undefined) {
                    var attr = collection && collection.getAttributeByName( iKey),
                        attrID = attr && attr.get('id');
                    if( !SC.none( attrID))
                      valuesMap[attrID] = iValue;
                  }
                });
    this._valuesMap = valuesMap;
    // We don't need the 'values' property outside of save/restore
    this.set('values', null);
  },

  debugLog: function(iPrompt) {
    DG.log('Case ' + this.get('id'));
  }

}) ;

  /**
   * Creates a new case with the specified properties.
   * @param {Object}    iProperties -- Properties to apply to the newly-created DG.Case
   * @return {DG.Case}  The newly-created DG.Case
   */
DG.Case.createCase = function( iProperties) {
  var newCase = DG.store.createRecord( DG.Case, iProperties || {});
  DG.store.commitRecords();
  newCase._id = newCase.get('id');
  return newCase;
};

  /**
   * Destroys the specified DG.Case.
   * @param {DG.Case} iCase The case to destroy
   */
DG.Case.destroyCase = function( iCase) {
  iCase.destroy();
};

