// ==========================================================================
//                          DG.DefaultStorage
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
sc_require('controllers/authorization');

/** @class

  Interface class for interacting with the default CODAP document storage.

 @extends SC.Object
 */
DG.DefaultStorage = DG.StorageAPI.extend({
  canSave: YES,
  isLoggedIn: NO,

  list: function() {
    return new Promise(function(resolve, reject) {
      var url = '/DataGames/api/document/all?username=%@&sessiontoken=%@'.fmt(
        DG.authorizationController.getPath('currLogin.user'),
        encodeURIComponent(DG.authorizationController.getPath('currLogin.sessionID'))
      );
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

  open: function(id) {
    return new Promise(function(resolve, reject) {
      var url = '/DataGames/api/document/open?username=%@&sessiontoken=%@&recordid=%@'.fmt(
        DG.authorizationController.getPath('currLogin.user'),
        encodeURIComponent(DG.authorizationController.getPath('currLogin.sessionID')),
        id
      );
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

  save: function(id, content) {
    return new Promise().reject(new Error('Cannot save with StorageAPI.'));
  },

  rename: function(id, oldName, newName) {
    return new Promise().reject(new Error('Cannot rename with StorageAPI.'));
  },

  delete: function(id) {
    return new Promise().reject(new Error('Cannot delete with StorageAPI.'));
  }
});
