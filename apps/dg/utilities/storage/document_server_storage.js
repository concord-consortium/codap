// ==========================================================================
//                          DG.DocumentServerStorage
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

sc_require('utilities/storage/storage_api');

/** @class

  Interface class for interacting with the CODAP Document Server.

 @extends SC.Object
 */
DG.DocumentServerStorage = DG.StorageAPI.extend({
  canSave: YES,
  isLoggedIn: NO,

  list: function() {
    return new Promise(function(resolve, reject) {
      var url = '%@document/all'.fmt(DG.documentServer);
      if (DG.runKey) {
        url = this._appendParams({runKey: DG.runKey});
      }
      this._urlForGetRequests(url)
        .notify(null, function(response) {
          if (SC.ok(response)) {
            resolve(response);
          } else {
            reject(response);
          }
        })
        .send();
    }.bind(this));
  },

  open: function(options) {
    return new Promise(function(resolve, reject) {
      var url = '%@document/open'.fmt(DG.documentServer),
          params = options.params || {};
      if (!SC.none(options.id)) {
        params.recordid = options.id;
      } else if (!SC.none(options.name) && !SC.none(options.owner)) {
        params.recordname = options.name;
        params.owner = options.owner;
      } else {
        reject(new Error("Must supply either 'id' or 'name' and 'owner' in the options!"));
        return;
      }
      if (DG.runKey) {
        params.runKey = DG.runKey;
      }

      url = this._appendParams(url, params);

      this._urlForGetRequests(url)
        .notify(null, function(response) {
          if (SC.ok(response)) {
            resolve(response);
          } else {
            reject(response);
          }
        })
        .send();
    }.bind(this));
  },

  save: function(iDocumentIdOrName, iContent) {
    return new Promise().reject(new Error('Cannot save with StorageAPI.'));
  },

  revert: function(options) {
    options.params = {original: 'true'};
    return this.open(options);
  },

  rename: function(options) {
    return new Promise(function(resolve, reject) {
      var url = '%@document/rename'.fmt(DG.documentServer),
          params = options.params || {};
      if (!SC.none(options.id)) {
        params.recordid = options.id;
      } else if (!SC.none(options.name) && !SC.none(options.owner)) {
        params.recordname = options.name;
        params.owner = options.owner;
      } else {
        reject(new Error("Must supply either 'id' or 'name' and 'owner' in the options!"));
        return;
      }
      if (DG.runKey) {
        params.runKey = DG.runKey;
      }
      params.newRecordname = options.newName;

      url = this._appendParams(url, params);

      this._urlForGetRequests(url)
        .notify(null, function(response) {
          if (SC.ok(response)) {
            resolve(response);
          } else {
            reject(response);
          }
        })
        .send();
    }.bind(this));
  },

  delete: function(iDocumentId) {
    return new Promise().reject(new Error('Cannot delete with StorageAPI.'));
  }
});
