// ==========================================================================
//                          DG.DataInteractivePhoneHandler
//
//  Copyright (c) 2016 by The Concord Consortium, Inc. All rights reserved.
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
 *
 * The DataInteractivePhoneHandler handles inbound messages for the Data Interactive
 * API.
 *
 * @extends SC.Object
 */
DG.DataInteractivePhoneHandler = SC.Object.extend(
    /** @scope DG.DataInteractivePhoneHandler.prototype */ {

      /**
       * @type {DG.GameController}
       */
      controller: null,

      /**
       * @type {DG.DataInteractiveModel}
       */
      modelBinding: SC.Binding.oneWay('*controller.model.content'),

      idBinding: SC.Binding.oneWay('*model.id'),

      /**
       * Handles communication over PostMessage interface.
       *
       * Set up by creator.
       *
       * @property {iframePhone.IframePhoneRpcEndpoint}
       */
      rpcEndpoint: null,

      /**
       * Whether activity has been detected on this channel.
       * @property {boolean}
       */
      connected: false,

      handlerMap: null,

      contextCountDidChange: function () {
        DG.log('contextCountDidChange');
        // re-add observers for all data contexts
        DG.currDocumentController().contexts.forEach(function (context){
          this.removeDataContextObserver(context);
          this.addDataContextObserver(context);
        }.bind(this));

        // send notification to DI
        this.rpcEndpoint.call({
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
      /**
       Initialization method
       */
      init: function () {
        sc_super();
        var contexts = DG.currDocumentController().get('contexts');

        contexts.forEach(function (context) {
          this.addDataContextObserver(context);
        }.bind(this));

        DG.currDocumentController().addObserver('contexts.length', this, this.contextCountDidChange);

        this.handlerMap = {
          attribute: this.handleAttribute,
          attributeList: this.handleAttributeList,
          'case': this.handleCase,
          caseByIndex: this.handleCaseByIndexOrID,
          caseByID: this.handleCaseByIndexOrID,
          caseCount: this.handleCaseCount,
          collection: this.handleCollection,
          collectionList: this.handleCollectionList,
          component: this.handleComponent,
          // Remove access to component information for now, or until
          // di needs in this area become clearer.
          //componentList: this.handleComponentList,
          dataContext: this.handleDataContext,
          dataContextList: this.handleDataContextList,
          //global: this.handleGlobal,
          //globalList: this.handleGlobalList,
          interactiveFrame: this.handleInteractiveFrame,
          logMessage: this.handleLogMessage,
          selectionList: this.handleSelectionList//,
          //undoChangeNotice: this.handleUndoChangeNotice
        };


      },

      /**
       * Break loops
       */
      destroy: function () {
        var contexts = DG.currDocumentController().get('contexts');
        if (this.rpcEndpoint) {
          this.rpcEndpoint.disconnect();
        }
        contexts.forEach(function (context) {
          this.removeDataContextObserver(context);
        }.bind(this));
        DG.currDocumentController().removeObserver('contexts.length', this, this.contextCountDidChange);

        sc_super();
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
        if (!this.connected) {
          return;
        }
        var dataContextName = dataContext.name;

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
                result[k] = v;
                break;
              case 'collection':
                result[k] = v.get('id');
                break;
              default:
                DG.log('unhandled result property: ' + k );
            }
          });

          return {operation: change.operation, result: result};
        });
        if (!changes || changes.length === 0) {
          return;
        }
        this.rpcEndpoint.call({
          action: 'notify',
          resource: 'dataContextChangeNotice[' + dataContextName + ']',
          values: changes
        }, function (response) {
          DG.log('Sent dataContextChangeNotice to Data Interactive for context: '
              + dataContextName + ': ' + JSON.stringify(changes));
          DG.log('Response: ' + JSON.stringify(response));
        });
      },

      /**
       * CODAP's request of DI state (for saving)
       * @param {function} callback
       */
      requestDataInteractiveState: function (callback) {
        this.rpcEndpoint.call({
          action: 'get',
          resource: 'interactiveState'
        }, callback);
      },

      /**
       * A resource selector identifies a CODAP resource. It is either a group
       * resource or an individual resource. This routine parses a resource
       * selector into its component parts and builds an equivalent object.
       *
       *   * Base resources: [interactiveFrame, logAction]
       *   * Doc resources: [dataContext, component, global]
       *   * DataContext resources: [collection, attributes]
       *   * Collection resources: [case]
       *
       *   Some examples of resource selectors:
       *    * "dataContext[DataCard]", or
       *    * "dataContext[DataCard2].collection[Measurements].attribute"
       *
       *   These would parse to objects, respectively:
       *    * {dataContext: 'DataCard', type: 'dataContext'}
       *    * {dataContext: 'DataCard2', collection: 'Measurements', attribute: null, type: 'attribute'}
       *
       * @param iResource {string}
       * @returns {{}}
       */
      parseResourceSelector: function (iResource) {
        var selectorRE = /([A-Za-z0-9_]+)\[([#_A-Za-z0-9][^\]]*)]/;
        var result = {};
        var selectors = iResource.split('.');
        result.type = '';
        selectors.forEach(function (selector) {
          var resourceType, resourceName;
          var match = selectorRE.exec(selector);
          if (selectorRE.test(selector)) {
            resourceType = match[1];
            resourceName = match[2];
            result[resourceType] = resourceName;
            result.type = resourceType;
          } else {
            result.type = selector;
          }
        });

        return result;
      },

      /**
       *
       * @param {object} resourceSelector Return value from parseResourceSelector
       * @param {string} action           Action name: get, create, update, delete, notify
       * @returns {{interactiveFrame: DG.DataInteractivePhoneHandler}}
       */
      resolveResources: function (resourceSelector, action) {
        function resolveContext(selector, myModel) {
          var context;
          if (SC.empty(selector)) {
            return;
          }
          if (selector === '#default') {
            context = myModel.get('context');
          } else {
            context = DG.currDocumentController().getContextByName(resourceSelector.dataContext);
          }
          return context;
        }

        var result = { interactiveFrame: this};

        if (['interactiveFrame',
              'logMessage',
              'dataContextList'].indexOf(resourceSelector.type) < 0) {
          // if no data context provided, and we are not creating one, the
          // default data context is implied
          if (SC.none(resourceSelector.dataContext) && (action !== 'create' && resourceSelector.type !== 'dataContext')) {
            resourceSelector.dataContext = '#default';
            // set a flag in the result, so we can recognize this context as special.
            result.isDefaultDataContext = true;
          }
          result.dataContext = resolveContext(resourceSelector.dataContext, this.get('model'));
        }

        if (resourceSelector.component) {
          result.component = DG.currDocumentController().getComponentByName(resourceSelector.component);
        }
        if (resourceSelector.global) {
          result.global = DG.currDocumentController().getGlobalByName(resourceSelector.global);
        }
        if (resourceSelector.collection) {
          result.collection = result.dataContext &&
              result.dataContext.getCollectionByName(resourceSelector.collection);
        }
        if (resourceSelector.attribute) {
          result.attribute = result.dataContext &&
              result.dataContext.getAttributeByName(resourceSelector.attribute);
        }
        if (resourceSelector.caseByID) {
          result.caseByID = result.collection && result.collection.getCaseByID(resourceSelector.caseByID);
        }
        if (resourceSelector.caseByIndex) {
          result.caseByIndex = result.collection && result.collection.getCaseAt(Number(resourceSelector.caseByIndex));
        }
        DG.ObjectMap.forEach(resourceSelector, function (key, value) {
          // Make sure we got values for every non-terminal selector.
          if (SC.none(result[key]) && key !== 'type') {
            throw (new Error('Unable to resolve %@: %@'.loc(key, value)));
            //DG.log('Unable to resolve %@: %@'.loc(key, value));
          }
        });
        return result;
      },

      filterResultValues: function (resultValues) {
        var maxLevels = 10;
        function renameKeys (obj) {
          if (obj.guid !== null && obj.guid !== undefined) {
            obj.id = obj.guid;
          }
          return obj;
        }
        function visit(obj, level) {
          var k,v;
          if ((level < 0) ||
              (!obj) ||
              (typeof obj === 'string') ||
              (typeof obj === 'number') ||
              (typeof obj === 'boolean')) {
            return;
          }
          if (Array.isArray(obj))  {
            obj.forEach(function (o) {
              visit(o, level - 1);
            });
          } else if (typeof obj === 'object') {
            for (k in obj) {
              if (obj.hasOwnProperty(k)) {
                v = obj[k];
                visit(v, level - 1);
              }
            }
            renameKeys(obj);
          }
        }
        visit(resultValues, maxLevels);
      },
      /**
       * Respond to requests from a Data Interactive.
       *
       * Parses the request, instantiates any named resources, finds a handler
       * and invokes it.
       *
       * @param iMessage See documentation on the github wiki: TODO
       * @param iCallback
       */
      doCommand: function (iMessage, iCallback) {
        this.setIfChanged('connected', true);
        DG.log('Handle Request: ' + JSON.stringify(iMessage));
        var result = ({success: false});
        try {
          if (!SC.none(iMessage)) {
            // parse the resource name into constituent parts
            var selectorMap = iMessage.resource && this.parseResourceSelector(
                iMessage.resource);

            // resolve identified resources
            var resourceMap = this.resolveResources(selectorMap, iMessage.action);

            var action = iMessage.action;
            var type = selectorMap && selectorMap.type;

            var handler = type && this.handlerMap[type];

            if (handler) {
              if (handler[action]) {
                SC.run(function () {
                  result = handler[action].call(this, resourceMap, iMessage.values) || {success: false};
                  if (result.values) {
                    this.filterResultValues(result.values);
                  }
                }.bind(this));
              } else {
                DG.logWarn('Unsupported action: %@/%@'.loc(action,type));
              }
            } else {
              DG.logWarn("Unknown message type: " + type);
            }
          }
        } catch (ex) {
          DG.logWarn(ex);
        } finally {
          DG.log('Returning response: ' + JSON.stringify(result));
          iCallback(result);
        }
      },

      /**
       *     {{
       *      action: 'update'|'get'|'delete'
       *      what: {type: 'interactiveFrame'}
       *      values: { {title: {String}, version: {String}, dimensions: { width: {Number}, height: {Number} }}}
       *     }}
       * @return {object} Object should include status and values.
       */
      handleInteractiveFrame: {
        update: function (iResources, iValues) {
          iResources.interactiveFrame.setPath('model.title', iValues.title);
          iResources.interactiveFrame.setPath('model.version', iValues.version);
          iResources.interactiveFrame.setPath('model.dimensions', iValues.dimensions);
          if (!SC.none(iValues.preventBringToFront)) {
            iResources.interactiveFrame.setPath('controller.preventBringToFront', iValues.preventBringToFront);
          }

          return {
            success: true
          };
        },

        get: function (iResources) {

          var tReturnValues = {};
          var interactiveFrame = iResources.interactiveFrame;
          tReturnValues.title = interactiveFrame.getPath('model.title');
          tReturnValues.version = interactiveFrame.getPath('model.version');
          tReturnValues.dimensions = interactiveFrame.getPath('model.dimensions');
          tReturnValues.savedState = interactiveFrame.getPath(
              'model.componentStorage.savedGameState');
          return {
            success: true,
            values: tReturnValues
          };
        }
      },

      /**
       * handles operations on dataContext.
       *
       * Notes:
       *
       *  * At this point only one data context for each data interactive is permitted.
       *  * Updates permit modification of top-level api properties only. That is
       *    to say, not collections. Use collection API.
       *
       * @param  iMessage {object}
       *     {{
       *      action: 'create'|'update'|'get'|'delete'
       *      what: {{type: 'context'}}
       *      values: {{name: {string}, title: {string}, description: {string}, collections: [{Object}] }}
       *     }}
       *
       */
      handleDataContext: {
        create: function (iResources, iValues) {
          var context;
          var collectionSpecs;
          var status = true;
          if (iValues.collections) {
            collectionSpecs = iValues.collections;
            delete iValues.collections;
          }
          context = DG.currDocumentController().createNewDataContext(iValues);
          if (iResources.isDefaultDataContext) {
            this.setPath('model.context', context);
          }
          if (collectionSpecs) {
            collectionSpecs.forEach(function (collectionSpec) {
              var collectionClient;
              if (collectionSpec.parent) {
                collectionSpec.parent = context.getCollectionByName(collectionSpec.parent).collection;
              }
              collectionClient = context.createCollection(collectionSpec);
              status = status && !SC.none(collectionClient);
            });
          }
          return {
            success: status
          };
        },

        update: function (iResources, iValues) {
          var context = iResources.dataContext;
          if (context) {
            ['title', 'description'].forEach(function (prop) {
              if (iValues[prop]) {
                context.set(prop, iValues[prop]);
              }
            });
          }
          return {
            success: true
          };
        },

        get: function (iResources, iValues) {
          var context = iResources.dataContext;
          var values;
          if (context) {
            values = context.get('model').toArchive(true, true/*omit cases*/);
          }
          return {
            success: !SC.none(values),
            values: values
          };
        },

        'delete': function (iResources, iValues) {
          var context = iResources.dataContext;
          if (context) {
            context.destroy();
          }
          return {
            success: true
          };
        }
      },

      /**
       * handles list operations on dataContext.
       *
       * Notes:
       *
       *  * At this point only one data context for each data interactive is permitted.
       *  * Updates permit modification of top-level api properties only. That is
       *    to say, not collections. Use collection API.
       *
       * @param  iMessage {object}
       *     {{
       *      action: 'get'
       *      what: {{type: 'context'}}
       *      values: {{name: {string}, title: {string}, description: {string}, collections: [{Object}] }}
       *     }}
       *
       */
      handleDataContextList: {
        get: function (iResources, iValues) {
          var values = DG.currDocumentController().get('contexts').map(function (context) {
            return {
              name: context.get('name'),
              guid: context.get('id'),
              title: context.get('title')
            };
          });
          return {
            success: true,
            values: values
          };
        }
      },

      /**
       * handles operations on collections.
       *
       * Notes:
       *   * Parent collection must be created before the child collection.
       *   * Parent collection can have at most one child collection.
       *
       * @param  iMessage {object}
       *     {{
       *      action: 'create'|'update'|'get'|'delete'
       *      what: {{type: 'collection', context: {String}, collection: {String}}
       *      values: {{
       *        name: {string},
       *        title: {string},
       *        description: {string},
       *        parent: {string},
       *        attribute: [{Object}],
       *        labels: [{Object}] }}
       *     }}
       *
       */
      handleCollection: {
        get: function (iResources) {
          var model = iResources.collection.get('collection');
          var values = model.toArchive(true/*excludeCases*/);
          return {
            success: true,
            values: values
          };
        },
        create: function (iResources, iValues) {
          var context = iResources.dataContext;
          var change = {
            operation: 'createCollection',
            properties: iValues,
            attributes: ( iValues && iValues.attributes ),
            requester: this.get('id')
          };
          var changeResult = context.applyChange(change);
          var success = (changeResult && changeResult.success) || success;
          return {
            success: success,
          };
        },
        update: function (iResources, iValues) {
          var context = iResources.dataContext;
          var change = {
            operation: 'updateCollection',
            collection: iResources.collection,
            properties: iValues,
            requester: this.get('id')
          };
          var changeResult = context.applyChange(change);
          var success = (changeResult && changeResult.success) || success;
          return {
            success: success,
          };
        }
        //delete: function (iResources) {
        //  return {
        //    success: true,
        //  }
        //}
      },

      /**
       * handles operations on collection Lists.
       *
       * Notes:
       *   * List is in order of parentage, highest ancestor first, ultimate
       *     descendant last.
       *
       * @param  iMessage {object}
       *     {{
       *      action: 'get'
       *      what: {type: 'collection', context: {String}}
       *      }}
       * @return {object}
       *   {{
       *      success: {boolean}
       *      values: {
       *        name: {string},
       *        title: {string},
       *        guid: {number}
       *      }
       *     }}
       *
       */
      handleCollectionList: {
        get: function (iResources) {
          var context = iResources.dataContext;
          var values = context.get('collections').map(function (collection) {
            return {
              name: collection.get('name'),
              guid: collection.get('id'),
              title: collection.get('title')
            };
          });
          return {
            success: true,
            values: values
          };
        }
      },

      /**
       * handles operations on attributes.
       *
       * @param  iMessage {object}
       *     {{
       *        action: 'create'|'update'|'get'|'delete'
       *        what: {{type: 'attribute', context: {name}, collection: {string}, attribute: {string}}
       *        values: {[object]|object}
       *      }}
       *
       */
      handleAttribute: {
        get: function (iResources) {
          var attribute = iResources.attribute;
          var values;
          DG.assert(!SC.none(attribute), 'Expected attribute not found');
          values = attribute.toArchive();
          return {
            success: true,
            values: values
          };
        },
        create: function (iResources, iValues) {
          var context = iResources.dataContext;
          var change = {
            operation: 'createAttributes',
            collection: iResources.collection,
            attrPropsArray: iValues,
            requester: this.get('id')
          };
          var changeResult = context.applyChange(change);
          var success = (changeResult && changeResult.success);
          return {
            success: success
          };
        },
        update: function (iResources, iValues) {
          var context = iResources.dataContext;
          iValues.name = iResources.attribute.name;
          var change = {
            operation: 'updateAttributes',
            collection: iResources.collection,
            attrPropsArray: [iValues],
            requester: this.get('id')
          };
          var changeResult = context.applyChange(change);
          var success = (changeResult && changeResult.success);
          return {
            success: success
          };
        }
        //delete: function (iResources) {
        //  return {
        //    success: true,
        //  }
        //}
      },

      handleAttributeList: {
        get: function (iResources) {
          var collection = iResources.collection;
          var values = [];
          collection.forEachAttribute(function (attr) {
            var value = {
              id: attr.get('id'),
              name: attr.get('name'),
              title: attr.get('title')
            };
            values.push(value);
          });
          return {
            success: true,
            values: values
          };
        }
      },

      handleCase: {
        create: function (iResources, iValues) {
          function createOneCase(iCase) {
            var changeResult = context.applyChange({
              operation: 'createCases',
              collection: collection,
              properties: {
                parent: iCase.parent
              },
              values: [iCase.values],
              requester: requester
            });
            success = (changeResult && changeResult.success) && success;
            if (changeResult.caseIDs[0]) {
              caseIDs.push({id: changeResult.caseIDs[0]});
            }
          }

          var success = true;
          var context = iResources.dataContext;
          var collection = iResources.collection;
          var cases = Array.isArray(iValues)?iValues: [iValues];
          var caseIDs = [];
          var requester = this.get('id');
          cases.forEach(createOneCase);
          return {success: success, values: caseIDs};
        },
      },

      /**
       * Utility function to create a serializable representation of the case
       * for return to the data interactive
       * @param iCollection
       * @param iCase
       * @returns {{id: *, guid: *, parent: *, values: {}}}
       */
      makeSerializableCase: function (iCollection, iCase) {
        var values = {};
        iCollection.forEachAttribute(function (attr) {
          values[attr.name] = iCase.getValue(attr.id);
        });
        return  {
          id: iCase.id,
          parent: (iCase.parent && iCase.parent.id),
          values: values
        };
      },

      handleCaseByIndexOrID: {
        get: function (iResources) {
          var collection = iResources.collection;
          var myCase = iResources.caseByIndex || iResources.caseByID;
          var values;
          if (myCase) {
            values = {
              'case': this.makeSerializableCase(collection, myCase),
              caseIndex: collection.getCaseIndexByID(myCase.get('id'))
            };
            values['case'].children = myCase.children.map(function (child) {return child.id;});
          }
          return {
            success: !SC.none(values),
            values: values
          };
        },
        update: function (iResources, iValues) {
          var context = iResources.dataContext;
          var collection = iResources.collection;
          var theCase = iResources.caseByIndex || iResources.caseByID;
          var success = false;
          var changeResult;
          if (collection && theCase && iValues) {
            changeResult = context.applyChange({
              operation: 'updateCases',
              collection: collection,
              cases: [theCase],
              values: [iValues.values],
              requester: this.get('id')
            });
            success = (changeResult && changeResult.success);
          }
          return {
            success: success
          };
        }
      },

      handleCaseCount: {
        get: function (iResources) {
          var count = iResources.collection.casesController.length();
          return {
            success: true,
            values: count
          };
        }
      },

      handleSelectionList: {
        /**
         * Returns an array containing ids of selected cases. If collection is
         * provided, will filter the list to members of the collection.
         * @param iResources
         * @returns {{success: boolean, values: *}}
         */
        get: function (iResources) {
          var context = iResources.dataContext;
          var collection = iResources.collection;
          var values = context.getSelectedCases().filter(function(iCase) {
            // if we specified a collection in the get, filter by it
            return (!collection || collection === iCase.collection);
          }).map(function (iCase) {
            var collectionID = iCase.getPath('collection.id');
            var collectionName = context.getCollectionByID(collectionID).get('name');
            return {
              collectionID: collectionID,
              collectionName: collectionName,
              caseID: iCase.get('id')
            };
          });
          return {
            success: true,
            values: values
          };
        },
        /**
         * Creates a selection list in this context. The values provided will
         * replace the current selection list. Values are a array of case ids.
         * @param {object} iResources
         * @param {[number]} iValues
         * @returns {{success: boolean}}
         */
        create: function (iResources, iValues) {
          return this.doSelect(iResources, iValues, false);
        },
        /**
         * Updates a selection list in this context. The values provided will
         * amend the current selection list. Values are a array of case ids.
         * @param {object}iResources
         * @param {[number]} iValues
         * @returns {{success: boolean}}
         */
        update: function (iResources, iValues) {
          return this.doSelect(iResources, iValues, true);
        },
      },

      /**
       * Utility to initiate a select action in a data context.
       * @param {object} iResources
       * @param {[number]} iValues
       * @param {boolean} extend
       * @returns {{success: (*|boolean)}}
       */
      doSelect: function (iResources, iValues, extend) {
        var context = iResources.dataContext;
        var collection = iResources.collection;
        var cases;
        if (collection) {
          cases = iValues.map(function (caseID) {
            return collection.getCaseByID(caseID);
          });
        } else {
          cases = iValues.map(function (caseID) {
            return context.getCaseByID(caseID);
          });
        }
        var result = context.applyChange({
          operation: 'selectCases',
          collection: collection,
          cases: cases,
          select: true,
          extend: extend,
          requester: this.get('id')
        });
        return {
          success: result && result.success
        };
      },

      handleComponent: {
       create: function (iResource, iValues) {
         var doc = DG.currDocumentController();
         var type = iValues.type;
         var typeClass;
         var rtn;
         switch (type) {
           case 'graph':
               typeClass = 'DG.GraphView';
             break;
           case 'caseTable':
               typeClass = 'DG.TableView';
             break;
           case 'map':
             typeClass = 'DG.MapView';
             break;
           case 'slider':
             typeClass = 'DG.SliderView';
             break;
           case 'calculator':
             typeClass = 'DG.Calculator';
             break;
           case 'text':
             typeClass = 'DG.TextView';
             break;
           case 'webView':
             typeClass = 'SC.WebView';
             break;
           case 'guide':
             typeClass = 'DG.GuideView';
             break;
           default:
         }
         if (!SC.none(typeClass)) {
           iValues[document] = doc;
           iValues.type = typeClass;
           //rtn = doc.createComponentAndView(DG.Component.createComponent(iValues), typeClass);
           rtn = SC.RootResponder.responder.sendAction('createComponentAndView', null, this, null, iValues);
         } else {
           DG.log('Unknown component type: ' + type);
         }
         return {
           success: !SC.none(rtn)
         };
       },

       update: function (iResources, iValues) {
         var context = iResources.dataContext;
         ['title', 'description'].forEach(function (prop) {
             if (iValues[prop]) {
               context.set(prop, iValues[prop]);
             }
         });
         return {
           success: true
         };
       },

       // remove, for now, or until we understand user needs
       //get: function (iResources) {
       //  var component = iResources.component;
       //  return {
       //    success: true,
       //    values: component.get('model').toArchive()
       //  };
       //},
       //
       'delete': function (iResource) {
         var component = iResource.component;
         component.destroy();
         return {success: true};
       }
      },

      // remove, for now, or until we understand user needs
      //handleComponentList: {
      //  get: function (iResources) {
      //    var document = DG.currDocumentController();
      //
      //    var result = [];
      //    DG.ObjectMap.forEach(document.get('components'), function(id, component) {
      //      result.push( {
      //        id: component.get('id'),
      //        name: component.get('name'),
      //        title: component.get('title')
      //      });
      //    });
      //    return {
      //      success: true,
      //      values: result
      //    };
      //  }
      //},
      //
      handleLogMessage: {
        notify: function (iResources, iValues) {
          DG.logUser(iValues);
          return {
            success: true
          };
        }
      }

      //get: function (iResources) {
      //  return {
      //    success: true,
      //  }
      //},
      //create: function (iResources, iValues) {
      //  return {
      //    success: true,
      //  }
      //},
      //update: function (iResources, iValues) {
      //  return {
      //    success: true,
      //  }
      //}
      //delete: function (iResources) {
      //  return {
      //    success: true,
      //  }
      //}
    });

