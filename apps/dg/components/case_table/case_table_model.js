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
  }.property('context.name'),

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

  init: function () {
    this.preferredAttributeWidths = this.preferredAttributeWidths || {};
    this.preferredTableWidths = this.preferredTableWidths || {};
  },

  /**
   * Column widths changed for a view.
   *
   * Update preferredAttributeWidths,
   *
   * @param view {DG.CaseTableView}
   */
  columnWidthsDidChange: function (view) {
    var columnWidthMap = view.get('columnWidths');
    DG.ObjectMap.forEach(columnWidthMap, function (key, value) {
      this.preferredAttributeWidths[key] = value;
    }.bind(this));
  },

  getPreferredAttributeWidth: function (attrID) {
    return this.preferredAttributeWidths[attrID];
  }
});
