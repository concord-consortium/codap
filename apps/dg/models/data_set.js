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


sc_require('models/data_item');

/** @class DataSet
 *
 * An indexed array of the DataItems in a DataContext.
 *
 *
 * DataItem attribute Values can be retrieved or modified by item index and
 * Attribute id.
 * Item indices, once assigned to a DataItem, are not reused.
 */

DG.DataSet = SC.Object.extend((function() // closure
/** @scope DG.DataSet.prototype */ {

  var nextDataItemID = 1;

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
     * Order of registered collections. This ordering
     * is established by insertion and removal of collections. Collections are not moved,
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
      this._clientToItemIndexMap = [];
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
     * Adds attributes. Ideally this is an initialization step, but may be called
     * at any time.
     *
     * TODO: consider making attribute resolution happen dynamically through
     * TODO: the collection list, and not through the mechanism here.
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
     * Delete attribute from data set.
     *
     * Note we do not modify the underlying data set which is kept as a map from
     * attribute id. The orphan attribute data does not get saved nor restored.
     *
     * @param attr {DG.Attribute}
     */
    deleteAttribute: function (attr) {
      var ix = this.attrs.findIndex(function (a) {return a === attr;});
      if (ix >= 0) {
        this.attrs.splice(ix, 1);
      }
    },

    /**
     * Adds a dataItem provided as an array of values, a map of attribute keys to values,
     * or as a DG.DataItem.
     *
     * @param {DG.DataItem|{}|[*]} data  A data item, a map of attribute
     * keys to values, or an array of values indexed in attribute order.
     * @return {DG.DataItem} the item.
     */
    addDataItem: function (data, beforeItemID) {
      var dataItem;
      var ix;

      data = data || {};

      if (data.constructor === DG.DataItem) {
        dataItem = data;
        if (!dataItem.id) {
          DG.logWarn("DG.DataSet.addDataItem: Received DataItem without ID!");
          dataItem.id = nextDataItemID++;
        }
      } else if (typeof data === 'object') {
        dataItem = DG.DataItem.create({
          id: nextDataItemID++,
          dataSet: this,
          values: DG.DataUtilities.canonicalizeAttributeValues(this.attrs, data)
        });
      }

      if (dataItem) {
        ix = this.dataItems.push(dataItem) - 1; // push returns new array length.
                                    // We want the index of the last element
        dataItem.itemIndex = ix;

        if (beforeItemID == null) {
          dataItem._clientIndex = this._clientToItemIndexMap.push(ix) - 1;
        }
        else {
          var beforeClientIndex = this.getDataItemClientIndexByID(beforeItemID);

          // give the new item its client index
          dataItem._clientIndex = beforeClientIndex;

          // update client indices for existing items being pushed back
          this._clientToItemIndexMap.forEach(function(itemIndex) {
                                                var item = this.dataItems[itemIndex];
                                                if (item._clientIndex >= beforeClientIndex)
                                                  ++ item._clientIndex;
                                              }.bind(this));
          // splice in the new client index
          this._clientToItemIndexMap.splice(beforeClientIndex, 0, ix);
        }
      }
      return  dataItem;
    },

    /**
     * Marks an item for deletion.
     * @param {integer} itemIndex
     * @return {DG.DataItem} the deleted item.
     */
    deleteDataItem: function (item) {
      if (item) {
        item.deleted = true;
      }
      return item;
    },

    /**
     * Marks an item for deletion.
     * @param {integer} itemIndex
     * @return {DG.DataItem} the deleted item.
     */
    deleteDataItemByIndex: function (itemIndex) {
      var index = this._clientToItemIndexMap[itemIndex],
          item = this.getDataItem(index);
      return item ? this.deleteDataItem(item) : null;
    },

    /**
     * Undeletes a dataItem if possible. It may not be possible, as clean will remove
     * deleted items.
     * @param itemIndex
     * @return {[*]|undefined} the restored DataItem.
     */
    undeleteDataItem: function (itemIndex) {
      var index = this._clientToItemIndexMap[itemIndex],
          item;
      if (index >= 0 && index < this.dataItems.length) {
        item = this.dataItems[index];
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
      var index = this._clientToItemIndexMap[itemIndex],
          item, ret;
      if (index >= 0 && index < this.dataItems.length) {
        item = this.dataItems[index];
        if (item && !item.deleted) {
          if (value) {
            item.values[attributeID] = value;
          }
          ret = item.values[attributeID];
        }
      }
      return ret;
    },

    getDataItems: function() {
      return this._clientToItemIndexMap
              .map(function(index) { return this.dataItems[index]; }.bind(this));
    },

    /**
     * Retrieves an existing DataItem.
     *
     * @param {integer} itemIndex
     * @return {DG.DataItem|undefined}
     */
    getDataItem: function (itemIndex) {
      var index = this._clientToItemIndexMap[itemIndex],
          item;
      if (index >= 0 && index < this.dataItems.length) {
        item = this.dataItems[index];
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
     * Retrieves the client index of the DataItem wth the specified ID.
     * @param {*} itemID
     * @returns {number}
     */
    getDataItemClientIndexByID: function (itemID) {
      return this._clientToItemIndexMap.findIndex(function(itemIndex) {
                                                    var item = this.dataItems[itemIndex];
                                                    return item && (item.id === itemID);
                                                  }.bind(this));
    },

    compareItemsByClientIndex: function(item1, item2) {
      return item1._clientIndex - item2._clientIndex;
    },

    /**
     * Returns a serializable version of this object.
     * @returns {{dataItems: [DG.DataItem]}}
     */
    toArchive: function () {
      return {
        dataItems: this.dataItems.filterProperty('deleted', false).map(function (item) {
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
