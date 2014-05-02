// ==========================================================================
//                               DG.Document
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

  Represents a user document.

  @extends DG.Record
*/
DG.Document = DG.Record.extend(
/** @scope DG.Document.prototype */ {

  /**
   * The name/title of the document
   * @property {String}
   */
  name: SC.Record.attr(String, { defaultValue: '' }),
  
  appName: SC.Record.attr(String, { defaultValue: '' }),

  appVersion: SC.Record.attr(String, { defaultValue: '' }),

  appBuildNum: SC.Record.attr(String, { defaultValue: '' }),

  /**
   * A relational link to the components in this document.
   * @property {Array of DG.Component}
   */
  components: SC.Record.toMany('DG.Component', {
    inverse: 'document', isOwner: YES, isMaster: YES
  }),

  /**
   * A relational link to the collections in this document.
   * @property {Array of DG.CollectionRecord}
   */
  contexts: SC.Record.toMany('DG.DataContextRecord', {
    inverse: 'context', isOwner: YES, isMaster: YES
  }),

  /**
   * A relational link to the collections in this document.
   * @property {Array of DG.CollectionRecord}
   */
  globalValues: SC.Record.toMany('DG.GlobalValue', {
    inverse: 'document', isOwner: YES, isMaster: YES
  }),
  
  contextRecords: null,
  
  init: function() {
    sc_super();
    
    this.contextRecords = DG.store.find( DG.DataContextRecord);
  },
  
  destroy: function() {
  
    this.get('globalValues').forEach( function( iGlobal) {
                                      DG.GlobalValue.destroy( iGlobal);
                                    });
  
    this.get('contexts').forEach( function( iContext) {
                                      DG.DataContextRecord.destroy( iContext);
                                    });
  
    this.get('components').forEach( function( iComponent) {
                                      DG.Component.destroy( iComponent);
                                    });
    sc_super();
  },
  
  createContext: function( iProperties) {
    if( SC.none( iProperties)) iProperties = {};
    iProperties.document = this.get('id');
    return DG.DataContextRecord.createContext( iProperties);
  },
  
  willSaveRecord: function() {
    this.set('appName', DG.APPNAME);
    this.set('appVersion', DG.VERSION);
    this.set('appBuildNum', DG.BUILD_NUM);
  }
  
});

DG.Document.createDocument = function( iProperties) {
  var kMemoryDataSource = 'DG.MemoryDataSource',
      // kRESTDataSource = 'DG.RESTDataSource',
      kDefaultDataSource = /*kRESTDataSource*/ kMemoryDataSource;
  var docStore = SC.Store.create({ document: this }).from( kDefaultDataSource);

  DG.assert( !DG.store, "Can't create another document without closing the first.");
  DG.store = docStore;

  var tDocument = docStore.createRecord( DG.Document, iProperties || {});
  DG.store.commitRecords();
  
  return tDocument;
};

DG.Document.destroyDocument = function( iDocument) {
  iDocument.destroy();
  DG.store = null;
};
