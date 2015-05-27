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

/** @class

  Coordinating controller for the document.

  @extends SC.Object
*/

/*global CSV: true */

DG.DocumentArchiver = SC.Object.extend(
/** @scope DG.DocumentArchiver.prototype */ {

    /**
     Tests the JSON text for validity as a possible document.

     The following assertions are tested:

     (1) The document is valid JSON. that is: it parses correctly
     (2) The document looks like a valid CODAP document. It has all mandatory
     top level elements and no unexpected top level elements.
     (3) all internal links can be resolved.

     @param    {String}    iDocument -- The JSON-formatted document text
     @returns  {[String]}   An array of error messages, zero length, if none.
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
              symbols.push(Number(value));
              return true;
            } else if (key === '_links_') {
              DG.ObjectMap.forEach(value, function(k, v) {
                references.push(Number(v.id));
              });
              return true;
            } else if (key === 'contextStorage') { // context storage is private to data interactive
              return false;
            }

          });
        });
        references.forEach(function (ref) {
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
        '_permissions'
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
    Open the specified document text as a new document, returning the newly-created document.
   */
  openDocument: function( iStore, iDocText) {
    var deferred = $.Deferred(),
    externalDocIds = DG.StringUtilities.scan(iDocText, /"externalDocumentId": ?"?(\d+)"?/g, function(m) { return m[1]; }),
        promises = DG.authorizationController.loadExternalDocuments(externalDocIds);

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

  importCSV: function (iText, iFileName) {

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
        tChildName = 'children',// Child Collection Name: should be first
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
            name: iName
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

    var docArchive = parseText( );
    return docArchive;
  },
  /**
   *
   * @param iText - csv or tab-delimited
   * @returns {DG.Document}
   */
  importTextIntoDocument: function( iText, iName) {
    var docArchive = this.importCSV(iText, iName);

    return DG.Document.createDocument(docArchive);
  },

  /**
   *
   * @param iURL - URL of data interactive
   * @returns {DG.Document}
   */
  importURLIntoDocument: function (iURL) {
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
    Save the specified document in its JSON-text form.
    @param    {DG.Document}   iDocument   The document whose contents are to be archived

    signature of `callback`:
    @param  {Object} docArchive      An object suitable for JSON encoding
   */
  saveDocument: function( iDocument, callback, fullData) {
    
    // Prepare the context-specific storage for saving.
    // Start by saving the state of the current game in the appropriate context.
    // Callback below executes after the state has been saved
    DG.currDocumentController().saveCurrentGameState(function() {
      var docController = DG.currDocumentController();      
      DG.DataContext.forEachContextInMap( iDocument.get('id'),
        function( iContextID, iContext) {
          iContext.willSaveContext();
        });
      if( docController) {
        // Prepare the component-specific storage for saving
        DG.ObjectMap.forEach( docController.componentControllersMap,
          function( iComponentID, iController) {
            iController.willSaveComponent();
          });
      }

      callback(iDocument.toArchive(fullData));
    });
  },

  saveDataContexts: function( iDocument, callback, saveAll) {
    var model,
        deferred = $.Deferred();
    DG.currDocumentController().saveCurrentGameState(function() {
      DG.DataContext.forEachContextInMap( iDocument.get('id'),
        function( iContextID, iContext) {
          iContext.willSaveContext();
          model = iContext.get('model');
          if ( saveAll || !SC.none(model.get('externalDocumentId'))) {
            callback(model, model.toArchive(true));
          }
        });
      deferred.resolve();
    });
    return deferred;
  }

});

