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
   * Indicates whether logging should be enabled for this user/session.
   * @property {Boolean}
   */
  isLoggingEnabled: true,
  
  /**
   * Counter which increments with every logging call.
   * @property {Number}
   */
  logIndex: 0,
  
  /**
   * Clears the current login credentials.
   */
  clear: function() {
    this.set('isLoggingEnabled', true);
    return this;
  }
  
}) ;
