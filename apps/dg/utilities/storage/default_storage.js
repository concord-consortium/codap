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
sc_require('utilities/storage/codap_common_storage');

sc_require('controllers/authorization');

/** @class

  Interface class for interacting with the default CODAP document storage.

 @extends SC.Object
 */
DG.DefaultStorage = DG.StorageAPI.extend(DG.CODAPCommonStorage, {
  canSave: YES,
  isLoggedIn: NO,

  login: function(options) {
    return new Promise(function(resolve, reject) {
      this._urlForPostRequests('/DataGames/api/auth/login')
        .notify(this, '_handleResponse', resolve, reject)
        .send(options);
    }.bind(this));
  },

  logout: function(options) {
    return new Promise(function(resolve, reject) {
      this._urlForPostRequests('/DataGames/api/auth/logout')
        .notify(this, '_handleResponse', resolve, reject)
        .send(options);
    }.bind(this));
  },

  list: function() {
    return new Promise(function(resolve, reject) {
      var url = '/DataGames/api/document/all?username=%@&sessiontoken=%@'.fmt(
        DG.authorizationController.getPath('currLogin.user'),
        encodeURIComponent(DG.authorizationController.getPath('currLogin.sessionID'))
      );
      this._urlForGetRequests(url)
        .notify(this, '_handleResponse', resolve, reject)
        .send();
    }.bind(this));
  },

  open: function(options) {
    return new Promise(function(resolve, reject) {
      var url;
      if (!SC.none(options.id)) {
        url = '/DataGames/api/document/open?username=%@&sessiontoken=%@&recordid=%@'.fmt(
          DG.authorizationController.getPath('currLogin.user'),
          encodeURIComponent(DG.authorizationController.getPath('currLogin.sessionID')),
          options.id
        );
      } else if (!SC.none(options.name) && !SC.none(options.owner)) {
        url = '/DataGames/api/document/open?username=%@&sessiontoken=%@&recordname=%@&owner=%@'.fmt(
          DG.authorizationController.getPath('currLogin.user'),
          encodeURIComponent(DG.authorizationController.getPath('currLogin.sessionID')),
          options.name,
          options.owner
        );
      } else {
        reject(new Error("Must supply either 'id' or 'name' and 'owner' in the options!"));
        return;
      }
      this._urlForGetRequests(url)
        .notify(this, '_handleResponse', resolve, reject)
        .send();
    }.bind(this));
  },

  save: function(options) {
    return new Promise(function(resolve, reject) {
      var url,
          documentContent = JSON.stringify(options.content);
      if (!SC.none(options.id)) {
        url = '/DataGames/api/document/save?username=%@&sessiontoken=%@&recordid=%@'.fmt(
          DG.authorizationController.getPath('currLogin.user'),
          encodeURIComponent(DG.authorizationController.getPath('currLogin.sessionID')),
          options.id
        );
      } else if (!SC.none(options.name)) {
        url = '/DataGames/api/document/save?username=%@&sessiontoken=%@&recordname=%@'.fmt(
          DG.authorizationController.getPath('currLogin.user'),
          encodeURIComponent(DG.authorizationController.getPath('currLogin.sessionID')),
          encodeURIComponent(options.name)
        );
      } else {
        reject(new Error("Must supply either 'id' or 'name' in the options!"));
        return;
      }

      this._urlForPostRequests(url)
        .notify(this, '_handleResponse', resolve, reject)
        .timeoutAfter(60000)
        .send(documentContent);
    }.bind(this));
  },

  revert: function(options) {
    return Promise.reject(new Error('Cannot revert with DefaultStorage.'));
  },

  rename: function(options) {
    return Promise.reject(new Error('Cannot rename with DefaultStorage.'));
  },

  delete: function(options) {
    return Promise.reject(new Error('Cannot delete with DefaultStorage.'));
  }
});
