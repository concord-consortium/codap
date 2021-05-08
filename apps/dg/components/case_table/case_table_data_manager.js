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
 * @class CaseTableDataManager
 *
 * A specialized, on demand, implementation of the SlickGrid DataView interface.
 * See https://github.com/mleibman/SlickGrid/wiki/DataView.
 * We implement getLength() and getItem(index) from the API.
 *
 * @extends SC.Object
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
   * Home for column info
   * @type {DG.CaseTableAdapter}
   */
  adapter: null,

  /**
   * @type {boolean}
   */
  suspended: false,

  /**
   * Cache of mappings from row index to case.
   * @type {[DG.Case]}
   */
  _rowCaseMap: null,

  /**
   * Map from collection ID to proto-case.
   * @type {Object}
   */
  _protoCases: null,

  /**
   *
   */
  _collapsedNodeInfoCache: null,

  caseTableLength: function () {
    return this._rowCaseMap.length;
  }.property(),

  init: function () {
    this._rowCaseMap = [];
    this._protoCases = {};
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
   * Returns the contents of the given row as a Case.
   *
   * If this particular row is a collapsed group indicator, returns the collapsed
   * case, which is a member of a parent or other ancestor collection. We can
   * tell, then, that the row corresponds to a collapsed group by comparing the
   * case's collection with the case table's collection.
   *
   * Signature defined by Slick Grid DataView API.
   *
   * @param row {number}
   * @returns {DG.Case}
   */
  getItem: function (row) {
    return this._rowCaseMap[row];
  },

  /**
   * Returns metadata for the selected row, if any.
   *
   * We use this API to construct collapsed rows.
   *
   * Signature defined by Slick Grid DataView API.
   *
   * @param row {number}
   * @returns {object} See slickgrid documentation.
   */
  getItemMetadata: function (row) {
    function computeProtoRowMetadata(columns) {
      var metadata = {};
      columns.forEach(function (column) {
        var attr = column.attribute;
        var focusable = attr? !attr.hasFormula() : column.focusable;
        metadata[column.id] = {
          id: column.id,
          focusable: focusable
        };
      });
      return {
        cssClasses: 'dg-proto-row',
        columns: metadata
      };
    }
    var myCase = this.getItem(row);
    if (myCase && (myCase instanceof DG.Case)) {
      if (myCase.collection.get('id') !== this.collection.get('id')) {
        return {
          cssClasses: 'dg-collapsed-row',
          columns: {
            0: {
              colspan: "*"
            }
          },
          formatter: function (row, cell, cellValue, colInfo, rowItem) {
            var caseCount = this.subcaseCount(this._rowCaseMap[row]);
            var setName = this.context.getCaseNameForCount(this.collection, caseCount);
            return '%@ %@'.loc(caseCount, setName);
          }.bind(this)
        };
      }
    }
    else {
      return computeProtoRowMetadata(this.adapter.gridColumns);
    }
  },

  /*
   * To support creating new cases in the case table, we introduce the notion
   * of a proto-case which mocks some of the methds of DG.Case and can contain
   * a number of attribute/value pairs until the proto-case gets committed at
   * which point its values are transferred to a real case. Because there can
   * be multiple data sets, each collection can have its own proto-case.
   */
  getProtoCase: function(collection) {
    if (!collection) collection = this.get('collection');
    var collectionID = collection && collection.get('id'),
        protoCase = collectionID && this._protoCases[collectionID];
    if (!collectionID) return null;
    if (!protoCase) {
      // Proto-case is an SC.Object rather than a DG.Case.
      // Proto-case can be tested for explicitly via _isProtoCase property,
      // or in the negative by `item instanceof DG.Case` being false.
      protoCase = this._protoCases[collectionID] = SC.Object.create({
        id: Math.pow(2, 32) - collectionID,

        collection: collection,

        _isProtoCase: true,

        // id of case in this collection which proto-case should be before
        beforeCaseID: null,

        // id of parent case in next-level collection; defaults to null,
        // which is interpreted as last case in next-level collection
        parentCaseID: null,

        children: [],

        _values: null,

        init: function() {
          sc_super();
          this._values = {};
        },

        getStrValue: function(columnID) {
          var value = this._values[columnID];
          return DG.isDate(value)
                    ? DG.formatDate(value)
                    : value;
        },

        getValue: function(columnID) {
          return this._values[columnID];
        },

        setValue: function(columnID, value) {
          this._values[columnID] = value;
        }
      });
    }
    return protoCase;
  },

  /**
   * Resets the data entry rows (proto-cases) to their default location
   * at the bottom of the table.
   *
   * If iParentCaseID is specified, then only resets data entry rows
   * associated with that particular parent case.
   */
  resetProtoCases: function (iParentCaseID) {
    // collapsing a group with the entry row moves the entry row to its default location
    DG.ObjectMap.forEach(this._protoCases, function(collectionID, protoCase) {
      if (!iParentCaseID || (protoCase.get('parentCaseID') === iParentCaseID)) {
        protoCase.set('beforeCaseID', null);
        protoCase.set('parentCaseID', null);
      }
    });
  },

  /**
   * Resets this object in response to state changes such as:
   *   expand or collapse of a case, addition or deletion of a case.
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
    if (this.get('suspended')) {
      this.set('refreshNeeded', true);
      return;
    }
    var beforeCount = this._rowCaseMap.length;
    var rowCaseIndex = [];
    var myCollection = this.collection;
    var context = this.context;
    var model = this.model;
    var collections = makeCollections(myCollection);
    visit(collections[0].casesController, 0);
    this._rowCaseMap = rowCaseIndex;
    if (this.getPath('adapter.isCollectionReorgAllowed')) {
      // add proto-case to support data entry row
      var protoCase = this.getProtoCase(myCollection);
      var protoCaseBeforeID = protoCase.get('beforeCaseID');
      var protoCaseParentID = protoCase.get('parentCaseID');
      var protoCaseIndex = -1;
      if (protoCaseBeforeID) {
        this._rowCaseMap.forEach(function(aCase, i) {
          if (aCase.getPath('id') === protoCaseBeforeID) {
            protoCaseIndex = i;
          }
        });
      }
      if ((protoCaseIndex < 0) && protoCaseParentID) {
        this._rowCaseMap.forEach(function(aCase, i) {
          if (aCase.getPath('parent.id') === protoCaseParentID) {
            protoCaseIndex = i + 1;
          }
        });
      }
      if (protoCaseIndex >= 0) {
        this._rowCaseMap.splice(protoCaseIndex, 0, protoCase);
      }
      else {
        this._rowCaseMap.push(protoCase);
      }
    }
    if (this._rowCaseMap.length !== beforeCount) {
      this.onRowCountChanged.notify({previous: beforeCount, current: this._rowCaseMap.length}, null, this);
    }
    else {
      this.onRowsChanged.notify({rows: null}, null, this);
    }
    this.set('refreshNeeded', false);
  },

  /**
   * Event handler fired when Row data changes.
   *
   * Initialized in init to avoid issues resolving slickgrid library.
   *
   * Method signature matches method of Slick Grid default DataView.
   */
  onRowsChanged: null,

  /**
   * Event handler fired when row count changes.
   *
   * Initialized in init to avoid issues resolving slickgrid library.
   *
   * Method signature matches method of Slick Grid default DataView.
   */
  onRowCountChanged: null,


  /**
   * Called before a sequence of operations to avoid premature refreshes.
   *
   * Method signature matches method of Slick Grid default DataView.
   */
  beginUpdate: function () {
    this.set('suspended', true);
  },

  /**
   * Called at the end of a sequence of operations.
   *
   * Invokes refresh if necessary.
   *
   * Method signature matches method of Slick Grid default DataView.
   */
  endUpdate: function () {
    this.set('suspended', false);
    if (this.get('refreshNeeded')) {
      this.refresh();
    }
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
  //getItems: function () {
  //  return this.collection.casesController;
  //},

  /**
   * Searches for an item by its id.
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
   * Gets the index of the case table row, given a case (or proto-case) id.
   *
   * Method signature matches method of Slick Grid default DataView.
   *
   * Note that a case that is part of a collapsed group is not considered
   * to be a part of the case table.
   *
   * @param iCaseID {number}
   * @returns {Number}
   */
  getRowById: function (iCaseID) {
    return this._rowCaseMap
            .findIndex(function(rowCase) {
              // allow number/string matches
              return rowCase && (rowCase.get('id') == iCaseID); // eslint-disable-line eqeqeq
            });
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
   * Called for updateCase.
   *
   * We simply refresh.
   * TODO: consider refreshing only if the item is visible.
   *
   * Method signature matches method of Slick Grid default DataView.
   */
  updateItem: function (id, item) {
    this.refresh();
  },

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

  /**
   * A property defining the expand and collapsed counts for this collection.
   *
   * Used for determining the state of the expand all/collapse all buttons.
   */
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
  }.property(),

  /**
   * Counts the cases at this level of the case table hierarchy which descend
   * from the given case.
   *
   * Used for creating a collapsed row message.
   *
   * @param iCase
   * @returns {number}
   */
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
  }
});
