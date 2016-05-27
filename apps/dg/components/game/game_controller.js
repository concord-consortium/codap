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

      shouldConfirmClose: function () {
        return this.connected;
      }.property('connected'),

      confirmCloseDescription: 'DG.GameController.confirmCloseDescription',

      shouldDestroyOnComponentDestroy: true,

      gameIsReady: true,  // Will be set to false at the point we discover we're
                          // going to have a default game loaded

      /**
       * Every game manages directly a default GameContext. A game context knows
       * basic information about the game and has collections and the namespace
       * for the game to store its data into.
       *
       * @property {DG.GameContext}
       */
      contextBinding: '.model.context',

      savedChangeCount: 0,

      /**
       * If true, permit the data interactive to participate in normal component
       * selection, including
       * @type {boolean}
       */
      preventBringToFront: true,

      /**
       * Break loops
       */
      destroy: function() {
        this.setPath('model.content', null);
        sc_super();
      },

      gameViewWillClose: function() {
      },

      /**
       * Saves the current state of the DataInteractive (if the DataInteractive supports this).
       *
       * This should be assumed to be asynchronous, as it will generally use iFramePhone,
       * although it's possible for it to return synchronously.
       *
       * @param {Function} callback     A function which will be called with a results object:
       * {success: bool, state: state}
       */
      saveGameState: function (callback) {
        var dataInteractiveHandler = this.getPath('view.contentView.dataInteractivePhoneHandler');
        var gamePhoneHandler = this.getPath('view.contentView.gamePhoneHandler');
        if (dataInteractiveHandler && dataInteractiveHandler.get('isActive')) {
          dataInteractiveHandler.requestDataInteractiveState(callback);
        } else if (gamePhoneHandler && gamePhoneHandler.get('gameIsReady')) {
          gamePhoneHandler.saveGameState(callback);
        } else {
          callback({success: false, state: null});
        }
      },

      /**
       *  Returns an object that should be stored with the document when the document is saved.
       *  @returns  {Object}  An object whose properties should be stored with the document.
       */
      createComponentStorage: function () {
        var tStorage = this.getPath('model.componentStorage');

        if (!SC.none(this.context)) {
          // Save information about the current game
          tStorage.currentGameName = tStorage.currentGameName || this.getPath('context.gameName');
          tStorage.currentGameUrl = tStorage.currentGameUrl || this.getPath('context.gameUrl');
        }

        var dataContext = this.get('context');

        if (dataContext && !this.getLinkID(tStorage, 'context')) {
          this.addLink(tStorage, 'context', dataContext);
        }

        // Save any user-created formulas from DG.FormulaObjects.
        // Currently, only formulas from the current game are saved.
        // Eventually, the formulas should be stored with the DG.GameContext
        // and they should be saved for any game in which formulas are defined.
        tStorage.currentGameFormulas = SC.clone(this.getPath('context.formulas'));

        return tStorage;
      },

      /**
       *  Restores the properties of the DG.GamePhoneHandler from the specified Object.
       *  @param  {Object}  iComponentStorage -- The object whose properties should be restored.
       *  @param  {String}  iDocumentID -- The ID of the document being restored.
       */
      restoreComponentStorage: function (iComponentStorage, iDocumentID) {
        var gameName = iComponentStorage.currentGameName,
            gameUrl = iComponentStorage.currentGameUrl,
            contextID,
            dataContext;


        // We try to hook up the appropriate restored context.
        // Try to restore the data context for the current game.
        // First, see if it was written out with the document.
        // (Writing out the link began in build 0175.)
        contextID = this.getLinkID(iComponentStorage, 'context');
        dataContext = contextID && DG.DataContext.retrieveContextFromMap(iDocumentID, contextID);
        if (!dataContext) {
          // If it wasn't written out with the document, look for one
          // associated with a game of the correct name, or for the
          // first context as a last resort.
          DG.currDocumentController().contexts.forEach(function (iContext) {
            // Look for a context with matching game name.
            // Note that at the moment, 'gameName' is a computed
            // property which relies on the 'gameSpec' property
            // having been set, which is unlikely to have occurred
            // given that the gameSpec doesn't know about the context.
            // This could change down the road, however, so we leave it.
            if (!dataContext && iContext) {
              var contextGameName = iContext.get('gameName');
              if (contextGameName === gameName) {
                dataContext = iContext;
              }
            }
          });
        }
        if (dataContext) {
          this.set('context', dataContext);
          this.setPath('context.gameName', gameName);
          this.setPath('context.gameUrl', gameUrl);
        }

        // If there are user-created formulas to restore, set them in the
        // gameSpec.
        if (dataContext && iComponentStorage.currentGameFormulas)
          dataContext.set('formulas', iComponentStorage.currentGameFormulas);

        this.set('gameIsReady', true);
      },


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

