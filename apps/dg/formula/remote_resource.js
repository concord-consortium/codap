// ==========================================================================
//                          DG.RemoteResource
//
//  Author:   Kirk Swenson
//
//  Copyright (c) 2017 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('models/global_value_model');


/** @class DG.PendingRequest

  "Error" class for pending requests.

  @extends Error
*/
DG.PendingRequest = function() {
  this.name = 'DG.Formula.PendingRequest.name'.loc();
  this.message = 'DG.Formula.PendingRequest.message'.loc();
  this.description = 'DG.Formula.PendingRequest.description'.loc();
};
DG.PendingRequest.prototype = new Error();
DG.PendingRequest.prototype.constructor = DG.PendingRequest;


/** @class DG.FailedRequest

  "Error" class for failed requests.

  @extends Error
*/
DG.FailedRequest = function(error) {
  this.name = 'DG.Formula.FailedRequest.name'.loc();
  this.message = 'DG.Formula.FailedRequest.message'.loc(error);
  this.description = 'DG.Formula.FailedRequest.description'.loc(error);
};
DG.FailedRequest.prototype = new Error();
DG.FailedRequest.prototype.constructor = DG.FailedRequest;


DG.RemoteResource = DG.GlobalValue.extend({

  url: null,

  format: null,

  archivable: false,

  pendingValue: new DG.PendingRequest(),

  _value: null,

  init: function() {
    sc_super();
  },

  destroy: function() {
    sc_super();
  },

  value: function() {
    if (this._value != null)
      return this._value;

    this._load();
  }.property(),

  _load: function() {
    this._value = this.get('pendingValue');
    this.notifyPropertyChange('value');

    $.ajax({
      url: this.url,
      context: this,
      dataType: 'json',
      success: function(data, status, jqXHR) {
        this._value = this._handleSuccess(data, status, jqXHR);
        this.notifyPropertyChange('value');
      }.bind(this),
      error: function (jqXHR, status, error) {
        this._value = this._handleError(jqXHR, status, error);
        this.notifyPropertyChange('value');
      }
    });
  },

  _handleSuccess: function(data) {
    return data;
  },

  _handleError: function(jqXHR, status, error) {
    return new DG.FailedRequest(error || status);
  }

});
