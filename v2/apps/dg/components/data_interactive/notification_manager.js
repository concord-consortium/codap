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
   * Returns a list of active channels
   * @param document {DG.DocumentController}
   */
  function findActiveChannels (document) {
    var gameControllers = document.get('dataInteractives');
    var channels = gameControllers.filter(function (gameController) {
      return gameController.get('isUsingDataInteractiveChannel');
    }).map(function (gameController) {
      return gameController.get('activeChannel');
    });
    // If we have embeddedMode handlers return any active ones.
    if (DG.embeddedModePhoneHandlers) {
      DG.embeddedModePhoneHandlers.forEach(function (handler) {
        if (handler.get('isPhoneInUse')) {
          channels.push(handler);
        }
      });
    }
    return channels;
  }

  return {

    /**
     * Stashed as part of contextDataDidChange for later retrieval by observers such as maps
     * @property [Object]
     */
    mostRecentDataContextChanges: null,

    init: function () {
      sc_super();
      this.invokeLater(function () {
        if (!this.isDestroyed) {
          // Because we're in an invokeLater, we might already have been destroyed
          var contexts = DG.currDocumentController().get('contexts');

          contexts.forEach(function (context) {
            this.guaranteeDataContextObserver(context);
          }.bind(this));
          DG.currDocumentController().addObserver('contextsLength', this, this.contextCountDidChange);
        }

      }, 200);
    },
    destroy: function () {
      var contexts = DG.currDocumentController().get('contexts');
      contexts.forEach(function (context) {
        this.removeDataContextObserver(context);
      }.bind(this));
      DG.currDocumentController().removeObserver('contextsLength', this, this.contextCountDidChange);
      sc_super();
    },

    /**
     * Sends a notification to all active channels
     * @param message {Object} A serializable object.
     * @param callback {Function}
     */
    sendNotification: function (message, callback) {
      var activeChannels = findActiveChannels(DG.currDocumentController());
      activeChannels.forEach(function (channel) {
        if (channel.sendMessage) {
          channel.sendMessage(message, callback);
        }
      });
    },

    sendChannelNotification: function (gameController, message, callback) {
      var channel = gameController.get('activeChannel');
      if (channel) {
        if (channel.sendMessage) {
          channel.sendMessage(message, callback);
        }
      } else {
        DG.logWarn("NotificationManager.sendChannelNotification to unknown plugin");
      }
    },

    contextCountDidChange: function () {
      DG.log('contextCountDidChange');
      // re-add observers for all data contexts
      DG.currDocumentController().contexts.forEach(function (context){
        this.guaranteeDataContextObserver(context);
      }.bind(this));

      // send notification to DI
      this.sendNotification({
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

    guaranteeDataContextObserver: function (iDataContext) {
      if (!iDataContext.hasObserverFor('changeCount', this, this.contextDataDidChange)) {
        iDataContext.addObserver('changeCount', this, this.contextDataDidChange);
      }
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

      var originalChanges = dataContext.get('newChanges');

      var activeChannels = findActiveChannels(DG.currDocumentController());

      activeChannels.forEach(function (channel) {
        var changes = originalChanges.filter(function (iChange) {
          // filter out unsuccessful change attempts and those with
          // a requester that matches the channel handler.
          return ((iChange.result && iChange.result.success) &&
          (!iChange.requester || (iChange.requester !== channel.get('id'))));
        }.bind(channel)).map(function (iChange) {
          // fix up change objects by copying through certain result properties
          // and converting objects to their id.
          var result = {};
          DG.ObjectMap.forEach(iChange.result, function (k, v) {
            switch (k) {
              case 'success':
              case 'properties':
              case 'attrIDs':
              case 'caseID':
              case 'caseIDs':
              case 'itemID':
              case 'itemIDs':
                result[k] = v;
                break;
              case 'collection':
                result[k] = v.get('id');
                result.name = iChange.properties.name;
                result.attribute = (iChange.attributes && iChange.attributes.length > 0) ?
                    iChange.attributes[0].get('name') : null;
                break;
              case 'attrs':
                // return archivable attribute descriptors rather DG.Attributes
                result[k] = v && v.map(function(attr) {
                  return DG.DataInteractiveUtils.getAttributeProperties(attr);
                });
                break;
              default:
                DG.log('unhandled result property: ' + k );
            }
          });
          if (iChange.cases) {
            result.cases = [];
            result.extend = iChange.extend;
            (iChange.cases).forEach(function (iCase) {
              if( iCase._isProtoCase)
                return; // In rare situation got here and what follows causes exception
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
                  parent: iCase.collection.parent ? {
                        id: iCase.collection.parent.id,
                        name: iCase.collection.parent.name
                      } : null
                },
                values: values
              });
            });
          }

          return {operation: iChange.operation, result: result};
        }); // end of map

        if (!changes || changes.length === 0) {
          return;
        }

        channel.sendMessage({
          action: 'notify',
          resource: 'dataContextChangeNotice[' + dataContextName + ']',
          values: changes
        }, function (response) {
          DG.log('Sent dataContextChangeNotice to Data Interactive for dataContext: '
              + dataContextName + ': ' + JSON.stringify(changes));
          DG.log('Response: ' + JSON.stringify(response));
        });
      });

      this.set('mostRecentDataContextChanges', originalChanges);
    },

    notifyLogMessageSubscribers: function (iValues) {
      // shortcut if no listeners are registered
      var logMonitors = DG.currDocumentController().dataInteractiveLogMonitor.get("logMonitors");
      if (logMonitors.length === 0) {
        return;
      }

      var values = {};
      Object.keys(iValues).forEach(function (key) {
        values[key] = iValues[key];
      });
      values.message = SC.String.fmt(iValues.formatStr, iValues.replaceArgs);

      logMonitors.forEach(function (logMonitor) {
        var logMonitorValues = logMonitor.values;
        logMonitorValues = SC.merge({
          topicMatches: logMonitorValues.topic && (logMonitorValues.topic === iValues.topic),
          topicPrefixMatches: logMonitorValues.topicPrefix && iValues.topic && (logMonitorValues.topicPrefix === iValues.topic.substr(0, logMonitorValues.topicPrefix.length)),
          formatStrMatches: logMonitorValues.formatStr && (logMonitorValues.formatStr === iValues.formatStr),
          formatPrefixMatches: logMonitorValues.formatPrefix && iValues.formatStr && (logMonitorValues.formatPrefix === iValues.formatStr.substr(0, logMonitorValues.formatPrefix.length)),
          messageMatches: logMonitorValues.message &&
            ((logMonitorValues.message === values.message)||
                (logMonitorValues.message === "*"))
        }, logMonitorValues);
        if (logMonitorValues.topicMatches || logMonitorValues.topicPrefixMatches ||
            logMonitorValues.formatStrMatches || logMonitorValues.formatPrefixMatches || logMonitorValues.messageMatches) {
          values.logMonitor = logMonitorValues;
          logMonitor.iPhoneHandler.sendMessage({
            action: "notify",
            resource: "logMessageNotice",
            values: values
          });
        }
      }.bind(this));
    },

    /**
     * Used when a plugin requests document state. We can't send it synchronously as a reply, so we call
     * this method to send it to all subscribers.
     */
    sendDocumentToSubscribers: function() {
      var activeChannels = findActiveChannels(DG.currDocumentController()),
          documentSubscribers;
      documentSubscribers = activeChannels.filter( function( iChannel) {
        return iChannel.getPath('controller.contentView.model.subscribeToDocuments');
      });
      if (documentSubscribers.length > 0) {
        DG.currDocumentController().captureCurrentDocumentState(true /* fullData */).then(function (value) {
          documentSubscribers.forEach( function( iSubscriber) {
            iSubscriber.sendMessage({
              action: 'notify',
              resource: 'document',
              values: {
                operation: 'newDocumentState',
                state: value
              }
            });
          });
        });
      }
    }
  };


})());
