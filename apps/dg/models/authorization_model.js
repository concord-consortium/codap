// ==========================================================================
//                          DG.Authorization
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

/** @class

  Represents a set of user login/authorization credentials.

  @extends DG.Object
*/
DG.Authorization = SC.Object.extend(
/** @scope DG.Authorization.prototype */ {

  /**
   * The user name.
   * @property {String}
   */
  user: '',
  
  /**
   * The user's password.
   * @property {String}
   */
  passwd: '',
  
  /**
   * The status of the current login credentials.
   * Currently, 0 (falsy) means not logged in, 1 (truthy) means logged in.
   * @property {Number}
   */
  status: 0,
  
  /**
   * Used to decide whether to display 'invalid user or password' message
   * @property {Boolean}
   */
  failedLoginAttempt: false,
  
  /**
   * [Computed] The status message string of the current login credentials.
   * @property {String}
   */
  statusMsg: function() {
    var hasUser = !SC.empty(this.get('user'));
    var hasStatus = (this.get('status') !== 0);
    if (hasUser && !hasStatus) {
      return '<img src=\''+static_url('ajax-loader.gif')+'\'>';
    }
    if (this.failedLoginAttempt) {
      //default to general error
      var msg = ('DG.Authorization.loginPane.' + this.get('errorCode'));
      if (msg.loc() === msg)
        msg = 'DG.Authorization.loginPane.error.general';
      return msg.loc();
    }
    return '';
  }.property('user', 'status'),

  /**
   * Returns true if the 'user' is non-empty and the 'status' is non-zero.
   */
  isValid: function() {
    var hasUser = !SC.empty(this.get('user'));
    var hasStatus = (this.get('status') !== 0);
    
    return hasUser && hasStatus;
  }.property('user', 'status'),

  
  /**
   * The session ID associated with the current login credentials.
   * @property {Number}
   */
  sessionID: 0,
  
  /**
   * Indicates whether save/restore should be enabled for this user/session.
   * @property {Boolean}
   */
  isSaveEnabled: false,
  
  /**
   * Indicates whether logging should be enabled for this user/session.
   * @property {Boolean}
   */
  isLoggingEnabled: false,
  
  /**
   * Counter which increments with every logging call.
   * @property {Number}
   */
  logIndex: 0,
  
  /**
   * Clears the current login credentials.
   */
  clear: function() {
    this.set('user', '');
    this.set('passwd', '');
    this.set('status', 0);
    this.set('sessionID', 0);
    this.set('isSaveEnabled', false);
    this.set('isLoggingEnabled', false);
    return this;
  }
  
}) ;
