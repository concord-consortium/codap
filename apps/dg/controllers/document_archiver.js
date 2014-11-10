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
DG.DocumentArchiver = SC.Object.extend(
/** @scope DG.DocumentArchiver.prototype */ {

  
  /**
    Open the specified document text as a new document, returning the newly-created document.
   */
  openDocument: function( iStore, iDocText) {
    var docArchive = SC.json.decode( iDocText),
        dataSource = DG.ModelStore.create();

    DG.store = dataSource;
    DG.Document.createDocument(docArchive);
    return DG.activeDocument;
  },

  /**
    Save the specified document in its JSON-text form.
    @param    {DG.Document}   iDocument   The document whose contents are to be archived

    signature of `callback`:
    @param  {Object} docArchive      An object suitable for JSON encoding
   */
  saveDocument: function( iDocument, callback) {
    
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

      callback(iDocument.toArchive());
    });
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

