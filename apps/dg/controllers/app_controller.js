// ==========================================================================
//                          DG.appController
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

  Top-level coordinating controller for the DG application.

 @extends SC.Object
 */
DG.appController = SC.Object.create((function () // closure
/** @scope DG.appController.prototype */ {


  return {  // return from closure

    /**
     * File menu.
     * @property {SC.MenuPane}
     */
    fileMenuPane: null,

    /**
     * Options menu.
     * @property {SC.MenuPane}
     */
    optionMenuPane: null,

    /**
     * Options menu.
     * @property {SC.MenuPane}
     */
    guideMenuPane: null,

    autoSaveTimer: null,

    /**
     * Initialization function.
     */
    init: function () {
      sc_super();
      this.fileMenuPane = SC.MenuPane.create({
        items: this.get('fileMenuItems'),
        layout: { width: 165 }
      });
      this.optionMenuPane = SC.MenuPane.create({
        items: this.get('optionMenuItems'),
        layout: { width: 150 }
      });
      this.guideMenuPane = SC.MenuPane.create({
        layout: { width: 250 }
      });

      this.autoSaveTimer = SC.Timer.schedule({
        target: this,
        action: 'autoSaveDocument',
        interval: 1000*10, // Every ten seconds
        repeats: YES
      });

      // Give the user a chance to confirm/cancel before closing, reloading,
      // or navigating away from the page. The sites listed below provide some
      // information on the 'beforeunload' event and its handling, but the upshot
      // is that if you return a string, then the browser will provide a dialog
      // that should include the returned string (Firefox >= 4 chooses not to on
      // the grounds that there are security concerns).
      // https://developer.mozilla.org/en-US/docs/DOM/window.onbeforeunload
      // http://bytes.com/topic/javascript/insights/825556-using-onbeforeunload-javascript-event
      // https://bugzilla.mozilla.org/show_bug.cgi?id=588292 for discussion of Firefox functionality.
      window.onbeforeunload = function (iEvent) {
        if (DG.currDocumentController().get('hasUnsavedChanges'))
          return 'DG.AppController.beforeUnload.confirmationMessage'.loc();
      };
    },
    // always include dev items, for now. jms 7/3/2014
    _fileMenuIncludesDevItems: true, //DG.IS_DEV_BUILD,

    fileMenuItems: function () {
      var stdItems = [
          { 
            localize: true, 
            title: 'DG.AppController.fileMenuItems.openDocument', // "Open Document..."
            target: this, 
            action: 'openDocument',
            isEnabledBinding: 'DG.authorizationController.isSaveEnabled' 
          },
          { 
            localize: true, 
            title: 'DG.AppController.fileMenuItems.copyDocument', // "Make a copy..."
            target: this, 
            action: 'copyDocument',
            isEnabledBinding: SC.Binding.oneWay('DG._currDocumentController.canBeCopied').bool() },
          {
            localize: true,
            title: 'DG.AppController.revertDocument.title', // "Revert to Original..."
            target: this,
            action: 'revertDocumentToOriginal',
            isEnabledBinding: SC.Binding.oneWay('DG._currDocumentController.canBeReverted').bool() },
          { 
            localize: true, 
            title: 'DG.AppController.fileMenuItems.closeDocument',  // "Close Document..."
            target: this, 
            action: 'closeCurrentDocument' },
          { 
            isSeparator: YES },
          { 
            localize: true, 
            title: 'DG.AppController.fileMenuItems.documentManager', // "Document Manager..."
            target: this, 
            action: 'loadManager',
            isEnabledBinding: 'DG.authorizationController.isSaveEnabled' },
          { isSeparator: YES },
          { 
            localize: true, 
            title: 'DG.AppController.fileMenuItems.exportCaseData', // "Export Case Data..."
            target: this, 
            action: 'exportCaseData' }
        ],
        docServerItems = [
          { isSeparator: YES },
          { 
            localize: true, 
            title: 'DG.AppController.fileMenuItems.showShareLink', // "Share document..."
            target: this, 
            action: 'showShareLink',
            isEnabledBinding: SC.Binding.oneWay('DG._currDocumentController.canBeShared').bool()
          }
        ],
        devItems = [
          { isSeparator: YES },
          { 
            localize: true, 
            title: 'DG.AppController.fileMenuItems.importDocument', // "Import JSON Document..."
            target: this, 
            action: 'importDocument' },
          { 
            localize: true, 
            title: 'DG.AppController.fileMenuItems.exportDocument', // "Export JSON Document..."
            target: this, 
            action: 'exportDocument' }
        ], finalItems;
        finalItems = stdItems.concat([]);
        if (DG.documentServer) { 
          finalItems = finalItems.concat( docServerItems ); 
        }
        if (this._fileMenuIncludesDevItems) { 
          finalItems = finalItems.concat( devItems ); 
        }
        return finalItems;
    }.property(),

    documentNameDidChange: function () {
      // Update document title
      var documentController = DG.currDocumentController
          && DG.currDocumentController(),
        nameString = '';
      if (documentController) {
        nameString = documentController.get('documentName') + ' - ';
      }
      $('title').text(nameString + 'CODAP');
    }.observes('DG._currDocumentController.documentName'),

    loginDidChange: function () {
      var isDeveloper = DG.authorizationController.get('isUserDeveloper');
      this._fileMenuIncludesDevItems = this._fileMenuIncludesDevItems || isDeveloper;
      this.fileMenuPane.set('items', this.get('fileMenuItems'));
    }.observes('DG.authorizationController.isUserDeveloper'),

    optionMenuItems: function () {
      return [
        { localize: true, title: 'DG.AppController.optionMenuItems.help', // "Help...",
          target: this, action: 'showHelp' },
        { localize: true, title: 'DG.AppController.optionMenuItems.reportProblem', // "Report Problem..."
          target: this, action: 'reportProblem' },
        { localize: true, title: 'DG.AppController.optionMenuItems.toWebSite', // "CODAP website...",
          target: this, action: 'showWebSite' },
        { isSeparator: YES },
        { localize: true, title: 'DG.AppController.optionMenuItems.configureGuide', // "Configure Guide..."
          target: this, action: 'configureGuide' },
        { localize: true, title: 'DG.AppController.optionMenuItems.viewWebPage', // "View Web Page..."
          target: this, action: 'viewWebPage' }
      ];
    }.property(),

    /**
     Allows the user to specify a document to be opened.
     Called when the user selects "Open" from the document's gear menu.
     */
    openDocument: function () {

      console.log('In openDocument');
      SC.Benchmark.start('openDocument');

      this.openSaveDialog = DG.CreateOpenSaveDialog({
        dialogType: DG.OpenSaveDialog.kOpenDialog,
        prompt: 'DG.AppController.openDocument.prompt', // "Choose a document to open:"
        documentList: DG.DocumentListController.create(),
        okTitle: 'DG.AppController.openDocument.okTitle', // "Open"
        okTooltip: 'DG.AppController.openDocument.okTooltip', // "Open the specified document"
        okTarget: this,
        okAction: 'openDocumentFromDialog'
      });

      SC.Benchmark.end('openDocument');
      SC.Benchmark.log('openDocument');

    },

    /**
     Dialog callback function after the user chooses a document to open.
     */
    openDocumentFromDialog: function () {

      console.log("In openDocumentFromDialog");


      var docName = this.openSaveDialog.get('documentName'),
        docID = this.openSaveDialog.get('documentID');
      SC.Benchmark.start('openDocumentFromDialog: '+docName);

      // Close the dialog when we're finished with it.
      this.openSaveDialog.close();
      this.openSaveDialog = null;

      var openDocumentAfterConfirmation = function () {
        DG.busyCursor.show( function() {
          DG.authorizationController.openDocument(docID, this);
        }.bind(this));
        DG.logUser("openDocument: '%@'", docName);
      }.bind(this);

      var cancelOpenDocument = function () {
        DG.logUser("cancelOpenDocument: '%@'", docName);
      };

      // If the user chose a document to open...
      if (!SC.empty(docName)) {
        // ... and it contains unsaved changes...
        if (DG.currDocumentController().get('hasUnsavedChanges')) {
          // ... then ask the user to confirm closing the current document
          DG.logUser("confirmOpenDocument?: '%@'", docName);
          DG.AlertPane.warn({
            message: 'DG.AppController.closeDocument.warnMessage',
            description: 'DG.AppController.closeDocument.warnDescription',
            buttons: [
              { title: 'DG.AppController.closeDocument.okButtonTitle',
                action: openDocumentAfterConfirmation,
                localize: YES
              },
              { title: 'DG.AppController.closeDocument.cancelButtonTitle',
                action: cancelOpenDocument,
                localize: YES
              }
            ],
            localize: YES
          });
        }
        else {
          openDocumentAfterConfirmation();
        }
      }

      SC.Benchmark.end('openDocumentFromDialog: '+docName);
      SC.Benchmark.log('openDocumentFromDialog: '+docName);
    },

    /**
     * Called when the name of the desired document is given other than through
     * user dialog box.
     *
     * @param {String} iName Name of the document
     * @param {String} iOwner Owner of the document
     */
    openDocumentNamed: function (iName, iOwner) {
      if (iName) {  // try to open the document the user chose
        DG.authorizationController.openDocumentByName(iName, iOwner, this);
        DG.logUser("openDocument: '%@'", iName);
      }

      if (iOwner && iOwner !== DG.authorizationController.getPath('currLogin.user')) {
        this.setOpenedDocumentUnshared = YES;
      }
    },

    openDocumentWithId: function (iId) {
      if (iId) {
        DG.authorizationController.openDocument(iId, this);
        DG.currDocumentController().set('externalDocumentId', ''+iId);
        DG.logUser("openDocument: '%@' (id)", iId);
      }

      // FIXME How do we determine whether it should get set unshared or not?
    },

    setOpenedDocumentUnshared: NO,

    /**
     openDocument callback function after the document content has been loaded.
     */
    receivedOpenDocumentResponse: function (iResponse) {
      var shouldShowAlert = true,
        alertDescription = 'DG.AppController.openDocument.error.general',
        openDeferred,
        responseIsError = iResponse.get('isError'),
        headers = iResponse.get('headers'),
        body = iResponse.get('body'),
        contentType = headers['Content-Type'],
        bodyMayBeJSON = (body && (body[0]!== '<')); // some servers may return
                                                    // an error page without
                                                    // setting error status

      DG.log('Document content-type: ' + contentType);

      // Currently, we must close any open document before opening another
      if (!responseIsError && bodyMayBeJSON) {

        if ((openDeferred = this.openJsonDocument(body, false)) !== null) {
          var docId = iResponse.headers()['Document-Id'];
          if (docId) {
            shouldShowAlert = false;
            openDeferred.done(function() {
              DG.currDocumentController().set('externalDocumentId', ''+docId);
            });
          }
        }
        // If we failed to open/parse the document successfully,
        // then we may need to create a new untitled document.
      }
      DG.busyCursor.hide();
      if (shouldShowAlert) {
        // Should handle errors here -- alert the user, etc.
        DG.AlertPane.error({
          localize: true,
          message: alertDescription,
          delegate: SC.Object.create({
            alertPaneDidDismiss: function (pane, status) {
              // Could do something more here on dismissal,
              // e.g. create a new document if necessary
            }
          })
        });
      }
    },

    /**
     Tests the JSON text for validity as a possible document.  This is a placeholder function
     for future DG Document structure validation.
     @param    {String}    iDocText -- The JSON-formatted document text
     @returns  {Boolean}   True on success, false on failure
     */
    isValidJsonDocument: function (iDocText) {
      // Is there some other form of validation that is more appropriate?
      return true;
    },

    /**
     Attempts to parse the specified iDocText as the contents of a saved document in JSON format.
     @param    {String}    iDocText -- The JSON-formatted document text
     @returns  {Boolean}   True on success, false on failure
     */
    openJsonDocument: function (iDocText, saveImmediately) {
      console.log('In app_controller:openJsonDocument');
      SC.Benchmark.start('app_controller:openJsonDocument');

      // Does it look like it could be a valid document?
      if (!this.isValidJsonDocument(iDocText)) return false;

      // Currently, we must close any open document before opening another
      this.closeDocument();

      // Create document-specific store.
      var archiver = DG.DocumentArchiver.create({}),
          // Parse the document contents from the retrieved docText.
          deferred = archiver.openDocument(DG.store, iDocText);
      deferred.done(function(newDocument) {
        if (newDocument) {
          console.log('In app_controller:openJsonDocument:setting document controller');
          SC.Benchmark.start('app_controller:openJsonDocument:setting document controller');
          DG.currDocumentController().setDocument(newDocument);
          SC.Benchmark.end('app_controller:openJsonDocument:setting document controller');
          SC.Benchmark.log('app_controller:openJsonDocument:setting document controller');

          if (saveImmediately) {
            // Trigger a save first thing
            this.invokeLater(function() {
              DG.dirtyCurrentDocument();
              this.autoSaveDocument();
            }.bind(this));
          }
        }

        if (this.setOpenedDocumentUnshared) {
          DG.currDocumentController().setPath('content._permissions', 0);
          this.setOpenedDocumentUnshared = NO;
        }
        SC.Benchmark.end('app_controller:openJsonDocument');
        SC.Benchmark.log('app_controller:openJsonDocument');
      }.bind(this));
      return deferred;
    },

    /**
     *
     * @param iText String  either CSV or tab-delimited
     * @param iName String  document name
     * @returns {Boolean}
     */
    importText: function( iText, iName) {

      // Create document-specific store.
      var archiver = DG.DocumentArchiver.create({}),
          newDocument, context, contextRecord,
          documentController = DG.currDocumentController();

      // Parse the document contents from the retrieved docText.
      newDocument = archiver.importCSV( iText, iName);
      // set the id of the current document into the data context.
      newDocument.contexts[0].document = documentController.get('documentID');
      // Create the context record.
      contextRecord = DG.DataContextRecord.createContext(newDocument.contexts[0]);
      // create the context
      context = documentController.createDataContextForModel(contextRecord);
      context.restoreFromStorage(contextRecord.contextStorage);

      // add case table
      documentController.addCaseTableP(DG.mainPage.get('docView'), null, {dataContext: context});

      return true;
    },

    /**
     *
     * @param iURL - For the moment, we're assuming it's the URL of a data interactive
     * @returns {Boolean}
     */
    importURL: function (iURL) {

      var addInteractive = function () {
        var tDoc = DG.currDocumentController(),
          tComponent = DG.Component.createComponent({
            "type": "DG.GameView",
            "document": tDoc.get('content') ,
            "componentStorage": {
              "currentGameName": "",
              "currentGameUrl": iURL,
              allowInitGameOverride: true
            }
          });
        tDoc.createComponentAndView( tComponent);
      }.bind(this);
      //embedInteractive = function () {
            // Currently, we must close any open document before opening a new data interactive
            //this.closeDocument();

            // Create document-specific store.
            //var archiver = DG.DocumentArchiver.create({}),
              //  newDocument;

            // Make a data interactive iFrame using the given URL
            //newDocument = archiver.importURLIntoDocument(iURL);

            //DG.currDocumentController().setDocument(newDocument);
          //}.bind(this),
          // add interactive to existing document
          //,
          //embedWebView = function () {
          //  DG.currDocumentController().addWebView(DG.mainPage.get('docView'), null,
          //      iURL, 'Web Page',
          //      {width: 600, height: 400});
          //}.bind(this);

      addInteractive();
      return true;
    },

    /**
     Allows the user to save the current document contents with a user-specified document name.
     */
    saveDocument: function () {
      if (DG.currDocumentController().get('documentName') === SC.String.loc('DG.Document.defaultDocumentName')) {
        this.openSaveDialog = DG.CreateOpenSaveDialog({
          dialogType: DG.OpenSaveDialog.kSaveDialog,
          prompt: 'DG.AppController.saveDocument.prompt', // "Choose a name for your document:"
          documentNameValue: DG.currDocumentController().get('documentName'),
          documentPermissionValue: DG.currDocumentController().get('documentPermissions'),
          okTitle: 'DG.AppController.saveDocument.okTitle', // "Save"
          okTooltip: 'DG.AppController.saveDocument.okTooltip', // "Save the document with the specified name"
          okTarget: this,
          okAction: 'saveDocumentFromDialog'
        });
      } else {
        this.autoSaveDocument();
      }
    },

    _originalDocumentName: null,
    renameDocument: function(iOriginalName, iNewName) {
      if ( DG.authorizationController.get('isSaveEnabled')
            && iOriginalName
            && iNewName !== iOriginalName
            && iOriginalName !== SC.String.loc('DG.Document.defaultDocumentName')
            && !SC.none(DG.currDocumentController().get('externalId'))
          ) {
        this.set('_originalDocumentName', iOriginalName);
        DG.authorizationController.renameDocument(iOriginalName, iNewName, this);
      }
    },

    receivedRenameDocumentResponse: function(iResponse) {
      var shouldShowAlert = true,
        alertDescription = null, msgKey;
      // Currently, we must close any open document before opening another
      if (SC.ok(iResponse) && !iResponse.get('isError')) {
          DG.dirtyCurrentDocument();
          this.saveDocument();
          this.set('_originalDocumentName', null);
          return;
      }
      // We got an error. Revert the rename.
      DG.currDocumentController().set('documentName', this.get('_originalDocumentName'));

      try {
        // Handle error response from server
        msgKey = 'DG.AppController.renameDocument.' + SC.json.decode(iResponse.get('body')).message;
      }
      catch(error) {
        msgKey = '';
      }

      if (msgKey.loc() === msgKey)
        msgKey = 'DG.AppController.renameDocument.error.general';
      // Note that we currently only support a single message rather than message & description.
      // We could use a convention like a '\n' in the string to delineate the separate message
      // and description without requiring the server to return two strings (for instance).
      // We leave this as a possible future nicety for a subsequent release so as not to hold
      // up the initial release for what is essentially a cosmetic improvement.
      alertDescription = msgKey;
      if (shouldShowAlert) {
        // Should handle errors here -- alert the user, etc.
        DG.AlertPane.error({
          localize: true,
          message: alertDescription,
          delegate: SC.Object.create({
            alertPaneDidDismiss: function (pane, status) {
              // Could do something more here on dismissal,
              // e.g. create a new document if necessary
            }
          })
        });
      }

    },

    copyDocument: function () {
      this.openSaveDialog = DG.CreateOpenSaveDialog({
        dialogType: DG.OpenSaveDialog.kSaveDialog,
        prompt: 'DG.AppController.copyDocument.prompt', // "Choose a name for your document:"
        documentNameValue: DG.currDocumentController().get('documentName'),
        documentPermissionValue: DG.currDocumentController().get('documentPermissions'),
        okTitle: 'DG.AppController.copyDocument.okTitle', // "Save"
        okTooltip: 'DG.AppController.copyDocument.okTooltip', // "Save the document with the specified name"
        okTarget: this,
        okAction: 'copyDocumentFromDialog'
      });
    },

    /**
     Dialog callback function after the user chooses a name for saving the document.
     */
    saveDocumentFromDialog: function () {
      var docName = this.openSaveDialog.get('documentName'),
        documentPermissions = this.openSaveDialog.get('documentPermissions');

      if (!SC.empty(docName)) {
        docName = docName.trim();
        DG.currDocumentController().set('documentName', docName);
        DG.currDocumentController().saveDocument(docName, documentPermissions);
        DG.logUser("saveDocument: '%@'", docName);
      }

      // Close the open/save dialog.
      this.openSaveDialog.close();
      this.openSaveDialog = null;
    },

    /**
     Dialog callback function after the user chooses a name for copying the document.
     */
    copyDocumentFromDialog: function () {
      var docName = this.openSaveDialog.get('documentName'),
        documentPermissions = this.openSaveDialog.get('documentPermissions');

      if (!SC.empty(docName)) {
        docName = docName.trim();
        DG.currDocumentController().copyDocument(docName, documentPermissions);
        DG.logUser("copyDocument: '%@'", docName);
      }

      // Close the open/save dialog.
      this.openSaveDialog.close();
      this.openSaveDialog = null;
    },

    /**
     Callback function which saves the current document.
     */
    autoSaveDocument: function () {
      if (DG.authorizationController.get('isSaveEnabled')) {
        var docName = DG.currDocumentController().get('documentName'),
          documentPermissions = DG.currDocumentController().get('documentPermissions');

        if (!SC.empty(docName)
          && docName !== SC.String.loc('DG.Document.defaultDocumentName')
          && DG.currDocumentController().get('hasUnsavedChanges')) {
          DG.currDocumentController().saveDocument(docName, documentPermissions);
          DG.logUser("autoSaveDocument: '%@'", docName);
        }
      }
    },

    triggerSaveNotification: function() {
      var el = DG.getPath('mainPage.mainPane.infoBar.leftSide.saveNotification.layer');
      var opacity = 1;
      var next = function(i) {
        if (opacity > 0) {
          el.style.opacity = opacity;
          opacity = 1 - (Math.pow(i,5));
          setTimeout(function() { next(i + 0.05); }, 100);
        } else {
          el.style.opacity = 0;
        }
      };
      next(0);
    },

    /**
     * Opens a new tab with users document manager opened.
     */
    loadManager: function() {
      var url = '';
      if (DG.documentServer) {
        url = DG.documentServer + "documents";
      } else {
        url = 'http://' +
            DG.getDrupalSubdomain() +
            DG.authorizationController.getLoginCookieDomain() + 
            ('DG.AppController.manageDocumentsURL'.loc());
      }
      window.open(url, 'document_manager');
    },

    logout: function () {

      var logoutAfterConfirmation = function () {
        // Close the current document
        this.closeDocument();

        // Create a new empty document
        DG.currDocumentController().setDocument(DG.currDocumentController().createDocument());

        // Log out, bringing up the login dialog
        DG.authorizationController.logout();
      }.bind(this);

      var cancelLogout = function () {
        DG.logUser("cancelLogout:");
      };

      if (DG.currDocumentController().get('hasUnsavedChanges')) {
        DG.logUser("confirmLogout?:");
        DG.AlertPane.warn({
          message: 'DG.AppController.closeDocument.warnMessage',
          description: 'DG.AppController.closeDocument.warnDescription',
          buttons: [
            { title: 'DG.AppController.closeDocument.okButtonTitle',
              action: logoutAfterConfirmation,
              localize: YES
            },
            { title: 'DG.AppController.closeDocument.cancelButtonTitle',
              action: cancelLogout,
              localize: YES
            }
          ],
          localize: YES
        });
      }
      else {
        logoutAfterConfirmation();
      }
    },

    /**
     Close the current document and all its components.
     */
    closeDocument: function () {
      SC.Benchmark.start('closeDocument');

      // Destroy the views
      DG.mainPage.closeAllComponents();

      // Finish whatever we were in the middle of
      if (DG.store) // We can get here without a store if we are opening a document specified as url param
        DG.store.commitRecords();

      // Destroy the document and its contents
      DG.currDocumentController().closeDocument();
      DG.store = null;
      SC.Benchmark.end('closeDocument');
      SC.Benchmark.log('closeDocument');

    },

    /**
     * Closes the current document with confirmation.
     *
     * We interpose this between the menu item and closeDocumentWithConfirmation
     * to correct the argument.
     *
     * @param {SC.Menu} sender: unused by the function.
     */
    closeCurrentDocument: function (sender) {
      this.closeDocumentWithConfirmation(null);
    },

    /**
     Closes the document after confirming with the user that that is desired.
     */
    closeDocumentWithConfirmation: function (iDefaultGameName) {
      var docName = DG.currDocumentController().get('documentName');

      var closeDocumentAfterConfirmation = function () {
        this.closeAndNewDocument(iDefaultGameName);
        DG.logUser("closeDocument: '%@'", docName);
      }.bind(this);

      var cancelCloseDocument = function () {
        DG.logUser("cancelCloseDocument: '%@'", docName);
      };

      if (DG.currDocumentController().get('hasUnsavedChanges')) {
        DG.logUser("confirmCloseDocument?: '%@'", docName);
        DG.AlertPane.warn({
          message: 'DG.AppController.closeDocument.warnMessage',
          description: 'DG.AppController.closeDocument.warnDescription',
          buttons: [
            { title: 'DG.AppController.closeDocument.okButtonTitle',
              action: closeDocumentAfterConfirmation,
              localize: YES
            },
            { title: 'DG.AppController.closeDocument.cancelButtonTitle',
              action: cancelCloseDocument,
              localize: YES
            }
          ],
          localize: YES
        });
      }
      else {
        closeDocumentAfterConfirmation();
      }
    },

    /**
     Close the current document and open up a new empty document.
     */
    closeAndNewDocument: function (iDefaultGameName) {

      // Close the current document
      this.closeDocument();

      // Create a new empty document
      DG.currDocumentController().setDocument(DG.currDocumentController().createDocument());

      /**
       * If we are still in the GamesMenu world, we need to find the new game.
       */
      if (!SC.none(iDefaultGameName)){
        DG.gameSelectionController.setDefaultGame(iDefaultGameName);
        DG.mainPage.addGameIfNotPresent();
      }
    },

    /**
     Revert document to the original stored in the document server, after prompting user for OK/Cancel.
     */
    revertDocumentToOriginal: function () {
      var _this = this;
      function doRevert() {
        DG.logUser("Reverted to original"); // deleted by user action, not game action
        DG.authorizationController.revertCurrentDocument(_this);
      }

      DG.AlertPane.warn({
        message: 'DG.AppController.revertDocument.warnMessage',
        description: 'DG.AppController.revertDocument.warnDescription',
        buttons: [
          { title: 'DG.AppController.revertDocument.okButtonTitle',
            action: doRevert,
            localize: YES
          },
          { title: 'DG.AppController.revertDocument.cancelButtonTitle', localize: YES }
        ],
        localize: YES
      });
    },

    /**
     Delete all case data, except for open case IDs, after prompting user for OK/Cancel.
     */
    deleteAllCaseData: function () {

      function doDelete() {
        DG.logUser("deleteAllCaseData by User"); // deleted by user action, not game action
        DG.doCommand({action: 'deleteAllCaseData'});
        DG.dirtyCurrentDocument();
      }

      DG.AlertPane.warn({
        message: 'DG.AppController.resetData.warnMessage',
        description: 'DG.AppController.resetData.warnDescription',
        buttons: [
          { title: 'DG.AppController.resetData.okButtonTitle',
            action: doDelete,
            localize: YES
          },
          { title: 'DG.AppController.resetData.cancelButtonTitle', localize: YES }
        ],
        localize: YES
      });
    },

    /**
     * The file parameter may have come from a drop or a dialog box.
     * @param iFile
     * @param {String} 'JSON' or 'TEXT'
     * @param optional
     */
    importFileWithConfirmation: function( iFile, iType, iDialog) {

      var importFile = function() {
        function handleAbnormal() {
          console.log("Abort or error on file read.");
        }

        function handleRead() {
          try {
            if( iType === 'JSON') {
              that.openJsonDocument(this.result, true);
            }
            else if( iType === 'TEXT') {
              that.importText(this.result, iFile.name);
            }
            if (iDialog)
              iDialog.close();
          }
          catch (er) {
            console.log(er);
            if (iDialog) {
              iDialog.showAlert( er);
            }
          }
          DG.busyCursor.hide();
        }
        var that = this;
        DG.busyCursor.show( function() {
          var reader = new FileReader();
          if (iFile) {
            reader.onabort = handleAbnormal;
            reader.onerror = handleAbnormal;
            reader.onload = handleRead;
            reader.readAsText(iFile);
          }
        });
      }.bind( this);

      var cancelCloseDocument = function () {
        DG.logUser("cancelCloseDocument: '%@'", docName);
      };

      if (DG.currDocumentController().get('hasUnsavedChanges')) {
        var docName = DG.currDocumentController().get('documentName');
        DG.logUser("confirmCloseDocument?: '%@'", docName);
        DG.AlertPane.warn({
          message: 'DG.AppController.closeDocument.warnMessage',
          description: 'DG.AppController.closeDocument.warnDescription',
          buttons: [
            { title: 'DG.AppController.closeDocument.okButtonTitle',
              action: importFile,
              localize: YES
            },
            { title: 'DG.AppController.closeDocument.cancelButtonTitle',
              action: cancelCloseDocument,
              localize: YES
            }
          ],
          localize: YES
        });
      }
      else {
        DG.busyCursor.show(function() {
          importFile();
        });
      }
      if( iDialog)
        iDialog.close();
    },

    /**
     Handler for the Import JSON Document... menu command.
     Puts up a dialog with which the user can specify a file to be imported.
     */
    importDocument: function () {
      var tDialog;

      var importJsonFileFromDialog = function () {
        var v = tDialog.get('value');
        this.importFileWithConfirmation( v[0], 'JSON', tDialog);
      }.bind(this);

      var resetAlert = function () {
        if (tDialog) {
          tDialog.hideAlert();
        }
      }.bind(this);

      tDialog = DG.CreateFileImportDialog({
        prompt: 'DG.AppController.importDocument.prompt',
        alert: 'DG.AppController.importDocument.alert',
        textValue: '',
        textAction: resetAlert,
        okTarget: null,
        okAction: importJsonFileFromDialog,
        okTitle: 'DG.AppController.importDocument.okTitle',
        okTooltip: 'DG.AppController.importDocument.okTooltip'
      });
    },

    /**
     Handler for the Export JSON Document... menu command.
     */
    exportDocument: function () {
      DG.currDocumentController().exportDocument(function(docArchive) {
        var docJson,
        tDialog = null,
        onOK = function () {
          var fn = tDialog.value();
          var blob = new Blob([docJson], {type: "application/json;charset=utf-8"});
          window.saveAs(blob, fn);
          tDialog.close();
        };
        if (docArchive) {
          docJson = SC.json.encode(docArchive);
          if (!SC.empty(docJson)) {
            tDialog = DG.CreateSingleTextDialog({
              prompt: 'DG.AppController.exportDocument.prompt',
              textValue: docArchive.name + '.json',
              okTarget: null,
              okAction: onOK,
              okTitle: 'DG.AppController.exportDocument.okTitle',
              okTooltip: 'DG.AppController.exportDocument.okTooltip',
              cancelVisible: true
            });
          }
        }
      }, true);
    },

    /**
     Handler for the Export Case Data... menu command.
     Displays a dialog, so user can select and copy the case data from the current document.
     */
    exportCaseData: function () {
      // callback to get export string from one of the menu item titles
      var exportCollection = function (whichCollection) {
        return DG.currDocumentController().exportCaseData(whichCollection);
      };
      // get array of exportable collection names for menu titles
      var tMenuItems = DG.currDocumentController().exportCaseData().split('\t'),
        tStartingMenuItem = tMenuItems[0];

      DG.CreateExportCaseDataDialog({
        prompt: 'DG.AppController.exportCaseData.prompt',
        textLimit: 1000000,
        textValue: exportCollection(tStartingMenuItem),
        collectionMenuTitle: tStartingMenuItem,
        collectionMenuItems: tMenuItems,
        collectionMenuItemAction: exportCollection,
        okTitle: 'DG.AppController.exportDocument.okTitle',
        okTooltip: 'DG.AppController.exportDocument.okTooltip'
      });
    },

    showShareLink: function() {
      var sheetPane = SC.PanelPane.create({
        layout: { top: 0, centerX: 0, width: 540, height: 190 },
        contentView: SC.View.extend({
          childViews: 'titleView shareButton okButton instructionsLabel linkLabel'.w(),

          titleView: SC.LabelView.design({
            layout: { top: 10, left: 0, right: 0, height: 34 },
            controlSize: SC.LARGE_CONTROL_SIZE,
            fontWeight: SC.BOLD_WEIGHT,
            textAlign: SC.ALIGN_CENTER,
            value: 'DG.AppController.shareLinkDialog.title',            // "Share"
            localize: YES
          }),

          shareButton: SC.CheckboxView.design({
            layout: { top: 44, height: 20, left: 10, width:100 },
            title: 'DG.AppController.shareLinkDialog.shareButtonLabel', // "Shareable"
            localize: YES,
            valueBinding: 'DG._currDocumentController.content._permissions',
            toggleOnValue: 1,
            toggleOffValue: 0,
            isDefault: NO,
            action: function() {
              DG.dirtyCurrentDocument();
              this.invokeNext(function() {
                DG.appController.autoSaveDocument();
              });
            }
          }),

          instructionsLabel: SC.LabelView.design({
            escapeHTML: NO,
            layout: { top: 67, left: 0, right: 0, height: 24 },
            textAlign: SC.ALIGN_CENTER,
            value: 'DG.AppController.shareLinkDialog.instructions',
            isVisibleBinding: SC.Binding.oneWay('DG._currDocumentController.documentPermissions').bool(),
            localize: YES
          }),

          linkLabel: SC.TextFieldView.design({
            layerId: 'shareLinkField',
            escapeHTML: NO,
            layout: { top: 87, left: 0, right: 0, height: 65 },
            textAlign: SC.ALIGN_CENTER,
            isTextArea: YES,
            isEditable: NO,
            autoCapitalize: NO,
            autoCorrect: NO,
            isDefault: YES,
            value: this.get('_shareLinkDialogText'),
            isVisibleBinding: SC.Binding.oneWay('DG._currDocumentController.documentPermissions').bool(),
            didAppendToDocument: function() {
              // Force always have all text selected
              // HACK, but I can't figure out how to use SC.TextSelection to do what I want, so using jQuery directly.
              $("#shareLinkField textarea").mouseup(function(e) {
                e.preventDefault();
                $("#shareLinkField textarea").select();
              });
              this.visibilityChanged();
            },
            visibilityChanged: function() {
              if (this.get('isVisible')) {
                //var linkView = this.get('_view_layer');
                // HACK, once again I can't figure out how to use SC.TextSelection to do what I want, so using jQuery directly.
                $("#shareLinkField textarea").focus();
                $("#shareLinkField textarea").select();
              }
            }.observes('isVisible')
          }),

          okButton: SC.ButtonView.design({
            layout: { bottom: 5, height: 24, right:20, width:100 },
            title: 'DG.AppController.shareLinkDialog.okButtonTitle',                // "OK"
            localize: YES,
            action: function() { sheetPane.remove(); },
            isDefault: NO
          })
        })
      });
      sheetPane.append();
    },

    _shareLinkDialogText: function() {
      var currDocId = DG.currDocumentController().get('externalDocumentId');
      return this.copyLink(currDocId);
    }.property(),

    showCopyLink: function(destination) {
      var sheetPane = SC.PanelPane.create({
        layout: { top: 0, centerX: 0, width: 340, height: 140 },
        contentView: SC.View.extend({
          childViews: 'titleView okButton instructionsLabel'.w(),

          titleView: SC.LabelView.design({
            layout: { top: 10, left: 0, right: 0, height: 34 },
            controlSize: SC.LARGE_CONTROL_SIZE,
            fontWeight: SC.BOLD_WEIGHT,
            textAlign: SC.ALIGN_CENTER,
            value: 'DG.AppController.copyLinkDialog.title',            // "Share"
            localize: YES
          }),

          instructionsLabel: SC.LabelView.design({
            escapeHTML: NO,
            layout: { top: 44, left: 0, right: 0, height: 36 },
            textAlign: SC.ALIGN_CENTER,
            value: 'DG.AppController.copyLinkDialog.instructions',
            localize: YES
          }),

          okButton: SC.ButtonView.design({
            layout: { top: 110, height: 24, right:20, width:100 },
            title: 'DG.AppController.copyLinkDialog.okButtonTitle',                // "OK"
            localize: YES,
            action: function() {
              var win = window.open(destination, '_blank');
              if (win) {
                win.focus();
              }
              sheetPane.remove();
            },
            isDefault: YES
          })
        })
      });
      sheetPane.append();
    },

    copyLink: function(newDocId) {
      return $.param.querystring(window.location.href, {recordid: newDocId} );
    }.property(),

    /**
     Bring up the bug report page.
     */
    reportProblem: function () {

      var submitFeedback= function() {
        var iUser = DG.authorizationController.getPath('currLogin.user');

        console.log(iUser);
        console.log(feedbackPane.contentView.subjectText.value);
        console.log(feedbackPane.contentView.feedbackText.value);
        console.log("Build #"+DG.BUILD_NUM);
        console.log("Browser: "+SC.browser.name+" v."+SC.browser.version);
        console.log("Device: "+SC.browser.device);
        console.log("OS: "+SC.browser.os+ " v."+SC.browser.osVersion);

        SC.Request.postUrl('http://app.codap.concord.org/DataGames/WebPages/scripts/datagames.php?'+
          'device='+ SC.browser.device +
          '&os='+SC.browser.os+
          '&os_version='+SC.browser.osVersion+
          '&cf_browser='+SC.browser.name+
          '&cf_browser_version='+SC.browser.version+
          '&version='+DG.BUILD_NUM+
          '&name='+iUser+
          '&description='+feedbackPane.contentView.subjectText.value+
          '&comments='+feedbackPane.contentView.feedbackText.value)
        //  .notify()
          .send();
        feedbackPane.remove();
        feedbackPane=null;
      };

      var cancelFeedback= function() {
        feedbackPane.remove();
        feedbackPane=null;
      };

      //Begin feedback form

      var feedbackPane=SC.PanelPane.create({

        layout: { top: 175, centerX: 0, width: 525, height: 480 },
        contentView: SC.View.extend({
          backgroundColor: '#dde2e8',
          childViews: 'feedbackHeader codapLogo feedbackImage subHeaderText messageText subjectText feedbackText submitFeedbackButton cancelFeedbackButton'.w(),

          feedbackHeader: SC.LabelView.design({
            layout: { top: 48,  height: 24 },
            controlSize: SC.LARGE_CONTROL_SIZE,
            fontWeight: SC.BOLD_WEIGHT,
            textAlign: SC.ALIGN_CENTER,
            value: 'DG.AppController.feedbackDialog.dialogTitle',
            localize: YES
          }),

          codapLogo: SC.ImageView.design({
            layout: {top:30, left:40, height:60, width:60},
            value: static_url('images/codap_logo.png')
          }),

          feedbackImage: SC.ImageView.design({
            layout: {top:30, right:40, height:60, width:60},
            value: static_url('images/upanddown.png')
          }),

          subHeaderText: SC.LabelView.design({
            layout: { top: 105, left: 40},
            fontWeight: SC.BOLD_WEIGHT,
            value: 'DG.AppController.feedbackDialog.subHeaderText',
            localize: YES
          }),

          messageText: SC.LabelView.design({
            layout: { top: 120, left: 40, right: 0, width: 400},
            textAlign: SC.ALIGN_LEFT,
            value: 'DG.AppController.feedbackDialog.messageText',
            localize: YES
          }),

          subjectText: SC.TextFieldView.design({
            layout: { top: 165, left: 40, width: 445, height: 30 },
            autoCorrect: false,
            autoCapitalize: false,
            hint: 'DG.AppController.feedbackDialog.subjectHint'
          }),

          feedbackText: SC.TextFieldView.design({
            layout: { top: 205, left: 40, height: 200, width: 445 },
            isTextArea: true,
            autoCorrect: false,
            autoCapitalize: false,
            hint:'DG.AppController.feedbackDialog.feedbackHint'
          }),

          submitFeedbackButton: SC.ButtonView.design({
            layout: { bottom: 30, height: 24, right: 40, width: 125 },
            title: 'DG.AppController.feedbackDialog.submitFeedbackButton',
            localize: YES,
            action: submitFeedback,
            isDefault: NO
          }),

          cancelFeedbackButton: SC.ButtonView.design({
            layout: { bottom: 30, height: 24, right: 180, width: 125 },
            title: 'DG.AppController.feedbackDialog.cancelFeedbackButton',
            localize: YES,
            action: cancelFeedback,
            isDefault: NO
          })
        })
      });
      feedbackPane.append();
      feedbackPane.contentView.subjectText.becomeFirstResponder();
    },


    /**
     Pass responsibility to document controller
     */
    viewWebPage: function () {
      DG.currDocumentController().viewWebPage();
    },

    /**
     Pass responsibility to document controller
     */
    configureGuide: function () {
      DG.currDocumentController().configureGuide();
    },

    /**
     Show the help window.
     */
    showHelp: function () {
      // Changed link to play.codap.concord.org/support
      DG.currDocumentController().addWebView(DG.mainPage.get('docView'), null,
          'http://' +  ('DG.AppController.showHelpURL'.loc()),
        'DG.AppController.showHelpTitle'.loc(), //'Help with CODAP'
        { centerX: 0, centerY: 0, width: 600, height: 400 });

    },

    /**
     Update the url in the browser bar to reflect the latest document information
     */
    updateUrlBar: function() {
      if (DG.authorizationController.getPath('currLogin.status') === 0) {
        // we haven't logged in yet, so leave the url alone
        return;
      }
      var currentParams = $.deparam.querystring(),
          recordid = DG.currDocumentController().get('externalDocumentId'),
          docName = DG.currDocumentController().get('documentName'),
          currUser = DG.authorizationController.getPath('currLogin.user');

      delete currentParams.runAsGuest;
      if (!SC.none(recordid)) {
        delete currentParams.doc;
        delete currentParams.owner;
        currentParams.recordid = recordid;
      } else {
        delete currentParams.recordid;
        if (docName === SC.String.loc('DG.Document.defaultDocumentName')) {
          //  We're still on a brand-new document, so we don't need to put any info into the url yet.
          delete currentParams.doc;
          delete currentParams.owner;
        } else {
          if (currUser !== 'guest') {
            currentParams.owner = currUser;
          }
          currentParams.doc = docName;
        }
      }
      var newUrl = $.param.querystring(window.location.href, currentParams, 2); // Completely replace the current query string
      window.history.replaceState("codap", docName + " - CODAP", newUrl);
    }.observes('DG.authorizationController.currLogin.user', 'DG._currDocumentController.documentName', 'DG._currDocumentController.externalDocumentId'),

    /**
     Open a new tab with the CODAP website.
     */
    showWebSite: function () {
      //var windowFeatures = "location=yes,scrollbars=yes,status=yes,titlebar=yes";
      DG.currDocumentController().addWebView(DG.mainPage.get('docView'), null,
          'http://' +  ('DG.AppController.showWebSiteURL'.loc()),
        'DG.AppController.showWebSiteTitle'.loc(), //'About CODAP'
        { centerX: 0, centerY: 0, width: 1000, height: 500 });


    }

  }; // end return from closure

}())); // end closure
