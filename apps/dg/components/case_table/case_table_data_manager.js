// ==========================================================================
//  
//  Author:   jsandoe
//
//  Copyright (c) 2016 by The Concord Consortium, Inc. All rights reserved.
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
 * A specialized, on demand, implemention the SlickGrid DataView interface.
 * See https://github.com/mleibman/SlickGrid/wiki/DataView.
 * We implement getLength() and getItem(index) from the API.
 */
DG.CaseTableDataManager = SC.Object.extend({
  /**
   * The collection that this case table is presenting.
   * @type {DG.CollectionClient}
   */
  collection: null,

  /**
   * @type {DG.CaseTableController}
   */
  controller: null,

  /**
   * @type {boolean}
   */
  suspended: false,

  /**
   * Returns the number of rows in the table.
   *
   * Implements a method of the SlickGrid DataView API.
   * The number of rows counts a collapsed group as a
   * single row.
   *
   * @returns {Number}
   */
  getLength: function () {
    return this.collection.getCaseCount();
  },

  /**
   * Returns the contents of the given row as a Case ID/value
   * hashmap.
   *
   * @param row
   * @returns {obj}
   */
  getItem: function (row) {
    return this.collection.getCaseAt(row).get('_valuesMap');
  },

  /** No-op */
  refresh: function () {},

  /** No-op */
  onRowsChanged: {
    subscribe: function () {}
  },

  /** No-op */
  onRowCountChanged: {
    subscribe: function () {}
  },

  /**
   * Todo: commentary
   */
  beginUpdate: function () {
    this.suspended = true;
  },

  /**
   * Todo: commentary
   */
  endUpdate: function () {
    this.suspended = false;
  },

  /** No-op */
  setItems: function (arr) {},

  /** Unsupported */
  getItems: function () {
    return this.collection.casesController;
  },

  /** TBD */
  getItemById: function (id) {
    return this.collection.getCaseByID(id);
  },

  /** TBD */
  getIdxById: function (id) {
    return this.collection.getCaseIndexByID(id);
  },

  /** TBD */
  getRowById: function (id) {
    return this.collection.getCaseIndexByID(id);
  },

  /** No-op */
  insertItem: function (item) {},

  /** No-op */
  addItem: function (item) {},

  /** No-op */
  updateItem: function (id, item) {},

  /** No-op */
  setGrouping: function (obj) {},

  /** No-op, for now */
  collapseGroup: function (id) {},

  /** No-op, for now */
  expandGroup: function (id) {},

  /** No-op */
  setRefreshHints: function (obj) {}
});