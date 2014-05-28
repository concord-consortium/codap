// ==========================================================================
//                              DG.GlobalValue
//
//  Copyright (c) 2014 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('models/dg_record');

/** @class

  Represents an global value (e.g. slider).

  @extends DG.Record
*/
DG.GlobalValue = DG.Record.extend(
/** @scope DG.GlobalValue.prototype */ {

  /**
   * The name of the global value
   * @property {String}
   */
  name: SC.Record.attr(String, { defaultValue: '' }),

  /**
   * The "native" storage of the value is a number for now.
   * Eventually, this will need to be a more general notion of value.
   * @property {Number}
   */
  value: SC.Record.attr(Number),
  
  /**
   * A relational link back to the document.
   * @property {DG.Document}
   */
  document: SC.Record.toOne('DG.Document', {
    inverse: 'globalValues', isOwner: NO, isMaster: NO
  })

});

DG.GlobalValue.createGlobalValue = function( iProperties) {
  var tGlobal = DG.store.createRecord( DG.GlobalValue, iProperties || {});
  DG.store.commitRecords();
  return tGlobal;
};

DG.GlobalValue.destroyGlobalValue = function( iGlobalValue) {
  iGlobalValue.destroy();
};

