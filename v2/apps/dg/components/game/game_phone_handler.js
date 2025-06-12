// ==========================================================================
//                          DG.GamePhoneHandler
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
 * The GamePhoneHandler manages a Component presumably containing a Data
 * Interactive.
 *
 * From CODAP's perspective a Data Interactive is a data source. It provides
 * data to an associated Data Context.
 *
 * It receives events from the interactive and acts upon them. Chiefly these
 * are events that create or update case data in collections managed by its
 * data context.
 *
 * @extends SC.Object
 */
DG.GamePhoneHandler = SC.Object.extend(
    /** @scope DG.GamePhoneHandler.prototype */ {

      /**
       Array of case IDs of currently open cases.
       @property {Array} of Number
       */
      openCaseIDs: null,

      /**
       * Handles communication over PostMessage interface.
       *
       * Set up by creator.
       *
       * @property {iframePhone.IframePhoneRpcEndpoint}
       */
      rpcEndpoint: null,

      /**
       * The game's controller.
       *
       * Set up by creator.
       *
       * @property {DG.GameController}
       */
      controller: null,

      /**
       * We need to be able to set version and title.
       */
      view: function() {
        return this.getPath('controller.view');
      }.property(),

      connected: false,

      /**
       * Every game manages exactly one GameContext. A game context knows
       * basic information about the game and has collections and the namespace
       * for the game to store its data into.
       *
       * @property {DG.GameContext}
       */
      contextBinding: '.controller.context',

      /**
       * Method for synchronous Data Interactive communication with a
       * data interactive (deprecated). Set by initGame.
       * This method is used for CODAP to initiate requests to
       * the Data Interactive.
       *
       * @property {Function}
       */
      doCommandFunc: null,

      /**
       * Name used for synchronous Data Interactive communication with a
       * Flash-based data interactive (deprecated). Set by initGame.
       * This name is used to identify an element with which to initiate requests to
       * the Data Interactive.
       *
       * @property {String}
       */
      gameEmbedID: null,

      /**
       Initialization method
       */
      init: function () {
        sc_super();

        this.openCaseIDs = [];
      },

      /**
       * Break loops
       */
      destroy: function () {
        if (this.rpcEndpoint) {
          this.rpcEndpoint.disconnect();
        }
        sc_super();
      },

      /**
       Returns the IDs of any currently open game cases, plus the child cases of those cases.
       @param iExcludeChildren {Boolean} optional parameter to not include child
       cases of open game cases.
       @returns  {Array} of Number   Array of open case IDs
       */
      getOpenCaseIDs: function (iExcludeChildren) {
        var tGameContext = this.get('context'),
            tOpenCaseIDs = [],
            tIncludeChildCases = !iExcludeChildren;

        // Adds the id of the specified case and all of its child cases to tOpenCaseIDs.
        function addCase(iCase) {
          tOpenCaseIDs.push(iCase.get('id'));

          if (tIncludeChildCases) {
            var childCases = iCase.get('children');
            childCases.forEach(function (iChildCase) {
              addCase(iChildCase);
            });
          }
        }

        // New Game API support -- Add open parent cases, child cases, and their values
        this.openCaseIDs.forEach(function (iCaseID) {
          var parentCase = tGameContext.getCaseByID(iCaseID);
          if (parentCase) addCase(parentCase);
        });

        // Old Game API support -- Add open parent cases, child cases, and their values
        DG.ObjectMap.forEach(this._openParentCases, function (iCollectionName, iOpenCase) {
          addCase(iOpenCase);
        });

        // Return the caseIDs to the caller
        return tOpenCaseIDs;
      },

      doCommand: function (iCmd, iCallback) {
        //DG.logWarn("DG.currGamePhoneHandler.doCommand is deprecated. Use DG.doCommand instead.");
        var result;
        SC.run(function () {
          result = this.dispatchCommand(iCmd, iCallback);
        }.bind(this));
        return result;
      },

      dispatchCommand: function (iCmd, iCallback) {
        var tCmdObj = null,
            tRet = {'success': false},
            tShouldDirtyDocument = true;

        this.setIfChanged('connected', true);

        // If it's a string, parse it as JSON
        if (SC.typeOf(iCmd) === SC.T_STRING) {
          // Catch any exceptions thrown by the parser
          try {
            tCmdObj = SC.json.decode(iCmd);
          }
          catch (e) {
            // TODO: Report invalid JSON back to caller
            DG.logWarn("Invalid JSON in doCommand(), reported from DG.GamePhoneHandler.dispatchCommand()");
            DG.log("JSON: " + iCmd);
          }
        }
        // If it's not a JSON-formatted string, assume it's a JavaScript cmd object
        else {
          tCmdObj = iCmd;
        }

      try {

        // Bail if we don't have a valid tCmdObj at this point
        if (!tCmdObj) return tRet;

        if (this.context && this.context.get('flexibleGroupingChangeFlag')
            && (['initGame',
              'createCollection',
              'openCase',
              'createCase',
              'createCases',
              'updateCases',
              'deleteCases'].indexOf(tCmdObj.action) >= 0)) {
          DG.log('User has reordered Data Context, "%@", further updates ' +
              'from data interactives prohibited.', this.context.get('name'));
          this.invokeLater(function () {
            this.showErrorAlert('DG.GamePhoneHandler.continuityError');
          }.bind(this));
          return tRet;
        }

        // Dispatch the action to the appropriate handler
        switch (tCmdObj.action) {

          /*
           * New API
           */
          case 'initGame':
            this.handleInitGame(tCmdObj.args, function () {
              var ret = {success: true};

              this.set('changeCount', 0);
              this.controller.updateSavedChangeCount();
              tShouldDirtyDocument = false;

              finishDispatchCommand.call(this);

              if (iCallback) {
                iCallback(ret);
              } else {
                return ret;
              }
            }.bind(this));
            return;

          case 'createComponent':
            // If we're in standalone mode, we allow more than one component of a type to be created
            tCmdObj.args.initiatedViaCommand = true;
            tRet = this.handleCreateComponent(tCmdObj.args, DG.STANDALONE_MODE);
            break;

          case 'createCollection':
            tRet = this.handleCreateCollection(tCmdObj.args);
            break;

          case 'openCase':
            tRet = this.handleOpenCase(tCmdObj.args);
            break;

          case 'updateCase':
            tRet = this.handleUpdateCase(tCmdObj.args);
            break;

          case 'closeCase':
            tRet = this.handleCloseCase(tCmdObj.args);
            break;

          case 'createCase':
            tRet = this.handleCreateCase(tCmdObj.args);
            break;

          case 'createCases':
            tRet = this.handleCreateCases(tCmdObj.args);
            break;

          case 'deleteCases':
            tRet = this.handleDeleteCases(tCmdObj.args);
            break;

          case 'deleteAllCaseData':
            tRet = this.handleDeleteAllCaseData(tCmdObj.args);
            break;

          case 'logAction':
            tRet = this.handleLogAction(tCmdObj.args);
            tShouldDirtyDocument = false;
            break;

          case 'reset':
            tRet = this.handleReset(tCmdObj.args);
            break;

          case 'undoableActionPerformed':
            tRet = this.handleUndoableAction(tCmdObj.args);
            break;

          case 'undo':
            tRet = DG.UndoHistory.undo();
            break;

          case 'redo':
            tRet = DG.UndoHistory.redo();
            break;

          /*
           * Old API
           */
          case 'requestAttributeValues':
            tRet = this.handleRequestAttributeValues(tCmdObj.args);
            tShouldDirtyDocument = false;
            SC.warn("Deprecated API Call: " + tCmdObj.action);
            break;

          default:
            tShouldDirtyDocument = false;
            SC.warn("Dispatch of unknown Data Interactive action(" + tCmdObj.action +
                "): ignoring");
            break;
        }
      } catch (ex) {
        DG.logWarn('DG.GameController.doCommand: Caught exception: ' + ex);
        //DG.logWarn('Original command: ' + (tCmdObj && JSON.stringify(tCmdObj)));
        tRet = tRet || {};
        tRet.success = false;
      }

        function finishDispatchCommand() {
          if (tShouldDirtyDocument) {
            this.incrementProperty('changeCount');
          }
        }

        finishDispatchCommand.call(this);

        if (iCallback) {
          //this.invokeLast(function() {
          iCallback(tRet);
          //});
          return tRet;
        }

        return tRet;
      },

      /**
       'initGame' handler
       @param {Object}   iArgs   See below for arguments
       @param {Function} callback  Callback, called when game is inited (this
       includes
       any game-state restoration)
       args: {
        name: "Name String",
        version: "Version String",
        dimensions: { width: _WIDTH_PIX_, height: _HEIGHT_PIX_ },
        contextType: 'DG.GameContext' | 'DG.DataContext', ...
        // Collections required to be ordered from grandparent-to-parent-to-child
        collections: [  // array of collections to create
          {
            name: "Collection1",
            attrs: [  // array of attributes to create/guarantee for this collection
              { name: "name string", type: 'numeric'|'nominal', [precision: _DECIMAL_PRECISION_] },
              ...
            ],
            labels: {
              singleCase: "singular name, e.g.: trial",
              pluralCase: "plural name, e.g.: trials",
              singleCaseWithArticle: "e.g.: a trial",
              setOfCases: "singular name, e.g.: game",
              setOfCasesWithArticle: "e.g.: a game"
            },
            defaults: {
              xAttr: "attribute name",
              yAttr: "attribute name",
              legendAttr: "attribute name",
              groupAttr: "attribute name"
            }
          },
          ...
        ]
      }
       */
      handleInitGame: function (iArgs, iCallback) {
        var finishInitGame = function () {
          SC.run(function () {
            // Ordinarily a component controller's model.content is the model that store's the
            // underlying state. But the model for a game controller (a Component) doesn't have
            // a natural content. So, as a workaround, we make ourselves its content so we can provide
            // a default title.
            this.set('defaultTitle', iArgs.name);
            this.setPath('model.content', this);

            // Once all the collections and attributes are created,
            // we're ready to play the game.
            this.set('gameIsReady', true);
            this.notifyPropertyChange('gameIsReady');

            if ((iArgs.log === undefined) || iArgs.log)
              DG.logUser("initGame: '%@', Collections: [%@]", tCurrentGameName,
                  tGameCollections.getEach('name').join(", "));
            this.updateLayout();
            if (iCallback) {
              iCallback();
            }
          }.bind(this));
        }.bind(this);

        //DG.log('InitGame: ' + JSON.stringify(iArgs));
        // The game-specified arguments form the core of the new DG.GameSpec.
        var tCurrentGameName = this.getPath('context.gameName'),
            tContextGameUrl = this.getPath('context.gameUrl'),
            tStoredGameUrl = this.getPath('model.componentStorage.currentGameUrl'),
            // 'di' URL param can override stored URL
            tCurrentGameUrl = tContextGameUrl || DG.finalGameUrl(tStoredGameUrl),
            tGameContext = this.get('context'),
            tGameCollections = [],
            tRestoredGameState,
            tRestoreCommand,
            tDoAppCommandFunc,
            tGameElement,
            tReturn = {success: true};

        if (SC.none(tGameContext)) {
          tGameContext = DG.currDocumentController().createNewDataContext({
            type: 'DG.GameContext'
          });
          this.set('context', tGameContext);
        }

        // Ask for the context after we've copied the arguments/properties,
        // so that if there's a 'contextType' it will be used.
        if (iArgs.name) {
          this.setPath('context.gameName', iArgs.name);
        }

        if (iArgs.version) {
          this.setPath('context.gameVersion', iArgs.version);
        }

        if (SC.empty(this.getPath('context.gameUrl'))) {
          this.setPath('context.gameUrl', tCurrentGameUrl);
        }

        if (iArgs.dimensions) {
          this.setPath('context.gameDimensions', {
            width: iArgs.dimensions.width, height: iArgs.dimensions.height
          });
        }

        if (!SC.none(iArgs.preventBringToFront)) {
          this.set('preventBringToFront', iArgs.preventBringToFront);
        }

        this.set('doCommandFunc', iArgs.doCommandFunc);
        this.set('gameEmbedID', iArgs.gameEmbedID);

        this.setPath('view.version',
            SC.none(this.context.gameVersion) ? '' : this.context.gameVersion);
        this.setPath('view.title',
            SC.none(this.context.gameName) ? '' : this.context.gameName);

        // Create/guarantee each collection and its required attributes
        if (iArgs.collections) {
          iArgs.collections.forEach(function (collectionArgs) {
            var result = this.handleCreateCollection(collectionArgs);
            tReturn.success = tReturn.success && result.success;
          }.bind(this));
        }

        // Notify that the collections have changed
        this.notifyPropertyChange('collections');

        // If we have restored game state for this game, we pass it to the game
        // at this point, before we've signalled that the game is ready. This way,
        // clients that respond to 'gameIsReady' won't have a chance to query the
        // game until it has finished restoring its state.
        tRestoredGameState = tGameContext && tGameContext.get('restoredGameState');
        tRestoreCommand = {
          operation: 'restoreState', args: {state: tRestoredGameState}
        };
        tDoAppCommandFunc = this.get('doCommandFunc');
        tGameElement = this.findCurrentGameElement(this.get('gameEmbedID'));

        if (tRestoredGameState) {
          if (tDoAppCommandFunc) {
            // for javascript games we can call the games 'doCommandFunc' directly
            tDoAppCommandFunc(tRestoreCommand);
          } else if (tGameElement && tGameElement.doCommandFunc) {
            // for flash games we must find the embedded swf object, then call its 'doCommandFunc'
            tGameElement.doCommandFunc(SC.json.encode(tRestoreCommand));
          } else if (this.get('isPhoneInUse')) {
            this.rpcEndpoint.call(tRestoreCommand, finishInitGame.bind(this));
            return tReturn;
          }
        }
        finishInitGame.call(this);
        return tReturn;
      },
      /**
       Create a component of the specified type.
       */
      handleCreateComponent: function (iArgs, iAllowMoreThanOne) {
        if (iAllowMoreThanOne)
          iArgs.allowMoreThanOne = true;
        // We use sendAction() here to avoid Lakosian issues
        return SC.RootResponder.responder.sendAction('createComponentAndView', null, this, null, iArgs);
      },

      /**
       * Find the current game element in DG, by searching the DOM
       *    Useful for callbacks to embedded flash .swf objects,
       *    which have functions made available by AS3's ExternalInterface.addCallback()
       * @param embeddedGameID the ID parameter of the game, e.g. set by ChainSaw.html for ChainSaw.swf
       * @return {} null or an element of an iFrame that has the given html ID.
       */
      findCurrentGameElement: function (embeddedGameID) {
        // games are dynamically embedded objects in iFrames
        var iFrames = document.getElementsByTagName("iframe"),
            gameElement = null;
        if (embeddedGameID) {
          var i, j; // find first iFrame with embedded element ID==embeddedGameID (expect 0 or 1 match)
          for (i = 0, j = iFrames.length; i < j && !gameElement; ++i) {
            try {
              gameElement = iFrames[i].contentWindow.document.getElementById(embeddedGameID);
            } catch (ex) {
              // errors may occur here because of same origin restrictions, we
              // expect that, so can ignore.
            }
          }
        }
        return gameElement;
      },

      notifyGameAboutExternalUndo: function () {
        if (this.get('gameIsReady') && DG.UndoHistory.get('enabled')) {
          if (DG.STANDALONE_MODE) {
            this.rpcEndpoint.call({operation: "standaloneUndoModeAvailable"});
          } else {
            this.rpcEndpoint.call({operation: "externalUndoAvailable"});
          }
        }
      }.observes('gameIsReady'),

      /**
       Returns the ID of the created case for passing to further 'openCase' or 'createCase' calls.
       @param {String} iAction   Command being executed (e.g. 'openCase',
       'createCase')
       @param {Object} iArgs     Arguments passed to the command
       @returns {Object}         { success: {Boolean}, [caseID: {Number}] }
       */
      doCreateCase: function (iAction, iArgs) {
        // TODO: Consolidate with doCreateCases() method below.
        var tGameContext = this.get('context'),
            collection = tGameContext.getCollectionByName(iArgs.collection),
            caseProperties = {},
            ret = {success: false};
        if (!SC.none(iArgs.parent))
          caseProperties.parent = iArgs.parent;

        if (!DG.assert(tGameContext, 'Missing game Context'))
          return ret;

        var change = {
          operation: 'createCase',
          properties: caseProperties,
          values: iArgs.values
        };
        if (collection)
          change.collection = collection;
        else  // We don't assert, because the data context will default to the child collection.
          DG.logWarn("DG.GamePhoneHandler.doCreateCase: Can't find collection '%@'", iArgs.collection);

        ret = tGameContext.applyChange(change);

        /*    Logging createCase generates too much logging, so turn it off, at least when it comes from
         a data interactive.
         if( ret.success && ((iArgs.log === undefined) || iArgs.log))
         DG.logUser("%@: %@ [%@]", iAction, iArgs.collection, iArgs.values.join(", "));
         */
        return ret;
      },

      /**
       Returns the ID of the created case for passing to further 'openCase' or 'createCase' calls.
       @param {String} iAction   Command being executed (e.g. 'openCase',
       'createCase')
       @param {Object} iArgs     Arguments passed to the command
       @returns {Object}         { success: {Boolean}, [caseID: {Number}] }
       */
      doCreateCases: function (iAction, iArgs) {
        var tGameContext = this.get('context'),
            collection = tGameContext.getCollectionByName(iArgs.collection),
            caseProperties = {},
            ret = {success: false};
        if (!SC.none(iArgs.parent))
          caseProperties.parent = iArgs.parent;

        if (!DG.assert(tGameContext, 'Missing game context'))
          return ret;

        var change = {
          operation: 'createCases',
          properties: caseProperties,
          values: iArgs.values
        };
        if (collection)
          change.collection = collection;
        else  // We don't assert, because the data context will default to the child collection.
          DG.logWarn("DG.GamePhoneHandler.doCreateCase: Can't find collection '%@'", iArgs.collection);

        ret = tGameContext.applyChange(change);

        if (ret.success && ((iArgs.log === undefined) || iArgs.log))
          DG.logUser("%@: %@ %@ cases created", iAction, iArgs.collection, iArgs.values.length);
        return ret;
      },

      /**
       * Deletes named cases.
     * @param {array} iCaseIDs
       * @returns {{success: boolean}}
       */
      doDeleteCases: function (iCaseIDs) {
        var tGameContext = this.get('context'),
            cases = [],
            change = {
              operation: 'deleteCases',
              cases: cases
            },
            ret;
        iCaseIDs.forEach(function (iCaseID) {
          var tCase = tGameContext.getCaseByID(iCaseID);
          if (tCase) {
            cases.push(tCase);
          }
        });
        ret = tGameContext.applyChange(change);
        if (SC.none(ret)) {
          DG.logWarn('UpdateCase failed to return a value');
          ret = {success: true};
        }

        return ret;
      },
      /**
       Update the values of an existing case.
       @param {String} iAction   Command being executed (e.g. 'openCase',
       'createCase')
       @param {Object} iArgs     Arguments passed to the command
       @returns {Object}         { success: {Boolean} }
       */
      doUpdateCase: function (iAction, iArgs) {
        var tGameContext = this.get('context'),
            collection = tGameContext.getCollectionByName(iArgs.collection),
            theCase = tGameContext.getCaseByID(iArgs.caseID),
            ret = {success: false};
        if (collection && theCase && iArgs.values) {
          var change = {
            operation: 'updateCases',
            collection: collection,
            cases: [theCase],
            values: [iArgs.values]
          };
          ret = tGameContext.applyChange(change);
          if (SC.none(ret)) {
            DG.logWarn('UpdateCase failed to return a value');
            ret = {success: true};
          }
        }
        if (iArgs.values && ((iArgs.log === undefined) || iArgs.log)) {
          DG.logUser("%@: %@ [%@]", iAction, collection.get('name'),
              iArgs.values ? iArgs.values.join(", ") : "");
        }
        return ret;
      },

      /**
       Create a new parent case, i.e. one that is expected to have child cases attached to it.
       Returns the ID of the created case for passing to further 'openCase' or 'createCase' calls.
       @param {Object} iArgs     Arguments passed to the 'openCase' command
       @returns {Object}         { success: {Boolean}, [caseID: {Number}] }
       */
      handleOpenCase: function (iArgs) {
        var tResult = this.doCreateCase('openCase', iArgs);
        if (tResult.success && !SC.none(tResult.caseID))
          this.openCaseIDs.pushObject(tResult.caseID);
        return tResult;
      },

      /**
       Update an open parent case with intermediate values.
       @param {Object} iArgs     Arguments passed to the 'updateCase' command
       @returns {Object}         { success: {Boolean} }
       */
      handleUpdateCase: function (iArgs) {
        return this.doUpdateCase('updateCase', iArgs);
      },

      /**
       Close an open parent case once the last of its child cases has been created.
       @param {Object} iArgs     Arguments passed to the 'closeCase' command
       @returns {Object}         { success: {Boolean} }
       */
      handleCloseCase: function (iArgs) {
        var tResult = this.doUpdateCase('closeCase', iArgs);
        if (!SC.none(iArgs.caseID))
          this.openCaseIDs.removeObject(iArgs.caseID);
        return tResult;
      },

      /**
       Create a leaf case, i.e. one which does not have any child cases.
       Returns the ID of the created case.
       @param {Object} iArgs     Arguments passed to the 'openCase' command
       @returns {Object}         { success: {Boolean}, [caseID: {Number}] }
       */
      handleCreateCase: function (iArgs) {
        return this.doCreateCase('createCase', iArgs);
      },

      /**
       Create a leaf case, i.e. one which does not have any child cases.
       Returns the ID of the created case.
       @param {Object} iArgs     Arguments passed to the 'openCase' command
       @returns {Object}         { success: {Boolean}, [caseID: {Number}] }
       */
      handleCreateCases: function (iArgs) {
        return this.doCreateCases('createCases', iArgs);
      },

      /**
       * Delete identified cases. If parent cases, delete children.
       * @param {Object} iArgs {caseIDs: [Number, ...]}
       */
      handleDeleteCases: function (iArgs) {
        return this.doDeleteCases(iArgs.caseIDs);
      },

      /**
       Delete all case data not associated with the current game case.
       @param {Object} iArgs     Arguments passed to the 'deleteAllCaseData'
       command
       @returns {Object}         { success: {Boolean}, [caseID: {Number}] }
       */
      handleDeleteAllCaseData: function (iArgs) {
        DG.logUser("deleteAllCaseData by Game");  // deleted via Game API, not via Delete Data button.
        var preserveAllGameCasesOption = iArgs && iArgs.preserveAllGames,
            preserveOpenEventCasesOption = iArgs && iArgs.preserveOpenEvents;
        return this.doDeleteAllCaseData(preserveAllGameCasesOption, !preserveOpenEventCasesOption);
      },


      /**
       Reset CODAP

       Remove the collections in the data context: they are to be redefined by the
       Data Interactive.
       */
      handleReset: function (iArgs) {
        // Destroy the collections: not just the cases within, but the attribute
        // definitions, too.
        this.doResetCollections();
      },

      /**
       The DataInteractive performed an undoable action

       We don't perform any action, because the external game has already performed the
       action. We simply store this new command in the stack, and the undo/redo of this
       command call undo/redo on the game.
       */
      handleUndoableAction: function (iArgs) {
        var logMessage = iArgs && iArgs.logMessage ? iArgs.logMessage : "Unknown action";
        var rpcEndpoint = this.get('rpcEndpoint');
        var handleUndoRedoCompleted = this.handleUndoRedoCompleted;
        DG.UndoHistory.execute(DG.Command.create({
          name: 'interactive.undoableAction',
          undoString: 'DG.Undo.interactiveUndoableAction',
          redoString: 'DG.Redo.interactiveUndoableAction',
          log: 'Interactive action occurred: ' + logMessage,
          execute: function () {
          },
          undo: function () {
            // FIXME If the game component was removed and then re-added via an undo,
            // then calling undo or redo here will likely fail because the game's undo stack would
            // probably have been cleared.
            rpcEndpoint.call({operation: "undoAction"}, handleUndoRedoCompleted);
          },
          redo: function () {
            rpcEndpoint.call({operation: "redoAction"}, handleUndoRedoCompleted);
          }
        }));
      },

      handleUndoRedoCompleted: function (ret) {
        if (ret && ret.success === false) {
          // The Data Interactive was not able to successfully undo or redo an action
          DG.UndoHistory.showErrorAlert(true, {message: "Data Interactive error"});
        }
      },

      /**
       * Reset all collections. Remove all case data and attributes.
       */
      doResetCollections: function () {
        var result,
            dataContext = this.get('context'),
            tChange = {
              operation: 'resetCollections'
            };
        if (dataContext)
          result = dataContext.applyChange(tChange);
        return result;
      },

      /**
       Delete all case data (except data linked to the currently open game case).
       Design for use by user (DG.AppController.deleteAllCaseData()) or by game (this.handleDeleteAllCaseData())
       @param preserveTopCasesOption {Boolean} (optional) prevent delete of all
       top level cases (delete child cases only)
       @param deleteOpenEventCases {Boolean} (optional) also delete open event
       cases, which by default are preserved.
       @returns {{success: boolean}}
       */
      doDeleteAllCaseData: function (preserveTopCasesOption, deleteOpenEventCases) {
        preserveTopCasesOption = preserveTopCasesOption || false;
        deleteOpenEventCases = deleteOpenEventCases || false;
        var dataContext = this.get('context'),
            tCaseIDsToPreserve = this.getOpenCaseIDs(deleteOpenEventCases), // don't delete the open cases (parent or child)
            tGameCollection = null,
            tDeletedCaseIDs = null;

        if (preserveTopCasesOption) {
          // add all top-level case IDs to tCaseIDsToPreserve, removing duplicates with getOpenCaseIDs() above.
          tGameCollection = dataContext && dataContext.getCollectionAtIndex(0); // get top-level collection
          if (tGameCollection) {
            tGameCollection.getCaseIDs().forEach(function (iID) {
              if (tCaseIDsToPreserve.indexOf(iID) === -1) {
                tCaseIDsToPreserve.push(iID);       // not a duplicate, so preserve this game case
              }
            });
          }
        }
        tDeletedCaseIDs = DG.store.destroyAllRecordsOfType(DG.Case, tCaseIDsToPreserve);

        var tChange = {
              operation: 'deleteCases',
              // signal that the action has already been completed
              isComplete: true,
              ids: tDeletedCaseIDs
            },
            result = {success: false};
        if (dataContext)
          result = dataContext.applyChange(tChange);
        return result;
      },

      /**
       Create a collection.
       Returns the ID of the created collection.
       @param {Object}       iCollectionArgs -- An object that specifies the properties of
       the collection
       {String}          iCollectionArgs.name -- Name of the new collection
       {Array of Object} iCollectionArgs.attrs -- Array of attribute specification objects
       @returns {Object}     { success: {Boolean}, collectionID: {Number} }
       */
      handleCreateCollection: function (iCollectionArgs) {
        //DG.log('CreateCollection: ' + JSON.stringify(iCollectionArgs));
        var tGameContext = this.get('context'),
            tCollectionProperties = {
              name: iCollectionArgs.name,
              caseName: iCollectionArgs.caseName,
              labels: iCollectionArgs.labels,
              defaults: iCollectionArgs.defaults,
              collapseChildren: iCollectionArgs.collapseChildren,
              areParentChildLinksConfigured: true
            },
            tGameCollections = tGameContext.get('collections'),
            tResult,
            tCollection;
        if (tGameCollections && tGameCollections.length > 0) {
          tCollectionProperties.parent = tGameCollections[tGameCollections.length - 1].get('id');
        }

        iCollectionArgs.attrs && iCollectionArgs.attrs.forEach(function (attr) {
          if (SC.none(attr.editable)) {
            attr.editable = false;
          }
        });

        tResult = tGameContext &&
            tGameContext.applyChange({
              operation: 'createCollection',
              properties: tCollectionProperties,
              attributes: iCollectionArgs.attrs
            });
        tCollection = tResult && tResult.success && tResult.collection;
        if (tCollection) {
          if ((iCollectionArgs.log === undefined) || iCollectionArgs.log)
            DG.logUser("newCollectionCreated: %@ with %@ attributes", iCollectionArgs.name, iCollectionArgs.attrs.length);
          return {success: true, collectionID: tCollection.get('id')};
        }
        else
          return {success: false};
      },

      /**
       Calls logUser with the specified arguments.
       Uses Function.apply to package the formatStr and replaceArgs for use by the logUser function.
       @param    {Object}    iArgs
       {String}    iArgs.formatStr -- the format string to use for the log statement
       instances of %@ will be replaced by replaceArgs
       {Array}     iArgs.replaceArgs -- Array of values used to replace %@ instances in formatStr
       */
      handleLogAction: function (iArgs) {
        // Must have formatStr to log anything.
        if (iArgs.formatStr) {
          // Combine the formatStr and replaceArgs into an array for Function.apply.
          var applyArgs = [iArgs.formatStr];
          if (iArgs.replaceArgs)
            applyArgs = applyArgs.concat(iArgs.replaceArgs);
          DG.logUser.apply(this, applyArgs);
          return {success: true};
        }
        return {success: false};
      },

      /**
       Get attribute values of the case, matching each of the supplied attribute names.
       Typically used to get values of formula attributes after doUpdateCase().

       If the case exists an array of values will be returned, with success==true.  Array
       values will be null if the matching attribute does not exist, or has a missing value.
       @param {Object} iArgs     Arguments { collection, caseID,
         attributeNames:[] }
       @returns {Object}         { success: {Boolean}, values: [] }
       */
      handleRequestAttributeValues: function (iArgs) {

        // get the case from the requested collection
        var tGameContext = this.get('context'),
            collection = tGameContext.getCollectionByName(iArgs.collection),
            theCase = tGameContext.getCaseByID(iArgs.caseID),
            ret = {success: false, values: []};

        if (collection && theCase && iArgs.attributeNames) {
          // get the attribute values matching each attribute name
          var attrIDs = collection.getAttributeIDs(),
              attrIndex,
              attrValue,
              i, j = iArgs.attributeNames.length;
          for (i = 0; i < j; ++i) {
            attrIndex = collection.getAttributeIndexByName(iArgs.attributeNames[i]);
            attrValue = null;
            if (attrIndex > 0 && attrIndex < attrIDs.length) {
              attrValue = theCase.getValue(attrIDs[attrIndex]);
            }
            ret.values.push(attrValue);
          }
          ret.success = true;
        }
        return ret;
      },

      /**
       [Old Game API] Creates a new collection with the specified attributes.
       This function is called directly by games using the old Game API.
       New games should use the New Game API 'initGame' command.
       @param  {String}  iCollectionName -- The name of the collection to create
       @param  {Array} of String  iAttributeNames -- The names of the attributes
       to create
       */
      newCollectionWithAttributes: function (iCollectionName, iAttributeNames) {
        DG.logUser("newCollectionCreated: %@ [%@]", iCollectionName, iAttributeNames.join(', '));

        var tGameContext = this.get('context'),
            aCollection = tGameContext && tGameContext.guaranteeCollection({
                  name: iCollectionName
                });
        if (aCollection) {
          iAttributeNames.forEach(function (iAttributeName) {
            aCollection.guaranteeAttribute({
              name: iAttributeName
            });
          });
        }

        // Weasels kluge -- Create the Games collection automatically
        if (iCollectionName === "Weasels")
          this.newCollectionWithAttributes("Games", ["game"]);

        // Notify that the collections have changed
        this.notifyPropertyChange('collections');

        this.set('gameIsReady', true);
      },

      _openGameName: '',
      _openParentCollectionName: '',
      _openParentCases: {},

      openParentCase: function (iGameName, iCollectionName, iParentCollectionName, iParentCase) {
        this._openGameName = iGameName;
        this._openParentCollectionName = iParentCollectionName;
        this._openParentCases[iCollectionName] = iParentCase;
      },

      closeParentCases: function () {
        this._openGameName = '';
        this._openParentCollectionName = '';
        this._openParentCases = {};
      },

      closeParentCase: function (iValues) {
        this.closeParentCases();
      },

      getParentCaseFor: function (iValues) {
        return this._openParentCases[Object.keys(this._openParentCases).pop()];
      },


      /**
       Saves the current state of the DataInteractive (if the DataInteractive supports this).

       This should be assumed to be asynchronous, as it will generally use iFramePhone,
       although it's possible for it to return synchronously.

       @param {Function} callback     A function which will be called with a results object:
       {success: bool, state: state}
       */
      saveGameState: function (callback) {
        var doAppCommandFunc = this.get('doCommandFunc'),
            saveCommand = {operation: "saveState"},
            tGameElement = this.findCurrentGameElement(this.get('gameEmbedID')),
            result;

        if (doAppCommandFunc) {
          // for JavaScript games we can call directly with Objects as arguments
          result = doAppCommandFunc(saveCommand);
          callback(result);
        } else if (tGameElement && tGameElement.doCommandFunc) {
          result = tGameElement.doCommandFunc(SC.json.encode(saveCommand));
          if (typeof result === 'string') {
            result = JSON.parse(result);
          }
          callback(result);
        } else if (this.get('isPhoneInUse')) {
          // async path
          this.rpcEndpoint.call(saveCommand, callback);
        } else {
          callback({success: false});
        }
      },

      restoreGameState: function (state) {
        var context = this.getPath('controller.context');
        if (context) {
          context.restoreFromStorage(state);
        }
      },

      gameViewWillClose: function () {
      },

      updateLayout: function () {
        if (DG.STANDALONE_MODE)
          return; // layout has been set to full document. Don't change it.
        var gameView = this.get('view'),
            gameSize = this.getPath('context.gameDimensions'),
            newWidth, newHeight;
        if (gameView && gameSize) {
          newWidth = gameSize.width + DG.ViewUtilities.horizontalPadding();
          newHeight = gameSize.height + DG.ViewUtilities.verticalPadding();
          gameView.adjust('width', newWidth);
          gameView.adjust('height', newHeight);
        }
      },

      /**
       Logs a user action with the specified action name and array of values.
       If no values are passed, the logged message is simply the iActionString.
       If values are specified, they are appended to the log message:
       logUserAction("doSomething") --> "doSomething"
       logUserAction("doSomething", ["John Doe", 37]) --> "doSomething: [John Doe, 37]"
       @param    {String}    iActionString -- The name of the action/command
       being logged
       @param    {Array}     iValues -- Additional values to be included in the
       log message
       */
      logUserAction: function (iActionString, iValues) {
        DG.logUser(iActionString + (iValues && iValues.length ? ": [" + iValues.join(", ") + "]" : ""));
      },

      showErrorAlert: function (msg) {
        DG.AlertPane.warn({
          localize: true,
          message: msg,
        });
      },

    });

