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

sc_require('controllers/document_archiver');
sc_require('controllers/document_controller');
sc_require('utilities/menu_pane');

/** @class

  Top-level coordinating controller for the DG application.

 @extends SC.Object
 */
DG.appController = SC.Object.create((function () // closure
/** @scope DG.appController.prototype */ {


  return {  // return from closure

    /**
     * Options menu.
     * @property {DG.MenuPane}
     */
    optionMenuPane: null,

    /**
     * Guide menu.
     * @property {SC.MenuPane}
     */
    guideMenuPane: null,

    /**
     * Help menu.
     * @property {DG.MenuPane}
     */
    helpMenuPane: null,

    documentArchiver: DG.DocumentArchiver.create({}),

    showCaseTableFor: function(iDataContext) {
      function removeCaseTable(caseTableID) {
        var controller = documentController.componentControllersMap[caseTableID];
        var view = controller.get('view');
        var containerView = view.parentView;
        containerView.removeComponentView(view);
      }
      function selectCaseTable (caseTable) {
        // find its view and make it selected
        var contentView = DG.mainPage.mainPane.scrollView.contentView;
        var componentView = contentView.get('componentViews').find(function (componentView) {
          return (componentView.controller === caseTable);
        });
        if (componentView) {
          componentView.invokeLater(function () { componentView.maximizeAndSelect(); });
        }
      }
      // is there a data context? if so, is there a case table for it? If so,
      // select it. If not create it. If there is no data context, create a
      // new one.
      var documentController = DG.currDocumentController();
      var caseTables = documentController.findComponentsByType(DG.CaseTableController);
      var foundCaseTable;
      var dataContext = iDataContext;
      var caseTable;
      // If no data context, we create a new one.
      if (SC.none(iDataContext)) {
        DG.UndoHistory.execute(DG.Command.create({
          name: 'dataContext.create',
          undoString: 'DG.Undo.dataContext.create',
          redoString: 'DG.Redo.dataContext.create',
          log: 'createNewEmptyDataSet',
          execute: function () {
            dataContext = DG.appController.createDataContextFromCSV(
                'DG.AppController.createDataSet.initialAttribute'.loc(), /*'new'*/
                'DG.AppController.createDataSet.name'.loc(), /* 'new_dataset' */
                DG.canonicalizeNamesDefault
            );
            caseTable = documentController.addCaseTable(
                DG.mainPage.get('docView'), null, {position: 'top', dataContext: dataContext});
            this.invokeLater(function () {
              caseTable.setFocusToComponentTitle();
            }, 1000);
          },
          undo: function () {
            documentController.destroyDataContext(dataContext.get('id'));
          },
          redo: function () {
            this.execute();
          }
        }));
      } else {
        foundCaseTable = caseTables.find(function (caseTable) {
          return (caseTable.get('dataContext') === iDataContext);
        });
        if (foundCaseTable) {
          // find its view and make it selected
          selectCaseTable(foundCaseTable);
        } else {
          DG.UndoHistory.execute(DG.Command.create({
            name: 'caseTable.open',
            undoString: 'DG.Undo.caseTable.open',
            redoString: 'DG.Redo.caseTable.open',
            log: 'openCaseTable: {name: "%@"}'.fmt(iDataContext.get('name')),
            executeNotification: DG.UndoHistory.makeComponentNotification( 'create', 'table'),
            undoNotification: DG.UndoHistory.makeComponentNotification( 'delete', 'table'),
            execute: function () {
              caseTable = documentController.addCaseTable(
                  DG.mainPage.get('docView'), null,
                  {position: 'top', dataContext: iDataContext});
              selectCaseTable(caseTable.get('controller'));
            },
            undo: function () {
              removeCaseTable(caseTable.getPath('model.id'));
            },
            redo: function () {
              this.execute();
            }
          }));
        }
      }
    },

    /**
     * Initialization function.
     */
    init: function () {
      sc_super();

      // Without the SC.run() we get warnings about invokeOnce() being called
      // outside the run loop in SC 1.10. A better solution would probably be
      // to create these menus somewhere else, but for now we just wrap them
      // in a run loop to quiet the warnings.
      SC.run(function() {
        this.tileMenuPane = DG.MenuPane.create({
          showTileList: function (iAnchor) {
            this.set('items', DG.mainPage.mainPane.scrollView.contentView.get('tileMenuItems'));
            this.popup(iAnchor);
          },
          layout: {width: 150},
          menuItemDidChange: function () {
            var tItemView = this.getPath('currentMenuItem.content.target'),
              tPrevItemView = this.getPath('previousMenuItem.content.target');
            if (tItemView) {
              tItemView.get('parentView').bringToFront(tItemView);
              tItemView.$().addClass('component-view-staging');
              tItemView.scrollToVisible();
            }
            if (tPrevItemView && tPrevItemView !== tItemView)
              tPrevItemView.$().removeClass('component-view-staging');
          }.observes('currentMenuItem', 'previousMenuItem'),
          willRemoveFromDocument: function () {
            var tItem = this.get('currentMenuItem'),
              tPrevItem = this.get('previousMenuItem');
            if (tItem)
              tItem.getPath('content.target').$().removeClass('component-view-staging');
            if (tPrevItem)
              tPrevItem.getPath('content.target').$().removeClass('component-view-staging');
          }
        });
        this.caseTableMenuPane = DG.MenuPane.create({
          showMenu: function (iAnchor) {
            this.set('items', DG.appController.get('caseTableMenuItems'));
            this.popup(iAnchor);
          },
          selectedItemDidChange: function () {
            DG.appController.showCaseTableFor(this.get('selectedItem').dataContext);
          }.observes('selectedItem'),
          itemLayerIdKey: 'id',
          layout: {width: 150}
        });
        this.optionMenuPane = DG.MenuPane.create({
          items: this.get('optionMenuItems'),
          itemLayerIdKey: 'id',
          layout: {width: 150}
        });
        this.guideMenuPane = SC.MenuPane.create({
          layout: {width: 250}
        });
        this.helpMenuPane = DG.MenuPane.create({
          items: this.get('helpMenuItems'),
          itemLayerIdKey: 'id',
          layout: {width: 150}
        });
      }.bind(this));

      // Give the user a chance to confirm/cancel before closing, reloading,
      // or navigating away from the page. The sites listed below provide some
      // information on the 'beforeunload' event and its handling, but the upshot
      // is that if you return a string, then the browser will provide a dialog
      // that should include the returned string (Firefox >= 4 chooses not to on
      // the grounds that there are security concerns).
      // https://developer.mozilla.org/en-US/docs/DOM/window.onbeforeunload
      // http://bytes.com/topic/javascript/insights/825556-using-onbeforeunload-javascript-event
      // https://bugzilla.mozilla.org/show_bug.cgi?id=588292 for discussion of Firefox functionality.
      // TODO: This confirmation message can cause an unescapable loop if
      // TODO: saving fails. Need a way out in these circumstances.
      window.onbeforeunload = function (iEvent) {
        if (DG.currDocumentController().get('hasUnsavedChanges') &&
            (DG.embeddedMode === 'no') &&
            (DG.componentMode === 'no')) {
          return 'DG.AppController.beforeUnload.confirmationMessage'.loc();
        }
      };
    },

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

    caseTableMenuItems: function () {
      var dataContexts = DG.currDocumentController().get('contexts');
      var menuItems = dataContexts.map(function (dataContext) {
        return {
          localize: false,
          title: dataContext.get('title'),
          target: DG.appController,
          dgAction: 'openOrSelectCaseTable',
          icon: 'tile-icon-table',
          dataContext: dataContext
        };
      });
      menuItems.push({
        localize: false, // todo: fix
        title: '-- new --',
        target: DG.mainPage,
        dgAction: 'openCaseTableForNewContext',
        icon: 'tile-icon-table'
      });
      return menuItems;
    }.property(),
    optionMenuItems: function () {
      return [
        { localize: true, title: 'DG.AppController.optionMenuItems.viewWebPage', // "View Web Page..."
          target: this, dgAction: 'viewWebPage', id: 'dg-optionMenuItem-view_webpage' },
        { localize: true, title: 'DG.AppController.optionMenuItems.configureGuide', // "Configure Guide..."
          target: this, dgAction: 'configureGuide', id: 'dg-optionMenuItem-configure-guide' }
      ];
    }.property(),

    helpMenuItems: function () {
      return [
        { localize: true, title: 'DG.AppController.optionMenuItems.help', // "Help...",
          target: this, dgAction: 'showHelpSite', id: 'dg-optionMenuItem-help-website' },
        { localize: true, title: 'DG.AppController.optionMenuItems.toWebSite', // "CODAP website...",
          target: this, dgAction: 'showWebSite', id: 'dg-optionMenuItem-codap-website' }
        // { localize: true, title: 'DG.AppController.optionMenuItems.reportProblem', // "Report Problem..."
        //   target: this, dgAction: 'reportProblem', id: 'dg-optionMenuItems-report-problem' }
      ];
    }.property(),

    /**
     * Imports text (e.g. from a CSV file) to the document from a URL.
     *
     * @param {string} iURL The url of a text (e.g. CSV) file
     * @param {Boolean} iShowCaseTable
     * @return {Deferred|undefined}
     */
    importTextFromUrl: function (iURL, iShowCaseTable) {
      if (iURL) {
        $.ajax(iURL, {
          type: 'GET',
          contentType: 'text/plain'
        }).then(function (data) {
            SC.run(function() {
                var doc = (typeof data === 'string')? data: JSON.stringify(data);
                return this.importText(doc, iURL, iShowCaseTable);
              }.bind(this)
            );
          }.bind(this), function (msg) {
            DG.logWarn(msg);
          }
        );
      }
    },

    /**
     * Imports a csv to the document from a data uri.
     *
     * @param {string} iURL The url of a text (e.g. CSV) file as a data uri
     * @return {Deferred|undefined}
     */
    importCSVFromDataUri: function (iURL) {
      if (iURL) {
        var urlParts = iURL.match(/^data:text\/csv;((base64),|(charset)=([^,]+),)?(.*)$/);
        if (urlParts) {
          var doc = urlParts[5];
          if (urlParts[2] === "base64") {
            try {
              doc = atob(doc);
            }
            catch (e) {
              doc = null;
              DG.logWarn(e);
            }
          }
          else {
            // keep decoding until there are no encoded characters (to ensure against double encoding)
            while (doc.match(/%[0-9a-f]{2}/i)) {
              doc = decodeURIComponent(doc);
            }
          }
          if (doc !== null) {
            SC.run(function() {
              return this.importText(doc, "Imported CSV");
            }.bind(this));
          }
        }
      }
    },

    /**
     * Create a data context from a string formatted as a CSV file.
     * @param iText {string}
     * @param iName {string}
     * @return {DG.DataContext}
     */
    createDataContextFromCSV: function (iText, iName, iCanonicalizeNames) {
      // Create document-specific store.
      var newDocument, context, contextRecord,
          documentController = DG.currDocumentController();

      // Parse the document contents from the retrieved docText.
      newDocument = this.documentArchiver.convertCSVDataToCODAPDocument( iText, iName, iCanonicalizeNames);

      if (SC.none(newDocument)) {
        throw new Error('DG.AppController.validateDocument.parseError'.loc(iName));
      }

      // set the id of the current document into the data context.
      newDocument.contexts[0].document = documentController.get('documentID');

      // Create the context record.
      contextRecord = DG.DataContextRecord.createContext(newDocument.contexts[0]);

      // create the context
      context = documentController.createDataContextForModel(contextRecord);
      context.restoreFromStorage(contextRecord.contextStorage);

      return context;
    },

    /**
     * Create a data context from a CSV string and expose it as a case table.
     * @param iText String  either CSV or tab-delimited
     * @param iName String  document name
     * @param { Boolean } iShowCaseTable Defaults to true
     * @returns {Boolean}
     */
    importText: function( iText, iName, iShowCaseTable) {
      var context = this.createDataContextFromCSV(iText, iName, DG.canonicalizeNamesDefault);

      iShowCaseTable = SC.none( iShowCaseTable) || iShowCaseTable;
      if( iShowCaseTable) {
        var documentController = DG.currDocumentController(),
            caseTable = documentController.addCaseTable(DG.mainPage.get('docView'), null, {dataContext: context});

        DG.dirtyCurrentDocument(caseTable);
      }

      return true;
    },

    importWebView: function(iDataURI, iName) {
      function determineImageSize(imgSrc, callback) {
        var newImg = new Image();

        newImg.onload = function() {
          var height = newImg.height;
          var width = newImg.width;
          newImg = undefined;
          callback(width, height);
        };

        newImg.src = imgSrc; // this must be done AFTER setting onload
      }
      var documentController = DG.currDocumentController();
      determineImageSize(iDataURI, function (iWidth, iHeight) {
        SC.run(function () {
          documentController.addWebView(  DG.mainPage.get('docView'), null,
              iDataURI, iName, {width: Math.min(iWidth, 640),
                height: Math.min(iHeight + 25, 480) });
        });
      });
    },
    /**
     *
     * @param iURL - the URL of a data interactive, csv or json document based on
     * file extension in pathname.
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

      // from: http://www.abeautifulsite.net/parsing-urls-in-javascript/
      var urlParser = document.createElement('a');
      urlParser.href = iURL;
      var pathname = urlParser.pathname.toLocaleLowerCase();

      if (pathname.match(/.*\.(json|codap)$/)) {
        DG.cfmClient.openUrlFile(iURL);
      } else if (pathname.match(/.*\.csv$/)){
        // CFM should be importing this document
        this.importTextFromUrl(iURL);
      } else if (iURL.match(/^data:text\/csv/)){
        this.importCSVFromDataUri(iURL);
      } else {
        addInteractive();
      }
      return true;
    },

    /**
     Close the current document and all its components.
     */
    closeDocument: function () {
      // Destroy the document and its contents
      DG.currDocumentController().closeDocument();
      DG.store = null;
    },

    /**
     * Closes the current document with confirmation.
     *
     * We interpose this between the menu item and closeDocumentWithConfirmation
     * to correct the argument.
     *
     * @param {object} sender: unused by the function.
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
    },

    mimeTypesAndExtensions: [
      {
        group: 'TEXT',
        mime: 'text/csv',
        extensions: ['csv']
      },
      {
        group: 'TEXT',
        mime: 'application/csv',
        extensions: ['csv']
      },
      {
        group: 'TEXT',
        mime: 'text/plain',
        extensions: ['txt']
      },
      {
        group: 'TEXT',
        mime: 'text/tab-separated-values',
        extensions: ['tsv']
      },
      {
        group: 'JSON',
        mime: 'application/json',
        extensions: ['json', 'codap']
      },
      {
        group: 'JSON',
        mime: 'application/x-javascript',
        extensions: ['json', 'codap']
      },
      {
        group: 'JSON',
        mime: 'text/x-json',
        extensions: ['json', 'codap']
      },
      {
        group: 'BINARY',
        mime: 'image/gif',
        extensions: ['gif']
      },
      {
        group: 'BINARY',
        mime: 'image/jpeg',
        extensions: ['jpeg','jpg']
      },
      {
        group: 'BINARY',
        mime: 'image/png',
        extensions: ['png']
      },
      {
        group: 'BINARY',
        mime: 'image/svg+xml',
        extensions: ['svg', 'svgz']
      }/*,
      {
        group: 'BINARY',
        mime: 'application/pdf',
        xtensions: 'pdf'
      },*/
    ],
    /**
      Imports a dragged or selected file
      */
    importFile: function ( iFile) {
      var typeDesc = this.mimeTypesAndExtensions.find(function (mimeDef) {
        var foundMime = (mimeDef.mime === iFile.type);
        var match = iFile.name.match(/\.([^.\/]+)$/);
        var mySuffix = match && match[1].toLowerCase();
        var foundSuffix = mySuffix && mimeDef.extensions.find(function (ext) { return mySuffix === ext; } );
        return foundMime || foundSuffix;
      });

      var handlingGroup = typeDesc? typeDesc.group: 'JSON';

      var tAlertDialog = {
        showAlert: function( iError) {
          var message = 'DG.AppController.dropFile.error'.loc(iError.message);
          if (DG.cfmClient) {
            DG.cfmClient.alert(message);
          }
          else {
            DG.AlertPane.show( {
              message: message
            });
          }
        },
        close: function() {
          // Do nothing
        }
      };

      DG.log('Opening file "%@" of type %@'.loc(iFile && iFile.name, typeDesc? typeDesc.mime: 'unknown'));
      this.importFileWithConfirmation(iFile, handlingGroup, tAlertDialog);
    },

    /**
     * Read a file from the file system.
     *
     * Handles CODAP documents and 'TEXT' files
     * (TEXT files here means comma or tab delimited data files.)
     * Will present a confirmation dialog if the type indicates a CODAP document
     * and the document is managed by the document server and has unsaved
     * changes.
     *
     * The file parameter may have come from a drop or a dialog box.
     * @param {File} iFile
     * @param {String} iType 'JSON' or 'TEXT'
     * @param {{showAlert:function,close:function}} iDialog optional error alert.
     */
    importFileWithConfirmation: function( iFile, iType, iDialog) {

      var finishImport = function() {
        function handleAbnormal() {
          console.log("Abort or error on file read.");
        }

        var handleRead = function () {
          SC.run(function() {
            try {
              if (iType === 'JSON') {
                DG.cfmClient.openLocalFile(iFile);
                window.location.hash = '';
                DG.log('Opened: ' + iFile.name);
              }
              else if (iType === 'TEXT') {
                that.importText(this.result, iFile.name);
              }
              else if (iType === 'BINARY') {
                that.importWebView(this.result, iFile.name);
              }
              if (iDialog)
                iDialog.close();
            }
            catch (er) {
              console.log(er);
              if (iDialog) {
                iDialog.showAlert(er);
              }
            }
          }.bind(this));
        };

        var that = this;
        DG.busyCursor.show( function() {
          var reader = new FileReader();
          if (iFile) {
            reader.onabort = handleAbnormal;
            reader.onerror = handleAbnormal;
            reader.onload = handleRead;
            if (iType === 'BINARY') {
              reader.readAsDataURL(iFile);
            } else {
              reader.readAsText(iFile);
            }
          }
        });
      }.bind( this);

      var docName;

      var cancelCloseDocument = function () {
        DG.logUser("cancelCloseDocument: '%@'", docName);
      };

      if ((iType === 'JSON') && DG.currDocumentController().get('hasUnsavedChanges')) {
        docName = DG.currDocumentController().get('documentName');
        DG.logUser("confirmCloseDocument?: '%@'", docName);
        DG.AlertPane.warn({
          message: 'DG.AppController.closeDocument.warnMessage',
          description: 'DG.AppController.closeDocument.warnDescription',
          buttons: [
            { title: 'DG.AppController.closeDocument.okButtonTitle',
              action: finishImport,
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
          finishImport();
        });
      }
      if( iDialog)
        iDialog.close();
    },

    /**
     Bring up the bug report page.
     */
    reportProblem: function () {

      var submitFeedback= function() {
        console.log(feedbackPane.contentView.subjectText.value);
        console.log(feedbackPane.contentView.feedbackText.value);
        console.log("Build #"+DG.BUILD_NUM);
        console.log("Browser: "+SC.browser.name+" v."+SC.browser.version);
        console.log("Device: "+SC.browser.device);
        console.log("OS: "+SC.browser.os+ " v."+SC.browser.osVersion);

        //SC.Request.postUrl('http://app.codap.concord.org/DataGames/WebPages/scripts/datagames.php?'+
        SC.Request.postUrl('https://codap.concord.org/help/contact?'+
          'device='+ SC.browser.device +
          '&os='+SC.browser.os+
          '&os_version='+SC.browser.osVersion+
          '&cf_browser='+SC.browser.name+
          '&cf_browser_version='+SC.browser.version+
          '&version='+DG.BUILD_NUM+
          // '&name='+iUser+
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

        layout: { top: 175, centerX: 0, width: 405, height: 350 },
        contentView: SC.View.extend({
          backgroundColor: '#dde2e8',
          childViews: 'feedbackHeader codapLogo feedbackImage subHeaderText messageText subjectText feedbackText submitFeedbackButton cancelFeedbackButton'.w(),

          feedbackHeader: SC.LabelView.design({
            layout: { top: 27,  height: 20 },
            controlSize: SC.LARGE_CONTROL_SIZE,
            fontWeight: SC.BOLD_WEIGHT,
            textAlign: SC.ALIGN_CENTER,
            value: 'DG.AppController.feedbackDialog.dialogTitle',
            localize: YES
          }),

          codapLogo: SC.ImageView.design({
            layout: {top:10, left:10, height:35, width:35},
            value: static_url('images/codap_logo.png')
          }),

          subHeaderText: SC.LabelView.design({
            layout: { top: 55, left: 10},
            fontWeight: SC.BOLD_WEIGHT,
            value: 'DG.AppController.feedbackDialog.subHeaderText',
            localize: YES
          }),

          messageText: SC.LabelView.design({
            layout: { top: 70, left: 10, right: 0, width: 395},
            textAlign: SC.ALIGN_LEFT,
            value: 'DG.AppController.feedbackDialog.messageText',
            localize: YES
          }),

          subjectText: SC.TextFieldView.design({
            layout: { top: 110, left: 10, width: 385, height: 20 },
            autoCorrect: false,
            autoCapitalize: false,
            hint: 'DG.AppController.feedbackDialog.subjectHint'
          }),

          feedbackText: SC.TextFieldView.design({
            layout: { top: 140, left: 10, height: 170, width: 385 },
            isTextArea: true,
            autoCorrect: false,
            autoCapitalize: false,
            hint:'DG.AppController.feedbackDialog.feedbackHint'
          }),

          submitFeedbackButton: SC.ButtonView.design({
            layout: { bottom: 10, height: 24, right: 10, width: 113 },
            title: 'DG.AppController.feedbackDialog.submitFeedbackButton',
            localize: YES,
            action: submitFeedback,
            isDefault: NO
          }),

          cancelFeedbackButton: SC.ButtonView.design({
            layout: { bottom: 10, height: 24, right: 135, width: 113 },
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
      var kWidth = 600, kHeight = 400,
          tLayout = { width : kWidth, height: kHeight };
      DG.currDocumentController().addWebView(DG.mainPage.get('docView'), null,
        (DG.showHelpURL),
        'DG.AppController.showHelpTitle'.loc(), //'Help with CODAP'
          tLayout);

    },

    openWebView: function( iURL, iTitle, iWidth, iHeight) {
      var tDocFrame = DG.mainPage.mainPane.scrollView.frame(),
          tLayout = { left: (tDocFrame.width - iWidth) / 2, top: (tDocFrame.height - iHeight) / 2,
            width: iWidth, height: iHeight };

      //var windowFeatures = "location=yes,scrollbars=yes,status=yes,titlebar=yes";
      DG.currDocumentController().addWebView(DG.mainPage.get('docView'), null,
          iURL, iTitle, tLayout);
    },

    /**
     Open a new tab with the CODAP website.
     */
    showWebSite: function () {
      var kWebsiteURL = DG.get('showWebSiteURL');

      window.open(kWebsiteURL, "CODAP Product Page"); //If tab with site is already open, no new tabs are generated, but tab with page does not come forward
    },

    /**
     Open a new tab with the CODAP website.
     */
    showHelpSite: function () {
      var tHelpURL = DG.get('showHelpURL'),
          tWidth = 400, tHeight = 400,
          tBrowser = SC.browser;
      if(tBrowser.name === SC.BROWSER.safari && tBrowser.os === SC.OS.ios) {
        this.openWebView( DG.get('showHelpURL'), 'DG.AppController.showHelpTitle'.loc(), tWidth, tHeight);
      }
      else {
        window.open(tHelpURL);
      }
    }

  }; // end return from closure

}())); // end closure
