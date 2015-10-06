// ==========================================================================
//                        DG.DocumentArchiver
//
//  Author:   Kirk Swenson
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

/* global Promise */
/**
 * @class DocumentArchiver
 *
 * Coordinates streaming of documents and document elements. Deals with documents
 * as streamable entities in contrast to the Document Controller that
 * provides operational coordination of document elements. This class addresses
 * how to get documents in and out of CODAP predictably and the Document
 * Controller deals with Documents while they are being presented and
 * interacted with within CODAP.
 *
 * This class, at this point, has no state. It
 * functions, more or less, as a mixin to the App Controller, providing
 * a logically related collection of utility methods.
 *
 * @extends SC.Object
 */
/* globals CSV: true, jiff:true */
sc_require('libraries/jiff');

DG.DocumentArchiver = SC.Object.extend(
/** @scope DG.DocumentArchiver.prototype */ {

    /**
     * Tests the JSON text for validity as a possible document.
     *
     * The following assertions are tested:
     *
     * (1) The document is valid JSON. that is: it parses correctly
     * (2) The document looks like a valid CODAP document. It has all mandatory
     * top level elements and no unexpected top level elements.
     * (3) all internal links can be resolved.
     *
     * @param    {String}    iDocument -- The JSON-formatted document text
     * @returns  {[String]}   An array of error messages, zero length, if none.
     */
    isValidJsonDocument: function (iDocument) {
      function visit(key, value, fn) {
        var rtn = fn(key, value);
        if (rtn !== false) {
          if (Array.isArray(value)) {
            value.forEach(function (item) {
              visit(key, item, fn);
            });
          } else if (typeof value === 'object') {
            DG.ObjectMap.forEach(value, function (key, item) {
              visit(key, item, fn);
            });
          }
        }
      }

      function validateInternalRefs(iDocument) {
        var parts = subDocs.copy(false);
        var symbols = [];
        var references = [];
        parts.unshift(iDocument);
        parts.forEach(function (documentPart) {
          visit('doc', documentPart, function (key, value) {
            if (key === 'guid') {
              // store guids in symbol table
              symbols.push(Number(value));
              return true;
            } else if (key === '_links_') {
              // store links as references
              visit(key, value, function (k, v) {
                if (k === 'id') {
                  references.push(Number(v));
                }
                return true;
              });
              return false;
            } else if (key === 'parent') {
              // store parents as references
              references.push(Number(value));
              return true;
            } else if (key === 'contextStorage') {
            // context storage is private to data interactive
              return false;
            }

          });
        });
        references.forEach(function (ref) {
          // verify link is resolved
          if (symbols.indexOf(Number(ref)) < 0) {
            errors.push('DG.AppController.validateDocument.unresolvedID'.loc(ref));
          }
        });
      }
      var expectedProperties = [
        'appBuildNum',
        'appName',
        'appVersion',
        'components',
        'contexts',
        'globalValues',
        'guid',
        'name',
        '_permissions',
        '_openedFromSharedDocument' // this is an annotation we may create in
                                    // CodapCommonStorage
      ];
      var requiredProperties = [
        'name'
      ];
      var errors = [];
      var doc;
      var subDocs = [];

      if (typeof iDocument === 'string') {
        try {
          doc = JSON.parse(iDocument);
        } catch (ex) {
          errors.push('DG.AppController.validateDocument.parseError'.loc(ex));
        }
      } else {
        doc = iDocument;
      }

      if (DG.ExternalDocumentCache) {
        subDocs = DG.ExternalDocumentCache.fetchAll().map(function (iFragment) {
          var parsedFragment = {};
          if (typeof iDocument === 'string') {
            try {
              parsedFragment = JSON.parse(iFragment);
            } catch (ex) {
              errors.push('DG.AppController.validateDocument.parseError'.loc(ex));
            }
          } else {
            parsedFragment = iFragment;
          }
          return parsedFragment;
        });
      }

      if (doc) {
        requiredProperties.forEach(function (prop) {
            if (!doc.hasOwnProperty(prop)) {
              errors.push('DG.AppController.validateDocument.missingRequiredProperty'.loc(prop));
            }
          }
        );
        DG.ObjectMap.keys(doc).forEach(function (prop) {
            if (expectedProperties.indexOf(prop) < 0) {
              errors.push('DG.AppController.validateDocument.unexpectedProperty'.loc(prop));
            }
          }
        );
        validateInternalRefs(doc);
      }
      DG.log('Document validation: ' + (errors.length? JSON.stringify(errors): 'No Errors'));
      return errors;
    },

    /**
     * Loads externalized fragments of a main CODAP document.
     *
     * At present there is an external document for each Data Context.
     *
     * @param {[string]} iDocumentIds Document ids are the identifiers for each
     *                                fragment needed by
     *                                the storage server.
     * @returns {[Promise]}
     */
    loadExternalDocuments: function(iDocumentIds) {
      var promises = [], i, len;

      var sendRequest = function(id) {
        return DG.authorizationController.get('storageInterface').open({id: id}).then(
          function(body) {
            DG.ExternalDocumentCache.cache(id, body);
          },
          function(errorCode) {
            DG.logError('openDocumentFailed:' + JSON.stringify({id: id, message: errorCode }) );
          }
        );
      }.bind(this);

      for (i = 0, len = iDocumentIds.length; i < len; i++) {
        promises.push(sendRequest(iDocumentIds[i]));
      }

      return promises;
    },

    /**
      Open the specified document text as a new document, returning the newly-created document.
     */
    openDocument: function( iStore, iDocText) {
      var deferred = $.Deferred(),
          externalDocIds = DG.StringUtilities.scan(iDocText,
            /"externalDocumentId": ?"?(\d+)"?/g, function(m) { return m[1]; }),
          promises = this.loadExternalDocuments(externalDocIds);

      Promise.all(promises).then(function() {
        try {
          var docArchive = SC.json.decode( iDocText),
            validationErrors;

          validationErrors = this.isValidJsonDocument(docArchive);
          if (validationErrors.length > 0) {
            deferred.reject(new Error('DG.AppController.validateDocument.invalidDocument'.loc(
              JSON.stringify(validationErrors))));
          }
          else {
            DG.store = DG.ModelStore.create();
            deferred.resolve(DG.Document.createDocument(docArchive));
          }
        } catch (ex) {
          deferred.reject(ex);
        }
        DG.ExternalDocumentCache.clear();
        DG.busyCursor.hide();
      }.bind(this));
      return deferred;
    },

    /**
     * Converts a string representing the contents of a CSV or tab-delimited
     * file into a simple Streamable CODAP document. This document can be loaded
     * into CODAP. The CODAP document will have one data context with a single
     * Collection that contains the CSV data. It is assumed that either the first
     * line will contain the name of the collection and the second will contain the
     * names of each of the attributes or the collection name will be omitted and
     * the first line will contain the names of the attributes.
     *
     * @param {string} iText The contents of a CSV or tab-delimited file formatted
     *   according to the [rfc4180](http://www.ietf.org/rfc/rfc4180.txt) standard.
     * @param {string} iFileName The name of the file or URL from which the
     *   CSV text was extracted.
     * @returns {Object} A streamable CODAP document.
     */
    convertCSVDataToCODAPDocument: function (iText, iFileName) {

      // trims empty columns from right side of
      function trimTrailingColumns(arr) {
        var newArr = [];
        arr.forEach(function (row) {
          var value;
          if (Array.isArray(row)) {
            do {
              value = row.pop();
            } while(value === '');
            if (!SC.empty(value)) row.push(value);
          }
          if (row.length) {
            newArr.push(row);
          }
        });
        return newArr;
      }

      function parseText() {
        var tValuesArray,
          tCollectionRow,
          tChildName = 'cases',// Child Collection Name: should be first
                                  // line of CSV
          tAttrNamesRow,// Column Header Names: should be second row
          tDoc = {
            name: 'DG.Document.defaultDocumentName'.loc(),
            components: [],
            contexts: [
              {
                "type": "DG.DataContext",
                "collections": [
                  {
                    "attrs": [],
                    "cases": []
                  }
                ],
                "contextStorage": {
                  "gameUrl": iFileName
                }
              }
            ],
            appName: DG.APPNAME,
            appVersion: DG.VERSION,
            appBuildNum: DG.BUILD_NUM,
            globalValues: []
          },
          tAttrsArray = tDoc.contexts[0].collections[0].attrs,
          tCasesArray = tDoc.contexts[0].collections[0].cases;

        CSV.RELAXED = true;
        CSV.IGNORE_RECORD_LENGTH = true;
        tValuesArray = CSV.parse(iText);
        if (tValuesArray && tValuesArray.length >= 2) {
          tValuesArray = trimTrailingColumns(tValuesArray);
          tCollectionRow = tValuesArray.shift();
          tAttrNamesRow = tValuesArray[0];

          if (Array.isArray(tCollectionRow)) {
            // check if it looks like name row is missing
            if ((tAttrNamesRow.length === tCollectionRow.length) && (tAttrNamesRow.length > 1)) {
              tAttrNamesRow = tCollectionRow;
            } else {
              tChildName = tCollectionRow[0];
              tValuesArray.shift();
            }
          }
          else {
            tChildName = tCollectionRow;
            tValuesArray.shift();
          }
          tDoc.contexts[0].collections[0].name = tChildName;

          tAttrNamesRow.forEach(function (iName) {
            tAttrsArray.push( {
              name: String(iName)
            });
          });

          tValuesArray.forEach( function( iValues) {
            var tCase = {
              values: {}
            };
            tAttrNamesRow.forEach( function( iName, iIndex) {
              tCase.values[ iName] = iValues[ iIndex];
            });
            tCasesArray.push( tCase);
          });

          return tDoc;
        }
      } // parseText

      return parseText();
    },

    /**
     * We create a very simple document as a wrapper on the provided Data
     * Interactive URL and open it.
     *
     * @param iURL - URL of data interactive
     * @returns {DG.Document}
     */
    createNewDocumentWithDataInteractiveURL: function (iURL) {
      var tDoc = {
        name: 'DG.Document.defaultDocumentName'.loc(),
        guid: 1,
        components: [
          {
            "type": "DG.GameView",
            "componentStorage": {
              "currentGameName": "",
              "currentGameUrl": iURL
            }
          }
        ],
        appName: DG.APPNAME,
        appVersion: DG.VERSION,
        appBuildNum: DG.BUILD_NUM,
        globalValues: []
      };

      return DG.Document.createDocument(tDoc);
    },

    /**
     * Returns an object which contains the contents of the document suitable for conversion
     * to JSON and sending to the server.
     *
     * Signature of `callback`:
     *      {Object} docArchive an object representing the document suitable for JSON-conversion
     */
    exportDocument: function(callback, fullData) {
      var documentController = DG.currDocumentController();
      documentController.captureCurrentDocumentState(fullData)
        .then(function (streamableDocument) {
            return callback(streamableDocument);
        });
    },

    /**
     * Oversees exporting of all data contexts. Returns a promise that is
     * fulfilled when all exports complete successfully.
     *
     * @param {object} iDocument  A streamable archive of the document.
     * @param {function} callback The callback will perform the actual save.
     *                            Called once for each dataContext.
     * @param {boolean} saveAll   Whether to save all or only those with a defined
     *                            external document ID.
     */
    exportDataContexts: function(iDocument, callback, saveAll) {
      var promises = [];
      iDocument.contexts.forEach(function(iContext) {
        var model = iContext.get('model');
        // We call the callback that will, presumably, save the context if
        // the saveAll flag is set or there is an externalDocumentId, indicating
        // that the context was saved as a fragment before. Therefore, saveAll
        // should be set on first save.
        if ( saveAll || !SC.none(model.get('externalDocumentId'))) {
          promises.push(callback(model, model.toArchive(true), iDocument));
        }
      });
      return Promise.all(promises);
    },

      /**
       * Archive the document into durable form, and save it.
       *
       * @param {String} iDocumentName            The unique Id of the document as
       *                                        known to the server.
       * @param {integer} iDocumentPermissions  Encodes document permissions. So far,
       *                                        0: unshared, 1: shared
       */
      saveDocument: function( iDocumentName, iDocumentPermissions) {
        /**
         * @param {DG.DataContext} context The related context.
         * @param {object} docArchive      An archive of the DataContextRecord.
         *
         * @type {function(this:DG.DocumentArchiver)}
         */
        var exportDataContextCallback = function(context, dataContextArchive) {
          // Ensure that _permissions matches the main document
          var savePromise;
          var needsSave = false;
          var cleanedDocArchive;
          var shouldSkipPatch;
          var differences;
          // Only use differential saving if 1) enabled and 2) we've already saved it at least once (ie have a document id)

          if( !SC.none( iDocumentPermissions)) {
            if (dataContextArchive._permissions !== iDocumentPermissions) {
              needsSave = true;
            }
            dataContextArchive._permissions = iDocumentPermissions;
          }

          // FIXME If we toggle splitting on and off, we'll need to change this test
          if( DG.assert( !SC.none(dataContextArchive))
              && (needsSave
                || documentController.objectHasUnsavedChanges(context)
                || SC.none(context.get('externalDocumentId')
              )) ) {
            documentController.clearChangedObject(context);
            cleanedDocArchive = JSON.parse(JSON.stringify(dataContextArchive)); // Strips all keys with undefined values

            // If we are opening from a shared document, the first save of
            // each context should be a full save.
            shouldSkipPatch = documentController._skipPatchNextTime.indexOf(context) !== -1
                || context._openedFromSharedDocument;
            delete context._openedFromSharedDocument;

            if (DG.USE_DIFFERENTIAL_SAVING && !shouldSkipPatch && !SC.none(context.get('externalDocumentId'))) {
              differences = jiff.diff(context.savedShadowCopy(),
                  cleanedDocArchive, function(obj) {
                    return obj.guid || JSON.stringify(obj);
                  });
              if (differences.length === 0) { return; }
              savePromise = this.streamExternalDataContextToCloudStorage(context, iDocumentName, differences, this, false, true);
            } else {
              savePromise = this.streamExternalDataContextToCloudStorage(context, iDocumentName, dataContextArchive, this);
            }
            savePromise.then(function(success) {
              if (success) {
                if (DG.USE_DIFFERENTIAL_SAVING || shouldSkipPatch) {
                  context.updateSavedShadowCopy(cleanedDocArchive);
                }
                // remove this context from the skip list.
                if (shouldSkipPatch) {
                  documentController._skipPatchNextTime.splice(documentController._skipPatchNextTime.indexOf(context), 1);
                }
              } else {
                DG.dirtyCurrentDocument(context);
              }
            }.bind(this));
          }
          return savePromise;
        }.bind(this);

        /**
         * Streams the main document to a storage server.
         *
         * @param {object} A streamable form of the CODAP document.
         *
         * @type {function(this:DG.DocumentArchiver)}
         */
        var exportMainDocument = function(docArchive) {
          // determine if we need to save the main document
          var needsSave = documentController.objectHasUnsavedChanges(documentController.get('content'));
          var reply;
          if( !SC.none( iDocumentPermissions) && docArchive._permissions !== iDocumentPermissions) {
            docArchive._permissions = iDocumentPermissions;
            this.setPath('content._permissions', iDocumentPermissions);
            needsSave = true;
          }

          if( DG.assert( !SC.none(docArchive))) {
            if (needsSave) {
              reply = this.streamDocumentToCloudStorage(iDocumentName, docArchive, this)
                  .then(function(success) {
                    if (!success) {
                      DG.dirtyCurrentDocument();
                    }
                    saveInProgress.resolve(success);
                  });
            } else {
              this.invokeLater(function() { saveInProgress.resolve(); });
              reply = Promise.resolve(true);
            }
          }
          documentController.clearChangedObject(documentController.get('content'));
          return reply;
        }.bind(this);

        /*
           -------------- saveDocument begins here ----------
         */
        var documentController = DG.currDocumentController(),
            existingSaveInProgress = documentController.get('saveInProgress'),
            saveInProgress,
            exportPromise;
        if (!SC.none(existingSaveInProgress)) {
          DG.logWarn('Request to save, but save in progress: deferring.');
          return;
        }

        saveInProgress = documentController.signalSaveInProgress();

        documentController.updateSavedChangeCount();
        exportPromise = documentController.captureCurrentDocumentState(false/*resource fork only*/);
        // FIXME This forces data contexts to always be in a separate doc. Should this depend on other factors?
        exportPromise.then(function (iStreamableDocument) {
          return this.exportDataContexts(documentController,
              exportDataContextCallback, DG.FORCE_SPLIT_DOCUMENT);
        }.bind(this))
        .then(function() {
            return exportMainDocument(documentController.content.toArchive());
        })
        // at this point I want to call .catch, but the sproutcore js assemble
        // complains, so we call then with a null resolve function.
        .then(
          null,
          function (msg) {
          DG.logWarn('DocumentController.saveDocument: ' + msg);
        });
      },

      /**
       Archive the document into durable form, and save it.

       @param {String} iDocumentName   The unique Id of the document as known to the server.
       todo: move to DocumentArchiver
       */
      copyDocument: function( iDocumentName, iDocumentPermissions) {

        var streamOutDataContexts = function(context, dataContextArchive) {
          if( DG.assert( !SC.none(dataContextArchive))) {
            // Ensure that _permissions matches the main document
            if( !SC.none( iDocumentPermissions)) {
              dataContextArchive._permissions = iDocumentPermissions;
            }
            return this.streamExternalDataContextToCloudStorage(
                context, iDocumentName, dataContextArchive, this, true);
          }
        }.bind(this);

        var streamOutMainDocument = function( docArchive) {
          docArchive.name = iDocumentName;
          if (!SC.none(iDocumentPermissions))
            docArchive._permissions = iDocumentPermissions;

          if (DG.assert(!SC.none(docArchive))) {
            return this.streamDocumentToCloudStorage(iDocumentName, docArchive, this, true)
              .then(function() {
                // Set the externalDocumentIds back
                DG.currDocumentController().contexts.forEach(function (iContext) {
                  var model = iContext.get('model');
                  if ( !SC.none(model.get('externalDocumentId'))) {
                    model.set('externalDocumentId', model.get('oldExternalDocumentId'));
                    model.set('oldExternalDocumentId', null);
                  }
                });
                saveInProgress.resolve();
              }.bind(this));
          }
        }.bind(this);

        /* ----------  copyDocument starts here ------------------ */

        var documentController = DG.currDocumentController(),
            existingSaveInProgress = documentController.get('saveInProgress'),
            saveInProgress,
            exportPromise,
            oldDifferentialSaving,
            documentArchive;

        // if there is  a save in progress, retry when it is done.
        if (!SC.none(existingSaveInProgress)) {
          existingSaveInProgress.done(function() {
            this.copyDocument(iDocumentName, iDocumentPermissions);
          }.bind(this));
          return;
        }

        saveInProgress = documentController.signalSaveInProgress();

        oldDifferentialSaving = DG.USE_DIFFERENTIAL_SAVING;
        DG.USE_DIFFERENTIAL_SAVING = false;
        saveInProgress.done(function() { DG.USE_DIFFERENTIAL_SAVING = oldDifferentialSaving; });

        exportPromise = documentController.captureCurrentDocumentState(false)
        // FIXME This forces data contexts to always be in a separate doc. Should this depend on other factors?
        .then(function (da) {
          var promises = [];
          // save archive for when we export the main document
          documentArchive = da;
          documentController.contexts.forEach(function(iContext, ix) {
            var model = iContext.get('model');
            var dataContextArchive = model.toArchive(true);
            delete dataContextArchive.externalDocumentId;
            promises.push(streamOutDataContexts(model, model.toArchive(true))
                .then(function(documentID) {
                  documentArchive.contexts[ix].externalDocumentId = documentID;
                }));
          });
          return Promise.all(promises);
        }.bind(this))
        .then(function() {
          streamOutMainDocument(documentArchive);
        }.bind(this))
          // at this point I want to call .catch, but the sproutcore js assemble
          // complains, so we call then with a null resolve function.
        .then(
          null,
          function (msg) {
            DG.logWarn(msg);
          });
      },

      /**
       Saves the specified document object to the server.

       @param    iDocumentId       The ID of the document object
       @param    iDocumentArchive  The document object to be archived. This should be
       a JavaScript object suitable for JSON-encoding.
       @param    iReceiver         The receiver object whose receivedSaveDocumentResponse()
       method will be called when the response from the server
       is received. The called method should check for errors
       and perform any other appropriate tasks upon completion.
       */
      streamDocumentToCloudStorage: function(iDocumentId, iDocumentArchive, iReceiver, isCopying) {
        return DG.authorizationController.get('storageInterface').save({name: iDocumentId, content: iDocumentArchive}).then(
            function(body) {
              return iReceiver.receivedSaveDocumentSuccess.call(iReceiver, body, isCopying);
            },
            function(errorCode) {
              return iReceiver.receivedSaveDocumentFailure.call(iReceiver, errorCode, isCopying);
            }
        );
      },

      receivedSaveDocumentSuccess: function(body, isCopy) {
        return new Promise(function(resolve, reject) {
          var newDocId = body.id;
          if (isCopy) {
            var url = DG.appController.copyLink(newDocId);
            if (DG.authorizationController.getPath('currLogin.user') === 'guest') {
              url = $.param.querystring(url, {runAsGuest: 'true'});
            }
            var win = window.open(url, '_blank');
            if (win) {
              win.focus();
            } else {
              DG.appController.showCopyLink(url);
            }
          } else {
            DG.currDocumentController().set('externalDocumentId', ''+newDocId);
            DG.appController.triggerSaveNotification();
          }
          resolve(true);
        }.bind(this));
      },

      /**
       * @param errorCode
       * @param isCopy
       * @returns {*}
       */
      receivedSaveDocumentFailure: function(errorCode, isCopy) {
        return new Promise(function(resolve, reject) {
          var messageBase = 'DG.AppController.' + (isCopy ? 'copyDocument' : 'saveDocument') + '.';
          DG.appController.notifyStorageFailure(messageBase, errorCode, resolve);
        }.bind(this));
      },

      /**
       * Saves an external data context to the connected cloud storage.
       *
       * @param {*} contextModel
       * @param {string} iDocumentName
       * @param {*} iDocumentArchive
       * @param {object} iReceiver        The object receiving the result of the save.
       * @param {boolean} isCopying       Whether we are copying the current document.
       * @param {boolean} isDifferential  Whether we are copying the entire document
       *                                  or just the delta.
       * @returns {Promise}               Fullfilled after the handler for the response
       *                                  completes
       */
      streamExternalDataContextToCloudStorage: function(contextModel, iDocumentName,
          iDocumentArchive, iReceiver, isCopying, isDifferential) {
        var opts = {content: iDocumentArchive},
            externalDocumentId = contextModel.get('externalDocumentId'),
            parentDocumentId = DG.currDocumentController().get('externalDocumentId');

        if (!isCopying && !SC.none(externalDocumentId)) {
          opts.id = externalDocumentId;
          if (isDifferential) {
            opts.differential = true;
          }
        } else {
          opts.name = '%@-context-%@'.fmt(iDocumentName, SC.guidFor(contextModel));
        }

        if (!isCopying && !SC.none(parentDocumentId)) {
          opts.params = {parentDocumentId: parentDocumentId};
        }

        return DG.authorizationController.get('storageInterface').save(opts).then(
            function(body) {
              return iReceiver.receivedSaveExternalDataContextSuccess.call(iReceiver, body, isCopying, contextModel);
            },
            function(errorCode) {
              return iReceiver.receivedSaveExternalDataContextFailure.call(iReceiver, errorCode, isCopying, contextModel);
            }
        );
      },

      /**
       * Called to handle response from a save data context.
       *
       * TODO: Determine why we need to fiddle with the contextModel. We should
       * TODO: be operating on a copy of the context, not the original.
       *
       * @param body
       * @param isCopy
       * @param contextModel
       * @returns {Promise} of the new ID for the data context.
       */
      receivedSaveExternalDataContextSuccess: function(body, isCopy, contextModel) {
        return new Promise(function(resolve, reject) {
          var newDocId = body.id;
          SC.run(function() {
            if (isCopy) {
              contextModel.set('oldExternalDocumentId', contextModel.get('externalDocumentId'));
            }
            contextModel.set('externalDocumentId', ''+newDocId);

            this.invokeLater(function() {
              resolve(newDocId);
            });
          }.bind(this));
        }.bind(this));
      },

      /**
       * @param errorCode
       * @param isCopy
       * @param contextModel
       * @returns {*}
       */
      receivedSaveExternalDataContextFailure: function(errorCode, isCopy, contextModel) {
        return new Promise(function(resolve, reject) {
          if (errorCode === 'error.invalidPatch') {
            this._skipPatchNextTime.push(contextModel);
          }
          DG.appController.notifyStorageFailure('DG.AppController.saveDocument.', errorCode);
        }.bind(this));
      }

    }
);
