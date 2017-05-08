// ==========================================================================
//  
//  Author:   jsandoe
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
/**
 * The purpose of this emulator is allow parties in the same execution context
 * to communicate with one-another as if they were using the IFramePhone RPC
 * endpoint.
 */
DG.IFramePhoneEmulator = function (messageHandler, channelName, connectorName) {
  var queue = [];
  var connection = null;
  return {
    call: function (message, callback) {
      if (connection) {
        connection._transmit(message, function (reply) {
          if (callback) {
            callback(reply);
          }
        });
      } else {
        queue.push({message: message, callback: callback});
      }
    },
    connect: function (partner) {
      if (!connection && partner.connect) {
        DG.log('Local Connection established between %@ and %@'.loc(connectorName, partner.getConnectorName()));
        connection = partner;
        partner.connect(this);
        if (queue.length > 0) {
          queue.forEach(function (item) {
            this.call(item.message, item.callback);
          }.bind(this));
        }
      }
    },
    getConnectorName: function () {
      return connectorName;
    },
    _transmit: function (message, callback) {
      messageHandler(message, callback);
    }
  };
};