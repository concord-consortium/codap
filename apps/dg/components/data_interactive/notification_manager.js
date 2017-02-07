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
 * @class  DG.Notification - Broadcasts notifications to Data Interactive
 * Plugins with active DI-API channels.
 *
 * @extends SC.Object
 */
DG.notificationManager = SC.Object.create(/** @scope DG.NotificationManager.prototype */
(function () {
  /**
   * Returns a list of active documents
   * @param document {DG.DocumentController}
   */
  function findActiveChannels (document) {
    var gameControllers = document.get('dataInteractives');
    var channels = gameControllers.filter(function (gameController) {
      return gameController.get('isUsingDataInteractiveChannel');
    }).map(function (gameController) {
      return gameController.get('activeChannel');
    });
    if (DG.embeddedModePhoneHandler) {
      channels.push(DG.embeddedModePhoneHandler);
    }
    return channels;
  }

  return {
    /**
     * Sends a notification to all active channels
     * @param message {Object} A serializable object.
     * @param callback {Function}
     */
    sendNotification: function (message, callback) {
      var activeChannels = findActiveChannels(DG.currDocumentController());
      activeChannels.forEach(function (channel) {
        channel.sendMessage(message);
      });
    }
  };
})());