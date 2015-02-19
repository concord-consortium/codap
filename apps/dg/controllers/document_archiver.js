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
    Open the specified document text as a new document, returning the newly-created document.
   */
  openDocument: function( iStore, iDocText) {
    var docArchive = SC.json.decode( iDocText),
        dataSource = DG.ModelStore.create();

    DG.store = dataSource;
    return DG.Document.createDocument(docArchive);
  },

  /**
   *
   * @param iText - csv or tab-delimited
   * @returns {DG.Document}
   */
  importTextIntoDocument: function( iText) {
    // trims empty columns from right side of
    function trimTrailingColumns(arr) {
      var newArr = [];
      arr.forEach(function (row) {
        var value;
        if (Array.isArray(row)) {
          do {
            value = row.pop();
          } while(value === '');
          if (value) row.push(value);
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
                "document": 1,
                "collections": [
                  {
                    "attrs": [],
                    "cases": []
                  }
                ]
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
      components: [
        {
          "type": "DG.GameView",
          "componentStorage": {
            "currentGameName": "",
            "currentGameUrl": iURL,
            allowInitGameOverride: true
          }
        }
      ],
      contexts: [
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
    DG.gameSelectionController.saveCurrentGameState(function() {
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
    DG.gameSelectionController.saveCurrentGameState(function() {
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
  },

  /**
   * Copy the specified document case data in tab-delimited string form
   * @param	{String} iWhichCollection 'parent' or 'child' (TODO: allow 'both' for flatted collection with all attributes)
   * @param {DG.Document}	iDocument   The document whose contents are to be archived
   * @returns {String}	The export string
   */
  exportCaseData: function( iDocument, iWhichCollection ) {
    var caseDataString = '';

    DG.DataContext.forEachContextInMap( iDocument.get('id'),
      function( iContextID, iContext) {
        caseDataString += iContext.exportCaseData( iWhichCollection );
      });
    return caseDataString;
  }

});

