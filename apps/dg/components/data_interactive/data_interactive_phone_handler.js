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
          collection: this.handleCollection.bind(this)
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
            var selector = iMessage.what && iMessage.what.resource ? this.parseResourceSelector(
                iMessage.what.resource) : iMessage.what;
            var type = selector && selector.type;

            iMessage.origSelector = iMessage.what;
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
            tReturnValues = {};

        var update = function () {
              this.setPath('model.title', tValues.title);
              this.setPath('model.version', tValues.version);
              this.setPath('model.dimensions', tValues.dimensions);
            }.bind(this),

            get = function () {
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
        var values = {};
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
            DG.logWarn('Operation not permitted.');
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
            values = context && context.get('model').toArchive();
            success = !SC.none(values);
          } else { // otherwise, return names of existent contexts
            values = DG.currDocumentController().get('contexts').map(function (context) {
              return {name: context.get('name'), id: context.get('id')};
            });
            success = true;
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
       *      what: {{type: 'collection', context: {string}, collectionIdentifier: {string}}
       *      values: {{name: {string}, title: {string}, description: {string}, parent: {string}, attributes: [{Object}], labels: [{Object}] }}
       *     }}
       *
       */
      handleCollection: function (iMessage) {
        var context = this.getPath('model.context');
        var change;
        var result;

        if (!context) {
          this.createDefaultContext();
          context = this.getPath('model.context');
        }

        if (iMessage.action === 'create') {
          change = {
            operation: 'createCollection',
            properties: iMessage.values,
            attributes: ( iMessage.values && iMessage.values.attributes )
          };
          result = context.applyChange(change);
        } else if (iMessage.action === 'update') {
        } else if (iMessage.action === 'get') {
          // TODO
        } else if (iMessage.action === 'delete') {

        }
        return result;
      }

    });

