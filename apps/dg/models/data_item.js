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
/**
 * A DataItem is an n-tuple each element of which corresponds to exactly one
 * attribute in the data set. It can be thought of as a row in a flat table
 * where the columns are Attributes.
 */
DG.DataItem = SC.Object.extend({
  /*
   * A 'given' ID for the DataItem. Items are also identified by their
   * index in the data set.
   * @type {string}
   */
  id: null,

  /*
   * A hash map of attribute IDs to values.
   * @type {{attributeID: *}}
   */
  values: null,

  setValue: function (attributeID, value) {
    this.values[attributeID] = value;
  },

  updateData: function (dataMap) {
    this.values = this.values || {};
    $.extend(this.values, dataMap);
  },

  toArchive: function () {
    // Todo
  }
});
