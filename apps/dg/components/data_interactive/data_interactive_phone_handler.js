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
 * The DataInteractivePhoneHandler todo: write this
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
          interactiveFrame: this.handleInteractiveFrame.bind(this),
          dataContext: this.handleDataContext.bind(this),
          dataContextList: this.handleDataContextList.bind(this),
          collection: this.handleCollection.bind(this),
          collectionList: this.handleCollectionList.bind(this),
          attributes: this.handleAttributes.bind(this),
          cases: this.handleCases.bind(this),
          caseByIndex: this.handleCaseByIndex.bind(this),
          caseByID: this.handleCaseByID.bind(this),
          caseCount: this.handleCaseCount.bind(this)//,
//          component: this.handleComponent.bind(this)
        };
      },

      /**
       * Break loops
       */
      destroy: function () {
        this.setPath('model.content', null);
        sc_super();
      },

      /**
       * A resource selector identifies a CODAP resource. It is either a group
       * resource or an individual resource. This routine parses a resource
       * selector into its component parts and builds an equivalent object.
       *
       *   * Base resources: [interactiveFrame, doc, logAction]
       *   * Doc resources: [dataContext, component]
       *   * DataContext resources: [collection]
       *   * Collection resources: [attribute, case]
       *   * Attribute resources: [colormap]
       *
       * @param iResource {string}
       * @returns {{}}
       */
      parseResourceSelector: function (iResource) {
        var selectorRE = /([A-Za-z0-9_]+)\[([A-Za-z0-9_]+)\]/;
        var result = {};
        var selectors = iResource.split('.');
        var baseSelector = selectors.shift();
        result.type = baseSelector;
        if (baseSelector === 'doc') {
          selectors.forEach(function (selector) {
            var rtype, rname;
            var match = selectorRE.exec(selector);
            if (selectorRE.test(selector)) {
              rtype = match[1];
              rname = match[2];
              result[rtype] = rname;
              result.type = rtype;
            } else {
              result.type = selector;
            }
          });
        }

        return result;
      },
      doCommand: function (iMessage, iCallback) {
        DG.log('gotIt: ' + JSON.stringify(iMessage));
        var result = ({success: false});
        try {
          if (!SC.none(iMessage)) {
            var selector = iMessage.resource && this.parseResourceSelector(
                iMessage.resource);
            var type = selector && selector.type;

            iMessage.what = selector;
            if (type && this.handlerMap[type]) {
              SC.run(function () {
                result = this.handlerMap[type](iMessage,
                        iCallback) || {success: false};
              }.bind(this));
            } else {
              DG.logWarn("Unknown message type: " + type);
            }
          }
        } catch (ex) {
          DG.logWarn(ex);
        } finally {
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
       *
       * @param  iMessage {object}
       *     {{
       *      action: 'update'|'get'|'delete'
       *      what: {type: 'interactiveFrame'}
       *      values: { {title: {String}, version: {String}, dimensions: { width: {Number}, height: {Number} }}}
       *     }}
       * @return {object} Object should include status and values.
       */
      handleInteractiveFrame: function (iMessage) {
        var tValues = iMessage.values,
            tSuccess = true,
            tReturnValues;

        var update = function () {
              this.setPath('model.title', tValues.title);
              this.setPath('model.version', tValues.version);
              this.setPath('model.dimensions', tValues.dimensions);
            }.bind(this),

            get = function () {
              tReturnValues = {};
              tReturnValues.title = this.getPath('model.title');
              tReturnValues.version = this.getPath('model.version');
              tReturnValues.dimensions = this.getPath('model.dimensions');
            }.bind(this);

        switch (iMessage.action) {
          case 'update':
            update();
            break;
          case 'get':
            get();
            break;
          default:
            console.log('unrecognized action in handleInteractiveFrame: ' + iMessage.action);
            tSuccess = false;
        }
        return {
          success: tSuccess,
          values: tReturnValues
        };
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
      handleDataContext: function (iMessage) {
        var success = false;
        var values;
        var model = this.get('model');
        var context;

        function getContext(name) {
          if (name) {
            return DG.currDocumentController().getContextByName(name);
          }
        }
        function handleCreate(iMessage, iModel) {
          context = getContext(iMessage.values.name);
          if (context) {
            DG.logWarn('Operation not permitted: Named context exists: ' + iMessage.values.name);
            success = false;
          } else {
            context = DG.currDocumentController().createNewDataContext(iMessage.values);
            if (SC.none(iModel.get('context'))) {
              iModel.set('iModel', context);
            }
            success = (!SC.none(context));
          }
        }

        function handleUpdate(iMessage, iModel) {
          context = getContext(iMessage.what.dataContext) || iModel.get('context');
          if (!context) {
            DG.logWarn('Update of non-existent object.');
            success = false;
          } else {
            ['title', 'description'].forEach(function (prop) {
              if (iMessage.values[prop]) {
                context.set(prop, iMessage.values[prop]);
              }
            });
            success = true;
          }
        }

        function handleGet(iMessage, iModel) {
          // if a specific context specified
          if (iMessage.what.dataContext) {
            context = getContext(iMessage.what.dataContext);
            values = context && context.get('model').toArchive(true, true);
            success = !SC.none(values);
          }
        }

        function handleDelete(iMessage, iModel) {
          context = getContext(iMessage.what.dataContext) || iModel.get('context');
          context.destroy();
          iModel.set('context', null);
        }

        if (iMessage.action === 'create') {
          handleCreate(iMessage, model);
        } else if (iMessage.action === 'update') {
          handleUpdate(iMessage, model);
        } else if (iMessage.action === 'get') {
          handleGet(iMessage, model);
        } else if (iMessage.action === 'delete') {
          handleDelete(iMessage, model);
        } else {
          DG.log('Unsupported action: ' + iMessage.action);
        }
        return {
          success: success,
          values: values
        };
      },

      createDefaultContext: function () {
        this.handleDataContext({
          action: 'create',
          what: {type: 'context'},
          values: {
            name: 'default',
            title: 'default',
          }
        });
      },

      _resolveContext: function (iMessage, model) {
        var context;
        if (!SC.none(iMessage.what.dataContext)) {
          context = DG.currDocumentController().getContextByName(iMessage.what.dataContext);
        }
        if (SC.none(context)) {
          context = model.get('context');
        }
        if (SC.none(context)) {
          this.createDefaultContext();
          context = model.get('context');
        }
        return context;
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
      handleDataContextList: function (iMessage) {
        var success = false;
        var values;

        function handleGet(iMessage) {
          values = DG.currDocumentController().get('contexts').map(function (context) {
            return {
              name: context.get('name'),
              guid: context.get('id'),
              title: context.get('title')
            };
          });
          success = true;
        }

        if (iMessage.action === 'get') {
          handleGet(iMessage);
        } else {
          DG.log('Unsupported action: ' + iMessage.action);
        }

        return {
          success: success,
          values: values
        };
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
       *        attributes: [{Object}],
       *        labels: [{Object}] }}
       *     }}
       *
       */
      handleCollection: function (iMessage) {

        function handleCreate(iMessage) {
          var change = {
            operation: 'createCollection',
            properties: iMessage.values,
            attributes: ( iMessage.values && iMessage.values.attributes )
          };
          var changeResult = context.applyChange(change);
          success = (changeResult && changeResult.success) || success;
        }

        function handleUpdate(iMessage) {
          var change = {
            operation: 'updateCollection',
            collection: context.getCollectionByName(iMessage.what.collection),
            properties: iMessage.values
          };
          var changeResult = context.applyChange(change);
          success = (changeResult && changeResult.success) || success;
        }
        
        function handleGet(iMessage) {
          var collection;
          var model;
          if (iMessage.what.collection) {
            collection = context.getCollectionByName(iMessage.what.collection);
            if (collection) {
              model = collection.get('collection');
              if (model) {
                values = model.toArchive(true);
                success = true;
              }
            }
          }
        }

        var success = false;
        var model = this.get('model');
        var context = this._resolveContext(iMessage, model);
        var values;

        if (iMessage.action === 'create') {
          handleCreate(iMessage);
        } else if (iMessage.action === 'update') {
          handleUpdate(iMessage);
        } else if (iMessage.action === 'get') {
          handleGet(iMessage);
        }
        /*else if (iMessage.action === 'delete') {
        }*/
        else {
          DG.logWarn('Data interactive api: unsupported action for collection: ' + iMessage.action);
        }
        return {
          success: success,
          values: values
        };
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
      handleCollectionList: function (iMessage) {
        function handleGet(iMessage) {
          values = context.get('collections').map(function (collection) {
            return {
              name: collection.get('name'),
              guid: collection.get('id'),
              title: collection.get('title')
            };
          });
          success = true;
        }

        var success = false;
        var model = this.get('model');
        var context = this._resolveContext(iMessage, model);
        var values;

        if (iMessage.action === 'get') {
          handleGet(iMessage);
        } else {
          DG.logWarn('Data interactive api: unsupported action for collectionList: ' + iMessage.action);
        }

        return {
          success: success,
          values: values
        };
      },

      /**
       * handles operations on attributes.
       *
       * @param  iMessage {object}
       *     {{
       *        action: 'create'|'update'|'get'|'delete'
       *        what: {{type: 'attributes', context: {name}, collection: {string}, attributes: {string}}
       *        values: {[object]|object}
       *      }}
       *
       */
      handleAttributes: function (iMessage) {
        var success = false;
        var model = this.get('model');
        var context = this._resolveContext(iMessage, model);
        var collection = context && context.getCollectionByName(iMessage.what.collection);
        var values;

        function handleCreate(iMessage) {
          var change = {
            operation: 'createAttributes',
            collection: collection,
            attrPropsArray: iMessage.values
          };
          var changeResult = context.applyChange(change);
          success = (changeResult && changeResult.success) || success;
        }

        function handleUpdate(iMessage) {
          var change = {
            operation: 'updateAttributes',
            collection: collection,
            attrPropsArray: [
              DG.ObjectMap.join(iMessage.values, {name: iMessage.what.attributes})
            ]
          };
          var changeResult = context.applyChange(change);
          success = (changeResult && changeResult.success) || success;
        }

        function handleGet(iMessage) {
          var attribute;
          if (iMessage.what.attributes) {
            attribute = collection.getAttributeByName(iMessage.what.attributes);
            values = attribute.toArchive();
            success = true;
          } else {
            values = collection.attrsController.map(function (attr) {
              return {name: attr.get('name'), id: attr.get('id')}; //attr.toArchive();
            });
            success = true;
          }
        }

        if (collection) {
          if (iMessage.action === 'create') {
            handleCreate(iMessage);
          } else if (iMessage.action === 'update') {
            handleUpdate(iMessage);
          } else if (iMessage.action === 'get') {
            handleGet(iMessage);
          }
          /*else if (iMessage.action === 'delete') {
           }*/
          else {
            DG.logWarn('Data interactive api: unsupported action for attributes: ' + iMessage.action);
          }
        }
        return {
          success: success,
          values: values
        };

      },

      handleCases: function (iMessage) {
        var success = false;
        var model = this.get('model');
        var context = this._resolveContext(iMessage, model);
        var collection = context && context.getCollectionByName(
                iMessage.what.collection);
        var values;

        function handleCreateOneCase(iCase) {
          var change = {
            operation: 'createCases',
            collection: collection,
            parent: iCase.parent,
            values: [iCase.values]
          };
          var changeResult = context.applyChange(change);
          success = (changeResult && changeResult.success) || success;
        }
        function handleCreate(iMessage) {
          var cases = Array.isArray(iMessage.values)?iMessage.values: [iMessage.values];
          cases.forEach(handleCreateOneCase);
        }

        if (iMessage.action === 'create') {
          handleCreate(iMessage);
        }
        /*else if (iMessage.action === 'update') {
         } */
        // else if (iMessage.action === 'get') {
        //   handleGet(iMessage);
        // }
        /*else if (iMessage.action === 'delete') {
         }*/
        else {
          DG.logWarn('Data interactive api: unsupported action for case: ' + iMessage.action);
        }
        return {
          success: success,
          values: values
        };

      },

      handleCaseByIndex: function (iMessage) {
        var success = false;
        var context = this._resolveContext(iMessage);
        var collection = context && context.getCollectionByName(
                iMessage.what.collection);
        var values = {};

        function handleGet(iMessage) {
          var myCase;
          if (collection) {
            myCase = collection.getCaseAt(Number(iMessage.what.caseByIndex));
            if (myCase) {
              values.case = myCase.toArchive();
              values.case.children = myCase.children.map(function (child) {return child.id;});
              values.caseIndex = iMessage.what.caseByIndex;
              success = true;
            }
          }
        }

        if (iMessage.action === 'get') {
          handleGet(iMessage);
        }
        else {
          DG.logWarn('Data interactive api: unsupported action for caseByIndex: ' + iMessage.action);
        }
        return {
          success: success,
          values: values
        };
      },
      handleCaseByID: function (iMessage) {
        var success = false;
        var context = this._resolveContext(iMessage);
        var collection = context && context.getCollectionByName(
                iMessage.what.collection);
        var values = {};

        function handleGet(iMessage) {
          var caseID = Number(iMessage.what.caseByID);
          var myCase;
          if (collection) {
            myCase = collection.getCaseByID(caseID);
            if (myCase) {
              values.case = myCase.toArchive();
              values.case.children = myCase.children.map(function (child) {return child.id;});
              values.caseIndex = collection.getCaseIndexByID(caseID);
              success = true;
            }
          }
        }

        if (iMessage.action === 'get') {
          handleGet(iMessage);
        }
        else {
          DG.logWarn('Data interactive api: unsupported action for caseByIndex: ' + iMessage.action);
        }
        return {
          success: success,
          values: values
        };
      },
      handleCaseCount: function (iMessage) {
        var success = false;
        var model = this.get('model');
        var context = this._resolveContext(iMessage, model);
        var collection = context && context.getCollectionByName(
                iMessage.what.collection);
        var values;

        function handleGet(iMessage) {
          values = collection.casesController.length();
          success = true;
        }

        if (iMessage.action === 'get') {
          handleGet(iMessage);
        } else {
          DG.logWarn('Data interactive api: unsupported action for caseCount: ' + iMessage.action);
        }
        return {
          success: success,
          values: values
        };

      },

      // handleComponent: function (iMessage) {
      //   var success = false;
      //   var values;
      //   var model = this.get('model');
      //
      //   function handleCreate(iMessage, iModel) {
      //     var doc = DG.currDocumentController();
      //     var type = iMessage.values.type;
      //     var typeClass;
      //     var rtn;
      //     switch (type) {
      //       case 'graph':
      //           typeClass = 'DG.GraphView';
      //         break;
      //       case 'caseTable':
      //           typeClass = 'DG.TableView';
      //         break;
      //       case 'map':
      //         typeClass = 'DG.MapView';
      //         break;
      //       case 'slider':
      //         typeClass = 'DG.SliderView';
      //         break;
      //       case 'calculator':
      //         typeClass = 'DG.Calculator';
      //         break;
      //       case 'text':
      //         typeClass = 'DG.TextView';
      //         break;
      //       case 'webView':
      //         typeClass = 'SC.WebView';
      //         break;
      //       case 'guide':
      //         typeClass = 'DG.GuideView';
      //         break;
      //       default:
      //     }
      //     if (!SC.none(typeClass)) {
      //       iMessage.values[document] = doc;
      //       iMessage.values.type = typeClass;
      //       rtn = doc.createComponentAndView(DG.Component.createComponent(iMessage.values), typeClass);
      //     } else {
      //       DG.log('Unknown component type: ' + type);
      //     }
      //     success = !SC.none(rtn);
      //     return rtn;
      //   }
      //
        // function handleUpdate(iMessage, iModel) {
        //   context = getContext(iMessage.what.dataContext) || iModel.get('context');
        //   if (!context) {
        //     DG.logWarn('Update of non-existent object.');
        //     success = false;
        //   } else {
        //     ['title', 'description'].forEach(function (prop) {
        //       if (iMessage.values[prop]) {
        //         context.set(prop, iMessage.values[prop]);
        //       }
        //     });
        //     success = true;
        //   }
        // }

        // function handleGet(iMessage, iModel) {
        //   // if a specific context specified
        //   if (iMessage.what.dataContext) {
        //     context = getContext(iMessage.what.dataContext);
        //     values = context && context.get('model').toArchive();
        //     success = !SC.none(values);
        //   } else { // otherwise, return names of existent contexts
        //     values = DG.currDocumentController().get('contexts').map(function (context) {
        //       return {name: context.get('name'), id: context.get('id')};
        //     });
        //     success = true;
        //   }
        // }

        // function handleDelete(iMessage, iModel) {
        //   context = getContext(iMessage.what.dataContext) || iModel.get('context');
        //   context.destroy();
        //   iModel.set('context', null);
        // }

        // if (iMessage.action === 'create') {
        //   handleCreate(iMessage, model);
        // } else if (iMessage.action === 'update') {
        //   handleUpdate(iMessage, model);
        // } else if (iMessage.action === 'get') {
        //   handleGet(iMessage, model);
        // } else if (iMessage.action === 'delete') {
        //   handleDelete(iMessage, model);
      //   } else {
      //     DG.log('Unsupported action: ' + iMessage.action);
      //   }
      //   return {
      //     success: success,
      //     values: values
      //   };
      // },

    });

