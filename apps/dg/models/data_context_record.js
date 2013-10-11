// ==========================================================================
//                        DG.DataContextRecord
//
//  Copyright ©2013 KCP Technologies, Inc., a McGraw-Hill Education Company
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

  Represents a user document.

  @extends DG.Record
*/
DG.DataContextRecord = DG.Record.extend(
/** @scope DG.DataContextRecord.prototype */ {

  type: SC.Record.attr(String, { defaultValue: 'DG.DataContext' }),

  /**
   * A relational link back to the parent DG.Document
   * @property {DG.Document}
   */
  document: SC.Record.toOne("DG.Document", {
    inverse: "contexts", isOwner: NO, isMaster: NO
  }),

  /**
   * A relational link to the collections in this document.
   * @property {Array of DG.CollectionRecord}
   */
  collections: SC.Record.toMany('DG.CollectionRecord', {
    inverse: 'context', isOwner: YES, isMaster: YES
  }),

  /**
   * Per-component storage, in a component specific format.
   * @property {JSON}
   */
  contextStorage: SC.Record.attr(Object, { defaultValue: null }),
  
  destroy: function() {
  
    this.collections.forEach( function( iCollection) {
                                      DG.CollectionRecord.destroy( iCollection);
                                    });
    sc_super();
  },
  
  createCollection: function( iProperties) {
    iProperties = iProperties || {};
    iProperties.context = this.get('id');
    return DG.CollectionRecord.createCollection( iProperties);
  }
  
});

DG.DataContextRecord.createContext = function( iProperties) {
  if( SC.none( iProperties)) iProperties = {};
  if( SC.none( iProperties.type)) iProperties.type = 'DG.DataContext';
  var tContext = DG.store.createRecord( DG.DataContextRecord, iProperties);
  DG.store.commitRecords();
  return tContext;
};

DG.DataContextRecord.destroyContext = function( iContext) {
  iContext.destroy();
};
