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
DG.NotificationManager = SC.Object.extend(/** @scope DG.NotificationManager.prototype */
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
    init: function () {
      sc_super();
      this.invokeLater(function () {
        var contexts = DG.currDocumentController().get('contexts');

        contexts.forEach(function (context) {
          this.addDataContextObserver(context);
        }.bind(this));

        DG.currDocumentController().addObserver('contexts.length', this, this.contextCountDidChange);

      }, 200);
    },

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
    },
    contextCountDidChange: function () {
      DG.log('contextCountDidChange');
      // re-add observers for all data contexts
      DG.currDocumentController().contexts.forEach(function (context){
        this.removeDataContextObserver(context);
        this.addDataContextObserver(context);
      }.bind(this));

      // send notification to DI
      this.sendMessage({
        action: 'notify',
        resource: 'documentChangeNotice',
        values: {
          operation: 'dataContextCountChanged'
    }
      }, function (response) {
        DG.log('Sent documentChangeNotice to Data Interactive');
        DG.log('Response: ' + JSON.stringify(response));
      });
    },

    addDataContextObserver: function (iDataContext) {
      iDataContext.addObserver('changeCount', this, this.contextDataDidChange);
    },

    removeDataContextObserver: function (iDataContext) {
      iDataContext.removeObserver('changeCount', this, this.contextDataDidChange);
    },

    /**
     * Called in response to data context change notices. We will filter out
     * changes that this object originated and those that were marked
     * unsuccessful. Then we will abstract the original change notice by
     * extracting what may be needed at a bare minimum for the DI to determine
     * their response to the notice.
     *
     * @param {@DG.DataContext} dataContext
     */
    contextDataDidChange: function (dataContext) {
      var dataContextName = dataContext.get('name');

      var changes = dataContext.get('newChanges').filter(function (iChange) {
        // filter out unsuccessful change attempts and those with
        // a requester that matches this handler.
        return ((iChange.result && iChange.result.success) &&
        (!iChange.requester || (iChange.requester !== this.get('id'))));
      }.bind(this)).map(function (change) {
        // fix up change objects by copying through certain result properties
        // and converting objects to their id.
        var result = {};
        DG.ObjectMap.forEach(change.result, function (k, v) {
          switch (k) {
            case 'success':
            case 'caseIDs':
            case 'caseID':
            case 'attrIDs':
              result[k] = v;
              break;
            case 'collection':
              result[k] = v.get('id');
              break;
            default:
              DG.log('unhandled result property: ' + k );
          }
        });

        result.cases = [];
        (change.cases || []).forEach(function (iCase) {
          var values = {};

          iCase.collection.attrs.forEach(function (attr) {
            values[attr.name] = iCase.getValue(attr.id);
          });

          result.cases.push({
            id: iCase.id,
            parent : iCase.parent && iCase.parent.id,
            context: {
              id: iCase.collection.context.id,
              name: iCase.collection.context.name
            },
            collection: {
              id: iCase.collection.id,
              name: iCase.collection.name,
              parent: iCase.collection.parent ? {id: iCase.collection.parent.id, name: iCase.collection.parent.name} : null
            },
            values: values
          });
        });

        return {operation: change.operation, result: result};
      });
      if (!changes || changes.length === 0) {
        return;
      }
      this.sendNotification({
        action: 'notify',
        resource: 'dataContextChangeNotice[' + dataContextName + ']',
        values: changes
      }, function (response) {
        DG.log('Sent dataContextChangeNotice to Data Interactive for context: '
            + dataContextName + ': ' + JSON.stringify(changes));
        DG.log('Response: ' + JSON.stringify(response));
      });
    }

  };
})());