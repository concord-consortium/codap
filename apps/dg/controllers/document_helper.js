// ==========================================================================
//                        DG.DocumentHelper
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

///* global Promise */
/**
 * @class DocumentHelper
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
/* globals Papa: true*/

DG.DocumentHelper = SC.Object.extend(
    /** @scope DG.DocumentHelper.prototype */ {

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
          'changeCount',
          'components',
          'contexts',
          'globalValues',
          'guid',
          'metadata',
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

        if (doc) {
          requiredProperties.forEach(function (prop) {
                if (!doc.hasOwnProperty(prop)) {
                  errors.push('DG.AppController.validateDocument.missingRequiredProperty'.loc(prop));
                }
              }
          );
          DG.ObjectMap.keys(doc).forEach(function (prop) {
                if (expectedProperties.indexOf(prop) < 0) {
                  // log unexpected properties but don't fail to open
                  DG.log('DG.AppController.validateDocument.unexpectedProperty'.loc(prop));
                }
              }
          );
          validateInternalRefs(doc);
        }
        DG.log('Document validation: ' + (errors.length ? JSON.stringify(errors) : 'No Errors'));
        return errors;
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
       *   @param {string} iContextName name of the context we will create
       *   @param {string} iCollectionName name of the collection we will create
       * @param {string} iFileURL The name of the file or URL from which the
       *   CSV text was extracted.
       * @returns {Object||undefined} A streamable CODAP document.
       */
      convertCSVDataToCODAPDocument: function (iText, iContextName, iCollectionName, iFileURL) {
        /**
         * Returns table stats object:
         *   numRows {number}
         *   maxCols {number}
         *   headerRows {[number]} Array of row indices of header rows
         *   rowLengthCounts {[number]} sparse array of counts of row lengths
         */
        function getTableStats(table) {
          var stats = {
            numRows: 0,
            maxCols: 0,
            rowLengthCounts: [],
            preponderantLength: 0
          };

          stats.numRows = table.length;
          table.forEach(function (row) {
            var len = row.length;
            if (stats.rowLengthCounts[len]) {
              stats.rowLengthCounts[len]++;
            } else {
              stats.rowLengthCounts[len] = 1;
            }
            stats.maxCols = Math.max(stats.maxCols, len);
          });
          var maxCount = 0;
          stats.rowLengthCounts.forEach(function (count, ix) {
            if (maxCount < count) {
              maxCount = count;
              stats.preponderantLength = ix;
            }
          });
          console.log('stats: ' + JSON.stringify(stats));
          return stats;
        }

        function guaranteeUnique(name, nameArray) {
          var ix = 0;
          var newName = name;
          while (nameArray.indexOf(newName) >= 0) {
            ix++;
            newName = name + '_' + ix;
          }
          return newName;
        }

        var tValuesArray,
            tAttrNamesRow,// Column Header Names: should be second row
            tAttrNames = [], tTableStats, ix,
            tDoc = {
              name: 'DG.Document.defaultDocumentName'.loc(),
              guid: 1,
              components: [
                {
                  "type": "DG.TableView",
                  "componentStorage": {
                    "_links_": {
                      "context": {
                        "type": "DG.DataContextRecord",
                        "id": 4
                      }
                    }
                  },
                  "layout": {
                    "width": 500,
                    "height": 200,
                    "top": 0,
                    "left": 0
                  }

                },
                {
                  "type": "DG.TextView",
                  "componentStorage": {
                    "text": "url=" + iFileURL,
                    "name": "Data Source"
                  }
                }
              ],
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
                    "gameUrl": iFileURL
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

        // a euro number is...
        //                     + optional sign value
        //                     |     + either grouped whole number using dots or spaces for grouping
        //                     |     |                            + or ungrouped whole number
        //                     |     |                            |       + followed optionally by a comma decimal separator
        //                     |     |                            |       |   +git and either decimal digits or
        //                     v     v                            v       v   v        v grouped decimal digits
        var isEuroNumberRE = /^[-+]?(([0-9]{1,3}([. ][0-9]{3})*)|([0-9]*))(,(([0-9]*)|([0-9]{3}[. ])[0-9]{1,3}))?$/;

        var result = Papa.parse(iText, {
          dynamicTyping: false,
          header: false,
          skipEmptyLines: true
        });

        if (result.errors) {
          // Ignore the undetectable delimiter warning, but otherwise log and abort
          if (result.errors.length > 1 ||
              (result.errors.length === 1 &&
                  result.errors[0].code !== 'UndetectableDelimiter')) {
            DG.logWarn("CSV Parse errors (%@): %@".loc(iFileURL,
                JSON.stringify(result.errors)));
            return;
          }
        }

        // if we have a csv with semicolon separators we assume are using the EU
        // number representation (comma as the decimal separator), so we convert
        // anything that looks like an EU number to standard representation.
        DG.log("CSV Parse Metadata: %@".loc(JSON.stringify(result.meta)));
        var euroDelimiter = (result.meta && result.meta.delimiter === ';');
        tValuesArray = result.data.map(function (row) {
          return row.map(function (str) {
            if (str === null || str === undefined) {
              return str;
            }
            str = str.trim();
            if (str.length === 0) {
              return str;
            }
            // converts a euro number string to a US number string
            var isEuroNumber = euroDelimiter && isEuroNumberRE.test(str);
            if (isEuroNumber) {
              return Number(str.replace(/[. ]/g, '').replace(/,/, '.'));
            } else {
              if (!isNaN(str)) {
                return Number(str);
              } else {
                return str;
              }
            }
          });
        });

        tTableStats = getTableStats(tValuesArray);

        if (!tValuesArray || tValuesArray.length < 1) {
          DG.logWarn('CSV or Tab-delimited parsing failed: ' + iFileURL);
          return;
        }

        tAttrNamesRow = tValuesArray.shift();

        var tDataContext = tDoc.contexts[0],
            tCollection = tDataContext.collections[0];
        tDataContext.name = tDataContext.title = iContextName;
        tCollection.name = tCollection.title = iCollectionName;

        var canonicalName;
        for (ix = 0; ix < tTableStats.maxCols; ix += 1) {
          canonicalName = DG.Attribute.canonicalizeName(tAttrNamesRow[ix]);
          tAttrNames.push(guaranteeUnique(canonicalName, tAttrNames));
        }

        tAttrNames.forEach(function (iName) {
          tAttrsArray.push({
            name: iName,
            editable: true
          });
        });

        tValuesArray.forEach(function (iValues) {
          var tCase = {
            values: {}
          };
          tAttrNames.forEach(function (iName, iIndex) {
            var tValue = iValues[iIndex];
            tCase.values[iName] = DG.DataUtilities.canonicalizeInputValue(tValue);
          });
          tCasesArray.push(tCase);
        });
        return tDoc;
      },

      /**
       * We create a very simple document as a wrapper on the provided Data
       * Interactive URL and open it.
       *
       * @param iURL - URL of data interactive
       * @returns {DG.Document}
       */
      createNewDocumentWithDataInteractives: function (iURLs) {
        var tComponents = (iURLs || [])
            .map(function (url) {
              return {
                "type": "DG.GameView",
                "componentStorage": {
                  "currentGameName": "",
                  "currentGameUrl": url
                }
              };
            });
        var tDoc = {
          name: 'DG.Document.defaultDocumentName'.loc(),
          guid: 1,
          components: tComponents,
          appName: DG.APPNAME,
          appVersion: DG.VERSION,
          appBuildNum: DG.BUILD_NUM,
          globalValues: []
        };

        return DG.Document.createDocument(tDoc);
      },

      /**
       * The current document will be made to conform to the information in the given JSON object.
       * @param iDocObject {Object}
       * @return {boolean}
       */
      updateDocument: function (iDocObject) {
        var tDocController = DG.currDocumentController(),
            tComponentControllers = tDocController.get('componentControllersMap'),
            tComponentsStorage = iDocObject.components,
            this_ = this;

        function deleteComponentsNotInDocObject() {
          var tIDsOfStoredComponents = tComponentsStorage.map(
              function (iCompStorage) {
                return Number(iCompStorage.guid);
              });
          DG.ObjectMap.forEach(tComponentControllers, function (iGuid, iController) {
            var tFoundStorage = tIDsOfStoredComponents.indexOf(Number(iGuid)) >= 0;
            if (!tFoundStorage) {
              DG.closeComponent(iGuid);
            }
          });
        }

        function deleteDataContextsNotInDocObject() {
          var tExistingContexts = tDocController.get('contextRecords'),
              tIDsOfStoredContexts = iDocObject.contexts.map(
                  function (iContext) {
                    return Number(iContext.guid);
                  });
          DG.ObjectMap.forEach(tExistingContexts, function (iGuid, iContext) {
            var tFoundStorage = tIDsOfStoredContexts.indexOf(Number(iGuid)) >= 0;
            if (!tFoundStorage) {
              tDocController.destroyDataContext(iGuid);
            }
          });
        }

        function createOrUpdateDataContexts() {
          var tExistingContexts = tDocController.get('contextRecords'),
              tNewDocContexts = iDocObject.contexts;  // The ones we're moving toward

          tNewDocContexts.forEach(function (iNewDocContext) {
            var tDocContextID = iNewDocContext.guid,
                tFoundExistingDocContextRecord;
            DG.ObjectMap.forEach(tExistingContexts, function (iGuid, iContext) {
              if (Number(iGuid) === tDocContextID)
                tFoundExistingDocContextRecord = iContext;
            });
            if (tFoundExistingDocContextRecord) {  // We found an existing context with the same ID
              var tArchiveOfFoundExistingDocContext = tFoundExistingDocContextRecord.toArchive(true /* fullData */)/*,
                    tFoundExistingDocContext = tDocController.getContextByID( tFoundExistingDocContextRecord.get('id'))*/;
              // Is the one we found identical to the one we're moving toward?
              if (JSON.stringify(iNewDocContext) !== JSON.stringify(tArchiveOfFoundExistingDocContext)) {
                // Something's different. First update the toplevel info
                this_.handleDataContext.update({dataContext: tFoundExistingDocContextRecord}, iNewDocContext);

                /*
                                  // Synchronize collections. Are they the same?
                                  if(JSON.stringify( iNewDocContext.collections) !==
                                      JSON.stringify( tArchiveOfFoundExistingDocContext.collections)) {
                                    window.alert('Cannot yet deal with reorganization of dataset');

                                    // Not the same. Any collection in doc context but not in new context should be deleted
                                    tArchiveOfFoundExistingDocContext.collections.forEach( function( iArchivedFoundCollection, iIndex) {
                                      var tFoundNewCollection = iNewDocContext.collections.find( function(iNewCollection) {
                                        return Number(iNewCollection.guid) === Number(iArchivedFoundCollection.guid);
                                      });
                                      if( !tFoundNewCollection) {
                                        var tDocCollectionToDelete =
                                              tFoundExistingDocContextRecord.collections[Number(iArchivedFoundCollection.guid)];
                                        this_.handleCollection.delete( { dataContext: tFoundExistingDocContext,
                                          collection: tDocCollectionToDelete });
                                      }
                                    });

                                    // Any new collections not already existing should be created
                                    iNewDocContext.collections.forEach( function( iNewCollection) {
                                      if( !tFoundExistingDocContextRecord.collections[Number(iNewCollection.guid)]) {
                                        // Set the new collection's attributes aside
                                        // var tAttrs = iNewCollection..attrs;
                                        delete iNewCollection.attrs;
                                        this_.handleCollection.create( { dataContext: tFoundExistingDocContext }, iNewCollection);
                                        // Move set aside attributes from wherever they are to the new collection

                                      }
                                    });
                                  }
                */

              }
            }
            else {
              tDocController.createNewDataContext(iNewDocContext);
            }
          });
        }

        function createOrUpdateComponents() {
          tComponentsStorage.forEach(function (iCompStorage) {
            var tComponentController = tComponentControllers[iCompStorage.guid];
            if (tComponentController) {
              tComponentController.restoreComponentStorage(iCompStorage.componentStorage);
              tComponentController.get('view').animate(iCompStorage.layout, {duration: 0.4, timing: 'ease-in-out'});
            }
            else {
              iCompStorage.document = DG.activeDocument;
              iCompStorage.allowMoreThanOne = true; // defaults to false and not stored
              var tComponent = DG.Component.createComponent(iCompStorage);
              tDocController.createComponentAndView(tComponent);
            }
          });
        }

        // Global values are not stored in slider components so we have to reinstate them separately
        function reinstateGlobalValues() {
          iDocObject.globalValues.forEach(function (iValue) {
            var tValueInDoc = DG.globalsController.getGlobalValueByID(iValue.guid);
            if (tValueInDoc) {
              tValueInDoc.set('value', iValue.value);
              tValueInDoc.set('name', iValue.name);
            }
            else {
              DG.globalsController.createGlobalValue( {name: iValue.name, value: iValue.value, guid: iValue.guid});
            }
          });
        }

        function reinstateSelection() {
          var tDocContexts = tDocController.get('contexts');
          iDocObject.contexts.forEach(function (iContext) {
            var tDocContext = tDocContexts.find(function (iDocContext) {
              return iDocContext.getPath('model.id') === iContext.guid;
            });
            if (tDocContext) {
              var tSelectedCases = iContext.contextStorage._links_.selectedCases.map(function (iLink) {
                return tDocContext.getCaseByID(iLink.id);
              });
              // allow for a render cycle
              tDocContext.invokeOnceLater(function () {
                tDocContext.applyChange({
                  operation: 'selectCases',
                  select: true,
                  cases: tSelectedCases
                });
              }, 200);
            }
          });
        }

        var tResult = true;

        deleteComponentsNotInDocObject();

        deleteDataContextsNotInDocObject();

        reinstateGlobalValues();

        createOrUpdateDataContexts();

        createOrUpdateComponents();

        reinstateSelection();

        return tResult;
      }

    }
);
