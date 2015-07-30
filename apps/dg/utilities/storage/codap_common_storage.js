// ==========================================================================
//                          DG.CODAPCommonStorage
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

/** @class

  Common functions used with both the Document Server storage and the Default storage.

 @extends SC.Object
 */
DG.CODAPCommonStorage = {

  // General Helper methods for the Document Server / General backends.

  _handleResponse: function(iResponse, resolve, reject) {
    try {
      var body = JSON.parse(iResponse.get('body'));

      if (this._isError(iResponse)) {
        reject(this._extractMessage(iResponse));
      } else {
        var docId = iResponse.headers()['Document-Id'];
        if (docId) {
          body.externalDocumentId = ''+docId;
        }
        resolve(body);
      }
    } catch(e) {
      // expected a json response, but got something else!
      reject('error.parseError');
    }
  },

  _urlForGetRequests: function(iUrl) {
    return SC.Request.getUrl(iUrl);
  },

  _urlForPostRequests: function(iUrl) {
    return SC.Request.postUrl(iUrl);
  },

  _appendParams: function(url, params) {
    return $.param.querystring(url, params);
  },

  _isError: function(iResponse) {
    return !SC.ok(iResponse) || iResponse.get('isError') || iResponse.getPath('response.valid') === false || iResponse.get('body').valid === false;
  },

  _extractMessage: function(iResponse) {
    var body = iResponse.get('body'),
        status = iResponse.get('status');
    if (status === 401) {
      return 'error.sessionExpired';
    } else if (status === 403) {
      return 'error.permissions';
    } else if (!SC.none(body.errors) && !SC.none(body.errors[0]) && body.errors[0].slice(0, 19) === "Invalid patch JSON ") {
      return 'error.invalidPatch';
    } else if (SC.none(body.message) || SC.empty(body.message)) {
      return 'error.general';
    }
    return body.message;
  }

};
