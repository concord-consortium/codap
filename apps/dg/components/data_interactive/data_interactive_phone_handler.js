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
       * @type {DG.DataInteractiveModel}
       */
      model: null,

      /**
       * Handles communication over PostMessage interface.
       *
       * Set up by creator.
       *
       * @property {iframePhone.IframePhoneRpcEndpoint}
       */
      phone: null,

      /**
       * Whether activity has been detected on this channel.
       * @property {boolean}
       */
      isActive: false,

      /**
       The total number of document-dirtying changes.
       @property   {Number}
       */
      changeCount: 0,

      /**
       The number of document-dirtying changes that have been saved.
       If this is less than the total change count, then the document is dirty.
       @property   {Number}
       */
      savedChangeCount: 0,

      handlerMap: null,

      /**
       Initialization method
       */
      init: function () {
        sc_super();

        this.handlerMap = {
          attribute: this.handleAttribute,
          attributeList: this.handleAttributeList,
          'case': this.handleCase,
          caseByIndex: this.handleCaseByIndex,
          caseByID: this.handleCaseByID,
          caseCount: this.handleCaseCount,
          collection: this.handleCollection,
          collectionList: this.handleCollectionList,
          component: this.handleComponent,
          componentList: this.handleComponentList,
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
        this.setPath('model.content', null);
        sc_super();
      },

      requestDataInteractiveState: function (callback) {
        this.phone.call({action: 'get', resource: 'interactiveState'}, callback);
      },

      /**
       * A resource selector identifies a CODAP resource. It is either a group
       * resource or an individual resource. This routine parses a resource
       * selector into its component parts and builds an equivalent object.
       *
       *   * Base resources: [interactiveFrame, doc, logAction]
       *   * Doc resources: [dataContext, component, global]
       *   * DataContext resources: [collection, attributes]
       *   * Collection resources: [case]
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

      resolveResources: function (resourceSelectors) {
        function resolveContext(selector, myModel) {
          var context;
          if (SC.empty(selector)) {
            return;
          }
          if (selector === '#default') {
            context = myModel.get('context');
          } else {
            context = DG.currDocumentController().getContextByName(resourceSelectors.dataContext);
          }
          return context;
        }

        var result = { interactiveFrame: this};

        if (['interactiveFrame', 'logMessage'].indexOf(resourceSelectors.type) < 0) {
          if (SC.none(resourceSelectors.dataContext)) {
            resourceSelectors.dataContext = '#default';
            // set a flag in the result, so we can recognize this context as special.
            result.isDefaultDataContext = true;
          }
          result.dataContext = resolveContext(resourceSelectors.dataContext, this.get('model'));
        }

        if (resourceSelectors.component) {
          result.component = DG.currDocumentController().getComponentByName(resourceSelectors.component);
        }
        if (resourceSelectors.global) {
          result.global = DG.currDocumentController().getGlobalByName(resourceSelectors.global);
        }
        if (resourceSelectors.collection) {
          result.collection = result.dataContext.getCollectionByName(resourceSelectors.collection);
        }
        if (resourceSelectors.attribute) {
          result.attribute = result.dataContext.getAttributeByName(resourceSelectors.attribute);
        }
        if (resourceSelectors.caseByID) {
          result.caseByID = result.collection && result.collection.getCaseByID(resourceSelectors.caseByID);
        }
        if (resourceSelectors.caseByIndex) {
          result.caseByIndex = result.collection && result.collection.getCaseAt(Number(resourceSelectors.caseByIndex));
        }
        DG.ObjectMap.forEach(resourceSelectors, function (key, value) {
          if (SC.none(result[key]) && key !== 'type') {
            //throw (new Error('Unable to resolve %@: %@'.loc(key, value)));
            DG.log('Unable to resolve %@: %@'.loc(key, value));
          }
        });
        return result;
      },

      /**
       * Respond to requests from a Data Interactive.
       *
       * Parses the request, instanciates any named resources, finds a handler
       * and invokes it.
       *
       * @param iMessage See documentation on the github wiki: TODO
       * @param iCallback
       */
      doCommand: function (iMessage, iCallback) {
        this.set('isActive', true);
        DG.log('Handle Request: ' + JSON.stringify(iMessage));
        var result = ({success: false});
        try {
          if (!SC.none(iMessage)) {
            // parse the resource name into constituent parts
            var selectorMap = iMessage.resource && this.parseResourceSelector(
                iMessage.resource);

            // resolve identified resources
            var resourceMap = this.resolveResources(selectorMap);

            var action = iMessage.action;
            var type = selectorMap && selectorMap.type;

            var handler = type && this.handlerMap[type];

            if (handler) {
              if (handler[action]) {
                SC.run(function () {
                  result = handler[action].call(this, resourceMap, iMessage.values) || {success: false};
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
       Whether or not the document contains unsaved changes such that the user
       should be prompted to confirm when closing the document, for instance.
       @property   {Boolean}
       */
      hasUnsavedChanges: function () {
        return this.get('changeCount') > this.get('savedChangeCount');
      }.property(),

      /**
       Synchronize the saved change count with the full change count.
       This method should be called when a save occurs, for instance.
       */
      updateSavedChangeCount: function () {
        this.set('savedChangeCount', this.get('changeCount'));
      },

      /** todo: decide if we need this for this handler */
      dispatchCommand: function (iCmd, iCallback) {
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
          return {
            success: true
          };
        },

        get: function (iResources) {
          var tReturnValues = {};
          tReturnValues.title = iResources.interactiveFrame.getPath('model.title');
          tReturnValues.version = iResources.interactiveFrame.getPath('model.version');
          tReturnValues.dimensions = iResources.interactiveFrame.getPath('model.dimensions');
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
          var collections;
          var status = true;
          if (iValues.collections) {
            collections = iValues.collections;
            delete iValues.collections;
          }
          context = DG.currDocumentController().createNewDataContext(iValues);
          if (iResources.isDefaultDataContext) {
            this.setPath('model.context', context);
          }
          if (collections) {
            collections.forEach(function (collection) {
              var rslt;
              if (collection.parent) {
                collection.parent = context.getCollectionByName(collection.parent).collection;
              }
              rslt = context.createCollection(collection);
              status = status && !SC.none(rslt);
            });
          }
          return {
            success: status
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

        get: function (iResources, iValues) {
          var context = iResources.dataContext;
          var values = context.get('model').toArchive(true, true);
          return {
            success: !SC.none(values),
            values: values
          };
        },

        'delete': function (iResources, iValues) {
          var context = iResources.dataContext;
          context.destroy();
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
          var values = model.toArchive(true);
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
            attributes: ( iValues && iValues.attributes )
          };
          var changeResult = context.applyChange(change);
          var success = (changeResult && changeResult.success) || success;
          return {
            success: true,
          };
        },
        update: function (iResources, iValues) {
          var context = iResources.dataContext;
          var change = {
            operation: 'updateCollection',
            collection: iResources.collection,
            properties: iValues
          };
          var changeResult = context.applyChange(change);
          var success = (changeResult && changeResult.success) || success;
          return {
            success: true,
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
          var values = attribute.toArchive();
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
            attrPropsArray: iValues
          };
          var changeResult = context.applyChange(change);
          var success = (changeResult && changeResult.success);
          return {
            success: success,
          };
        },
        update: function (iResources, iValues) {
          var context = iResources.dataContext;
          iValues.name = iResources.attribute.name;
          var change = {
            operation: 'updateAttributes',
            collection: iResources.collection,
            attrPropsArray: [iValues]
          };
          var changeResult = context.applyChange(change);
          var success = (changeResult && changeResult.success);
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
              values: [iCase.values]
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
          cases.forEach(createOneCase);
          return {success: success, values: caseIDs};
        },
      },

      handleCaseByIndex: {
        get: function (iResources) {
          var collection = iResources.collection;
          var myCase = iResources.caseByIndex;
          var values = {
            'case': myCase.toArchive(),
            caseIndex: collection.getCaseIndexByID(myCase.get('id'))
          };
          values.case.children = myCase.children.map(function (child) {return child.id;});
          return {
            success: true,
            values: values
          };
        },
        update: function (iResources, iValues) {
          var context = iResources.dataContext;
          var collection = iResources.collection;
          var theCase = iResources.caseByIndex;
          var ret = {success: false};
          if (collection && theCase && iValues) {
            ret = context.applyChange({
              operation: 'updateCases',
              collection: collection,
              cases: [theCase],
              values: [iValues.values]
            });
            if (SC.none(ret)) {
              DG.logWarn('UpdateCase failed to return a value');
              ret = {success: true};
            }
          }
          return ret;
        }
      },

      handleCaseByID: {

        get: function (iResources) {
          var collection = iResources.collection;
          var myCase = iResources.caseByID;
          var values = {
            'case': myCase.toArchive(),
            caseIndex: collection.getCaseIndexByID(myCase.get('id'))
          };
          values.case.children = myCase.children.map(function (child) {return child.id;});
          return {
            success: true,
            values: values
          };
        },
        update: function (iResources, iValues) {
          var context = iResources.dataContext;
          var collection = iResources.collection;
          var theCase = iResources.caseByID;
          var ret = {success: false};
          if (collection && theCase && iValues) {
            ret = context.applyChange({
              operation: 'updateCases',
              collection: collection,
              cases: [theCase],
              values: [iValues.values]
            });
            if (SC.none(ret)) {
              DG.logWarn('UpdateCase failed to return a value');
              ret = {success: true};
            }
        }
          return ret;
        }

      },

      handleCaseCount: {
        get: function (iResources) {
          var values = iResources.collection.casesController.length();
          return {
            success: true,
            values: values
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
          var values = context.getSelectedCases().map(function(iCase) {
            if (collection && collection !== iCase.collection) {
              return;
            } else {
              return iCase.get('id');
            }
          });
          return {
            success: true,
            values: values
          };
        },
        /**
         * Creates a selection list in this context. This collection will
         * replace the current selection list. If collection is provided, this
         * will be passed. Values are a array of case ids.
         * @param iResources
         * @param iValues
         * @returns {{success: boolean}}
         */
        create: function (iResources, iValues) {
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
            extend: false
          });
          return {
            success: result && result.success
          };
        },
        update: function (iResources, iValues) {
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
            extend: true
          });
          return {
            success: result && result.success
          };
        }

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

       get: function (iResources) {
         var component = iResources.component;
         return {
           success: true,
           values: component.get('model').toArchive()
         };
       },

       'delete': function (iResource) {
         var component = iResource.component;
         component.destroy();
         return {success: true};
       }
      },

      handleComponentList: {
        get: function (iResources) {
          var document = DG.currDocumentController();

          var result = [];
          DG.ObjectMap.forEach(document.get('components'), function(id, component) {
            result.push( {
              id: component.get('id'),
              name: component.get('name'),
              title: component.get('title')
            });
          });
          return {
            success: true,
            values: result
          };
        }
      },

      handleLogMessage: {
        create: function (iResources, iValues) {
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

