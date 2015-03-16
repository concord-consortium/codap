// ==========================================================================
//                          DG.StorageAPI
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

  Interface class for providing the basic skeleton API for storage interfaces.
  You shouldn't use this class directly, but should use one of the sub-classes.

  Storage interface authors: Extend this class with your own and override the
  methods that your storage interface supports.

 @extends SC.Object
 */
DG.StorageAPI = SC.Object.extend({

  canSave: NO,
  isLoggedIn: NO,

  list: function() {
    return new Promise().reject(new Error('Cannot list with StorageAPI.'));
  },

  open: function(options) {
    return new Promise().reject(new Error('Cannot open with StorageAPI.'));
  },

  save: function(iDocumentIdOrName, iContent) {
    return new Promise().reject(new Error('Cannot save with StorageAPI.'));
  },

  rename: function(iDocumentId, iOldName, iNewName) {
    return new Promise().reject(new Error('Cannot rename with StorageAPI.'));
  },

  delete: function(iDocumentId) {
    return new Promise().reject(new Error('Cannot delete with StorageAPI.'));
  },

  _urlForGetRequests: function(iUrl) {
    return SC.Request.getUrl(iUrl);
  },

  _urlForPostRequests: function(iUrl) {
    return SC.Request.postUrl(iUrl);
  },

  _urlForJSONPostRequests: function(iUrl) {
    return this._urlForPostRequests(iUrl).json();
  },

  _urlForJSONGetRequests: function(iUrl) {
    return this._urlForGetRequests(iUrl).json();
  },

});
