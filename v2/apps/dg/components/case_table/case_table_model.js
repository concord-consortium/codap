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

sc_require('components/case_table/data_context_base_model');

/** @class  DG.CaseTableModel - The model for a case table.

 @extends DG.DataContextBaseModel
 */
DG.CaseTableModel = DG.DataContextBaseModel.extend(/** @scope DG.CaseTableModel.prototype */ {
  /**
   * Attribute widths as requested by the user, keyed by attribute id.
   *
   * @property {Object} a hash of widths (pixels) keyed by attribute id.
   */
  preferredAttributeWidths: null,

  /**
   * Case table widths as requested by the user, keyed by caseTable id.
   *
   * @property {Object} a hash of widths (pixels) keyed by caseTable id.
   */
  // preferredTableWidths: null,

  /**
   * Case table row heights as requested by the user, keyed by collection id.
   *
   * @property {Object} a hash of row heights (pixels) keyed by collection id.
   */
  tableRowHeights: null,

  /**
   * A hash of case ids and their collapsed state and whether they are visible
   * or superseded by a collapsed case in a higher order table.
   * @type [{{isCollapsed: boolean, isHidden: boolean, collapsedCase: DG.Case}}]
   */
  _collapsedNodes: null,

  /**
   * @type {number}
   */
  horizontalScrollOffset: 0,

  /**
   * @type {boolean}
   */
  isIndexHidden: false,

  init: function () {
    sc_super();
    this.preferredAttributeWidths = this.preferredAttributeWidths || {};
    // this.preferredTableWidths = this.preferredTableWidths || {};
    this.tableRowHeights = this.tableRowHeights || {};
    this._collapsedNodes = this._collapsedNodes || {};
  },

  getPreferredAttributeWidth: function (attrID) {
    return this.preferredAttributeWidths[attrID];
  },

  setPreferredAttributeWidth: function(attrID, width) {
    this.preferredAttributeWidths[attrID] = width;
  },

  getTableRowHeight: function(collectionId) {
    return this.tableRowHeights[collectionId];
  },

  setTableRowHeight: function(collectionId, rowHeight) {
    this.tableRowHeights[collectionId] = rowHeight;
  },

  didDeleteCases: function (iCases) {
    if (iCases) {
      iCases.forEach(function (iCase) {
        var id = iCase.get('id');
        delete this._collapsedNodes[id];
      }.bind(this));
    }
  },

  /**
   * Whether node is collapsed and not hidden by another collapsed node.
   * @param iCase {DG.Case}
   * @returns {*|boolean}
   */
  isCollapsedNode: function (iCase) {
    return (this._collapsedNodes[iCase.id] && !this.isHiddenNode(iCase));
  },

  /**
   * Whether the case is within a collapsed node.
   * @param iCase {DG.Case}
   */
  isHiddenNode: function (iCase) {
    var parent = iCase.get('parent');
    if (parent) {
      if (this._collapsedNodes[parent.id]) {
        return true;
      } else {
        return this.isHiddenNode(parent);
      }
    } else {
      return false;
    }
  },

  /**
   * Marks a case as collapsed. In subordinate case tables the group of cases
   * descending from this case will appear only in summary.
   *
   * Will mark any collapsed cases that are descendents as hidden. The fact of
   * their collapsed state will be retained, but will have no effect unless this
   * case is expanded again.
   *
   * @param iCase {DG.Case}
   */
  collapseNode: function(iCase) {
    if (iCase) {
      this._collapsedNodes[iCase.id] = true;
    }
  },

  /**
   * Marks a case as not collapsed.
   *
   * Will reset any hidden collapsed cases to their correct state.
   *
   * @param iCase {DG.Case}
   */
  expandNode: function (iCase) {
    delete this._collapsedNodes[iCase.id];
  },

  /**
   * Returns an array of case IDs corresponding to collapsed nodes whether hidden or not.
   */
  collapsedNodes: function () {
    var key;
    var rtn = [];
    for(key in this._collapsedNodes) {
      if (this._collapsedNodes.hasOwnProperty(key)) {
        rtn.push(key);
      }
    }
    return rtn;
  }.property()

});
