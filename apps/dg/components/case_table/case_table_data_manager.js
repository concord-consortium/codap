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
   * @type {DG.CaseTableModel}
   */
  model: null,

  /**
   * @type {boolean}
   */
  suspended: false,

  /**
   * Cache of mappings from row index to case index.
   * @type {[DG.Case]}
   */
  _rowCaseIndexCache: null,

  /**
   *
   */
  _collapsedNodeInfoCache: null,

  caseTableLength: function () {
    return this._rowCaseIndexCache.length;
  }.property(),

  init: function () {
    this._rowCaseIndexCache = [];
  },


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
    return this.get('caseTableLength');
  },

  /**
   * Returns the contents of the given row as a Case ID/value
   * hashmap.
   *
   * @param row
   * @returns {DG.Case}
   */
  getItem: function (row) {
    return this._rowCaseIndexCache[row];
  },

  /** No-op */
  refresh: function () {
    function makeCollections(iCollection) {
      var arr = [];
      var col = iCollection;
      while ( col ) {
        arr.push(col);
        col = col.get('parent');
      }
      return arr.reverse();
    }
    function visit(nodes, level) {
      nodes.forEach(function (node) {
        if (level === collections.length - 1) {
          rowCaseIndex.push(node);
        } else {
          if (model.isCollapsedNode(node)) {
            rowCaseIndex.push(node);
          } else {
            visit(node.get('children'), level + 1);
          }
        }
      });
    }
    // ---- BEGIN ----
    var rowCaseIndex = [];
    var myCollection = this.collection;
    var model = this.model;
    var collections = makeCollections(myCollection);
    visit(collections[0].casesController, 0);
    this._rowCaseIndexCache = rowCaseIndex;
  },

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

  /**
   * Returns the case index of a case by id.
   * @param id
   * @returns {*|number|undefined}
   */
  getIdxById: function (id) {
    return this.collection.getCaseIndexByID(id);
  },

  /**
   * Gets the index of the case table row, given a case id.
   *
   * Note that a case table that is part of a collapsed group is not considered
   * to be a part of the table.
   *
   * @param iCaseID {number}
   * @returns {Number}
   */
  getRowById: function (iCaseID) {
    var myCase = this.collection.getCaseByID(iCaseID);

    return this._rowCaseIndexCache.indexOf(myCase);
  },

  /** No-op */
  insertItem: function (item) {},

  /** No-op */
  addItem: function (item) {},

  /** No-op */
  updateItem: function (id, item) {},

  /** No-op */
  setGrouping: function (obj) {},

  /**
   * Marks the identified case as collapsed.
   * @param iCaseID {number}
   */
  collapseGroup: function (iCaseID) {
    var parentCollection = this.collection.collectionModel.parent;
    var myCase = parentCollection.getCaseByID(iCaseID);
    if (myCase) {
      this.model.collapseNode(myCase);
      this.refresh();
    }
  },

  /**
   * Marks the identified case as expanded.
   * @param iCaseID {number} A case id.
   */
  expandGroup: function (iCaseID) {
    var parentCollection = this.collection.collectionModel.parent;
    var myCase = parentCollection.getCaseByID(iCaseID);
    if (myCase) {
      this.model.expandNode(myCase);
      this.refresh();
    }
  },

  /**
   * Whether the indicated node is collapsed.
   *
   * @param iCaseID {number} A case id.
   * @returns {boolean}
   */
  isGroupCollapsed: function (iCaseID) {
    var myCase = this.collection.getCaseByID(iCaseID);
    if (myCase) {
      return this.model.isCollapsedNode(myCase);
    }
  },

  /** No-op */
  setRefreshHints: function (obj) {}
});