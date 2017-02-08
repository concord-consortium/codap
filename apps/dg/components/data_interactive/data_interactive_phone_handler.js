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
       * We need to be able to set title.
       */
      view: function() {
        return this.getPath('controller.view');
      }.property(),

      idBinding: SC.Binding.oneWay('*controller.model.id'),

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

      /**
       * Initiates a message to the Data Interactive Plugin from codap with
       * optional callback
       *
       * @param message {Object}
       * @param callback {Function} (optional)
       */
      sendMessage: function (message, callback) {
        this.rpcEndpoint.call(message, callback);
      },

      handlerMap: null,

      /**
       Initialization method
       */
      init: function () {

        this.handlerMap = {
          attribute: this.handleAttribute,
          attributeList: this.handleAttributeList,
          'case': this.handleCase,
          allCases: this.handleAllCases,
          caseByIndex: this.handleCaseByIndexOrID,
          caseByID: this.handleCaseByIndexOrID,
          caseCount: this.handleCaseCount,
          caseSearch: this.handleCaseSearch,
          collection: this.handleCollection,
          collectionList: this.handleCollectionList,
          component: this.handleComponent,
          componentList: this.handleComponentList,
          dataContext: this.handleDataContext,
          dataContextList: this.handleDataContextList,
          //global: this.handleGlobal,
          //globalList: this.handleGlobalList,
          item: this.handleItems,
          interactiveFrame: this.handleInteractiveFrame,
          logMessage: this.handleLogMessage,
          selectionList: this.handleSelectionList,
          undoChangeNotice: this.handleUndoChangeNotice
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


      /**
       * CODAP's request of DI state (for saving)
       * @param {function} callback
       */
      requestDataInteractiveState: function (callback) {
        this.sendMessage({
          action: 'get',
          resource: 'interactiveState'
        }, callback);
      },

      /**
       * A resource selector identifies a CODAP resource. It is either a group
       * resource or an individual resource. This routine parses a resource
       * selector into its component parts and builds an equivalent object.
       *
       *   * Base resources: [interactiveFrame, logMessage]
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
        function resolveContext(selector, myContext) {
          var document = DG.currDocumentController();
          var context;
          if (SC.empty(selector)) {
            return;
          }
          if (selector === '#default') {
            context = myContext;
          } else {
            context = document.getContextByName(resourceSelector.dataContext) ||
                (!isNaN(resourceSelector.dataContext) &&
                    document.getContextByID(resourceSelector.dataContext));
          }
          return context;
        }

        var result = { interactiveFrame: this.get('controller')};

        if (['interactiveFrame',
              'logMessage',
              'dataContextList',
              'undoChangeNotice',
              'undoableActionPerformed',
              'component',
              'componentList'].indexOf(resourceSelector.type) < 0) {
          // if no data context provided, and we are not creating one, the
          // default data context is implied
          if (SC.none(resourceSelector.dataContext) ) {
            if (action !== 'create' || resourceSelector.type !== 'dataContext') {
              resourceSelector.dataContext = '#default';
            }
            // set a flag in the result, so we can recognize this context as special.
            result.isDefaultDataContext = true;
          }
          result.dataContext = resolveContext(resourceSelector.dataContext, this.getPath('controller.context'));
        }

        if (resourceSelector.component) {
          result.component = DG.currDocumentController().getComponentByName(resourceSelector.component) ||
              (!isNaN(resourceSelector.component) &&
                  DG.currDocumentController().getComponentByID(resourceSelector.component));
        }
        if (resourceSelector.global) {
          result.global = DG.currDocumentController().getGlobalByName(resourceSelector.global);
        }
        if (resourceSelector.collection) {
          result.collection = result.dataContext &&
              (result.dataContext.getCollectionByName(resourceSelector.collection) ||
              (!isNaN(resourceSelector.collection) &&
                  result.dataContext.getCollectionByID(resourceSelector.collection)));
        }
        if (resourceSelector.attribute) {
          result.attribute = (result.dataContext &&
              (result.dataContext.getAttributeByName(resourceSelector.attribute) ||
                  result.dataContext.getAttributeByName(DG.Attribute.legalizeAttributeName(resourceSelector.attribute)))) ||
              (!isNaN(resourceSelector.attribute) && result.collection && result.collection.getAttributeByID(resourceSelector.attribute));
        }
        if (resourceSelector.caseByID) {
          result.caseByID = result.dataContext.getCaseByID(resourceSelector.caseByID);
        }
        if (resourceSelector.caseByIndex) {
          result.caseByIndex = result.collection && result.collection.getCaseAt(Number(resourceSelector.caseByIndex));
        }
        if (resourceSelector.caseSearch) {
          result.caseSearch = result.collection && result.collection.searchCases(resourceSelector.caseSearch);
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
      handleOneCommand: function (iCmd) {
        var result = {success: false};

        try {
          // parse the resource name into constituent parts
          var selectorMap = iCmd.resource && this.parseResourceSelector(
                  iCmd.resource);

          // resolve identified resources
          var resourceMap = this.resolveResources(selectorMap, iCmd.action);

          var action = iCmd.action;
          var type = selectorMap && selectorMap.type;

          var handler = type && this.handlerMap[type];

          if (handler) {
            if (handler[action]) {
              SC.run(function () {
                result = handler[action].call(this, resourceMap, iCmd.values) || {success: false};
                if (result.values) {
                  this.filterResultValues(result.values);
                }
              }.bind(this));
            } else {
              result.values={error: 'Unsupported action: %@/%@'.loc(action,type)};

            }
          } else {
            DG.logWarn("Unknown message type: " + type);
            result.values={error: "Unknown message type: " + type};
          }
        } catch (ex) {
          DG.logWarn(ex);
          result.values={error: ex.toString()};
        }
        return result;
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
        var result = {success: false};
        if (!SC.none(iMessage)) {
          if (Array.isArray(iMessage)) {
            result = iMessage.map(function (cmd) {
              return this.handleOneCommand(cmd);
            }.bind(this));
          } else {
            result = this.handleOneCommand(iMessage);
          }
        }
        DG.log('Returning response: ' + JSON.stringify(result));
        iCallback(result);
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
          var diModel = iResources.interactiveFrame.getPath('model.content');
          var title = iValues.title || iValues.name || '';
          DG.assert(diModel, 'DataInteractiveModel  exists' );
          DG.assert(diModel.constructor === DG.DataInteractiveModel, 'model content is DataInteractiveModel');
          if (iValues) {
            diModel.set('title', iValues.title);
            this.setPath('view.title', title);

            diModel.set('version', iValues.version);
            diModel.set('dimensions', iValues.dimensions);
            if (!SC.none(iValues.preventBringToFront)) {
              // Todo 7/2016: we should be managing this value in the model only,
              // and deriving the value in the controller.
              this.controller.set('preventBringToFront', iValues.preventBringToFront);
              diModel.set('preventBringToFront', iValues.preventBringToFront);
            }
            if (!SC.none(iValues.preventDataContextReorg)) {
              // Todo 7/2016: we should be managing this value in the model only,
              // and deriving the value in the controller.
              this.controller.set('preventDataContextReorg', iValues.preventDataContextReorg);
              diModel.set('preventDataContextReorg', iValues.preventDataContextReorg);
            }
          }

          return {
            success: true
          };
        },

        get: function (iResources) {
          var diModel = iResources.interactiveFrame.getPath('model.content');
          var componentStorage = iResources.interactiveFrame.getPath('model.componentStorage');
          DG.assert(diModel, 'DataInteractiveModel  exists' );
          DG.assert(diModel.constructor === DG.DataInteractiveModel, 'model content is DataInteractiveModel');

          var tReturnValues = {};
          tReturnValues.title = diModel.get('title');
          tReturnValues.version = diModel.get('version');
          tReturnValues.dimensions = diModel.get('dimensions');
          tReturnValues.preventBringToFront = diModel.get('preventBringToFront');
          tReturnValues.preventDataContextReorg = diModel.get('preventDataContextReorg');
          // if embedded mode, set externalUndoAvailable, if standalone mode,
          // set standaloneUndoModeAvailable.
          tReturnValues.externalUndoAvailable = !DG.STANDALONE_MODE;
          tReturnValues.standaloneUndoModeAvailable = !!DG.STANDALONE_MODE;
          if (componentStorage) {
            DG.log('Sending data interactive, %@, state: %@'.loc(
                tReturnValues.title, JSON.stringify(componentStorage.savedGameState)));
            tReturnValues.savedState = componentStorage.savedGameState;
          }
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
            this.setPath('controller.context', context);
          }
          if (collectionSpecs) {
            collectionSpecs.forEach(function (collectionSpec) {
              var collectionClient;
              var parentCollectionClient;
              var hasParent = false;
              var error = false;
              if (collectionSpec.parent) {
                parentCollectionClient = context.getCollectionByName(
                    collectionSpec.parent);
                hasParent = true;
              }
              if (hasParent) {
                if (parentCollectionClient) {
                  collectionSpec.parent = parentCollectionClient.collection;
                } else {
                  DG.log( 'Attempt to create collection "%@": Unknown parent: "%@"'
                          .loc(collectionSpec.name, collectionSpec.parent));
                  error = true;
                }
              }
              if (!error) {
                collectionClient = context.createCollection(collectionSpec);
              }
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
          var documentController = DG.currDocumentController();
          if (context) {
            documentController.destroyDataContext(context.get('id'));
            return {
              success: true
            };
          } else {
            return {
              success: false,
              values: {
                error: 'Could not find dataContext'
              }
            };
          }
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
          // returns a parent key for the appropriate parent, if any.
          function mapParent (context, parentName) {
            var parentKey;
            var collections;
            var collection;

            if (!SC.none(parentName)) {
              collection = context.getCollectionByName(parentName);
              parentKey = collection? collection.get('id'): parentName;
            } else {
              collections = context.get('collections');
              if (collections && collections.length > 0) {
                parentKey = collections[collections.length - 1].get('id');
              }
            }
            return parentKey;
          }

          // returns a success indicator and ids.
          function createOneCollection(iContext, iCollectionSpec, iRequester) {
            var change = {
              operation: 'createCollection',
              properties: iCollectionSpec,
              attributes: ( iCollectionSpec && iCollectionSpec.attributes ),
              requester: iRequester.get('id')
            };
            iCollectionSpec.parent = mapParent(iContext, iCollectionSpec.parent);
            var changeResult = iContext.applyChange(change);
            var success = (changeResult && changeResult.success);
            var ids = changeResult.collection && {
                  id: changeResult.collection.get('id'),
                  name: changeResult.collection.get('name')
                };
            return {
              success: success,
              values: ids
            };
          }

          var context = iResources.dataContext;
          var success = true;
          var collectionIdentifiers = [];

          if (!Array.isArray(iValues)) {
            iValues = [iValues];
          }

          iValues.every(function (iCollectionSpec) {
            var rslt = createOneCollection(context, iCollectionSpec, this);
            success = success && rslt.success;
            if (success) {
            collectionIdentifiers.push(rslt.values);
            }
            return success;
          }.bind(this));

          return {success: success, values: collectionIdentifiers};
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
        },
        'delete': function (iResources) {
          var context = iResources.dataContext;
          var change = {
            operation: 'deleteAttributes',
            collection: iResources.collection,
            attrs: [iResources.attribute],
            requester: this.get('id')
          };
          var changeResult = context.applyChange(change);
          var success = (changeResult && changeResult.success);
          return {
            success: success,
          };
        }
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
            var request = {
              operation: 'createCases',
              collection: collection,
              properties: {
                parent: iCase.parent
              },
              values: [iCase.values],
              requester: requester
            },
            changeResult = context.applyChange(request);
            success = (changeResult && changeResult.success) && success;
            request.cases = success ? [collection.getCaseByID(changeResult.caseID)] : [];
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
        }
      },

      handleAllCases: {
        'delete': function (iResources) {
          var context = iResources.dataContext;
          var success = false;
          var changeResult, cases;
          if (context) {
            cases = context.get('allCases');
            changeResult = context.applyChange({
              operation: 'deleteCases',
              cases: cases,
              values: [],
              requester: this.get('id')
            });
            success = (changeResult && changeResult.success);
          }
          return {
            success: success
          };
        }
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
          collection: {
            name: iCollection.get('name'),
            id: iCollection.get('id')
          },
          values: values
        };
      },

      handleCaseByIndexOrID: {
        get: function (iResources) {
          function getCollectionClientFromCase(myCase, dataContext) {
            var collection = myCase.get('collection');
            var id = collection.get('id');
            return dataContext.getCollectionByID(id);
          }
          var dataContext = iResources.dataContext;
          var myCase = iResources.caseByIndex || iResources.caseByID;
          var collection = iResources.collection || getCollectionClientFromCase(myCase, dataContext);
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
        },
        'delete': function (iResources) {
          var context = iResources.dataContext;
          var collection = iResources.collection;
          var theCase = iResources.caseByIndex || iResources.caseByID;
          var success = false;
          var changeResult;
          if (collection && theCase) {
            changeResult = context.applyChange({
              operation: 'deleteCases',
              collection: collection,
              cases: [theCase],
              values: [],
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

      handleItems: {
        create: function (iResources, iValues) {
          var success = false;
          var context = iResources.dataContext;
          var caseIDs;
          if (context) {
            caseIDs = context.addItems(iValues);
            if (caseIDs) {
              success = true;
            }
          }
          return {success: success, values: caseIDs};
        }
      },

      handleCaseSearch: {
        get: function (iResources) {
          var success = iResources.caseSearch !== null,
              cases = [];

          if (success) {
            cases = iResources.caseSearch.map(function (iCase) {
              return this.makeSerializableCase(iResources.collection, iCase);
            }.bind(this));
          }
          return {
            success: success,
            values: cases
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

      handleComponent: (function () {
        // map CODAP Component types to DI-API component types
        var kTypeMap = {
          'DG.Calculator': 'calculator',
          'DG.TableView': 'caseTable',
          'DG.GameView': 'game',
          'DG.GraphView': 'graph',
          'DG.GuideView': 'guideView',
          'DG.MapView': 'map',
          'DG.SliderView': 'slider',
          'DG.TextView': 'text',
          'DG.WebView': 'webView'
        };

        // map DI-API component types to CODAP Component types
        var kResourceMap = {
          'calculator': 'DG.Calculator',
          'caseTable': 'DG.TableView',
          'game': 'DG.GameView',
          'graph': 'DG.GraphView',
          'guideView': 'DG.GuideView',
          'map': 'DG.MapView',
          'slider': 'DG.SliderView',
          'text': 'DG.TextView',
          'webView': 'DG.WebView'
        };

        var directMapping = function (key, value) {
          return {key: key, value: value};
        };

        var kComponentTypeDefaults = {
          slider: {
            dimensions: { width: 300, height: 98 }
          },
          caseTable: {
            dimensions: {width: 500, height: 200}
          }
        };

        // correspondence of DI-API properties to ComponentStorage properties.
        //
        // Direct means a one-to-one mapping.
        var kComponentStorageProperties = {
          calculator: {
            name: directMapping,
            title: directMapping
          },
          caseTable: {
            name: directMapping,
            title: directMapping,
          },
          game: {
            currentGameName: function (key, value) {
              return {key: 'name', value: value};
            },
            currentGameUrl: function (key, value) {
              return {key: 'URL', value: value};
            },
            name: function (key, value) {
              return {key: 'currentGameName', value: value};
            },
            title: directMapping,
            URL: function (key, value) {
              return {key: 'currentGameUrl', value: value};
            }
          },
          graph: {
            name: directMapping,
            title: directMapping,
            dataContext: function (key, value) {
              var v = (typeof value === 'string')?
                  DG.currDocumentController().getContextByName(value):
                  value.get('name');
              return {
                key: key,
                value: v
              };
            },
            xAttributeName: directMapping,
            yAttributeName: directMapping,
            y2AttributeName: directMapping,
            legendAttributeName: directMapping
          },
          guideView: {
            name: directMapping,
            title: directMapping,
          },
          map: {
            name: directMapping,
            title: directMapping,
            // todo: need more information than key/value to resolve
            // todo: can the component constructor resolve?
            legendAttributeName: directMapping,
            // todo: is this necessary? Will the map constructor be attentive to this?
            dataContextName: function (key, value) {
              return {key: 'context', value: DG.currDocumentController().getContextByName(value)};
            },
            context: function (key, value) {
              return {key: 'dataContextName', value: value.get('name')};
            }
          },
          slider: {
            animationDirection: directMapping,
            animationMode: directMapping,
            // todo: does slider construct global or is it expected to exist before?
            globalValueName: 'mapped',
            lowerBound: directMapping,
            name: directMapping,
            title: directMapping,
            upperBound: directMapping,
            value: directMapping
          },
          text: {
            name: directMapping,
            text: directMapping,
            title: directMapping
          },
          webView: {
            name: directMapping,
            title: directMapping,
            URL: directMapping,
          }
        };

        function remapProperties(from, to, componentType) {
          var mapping = kComponentStorageProperties[componentType];
          if (!mapping) {
            return;
          }
          Object.keys(from).forEach(function (key) {
            var mappingType = mapping[key];
            var m;
            if (typeof mappingType === 'function') {
              m = mappingType(key, from[key]);
              to[m.key] = m.value;
            }
          });
        }

        function mapTableLinkPropertiesFromDI(iIn, iOut) {
          var document = DG.currDocumentController();
          var context = iIn.dataContext && document.getContextByName(iIn.dataContext);
          if (context) {
            DG.ArchiveUtils.addLink(iOut, 'context', context);
          }
        }

        return {
          create: function (iResource, iValues) {
            var doc = DG.currDocumentController();
            var type = iValues.type;
            var typeClass = type && kResourceMap[type];
            // apply defaults
            var tValues = Object.assign({}, kComponentTypeDefaults[type] || {}, iValues);
            // We are going to construct props. Props is structured like a
            // a component definition in a document
            var props = {
              componentStorage: {}
            };
            var rtn, errorMessage;

            // If we have a valid type ...
            if (!SC.none(typeClass)) {
              props.document = doc;
              props.type = typeClass;
              // the allowMoreThanOne=false restriction is historical. It prevented
              // proliferation of components when a document was repeatedly opened
              // we default to allowing any number. It is a DI's responsibility
              // to avoid proliferation.
              props.allowMoreThanOne = true;

              // construct the layout object
              props.layout = {};
              if (tValues.dimensions) {
                props.layout = Object.assign(props.layout, tValues.dimensions);
              }
              if (tValues.position) {
                if (typeof tValues.position === 'string') {
                  props.position = tValues.position;
                } else if (typeof tValues.position === 'object') {
                  props.layout = Object.assign(props.layout, tValues.position);
                }
              }

              // copy those properties that can be handled by simple remap
              remapProperties(tValues, props.componentStorage, type);

              if (tValues.type === 'caseTable') {
                mapTableLinkPropertiesFromDI(tValues, props.componentStorage);
              }
              rtn = DG.currDocumentController().createComponentAndView(DG.Component.createComponent(props));
              errorMessage = !rtn && 'Component creation failed';
            } else {
              errorMessage = 'Unknown component type: ' + type;
            }
            if (rtn) {
              return {
                success: true,
                values: {
                  id: rtn.getPath('model.id'),
                  name: rtn.getPath('model.name'),
                  title: rtn.get('title'),
                  type: type
                }
              };
            } else {
              return {
                success: false,
                values: {
                  error: errorMessage || 'Unknown error'
                }
              };
            }
          },

          update: function (iResources, iValues) {
            var component = iResources.component;
            ['title'].forEach(function (prop) {
              if (iValues[prop]) {
                component.set(prop, iValues[prop]);
              }
            });
            return {
              success: true
            };
          },

          get: function (iResources) {
            function remapArchiveComponent(archive) {
              function extractDataContextName(componentStorage) {
                var dataContextID = DG.ArchiveUtils.getLinkID(componentStorage, 'context');
                var dataContext = DG.store.find(dataContextID);
                return dataContext && dataContext.get('name');
              }
              var rtn = {};
              // DG.log('Get Component: ' + JSON.stringify(archive));
              var componentStorage = archive.componentStorage;
              var layout = archive.layout;


              rtn.type = kTypeMap[archive.type];
              if (layout) {
                if (layout.height || layout.width) {
                  rtn.dimensions = {
                    height: layout.height || 0,
                    width: layout.width || 0
                  };
                }
                if ((layout.left !== undefined && layout.left !== null) ||
                    (layout.x !== undefined && (layout.x != null))) {
                  rtn.position = {
                    left: layout.left || layout.x || 0,
                    top: layout.top || layout.y || 0
                  };
                }
              }
              if (componentStorage) {
                remapProperties(componentStorage, rtn, rtn.type);
              }
              switch (rtn.type) {
                case 'caseTable':
                  rtn.dataContext = extractDataContextName(componentStorage);
                  break;
                case 'graph':
                  rtn.dataContext = extractDataContextName(componentStorage);
                  break;
                case 'map':
                  break;
                default:
              }
              return rtn;
            }
            var component = iResources.component;
            var document = DG.currDocumentController();
            var componentController = document.componentControllersMap[component.get('id')];
            componentController.willSaveComponent();
            var archive = component.toArchive();
            var serialized = archive && remapArchiveComponent(archive);
            if (serialized) {
              return {
                success: true,
                values: serialized
              };
            } else {
              return {
                success: false,
                values: {
                  error: 'Could not serialize component.'
                }
              };
            }
          },

          'delete': function (iResource) {
            var component = iResource.component;
            component.destroy();
            return {success: true};
          },
          'toDIType': function (iCODAPType) {
            return kTypeMap[iCODAPType];
          }
        };
      })(),

      handleComponentList: {
        get: function (iResources) {
          var document = DG.currDocumentController();

          var result = [];
          DG.ObjectMap.forEach(document.get('components'), function(id, component) {
            result.push( {
              id: component.get('id'),
              name: component.get('name'),
              title: component.get('title'),
              type: this.handleComponent.toDIType(component.get('type'))
            });
          }.bind(this));
          return {
            success: true,
            values: result
          };
        }
      },

      handleLogMessage: {
        notify: function (iResources, iValues) {
          DG.logUser(iValues);
          return {
            success: true
          };
        }
      },

      handleUndoChangeNotice: {
        /**
         * The DataInteractive performed an undoable action
         *
         * We don't perform any action, because the external game has already performed the
         * action. We simply store this new command in the stack, and the undo/redo of this
         * command call undo/redo on the game.
         */
        notify: function (iResources, iValues) {
          function handleUndoRedoCompleted (ret) {
            if (ret && ret.success === false) {
              // The Data Interactive was not able to successfully undo or redo an action
              DG.UndoHistory.showErrorAlert(true, {message: "Data Interactive error"});
            }
          }

          function registerUndoChangeNotice(logMessage, rpcEndpoint) {
            DG.UndoHistory.execute(DG.Command.create({
              name: 'interactive.undoableAction',
              undoString: 'DG.Undo.interactiveUndoableAction',
              redoString: 'DG.Redo.interactiveUndoableAction',
              log: 'Interactive action occurred: ' + logMessage,
              execute: function () {
              },
              undo: function () {
                // FIXME If the game component was removed and then re-added via an undo,
                // then calling undo or redo here will likely fail because the game's undo stack would
                // probably have been cleared.
                var message = {action: 'notify', resource: 'undoChangeNotice', values: {operation: "undoAction"}};
                this.sendMessage(message, handleUndoRedoCompleted);
              },
              redo: function () {
                var message = {action: 'notify', resource: 'undoChangeNotice', values: {operation: "redoAction"}};
                this.sendMessage(message, handleUndoRedoCompleted);
              }
            }));
            return true;
          }

          var logMessage = iValues && iValues.logMessage ? iValues.logMessage : "Unknown action";
          var success = true;

          switch (iValues.operation){
            case 'undoableActionPerformed':
              success = registerUndoChangeNotice(logMessage, this.get('rpcEndpoint'));
              break;
            case 'undoButtonPress':
              DG.UndoHistory.undo();
              break;

            case 'redoButtonPress':
              DG.UndoHistory.redo();
              break;
          }
          return {success: success};
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

