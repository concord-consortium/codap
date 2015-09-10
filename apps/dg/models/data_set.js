// ==========================================================================
//  Author:   Jonathan Sandoe
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

/** @class
 *
 * An indexed collection of Attribute values.
 *
 * Values can be retrieved or modified by item index and Attribute id.
 * Rows may be added, deleted, or undeleted.
 * Actual removal of deleted item is deferred until a clean operation is
 * executed.
 * ItemIndexes, once assigned to a DataItem, are not reused.
 */

DG.DataSet = SC.Object.extend((function() // closure
/** @scope DG.DataSet.prototype */ {
  DG.DataItem = SC.Object.extend({
    /*
     * A 'given' ID for the DataItem. Items are also identified by their
     * index in the data set.
     * @property {string}
     */
    id: null,

    /*
     * The internally assigned row index of this DataItem.
     * @property {number}
     */
    itemIndex: null,

    /*
     * Identifies the dataSet to which this DataItem belongs.
     * @property {number}
     */
    dataSetID: null,
    /*
     * Whether this item has been deleted.
     * @property {boolean}
     */
    deleted: false,
    /*
     * A compact array of values, indexed by the data set's attribute map.
     * @property {[*]}
     */
    data: null,

    toArchive: function () {
      // Todo
    }
  });

  var dataItems = [];
  var attributes = [];

  return {
    /*
     * @property {DG.DataContext} Each Data Set is bound to exactly one DataContext.
     */
    dataContextRecord: null,


    /**
     * Adds attributes. Ideally this is an initialization step, but may be called
     * at any time.
     * @param {[DG.Attribute]|DG.Attribute} newAttributes An array or a single attribute.
     */
    addAttributes: function (newAttributes) {
      var attrs = Array.isArray(newAttributes)? newAttributes : [newAttributes];
      attrs.forEach(function (attr) {
        if (attr.constructor === DG.Attribute) {
          attributes.push(attr);
        } else {
          DG.logWarn('Attempt to add non-attribute to Data Set for Context: ' +
              this.dataContextRecord.id);
        }
      });
    },

    /**
     * Adds a dataItem provided as an array of values or as a DG.DataItem.
     *
     * @param {DG.DataItem|[*]} dataItem  An array of values indexed by attribute ids.
     * @return {number|null} item index or null.
     */
    addDataItem: function (dataItem) {
      var di;
      var ix;
      if (dataItem.constructor === DG.DataItem) {
        di = dataItem;
      } if (Array.isArray(dataItem)) {
        di = DG.DataItem.create({data:dataItem});
      }
      if (di) {
        ix = di.push(dataItem) - 1; // push returns new array length.
                                    // We want the index of the last element
        di.itemIndex = ix;
      }
      return  ix;
    },

    /**
     * Marks an item for deletion.
     * @param itemIndex
     * @return {[*]} the deleted item.
     */
    deleteDataItem: function (itemIndex) {
      var item = this.getDataItem(itemIndex);
      if (item) {
        item.deleted = true;
      }
      return item;
    },

    /**
     * Undeletes a dataItem if possible. It may not be possible, as clean will remove
     * deleted items.
     * @param itemIndex
     * @return {[*]|undefined} the restored DataItem.
     */
    undeleteDataItem: function (itemIndex) {
      var item;
      if (itemIndex >= 0 && itemIndex < dataItems.length) {
        item = dataItems[itemIndex];
        item.deleted = false;
      }
      return item;
    },

    /**
     * Permanently removes deleted dataItems and reclaims space.
     * @return {number} Count of dataItems retrieved.
     */
    cleanDeletedDataItems: function () {
      dataItems.forEach(function(item, ix) {
        if (item.deleted) {
          delete dataItems[ix];
        }
      });
    },

    /**
     * Retrieves or sets an attribute value for a DataItem.
     *
     * @param {integer} itemIndex a non-negative integer
     * @param {integer} attributeID a non-negative integer
     * @param {string|number} value a legal attribute value
     * @return {string|number} a legal attribute value
     */
    value: function(itemIndex, attributeID, value) {
      var item, ret;
      if (itemIndex >= 0 && itemIndex < dataItems.length) {
        item = dataItems[itemIndex];
        if (item && !item.deleted) {
          if (value) {
            item[attributeID] = value;
          }
          ret = item[attributeID];
        }
      }
      return ret;
    },

    /**
     * Retrieves an existing DataItem.
     */
    getDataItem: function (itemIndex) {
      var item;
      if (itemIndex >= 0 && itemIndex < dataItems.length) {
        item = dataItems[itemIndex];
        if (!item.deleted) {
          return item;
        }
      }
    }




  };
})());