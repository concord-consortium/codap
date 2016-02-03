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
/* global Slick:true */
/**
 * A specialized, on demand, implemention the SlickGrid DataView interface.
 * See https://github.com/mleibman/SlickGrid/wiki/DataView.
 * We implement getLength() and getItem(index) from the API.
 */
DG.CaseTableDataManager = SC.Object.extend({

  /**
   * @type {DG.DataContext}
   */
  context: null,

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
    this.onRowCountChanged = new Slick.Event();
    this.onRowsChanged = new Slick.Event();
  },

  /**
   * Returns the number of rows in the table.
   *
   * Signature defined by Slick Grid DataView API.
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
   * Signature defined by Slick Grid DataView API.
   *
   * @param row {number}
   * @returns {DG.Case}
   */
  getItem: function (row) {
    return this._rowCaseIndexCache[row];
  },

  subcaseCount: function (iCase) {
    var count = 0;
    if (iCase.collection.id === this.collection.get('id')) {
      count = 1;
    } else {
      iCase.children.forEach(function (myCase) {
        count += this.subcaseCount(myCase);
      }.bind(this));
    }
    return count;
  },
  getItemMetadata: function (row) {
    var myCase = this.getItem(row);
    if (myCase.collection.get('id') !== this.collection.get('id')) {
      return {
        columns: {
          0: {
            colspan: "*"
          }
        },
        formatter: function (row, cell, cellValue, colInfo, rowItem) {
          var caseCount = this.subcaseCount(this._rowCaseIndexCache[row]);
          var setName = this.context.getCaseNameForCount(this.collection, 2);
          return '%@ %@'.loc(caseCount, setName);
        }.bind(this)
      };
    }
  },

  /**
   * Resets this object in response to state changes such as:
   *   expand or collapse of a case, a
   *   ddition or deletion of a case.
   *
   * Method signature matches method of Slick Grid default DataView.
   */
  refresh: function () {
    // returns an array of this collection and its ancestor collections.
    function makeCollections(iCollection) {
      var arr = [];
      var col = iCollection;
      var colID;
      while ( col ) {
        arr.push(col);
        colID = col.getParentCollectionID();
        if (!SC.none(colID)) {
          col = context.getCollectionByID(colID);
        } else {
          col = null;
        }
      }
      return arr.reverse();
    }
    // recursively visits a set of nodes assembling a row index to case mapping.
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
    var beforeCount = this._rowCaseIndexCache.length;
    var rowCaseIndex = [];
    var myCollection = this.collection;
    var context = this.context;
    var model = this.model;
    var collections = makeCollections(myCollection);
    visit(collections[0].casesController, 0);
    this._rowCaseIndexCache = rowCaseIndex;
    if (rowCaseIndex !== beforeCount) {
      this.onRowCountChanged.notify({previous: beforeCount, current: rowCaseIndex.length}, null, this);
    }
  },

  /**
   * No-op
   *
   * Method signature matches method of Slick Grid default DataView.
   */
  onRowsChanged: null,
  //onRowsChanged: {
  //  subscribe: function () {}
  //},


  /**
   * No-op
   *
   * Method signature matches method of Slick Grid default DataView.
   */
  onRowCountChanged: null,
  /** No-op */
  //onRowCountChanged: {
  //  subscribe: function () {}
  //},


  /**
   * Todo: commentary
   *
   * Method signature matches method of Slick Grid default DataView.
   */
  beginUpdate: function () {
    this.suspended = true;
  },

  /**
   * Todo: commentary
   *
   * Method signature matches method of Slick Grid default DataView.
   */
  endUpdate: function () {
    this.suspended = false;
  },

  /**
   * No-op
   *
   * Method signature matches method of Slick Grid default DataView.
   */
  setItems: function (arr) {},

  /** Unsupported
   *
   * Method signature matches method of Slick Grid default DataView.
   *
   * @returns {null}
   */
  getItems: function () {
    return this.collection.casesController;
  },

  /**
   * TODO:
   *
   * Method signature matches method of Slick Grid default DataView.
   */
  getItemById: function (id) {
    return this.collection.getCaseByID(id);
  },

  /**
   * Returns the case index of a case by id.
   *
   * Method signature matches method of Slick Grid default DataView.
   * @param id
   * @returns {*|number|undefined}
   */
  getIdxById: function (id) {
    return this.collection.getCaseIndexByID(id);
  },

  /**
   * Gets the index of the case table row, given a case id.
   *
   *
   * Method signature matches method of Slick Grid default DataView.
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

  /**
   * No-op
   *
   * Method signature matches method of Slick Grid default DataView.
   */
  insertItem: function (item) {},

  /**
   * No-op
   *
   * Method signature matches method of Slick Grid default DataView.
   */
  addItem: function (item) {},

  /**
   * No-op
   *
   * Method signature matches method of Slick Grid default DataView.
   */
  updateItem: function (id, item) {},

  /**
   * No-op
   *
   * Method signature matches method of Slick Grid default DataView.
   */
  setGrouping: function (obj) {},

  /**
   * Marks the identified case as collapsed.
   *
   * Method signature matches method of Slick Grid default DataView.
   * @param iCaseID {number}
   */
  collapseGroup: function (iCaseID) {

    var myCase = DG.store.find('DG.Case', iCaseID);
    if (myCase) {
      this.model.collapseNode(myCase);
      this.refresh();
    }
  },

  /**
   * Marks the identified case as expanded.
   *
   * Method signature matches method of Slick Grid default DataView.
   * @param iCaseID {number} A case id.
   */
  expandGroup: function (iCaseID) {
    var myCase = DG.store.find('DG.Case', iCaseID);
    if (myCase) {
      this.model.expandNode(myCase);
      this.refresh();
    }
  },

  /**
   * Whether the indicated node is collapsed.
   *
   * Method signature matches method of Slick Grid default DataView.
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

  /**
   * No-op
   *
   * Method signature matches method of Slick Grid default DataView.
   */
  setRefreshHints: function (obj) {},

  expandCollapseCounts: function () {
    var model = this.model;
    var counts = {
      expanded: 0,
      collapsed: 0
    };
    this.collection.casesController.forEach(function (myCase) {
      if (model.isCollapsedNode(myCase)) {
        counts.collapsed += 1;
      } else {
        counts.expanded += 1;
      }
    });
    return counts;
  }.property()
});