// ==========================================================================
//
//  Author:   jsandoe
//
//  Copyright (c) 2015 by The Concord Consortium, Inc. All rights reserved.
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
/**
 * A DataItem is an n-tuple each element of which corresponds to exactly one
 * attribute in the data set. It can be thought of as a row in a flat table
 * where the columns are Attributes.
 */
DG.DataItem = SC.Object.extend({
  /*
   * A 'given' ID for the DataItem. Items are also identified by their
   * index in the data set.
   * @type {string}
   */
  id: null,

  /**
   * Internal index of this item in the DataSet
   * @type {number}
   */
  itemIndex: null,

  /**
   * Index of this item in the DataSet as seen by clients
   * @type {number}
   */
  _clientIndex: null,

  /**
   * @type boolean
   */
  deleted: false,

  /**
   * Whether the case has been 'set aside': gone but retrievable
   * @type boolean
   */
  setAside: false,

  /*
   * A hash map of attribute IDs to values.
   * @type {{attributeID: *}}
   */
  values: null,

  /**
   * Set the value of an individual attribute
   * @param {number} attributeID
   * @param {*} value
   */
  setValue: function (attributeID, value) {
    this.values[attributeID] = DG.DataUtilities.canonicalizeInputValue( value);
  },

  /**
   * Gets the value of an attribute. If formula attribute, evaluates the formula
   * in the context of the case associated with the item at the level of the attribute.
   * @param attributeID {number|string} Id of attribute
   * @param [baseCollectionID] {number} Id of the rightmost collection in the DataContext
   * @return {*}
   */
  getValue: function(attributeID, baseCollectionID) {
    var attr = DG.Attribute.getAttributeByID(attributeID);
    var tCase;
    if (attr.hasFormula()) {
      tCase = DG.Case.findCase(baseCollectionID || attr.collection.id, this.id);
      return (tCase && tCase.getRawValue(attributeID));
    } else {
      return this.values[attributeID];
    }
  },

  /**
   * Update values from an attribute key to value map.
   * @param {object} dataMap
   */
  updateData: function (dataMap) {
    this.values = this.values || {};
    $.extend(this.values, dataMap);
  },

  /**
   * Creates a serializable object for transmission. Used by Plugin API.
   * At this point, items are not directly written to documents.
   * @return {{id: *, values: {}}}
   */
  toArchive: function () {
    var nameValueMap = {};
    Object.keys(this.values).map(function (key) {
      var attr = DG.Attribute.getAttributeByID(key);
      if (attr) {
        nameValueMap[attr.name] = this.getValue(key);
      }
    }.bind(this));
    return {
      id: this.id,
      values: nameValueMap
    };
  }
});
