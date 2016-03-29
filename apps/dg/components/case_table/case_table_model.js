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
/** @class  DG.CaseTableModel - The model for a slider. Holds onto a global value.

 @extends SC.Object
 */
DG.CaseTableModel = SC.Object.extend(/** @scope DG.CaseTableModel.prototype */ {
  /**
   @property { DG.DataContext }
   */
  context: null,

  id: null,
  idBinding: '*context.id',

  name: null,
  nameBinding: '*context.name',

  defaultTitle: function() {
    return this.getPath('context.name');
  }.property(),

  defaultTitleDidChange: function () {
    return this.notifyPropertyChange('defaultTitle');
  }.observes('*context.name'),

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
  preferredTableWidths: null,

  /**
   * A hash of case ids and their collapsed state and whether they are visible
   * or superseded by a collapsed case in a higher order table.
   * @type [{{isCollapsed: boolean, isHidden: boolean, collapsedCase: DG.Case}}]
   */
  collapsedNodes: null,

  init: function () {
    this.preferredAttributeWidths = this.preferredAttributeWidths || {};
    this.preferredTableWidths = this.preferredTableWidths || {};
    this.collapsedNodes = this.collapsedNodes || [];
  },

  getPreferredAttributeWidth: function (attrID) {
    return this.preferredAttributeWidths[attrID];
  },

  setPreferredAttributeWidth: function(attrID, width) {
    this.preferredAttributeWidths[attrID] = width;
  },

  /**
   * Whether node is collapsed and not hidden by another collapsed node.
   * @param iCase {DG.Case}
   * @returns {*|boolean}
   */
  isCollapsedNode: function (iCase) {
    var node = this.collapsedNodes[iCase.id];
    var isCollapsed = false;
    if (node) {
      isCollapsed = node.isCollapsed && !node.isHidden;
    }
    return isCollapsed;
  },

  /**
   * Whether the case is within a collapsed node.
   * @param iCase {DG.Case}
   */
  isHiddenNode: function (iCase) {
    var parent = iCase.get('parent');
    var isHidden = false;
    var parentCollapseState;
    if (parent) {
      parentCollapseState = this.collapsedNodes[parent.id];
      if (parentCollapseState && parentCollapseState.isCollapsed) {
        isHidden = true;
      } else {
        isHidden = this.isHiddenNode(parent);
      }
    }
    return isHidden;
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
    if (!iCase) {
      return;
    }
    var collapseState = this.collapsedNodes[iCase.id];
    if (!collapseState) {
      collapseState = {
        collapsedCase: iCase
      };
      this.collapsedNodes[iCase.id] = collapseState;
    }
    collapseState.isCollapsed = true;
    this.collapsedNodes.forEach(function (cs) {
      cs.isHidden = this.isHiddenNode(cs.collapsedCase);
    }.bind(this));
  },

  /**
   * Marks a case as not collapsed.
   *
   * Will reset any hidden collapsed cases to their correct state.
   *
   * @param iCase {DG.Case}
   */
  expandNode: function (iCase) {
    if (!iCase) {
      return;
    }
    var collapseState = this.collapsedNodes[iCase.id];
    if (!collapseState) {
      collapseState = {
        collapsedCase: iCase
      };
      this.collapsedNodes[iCase.id] = collapseState;
    }
    collapseState.isCollapsed = false;
    this.collapsedNodes.forEach(function (cs) {
      cs.isHidden = this.isHiddenNode(cs.collapsedCase);
    }.bind(this));
  }
});
