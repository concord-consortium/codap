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
     *
     * @param {DG.Collection} collection
     */
    unregisterCollection: function( collection) {
      var tIndex = this.collectionOrder.indexOf(collection);
      if( tIndex >= 0)
        this.collectionOrder.splice(tIndex, 1);
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

    hasAttribute: function( iAttr) {
      return this.attrs.contains( iAttr);
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
          dataItem.id = DG.DataUtilities.createUniqueID();
        }
      } else if (typeof data === 'object') {
        // the object may be just values or an object with id and values
        if (data.values && typeof data.values === 'object') {
          data.dataSet = this;
          if (!data.id) {
            data.id = DG.DataUtilities.createUniqueID();
          }
          data.values = DG.DataUtilities.canonicalizeAttributeValues(this.attrs, data.values);
          dataItem = DG.DataItem.create(data);
        } else {
          dataItem = DG.DataItem.create({
            id: DG.DataUtilities.createUniqueID(),
            dataSet: this,
            values: DG.DataUtilities.canonicalizeAttributeValues(this.attrs,
                data)
          });
        }
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

    updateItem: function (iItemID, iValues) {
      var iItemValues = DG.DataUtilities.canonicalizeAttributeValues(this.get('attrs'), iValues);
      var iItem = this.getDataItemByID(iItemID);
      iItem.updateData(iItemValues);
      return iItem;
    },

    /**
     * Sorts the items by the specified attribute using the specified compare function.
     * @return {number[]} the original client index map (for use with undo, for instance)
     */
    sortItems: function(attributeID, accessFunc, valueCompareFunc) {
      var compareFunc = function(itemIndex1, itemIndex2) {
                          var item1 = this.dataItems[itemIndex1],
                              item2 = this.dataItems[itemIndex2],
                              value1 = accessFunc(item1.id, attributeID),
                              value2 = accessFunc(item2.id, attributeID),
                              result = valueCompareFunc(value1, value2);
                          return result || (item1._clientIndex - item2._clientIndex);
                        }.bind(this);
      // copy the array, sort the copy
      var clientIndexMap = this._clientToItemIndexMap.slice().sort(compareFunc);
      // install the new map
      return this.setClientIndexMap(clientIndexMap);
    },

    /**
     * Returns a copy of the current client index map.
     * @return {number[]} the original client index map (for use with undo, for instance)
     */
    getClientIndexMapCopy: function() {
      return this._clientToItemIndexMap.slice();
    },

    /**
     * Installs the specified client index map.
     * @return {number[]} the original client index map (for use with undo, for instance)
     */
    setClientIndexMap: function(clientIndexMap) {
      var originalMap = this._clientToItemIndexMap;
      clientIndexMap.forEach(function(itemIndex, clientIndex) {
                              this.dataItems[itemIndex]._clientIndex = clientIndex;
                            }.bind(this));
      this._clientToItemIndexMap = clientIndexMap;
      return originalMap;
    },

    /**
     * Marks an item for deletion.
     * @param {DG.DataItem} iItem
     * @param {boolean} iSetAside whether to delete or set aside
     * @return {DG.DataItem} the deleted item.
     */
    deleteDataItem: function (iItem, iSetAside) {
      if (iItem) {
        iItem.deleted = true;
        iItem.setAside = iSetAside;
      }
      return iItem;
    },

    /**
     * Marks an item for deletion.
     * @param {integer} iItemIndex
     * @param {boolean} iSetAside whether to delete or set aside
     * @return {DG.DataItem} the deleted item.
     */
    deleteDataItemByIndex: function (iItemIndex, iSetAside) {
      var index = this._clientToItemIndexMap[iItemIndex],
          item = this.getDataItem(index);
      return item ? this.deleteDataItem(item, iSetAside) : null;
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

    restoreSetAsideItems: function () {
      var restoredItems = [];
      this.dataItems.forEach(function (item) {
        if (item.setAside) {
          restoredItems.push(item);
          item.deleted = false;
          item.setAside = false;
        }
      });
      return restoredItems;
    },

    getSetAsideCount: function () {
      var count = 0;
      this.dataItems.forEach(function (item) {
        if (item.setAside) { count++; }
      });
      return count;
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

    getDataItemCount: function() {
      return this.getDataItems().length;
    },

    getDataItems: function() {
      return this._clientToItemIndexMap
          .map(function(index) { return this.dataItems[index]; }.bind(this))
          .filter(function (item) {return !item.deleted;});
    },

    /**
     * Retrieves an existing DataItem by index.
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

    parseSearchQuery: function (queryString) {
      if (queryString === '*') {
        return {
          valid: true,
          op: '*'
        };
      }
      // for now this is a simple single expression of "left op right" where op is a comparison operator
      // this could be expanded (along with the testCaseAgainstQuery method below) using the shunting yard algorithm
      var matches = queryString.match(/([^=!<>]+)(==|!=|<=|<|>=|>)([^=!<>]+)/),
          trim = function (s) { return s.replace(/^\s+|\s+$/, ''); },
          parsedQuery = {
            valid: !!matches,
            left: matches && trim(matches[1]),
            op: matches && matches[2],
            right: matches && trim(matches[3])
          },
          attrs = this.attrs,
          parseOperand = function (value) {
            var numberValue = Number(value),
                parsedValue = value === 'true' ? true :
                    (value === 'false' ? false :
                    (isNaN(numberValue) ? value : numberValue));
            return {
              value: parsedValue,
              attr: attrs.find(function (attr) {return attr.name === value;}),
              name: value
            };
          };

      parsedQuery.left = parseOperand(parsedQuery.left);
      parsedQuery.right = parseOperand(parsedQuery.right);

      // valid queries must have at least one side with a defined attribute
      parsedQuery.valid = !!(parsedQuery.valid && (parsedQuery.left.attr || parsedQuery.right.attr));

      return parsedQuery;
    },

    testItemAgainstQuery: function (iItem, parsedQuery) {
      var getValue = function (token) {
            return token.attr ? iItem.getValue(token.attr.id) : token.value;
          },
          leftValue = parsedQuery.left && getValue(parsedQuery.left),
          rightValue = parsedQuery.right && getValue(parsedQuery.right);

      if (!parsedQuery.valid) {
        return false;
      }

      switch (parsedQuery.op) {
        case '*': return true;
// eslint-disable-next-line eqeqeq
        case '==': return leftValue == rightValue; // jshint ignore:line
// eslint-disable-next-line eqeqeq
        case '!=': return leftValue != rightValue; // jshint ignore:line
        case '<':  return leftValue <   rightValue;
        case '<=': return leftValue <=  rightValue;
        case '>=': return leftValue >=  rightValue;
        case '>':  return leftValue >   rightValue;
        default:   return false;
      }
    },

    getItemsBySearch: function (queryString) {
      var parsedQuery = this.parseSearchQuery(queryString);

      // return null to signal an invalid query
      if (!parsedQuery.valid) {
        return null;
      }

      return this.dataItems.filter(function (iItem) {

        return (!iItem.deleted) && this.testItemAgainstQuery(iItem, parsedQuery);
      }.bind(this));

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

    moveDataItemByID: function (itemID, order) {
      var clientIndex = this.getDataItemClientIndexByID(itemID);
      var itemIndex = this._clientToItemIndexMap[clientIndex];
      if ((clientIndex != null) && (order != null)) {
        var newIndexMap = this._clientToItemIndexMap.slice();
        newIndexMap.splice(clientIndex, 1);
        switch (order) {
          case 'first':
            newIndexMap.unshift(itemIndex);
            break;
          case 'last':
            newIndexMap.push(itemIndex);
            break;
          default:
            newIndexMap.splice(order, 0, itemIndex);
            break;
        }
        this.setClientIndexMap(newIndexMap);
      }
    },

    compareItemsByClientIndex: function(item1, item2) {
      return item1._clientIndex - item2._clientIndex;
    },

    /**
     * This method is called as a part of restoring a DataContext, to add
     * SetAside items to the DataSet.
     * @param itemSpecs
     */
    createSetAsideItems: function (itemSpecs) {
      itemSpecs.forEach(function (itemData) {
        var item = this.addDataItem(itemData);
        this.deleteDataItem(item, true);
      }.bind(this));
    },

    archiveSetAsideItems: function () {
      return this.dataItems.filter(function (item) {
          return item.setAside;
        }).map(function (item) {
          return {id: item.id, values: item.toArchive().values};
        });
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
