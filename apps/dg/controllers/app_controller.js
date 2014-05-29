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
DG.appController = SC.Object.create((function() // closure
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

  /**
   * Initialization function.
   */
  init: function() {
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

    // Give the user a chance to confirm/cancel before closing, reloading,
    // or navigating away from the page. The sites listed below provide some
    // information on the 'beforeunload' event and its handling, but the upshot
    // is that if you return a string, then the browser will provide a dialog
    // that should include the returned string (Firefix >= 4 chooses not to on
    // the grounds that there are security concerns).
    // https://developer.mozilla.org/en-US/docs/DOM/window.onbeforeunload
    // http://bytes.com/topic/javascript/insights/825556-using-onbeforeunload-javascript-event
    // https://bugzilla.mozilla.org/show_bug.cgi?id=588292 for discussion of Firefox functionality.
    window.onbeforeunload = function( iEvent) {
                              if( DG.currDocumentController().get('hasUnsavedChanges'))
                                return 'DG.AppController.beforeUnload.confirmationMessage'.loc();
                            };
  },
  
  _fileMenuIncludesDevItems: DG.IS_DEV_BUILD,
  
  fileMenuItems: function() {
    var stdItems = [
      { localize: true, title: 'DG.AppController.fileMenuItems.openDocument', // "Open Document..."
        target: this, action: 'openDocument',
        isEnabledBinding: 'DG.authorizationController.isSaveEnabled' },
      { localize: true, title: 'DG.AppController.fileMenuItems.saveDocument', // "Save Document..."
        target: this, action: 'saveDocument',
        isEnabledBinding: 'DG.authorizationController.isSaveEnabled' },
      { localize: true, title: 'DG.AppController.fileMenuItems.closeDocument',  // "Close Document..." 
        target: this, action: 'closeDocumentWithConfirmation' },
      { isSeparator: YES },
      { localize: true, title: 'DG.AppController.fileMenuItems.documentManager', // "Document Manager..."
        target: this, action: 'loadManager',
        isEnabledBinding: 'DG.authorizationController.isSaveEnabled' },
      { isSeparator: YES },
      { localize: true, title: 'DG.AppController.fileMenuItems.exportCaseData', // "Export Case Data..."
          target: this, action: 'exportCaseData' }
    ],
        devItems = [
      { isSeparator: YES },
      { localize: true, title: 'DG.AppController.fileMenuItems.importDocument', // "Import JSON Document..."
        target: this, action: 'importDocument' },
      { localize: true, title: 'DG.AppController.fileMenuItems.exportDocument', // "Export JSON Document..."
        target: this, action: 'exportDocument' }
    ];
    return this._fileMenuIncludesDevItems ? stdItems.concat( devItems) : stdItems;
  }.property(),

  loginDidChange: function() {
    var isDeveloper = DG.authorizationController.get('isUserDeveloper');
    this._fileMenuIncludesDevItems = DG.IS_DEV_BUILD || isDeveloper;
    this.fileMenuPane.set('items', this.get('fileMenuItems'));
  }.observes('DG.authorizationController.isUserDeveloper'),
  
  optionMenuItems: function() {
    return [
      { localize: true, title: 'DG.AppController.optionMenuItems.help', // "Help...",
        target: this, action: 'showHelp' },
      { localize: true, title: 'DG.AppController.optionMenuItems.reportProblem', // "Report Problem..."
        target: this, action: 'reportProblem' },
      { localize: true, title: 'DG.AppController.optionMenuItems.toWebSite', // "Data Games website...",
        target: this, action: 'showWebSite' },
      { isSeparator: YES },
      { localize: true, title: 'DG.AppController.optionMenuItems.about', // "About Data Games...",
        target: this, action: 'showAbout' },
      { localize: true, title: 'DG.AppController.optionMenuItems.releaseNotes', // "What's New?",
        target: this, action: 'showReleaseNotes' },
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
  openDocument: function() {
    this.openSaveDialog = DG.CreateOpenSaveDialog({
                              dialogType: DG.OpenSaveDialog.kOpenDialog,
                              prompt: 'DG.AppController.openDocument.prompt', // "Choose a document to open:"
                              documentList: DG.DocumentListController.create(),
                              okTitle: 'DG.AppController.openDocument.okTitle', // "Open"
                              okTooltip: 'DG.AppController.openDocument.okTooltip', // "Open the specified document"
                              okTarget: this,
                              okAction: 'openDocumentFromDialog'
                          });
  },
  
  /**
   Dialog callback function after the user chooses a document to open.
   */
  openDocumentFromDialog: function() {
    var docName = this.openSaveDialog.get('documentName'),
        docID = this.openSaveDialog.get('documentID');

    // Close the dialog when we're finished with it.
    this.openSaveDialog.close();
    this.openSaveDialog = null;
  
    var openDocumentAfterConfirmation = function() {
      DG.authorizationController.openDocument( docID, this);
      DG.logUser("openDocument: '%@'", docName);
    }.bind( this);
    
    var cancelOpenDocument = function() {
      DG.logUser("cancelOpenDocument: '%@'", docName);
    };

    // If the user chose a document to open...
    if( !SC.empty( docName)) {
      // ... and it contains unsaved changes...
      if( DG.currDocumentController().get('hasUnsavedChanges')) {
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
  },

    /**
     * Called when the name of the desired document is given other than through user dialog box.
     *
     * @param{String} iName
     */
  openDocumentNamed: function( iName, iOwner) {
    if( iName) {  // try to open the document the user chose
      DG.authorizationController.openDocumentByName( iName, iOwner, this);
      DG.logUser("openDocument: '%@'", iName);
    }
  },

  /**
    openDocument callback function after the document content has been loaded.
   */
  receivedOpenDocumentResponse: function(iResponse) {
  
    var shouldShowAlert = true,
        alertDescription = null;
    // Currently, we must close any open document before opening another
    if (SC.ok(iResponse) && !iResponse.get('isError')) {

      if( this.openJsonDocument( iResponse.get('body'))) {
        shouldShowAlert = false;
      }
      // If we failed to open/parse the document successfully,
      // then we may need to create a new untitled document.
    }
    // Handle error response from server
    var msgKey = 'DG.AppController.openDocument.' + SC.json.decode(iResponse.get('body')).message;
    if( msgKey.loc() === msgKey)
      msgKey = 'DG.AppController.openDocument.error.general';
    // Note that we currently only support a single message rather than message & description.
    // We could use a convention like a '\n' in the string to delineate the separate message
    // and description without requiring the server to return two strings (for instance).
    // We leave this as a possible future nicety for a subsequent release so as not to hold
    // up the initial release for what is essentially a cosmetic improvement.
    alertDescription = msgKey;
    if( shouldShowAlert) {
      // Should handle errors here -- alert the user, etc.
      DG.AlertPane.error({
            localize: true,
            message: alertDescription,
            delegate: SC.Object.create({
              alertPaneDidDismiss: function(pane, status) {
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
  isValidJsonDocument: function( iDocText) {
    // Is there some other form of validation that is more appropriate?
    return true;
  },

  /**
    Attempts to parse the specified iDocText as the contents of a saved document in JSON format.
    @param    {String}    iDocText -- The JSON-formatted document text
    @returns  {Boolean}   True on success, false on failure
   */
  openJsonDocument: function( iDocText) {

    var kMemoryDataSource = 'DG.MemoryDataSource',
        // kRESTDataSource = 'DG.RESTDataSource',
        kDefaultDataSource = /*kRESTDataSource*/ kMemoryDataSource;
    
    // Does it look like it could be a valid document?
    if( !this.isValidJsonDocument( iDocText)) return false;

    // Currently, we must close any open document before opening another
    this.closeDocument();

      // Create document-specific store.
    var docStore = SC.Store.create({}).from( kDefaultDataSource),
        archiver = DG.DocumentArchiver.create({}),
        newDocument;

    DG.store = docStore;
  
    // Parse the document contents from the retrieved docText.
    newDocument = archiver.openDocument( docStore, iDocText);
    if( newDocument) {
      docStore.document = newDocument;
      DG.currDocumentController().setDocument( newDocument);
    }
    return true;
  },
  
  /**
    Allows the user to save the current document contents with a user-specified document name.
   */
  saveDocument: function() {
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
  },
  
  /**
   Dialog callback function after the user chooses a name for saving the document.
   */
  saveDocumentFromDialog: function() {
    var docName = this.openSaveDialog.get('documentName'),
        documentPermissions = this.openSaveDialog.get('documentPermissions');

    if( !SC.empty( docName)) {
      docName = docName.trim();
      DG.currDocumentController().set('documentName', docName);
      DG.currDocumentController().saveDocument( docName, documentPermissions);
      DG.logUser("saveDocument: '%@'", docName);
    }
      
    // Close the open/save dialog.
    this.openSaveDialog.close();
    this.openSaveDialog = null;
  },

  /**
   * Opens a new tab with users document manager opened.
   */
  loadManager: function() {
    var url = 'http://'+DG.getDrupalSubdomain()+DG.authorizationController.getLoginCookieDomain() + ('DG.AppController.manageDocumentsURL'.loc());
    window.open(url, 'document_manager');
  },

  logout: function() {

    var logoutAfterConfirmation = function() {
      // Close the current document
      this.closeDocument();
  
      // Create a new empty document
      DG.currDocumentController().setDocument( DG.currDocumentController().createDocument());
  
      // Log out, bringing up the login dialog
      DG.authorizationController.logout();
    }.bind( this);
    
    var cancelLogout = function() {
      DG.logUser("cancelLogout:");
    };
  
    if( DG.currDocumentController().get('hasUnsavedChanges')) {
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
  closeDocument: function() {
    // Destroy the views
    DG.mainPage.closeAllComponents();

    // Finish whatever we were in the middle of
    if( DG.store) // We can get here without a store if we are opening a document specified as url param
      DG.store.commitRecords();

    // Destroy the document and its contents
    DG.currDocumentController().closeDocument();
    DG.store = null;
  },
  
  /**
    Closes the document after confirming with the user that that is desired.
   */
  closeDocumentWithConfirmation: function( iDefaultGameName) {
    var docName = DG.currDocumentController().get('documentName');
  
    var closeDocumentAfterConfirmation = function() {
      this.closeAndNewDocument( iDefaultGameName);
      DG.logUser("closeDocument: '%@'", docName);
    }.bind( this);
    
    var cancelCloseDocument = function() {
      DG.logUser("cancelCloseDocument: '%@'", docName);
    };
  
    if( DG.currDocumentController().get('hasUnsavedChanges')) {
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
  closeAndNewDocument: function( iDefaultGameName) {

    // Close the current document
    this.closeDocument();

    // Create a new empty document
    DG.currDocumentController().setDocument( DG.currDocumentController().createDocument());

    // New documents generally start with a default game
    // TODO: Eliminate redundancy with DG.authorizationController....
    DG.gameSelectionController.setDefaultGame( iDefaultGameName);
    DG.mainPage.addGameIfNotPresent();
  },

  /**
    Delete all case data, except for open case IDs, after prompting user for OK/Cancel.
   */
  deleteAllCaseData: function() {

    function doDelete() {
      DG.logUser("deleteAllCaseData by User"); // deleted by user action, not game action
      DG.currGameController.doDeleteAllCaseData();
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
    Handler for the Import JSON Document... menu command.
    Puts up a dialog in which the user can paste the JSON document text and then
    attempts to parse the text and import its contents.
   */
  importDocument: function() {
    var tDialog;
    
    var importJsonDocumentFromDialog = function() {
      var docText = tDialog.get('value');
      tDialog.close();
      if( !SC.empty( docText))
        this.openJsonDocument( docText);
    }.bind( this);
    
    tDialog = DG.CreateSingleTextDialog( {
                    prompt: 'DG.AppController.importDocument.prompt',
                    textValue: '',
                    // TODO: Shouldn't hints be localized?
                    textHint: "JSON document text",
                    textLimit: 1000000,
                    okTarget: null,
                    okAction: importJsonDocumentFromDialog,
                    okTitle: 'DG.AppController.importDocument.okTitle',
                    okTooltip: 'DG.AppController.importDocument.okTooltip'
                  });
  },

  /**
    Handler for the Export JSON Document... menu command.
   */
  exportDocument: function() {
    var docArchive = DG.currDocumentController().exportDocument(),
        tDialog = null,
        closeOnOK = function() { tDialog.close(); };
    if( docArchive) {
      var docJson = SC.json.encode( docArchive);
      if( !SC.empty( docJson)) {
        tDialog = DG.CreateSingleTextDialog( {
                        prompt: 'DG.AppController.exportDocument.prompt',
                        textLimit: 1000000,
                        textValue: docJson,
                        okTarget: null,
                        okAction: closeOnOK,
                        okTitle: 'DG.AppController.exportDocument.okTitle',
                        okTooltip: 'DG.AppController.exportDocument.okTooltip',
                        cancelVisible: false
                      });
      }
    }
  },

  /**
   Handler for the Export Case Data... menu command.
   Displays a dialog, so user can select and copy the case data from the current document.
   */
  exportCaseData: function() {
    // callback to get export string from one of the menu item titles
    var exportCollection = function( whichCollection ) {
            return DG.currDocumentController().exportCaseData( whichCollection );
          };
    // get array of exportable collection names for menu titles
    var tMenuItems = DG.currDocumentController().exportCaseData().split('\t'),
        tStartingMenuItem = tMenuItems[0];

    DG.CreateExportCaseDataDialog( {
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
  
  /**
    Bring up the bug report page.
   */
  reportProblem: function() {
    var username = DG.authorizationController.getPath('currLogin.user');
    
    if( username === 'guest') // Guest user isn't specific enough
      username = '';
    
    var serverString = 'DataGames/WebPages/scripts/datagames.php' +
                        '?device=%@&os=%@&os_version=%@&cf_browser=%@&cf_browser_version=%@&version=%@&name=%@'.fmt(
                          encodeURIComponent(SC.browser.device),
                          encodeURIComponent(SC.browser.os), encodeURIComponent(SC.browser.osVersion),
                          encodeURIComponent(SC.browser.name), encodeURIComponent(SC.browser.version),
                          encodeURIComponent(DG.BUILD_NUM), encodeURIComponent(username));
    DG.currDocumentController().
        addWebView( DG.mainPage.get('docView'), null, serverString,
                    'DG.AppController.reportProblem.dialogTitle'.loc(),
                    { centerX: 0, centerY: 0, width: 600, height: 400 });
  },
  
    /**
      Pass responsibility to document controller
     */
    viewWebPage: function() {
      DG.currDocumentController().viewWebPage();
    },

    /**
      Pass responsibility to document controller
     */
    configureGuide: function() {
      DG.currDocumentController().configureGuide();
    },

    /**
      Bring up the bug report page.
     */
    showReleaseNotes: function() {
      DG.currDocumentController().addWebView( DG.mainPage.get('docView'), null,
        'DG.AppController.showReleaseNotesURL'.loc(),
        'DG.AppController.showReleaseNotesTitle'.loc(), // 'Data Games Release Notes'
        { centerX: 0, centerY: 0, width: 600, height: 400 });
    },

    /**
      Show the about box.
     */
    showAbout: function() {
      DG.currDocumentController().addWebView( DG.mainPage.get('docView'), null,
        'DG.AppController.showAboutURL'.loc(),
        'DG.AppController.showAboutTitle'.loc(), // 'About Data Games'
        { centerX: 0, centerY: 0, width: 770, height: 400 });
    },

    /**
      Show the help window.
     */
    showHelp: function() {
      DG.currDocumentController().addWebView( DG.mainPage.get('docView'), null,
        'http://'+DG.getDrupalSubdomain()+DG.authorizationController.getLoginCookieDomain()+('DG.AppController.showHelpURL'.loc()),
        'DG.AppController.showHelpTitle'.loc(), //'Help with Data Games'
        { centerX: 0, centerY: 0, width: 600, height: 400 });
    },

    /**
     Open a new tab with the Data Games website.
     */
    showWebSite: function() {
      //var windowFeatures = "location=yes,scrollbars=yes,status=yes,titlebar=yes";
      var url = 'http://'+DG.getDrupalSubdomain()+DG.authorizationController.getLoginCookieDomain()+('DG.AppController.showWebSiteURL'.loc());
      window.open( url, 'dg_website' );
    }

  }; // end return from closure
  
}())) ; // end closure
