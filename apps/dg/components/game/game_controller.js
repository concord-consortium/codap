// ==========================================================================
//                          DG.GameController
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

sc_require('controllers/component_controller');

/** @class
 *
 * The GameController manages a Component presumably containing a Data
 * Interactive.
 *
 * From CODAP's perspective a Data Interactive is a data source. It provides
 * data to an associated Data Context.
 *
 * It receives events from the interactive and acts upon them. Chiefly these
 * are events that create or update case data in collections managed by its
 * data context.
 *
 * @extends DG.ComponentController
*/
DG.GameController = DG.ComponentController.extend(
/** @scope DG.GameController.prototype */ {

      savedChangeCount: 0,

      /**
       Whether or not the document contains unsaved changes such that the user
       should be prompted to confirm when closing the document, for instance.
       @property   {Boolean}
       */
      hasUnsavedChanges: function() {
        return this.get('changeCount') > this.get('savedChangeCount');
      }.property(),

      /**
       Synchronize the saved change count with the full change count.
       This method should be called when a save occurs, for instance.
       */
      updateSavedChangeCount: function() {
        this.set('savedChangeCount', this.get('changeCount'));
      },

      gameViewWillClose: function() {
      }


    }) ;

/**
 * The entry point for synchronous invocation of the Data Interactive API.
 * There is a problem of identification. The API implied a singular Data
 * Interactive. The synchronous API is regarded as deprecated. So, we will
 * respond to this API only if there is a single Data Interactive in the
 * system.
 *
 * TODO: Consider modifying the API to support channel identification.
 *
 * @param iCmd
 * @param iCallback
 * @returns {*}
 */
DG.doCommand = function( iCmd, iCallback)  {
  var result, interactives = DG.currDocumentController().get('dataInteractives'),
    myController = (interactives && interactives.length === 1)? interactives[0] : undefined;
  if (myController) {
    SC.run( function() { result = myController.dispatchCommand( iCmd, iCallback); });
  }
  return result;
};

/**
 * This entry point allows other parts of the code to send arbitrary commands to the
 * DataInteractive, if one exists. The commands should be one of the existing commands
 * defined in the list of CODAP-Initiated Actions,
 * https://github.com/concord-consortium/codap/wiki/Data-Interactive-API#codap-initiated-actions
 * and must be fully specified (e.g. `{operation: 'xyz'}).
 *
 * @param iCmd       An object representing the command to be send
 * @param iCallback  An optional callback passed back from the DI
 */
DG.sendCommandToDI = function( iCmd, iCallback) {
  var interactives = DG.currDocumentController().get('dataInteractives'),
    myController = (interactives && interactives.length === 1)? interactives[0] : undefined;
  if (myController && myController.phone && myController.get('gameIsReady')) {
    myController.phone.call(iCmd, iCallback);
  }
};

