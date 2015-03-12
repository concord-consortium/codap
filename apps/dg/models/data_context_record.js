/**
 * Created by jsandoe on 10/20/14.
 */
// ==========================================================================
//                        DG.DataContextRecord
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

sc_require('models/model_store');
sc_require('models/base_model');

/** @class

  Represents a user document.

 @extends SC.BaseModel
 */
DG.DataContextRecord = DG.BaseModel.extend(
  /** @scope DG.DataContextRecord.prototype */ {

    type: 'DG.DataContext',

    /**
     * A relational link back to the parent DG.Document
     * @property {DG.Document}
     */
    document: null,

    /**
     * A relational link to the collections in this document.
     * @property {Array of DG.CollectionRecord}
     */
    collections: null,

    /**
     * Per-component storage, in a component specific format.
     * @property {JSON}
     */
    contextStorage: null,

    _savedShadowCopy: null,

    init: function () {
      this.collections = {};
      sc_super();
    },

    verify: function () {
      if (SC.empty(this.document)) {
        DG.logWarn('Unattached data context: ' + this.id);
      }
      if (typeof this.document === 'number') {
        DG.logWarn('Unresolved reference to document id, ' + this.document +
          ', in data context: ' + this.id);
      }
    },

    destroy: function() {
      if (this.collections) {
        DG.ObjectMap.forEach(this.collections, function( iCollection) {
          DG.CollectionRecord.destroyCollection( iCollection);
        });
      }
      delete this.document.contexts[this.id];
      sc_super();
    },

    createCollection: function( iProperties) {
      iProperties = iProperties || {};
      iProperties.context = this;
      return DG.CollectionRecord.createCollection( iProperties);
    },

    toArchive: function (fullData) {
      var obj;
      fullData = fullData || false;
      if ( fullData || SC.none(this.externalDocumentId) ) {
        obj = {
            type: this.type,
            document: this.document && this.document.id || undefined,
            guid: this.id,
            collections: [],
            contextStorage: this.contextStorage
          };
        DG.ObjectMap.forEach(this.collections, function (collectionKey){
          obj.collections.push(this.collections[collectionKey].toArchive());
        }.bind(this));
      } else {
        obj = {
          externalDocumentId: this.externalDocumentId
        };
      }
      return obj;
    },

    savedShadowCopy: function() {
      return this._savedShadowCopy;
    },

    updateSavedShadowCopy: function(shadow) {
      this._savedShadowCopy = shadow;
    }

  });

DG.DataContextRecord.createContext = function( iProperties) {
  var tContext, shadowCopy = {};
  if( SC.none( iProperties)) iProperties = {};
  if( !SC.none( iProperties.externalDocumentId)) {
    // We should be loading this info from an external document.
    var body = DG.ExternalDocumentCache.fetch(iProperties.externalDocumentId);

    if (body) {
      if (!SC.none(body.externalDocumentId)) {
        iProperties.externalDocumentId = body.externalDocumentId;
        delete body.externalDocumentId;
      }
      shadowCopy = $.extend(true, shadowCopy, body);
      iProperties = $.extend(body, iProperties);
    } else {
      // FIXME What do we do when the document wasn't pre-fetched?
    }
  }
  if( SC.none( iProperties.type)) iProperties.type = 'DG.DataContext';
  if (!iProperties.document) {
    iProperties.document = DG.currDocumentController().content;
  }
  iProperties.document = DG.store.resolve(iProperties.document);
  tContext = DG.DataContextRecord.create(iProperties);
  tContext.updateSavedShadowCopy(shadowCopy);
  if (iProperties.document) {
    iProperties.document.contexts[tContext.get('id')] = tContext;
  }
  if (iProperties.collections) {
    iProperties.collections.forEach(function (iProps) {
      iProps.context = tContext;
      DG.CollectionRecord.createCollection(iProps);
    });
  }
  DG.log('Create context: ');

  return tContext;
};

DG.DataContextRecord.destroyContext = function( iContext) {
  iContext.destroy();
};
