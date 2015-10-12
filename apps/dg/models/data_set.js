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


sc_require('models/DataItem');

/** @class DataSet
 *
 * An indexed collection of DataItems, which are in turn .
 *
 * Values can be retrieved or modified by item index and Attribute id.
 * Rows may be added, deleted, or undeleted.
 * Actual removal of deleted item is deferred until a clean operation is
 * executed.
 * ItemIndexes, once assigned to a DataItem, are not reused.
 */

DG.DataSet = SC.Object.extend((function() // closure
/** @scope DG.DataSet.prototype */ {
  return {
    /**
     *  An array of data in the data set.
     * @type {[DG.DataItem]}
     */
    dataItems: null,

    /**
     * Attributes defined for this DataSet in the
     * order for the dataItems value array.
     *
     * @type {[DG.Attribute]}
     */
    attrs: null,

    /**
     *  Order of registered groups. This ordering
     * is established by insertion and removal of groups. Groups are not moved,
     * but are created at a position relative to other groups.
     *
     * ToDo: make into a cacheable method that derives values from collection
     * ToDO: attributes.
     *
     * @type {[DG.Collection]}
     */
    collectionOrder: null,

    init: function () {
      this.dataItems = [];
      this.attrs = [];
      this.collectionOrder = [];
    },

    /**
     * The rightmost collection.
     * @type {DG.Collection}
     */
    baseCollection: function () {
      var collections = this.get('collectionOrder');
      return collections[collections.length - 1];
    }.property('collectionOrder[]').cacheable(),

    /**
     * Inserts a group in the mapping before the existing group 'followerGroup'.
     * If no followerGroup, appends group.
     *
     * @param {DG.Collection} collection
     * @param {DG.Collection|null} followerCollection
     */
    registerCollection: function (collection, followerCollection) {
      if (followerCollection) {
        var insertLoc = this.collectionOrder.indexOf(followerCollection);
        if (insertLoc >= 0) {
          this.collectionOrder.insertAt(insertLoc, collection);
        } else {
          DG.logWarn('Inserting group, cannot find followerGroup');
          this.collectionOrder.push(collection);
        }
      } else {
        this.collectionOrder.push(collection);
      }
    },

    /**
     * The assignment of attributes to groups or the order of attributes within
     * groups changed, so we need to adjust.
     *
     * We query the order within the groups and re-sort.
     */
    attributeOrderDidChange: function() {
      this.attrs = [];
      this.collectionOrder.forEach(function (group) {
        group.attrs.forEach(function (attr) {
          this.attrs.push(attr);
        }.bind(this));
      }.bind(this));
      this.sortCollections();
    },

    resetCollections: function () {
      // TODO
    },

    /**
     * Adds attributes. Ideally this is an initialization step, but may be called
     * at any time.
     *
     * TODO: make a plain notification
     * TODO re-sort collections
     *
     * @param {[DG.Attribute]|DG.Attribute} newAttributes An array or a single attribute.
     */
    addAttributes: function (newAttributes) {
      var attrs = Array.isArray(newAttributes)? newAttributes : [newAttributes];
      attrs.forEach(function (attr) {
        if (attr.constructor === DG.Attribute) {
          if (!this.attrs.contains(attr)) {
            this.attrs.push(attr);
          } else {
            DG.logWarn('Duplicate add of attribute.');
          }
        } else {
          DG.logWarn('Attempt to add non-attribute to Data Set for Context: ' +
              this.dataContextRecord.id);
        }
      }.bind(this));
    },

    /**
     * Adds a dataItem provided as an array of values, a map of attribute keys to values,
     * or as a DG.DataItem.
     *
     * @param {DG.DataItem|{}|[*]} dataItem  A data item, a map of attribute
     * keys to values, or an array of values indexed in attribute order.
     * @param {string} id (optional)
     * @return {DG.DataItem} the item.
     */
    addDataItem: function (dataItem, id) {
      var mapToArray = function (dataMap) {
        var ar = [];
        DG.ObjectMap.forEach(dataMap, function(key, value) {
          var ix;
          for (ix = 0; ix < this.attrs.length; ix += 1) {
            if (String(this.attrs[ix].id) === key) {
              ar[ix] = value;
            }
          }
        }.bind(this));
        return ar;
      }.bind(this);
      var di;
      var ix;
      if (dataItem.constructor === DG.DataItem) {
        di = dataItem;
      } else if (Array.isArray(dataItem)) {
        di = DG.DataItem.create({dataSet: this, data:dataItem});
      } else if (typeof dataItem === 'object') {
        di = DG.DataItem.create({dataSet: this, data:mapToArray(dataItem)});
      }
      if (di) {
        ix = this.dataItems.push(di) - 1; // push returns new array length.
                                    // We want the index of the last element
        di.itemIndex = ix;
        di.id = id;
      }
      return  di;
    },

    /**
     * Marks an item for deletion.
     * @param {integer} itemIndex
     * @return {DG.DataItem} the deleted item.
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
      if (itemIndex >= 0 && itemIndex < this.dataItems.length) {
        item = this.dataItems[itemIndex];
        item.deleted = false;
      }
      return item;
    },

    /**
     * Permanently removes deleted dataItems and reclaims space.
     * @return {number} Count of dataItems retrieved.
     */
    cleanDeletedDataItems: function () {
      this.dataItems.forEach(function(item, ix) {
        if (item.deleted) {
          delete this.dataItems[ix];
        }
      }.bind(this));
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
      if (itemIndex >= 0 && itemIndex < this.dataItems.length) {
        item = this.dataItems[itemIndex];
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
     *
     * @param {integer} itemIndex
     * @return {DG.DataItem|undefined}
     */
    getDataItem: function (itemIndex) {
      var item;
      if (itemIndex >= 0 && itemIndex < this.dataItems.length) {
        item = this.dataItems[itemIndex];
        if (!item.deleted) {
          return item;
        }
      }
    },

    /**
     * Retrieves a DataItem by its given ID.
     * @param {*} itemID
     * @returns {DG.DataItem|undefined}
     */
    getDataItemByID: function (itemID) {
      return this.dataItems.find(function(item) { return item.id === itemID; });
    },

    /**
     * Returns a serializable version of this object.
     * @returns {{dataItems: [DG.DataItem]}}
     */
    toArchive: function () {
      return {
        dataItems: this.dataItems.map(function (item) {
          return {
            values: item.values,
            id: item.id,
            itemIndex: item.itemIndex
          };
        })
      };
    }

  };
})());

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
   * @property {DG.DataSet}
   */
  dataSet: null,
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

  updateData: function (dataMap) {
    DG.ObjectMap.forEach(dataMap, function(key, value) {
      var ix;
      for (ix = 0; ix < this.dataSet.attrs.length; ix += 1) {
        if (String(this.dataSet.attrs[ix].id) === key) {
          this.data[ix] = value;
        }
      }
    }.bind(this));
  },

  toArchive: function () {
    // Todo
  }
});

