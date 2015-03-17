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

/* globals pako */
sc_require('libraries/pako-deflate');

/** @class

  Interface class for interacting with the CODAP Document Server.

 @extends SC.Object
 */
DG.DocumentServerStorage = DG.StorageAPI.extend({
  canSave: YES,
  isLoggedIn: NO,

  login: function() {
    return new Promise(function(resolve, reject) {
      var url = '%@user/info'.fmt(DG.documentServer);
      if (DG.runKey) {
        url = this._appendParams(url, {runKey: DG.runKey});
      }

      this._urlForJSONGetRequests(url)
        .notify(null, function(response) {
          var body = response.get('body');
          if (SC.ok(response)) {
            resolve(body);
          } else {
            // if the server gets a 500 error(server script error),
            // then there will be no message return
            var errorCode = (body && body.message) || "";
            if (response.get('status') === 401) {
              if (DG.runAsGuest) {
                DG.authorizationController.sendLoginAsGuestRequest();
                resolve({skipLogin: true});
                return;
              } else {
                errorCode = 'error.notLoggedIn';
              }
            }
            reject(errorCode);
          }
        })
        .send();
    }.bind(this));
  },

  logout: function() {
    return Promise.reject(new Error('Cannot logout with Document Server.'));
  },

  list: function() {
    return new Promise(function(resolve, reject) {
      var url = '%@document/all'.fmt(DG.documentServer);
      if (DG.runKey) {
        url = this._appendParams(url, {runKey: DG.runKey});
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

  save: function(options) {
    return new Promise(function(resolve, reject) {
      var url,
          params = options.params || {},
          documentContent = JSON.stringify(options.content),
          req;

      if (options.differential) {
        url = '%@document/patch'.fmt(DG.documentServer);
      } else {
        url = '%@document/save'.fmt(DG.documentServer);
      }

      if (!SC.none(options.id)) {
        params.recordid = options.id;
      } else if (!SC.none(options.name)) {
        params.recordname = options.name;
      } else {
        reject(new Error("Must supply either 'id' or 'name' in the options!"));
        return;
      }
      if (DG.runKey) {
        params.runKey = DG.runKey;
      }

      url = this._appendParams(url, params);

      req = this._urlForPostRequests(url)
              .header('Content-Type', 'application/x-codap-document');

      if (DG.USE_COMPRESSION) {
        documentContent = pako.deflate(documentContent);
        req = req.header('Content-Encoding', 'deflate');
      }

      req.notify(null, function(response) {
          if (SC.ok(response)) {
            resolve(response);
          } else {
            reject(response);
          }
        })
        .timeoutAfter(60000)
        .send(documentContent);
    }.bind(this));
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

  delete: function(options) {
    return new Promise(function(resolve, reject) {
      var url = '%@document/delete'.fmt(DG.documentServer),
          params = options.params || {};

      if (!SC.none(options.id)) {
        params.recordid = options.id;
      } else if (!SC.none(options.name)) {
        params.recordname = options.name;
      } else {
        reject(new Error("Must supply either 'id' or 'name' in the options!"));
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
  }
});
