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

sc_require('controllers/document_helper');
sc_require('controllers/document_controller');
sc_require('utilities/menu_pane');
sc_require('utilities/clipboard_utilities');

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

    documentArchiver: DG.DocumentHelper.create({}),

    /**
     * Show the case table or case card for a data context.
     * @param iDataContext
     */
    showCaseDisplayFor: function(iMenuItem) {
      function removeCaseDisplay(componentID) {
        var controller = documentController.componentControllersMap[componentID];
        var view = controller.get('view');
        var containerView = view.parentView;
        containerView.removeComponentView(view);
      }
      function selectView (componentView) {
        if (componentView) {
          componentView.invokeLater(function () { componentView.showAndSelect(); });
        }
      }
      // is there a data context? if so, is there a case table for it? If so,
      // select it. If not create it. If there is no data context, create a
      // new one.
      var dataContext = iMenuItem.dataContext;
      var action = iMenuItem.dgAction;
      var documentController = DG.currDocumentController();
      var foundView;
      var caseTable;
      // If no data context, we create a new one.
      if (SC.none(dataContext) && action === 'openCaseTableForNewContext') {
        DG.UndoHistory.execute(DG.Command.create({
          name: 'dataContext.create',
          undoString: 'DG.Undo.dataContext.create',
          redoString: 'DG.Redo.dataContext.create',
          log: 'createNewEmptyDataSet',
          isUndoable: false,
          execute: function () {
            dataContext = DG.appController.createMinimalDataContext(
                'DG.AppController.createDataSet.initialAttribute'.loc(), /*'AttributeName'*/
                'DG.AppController.createDataSet.name'.loc() /* 'New Dataset' */);
            caseTable = documentController.addCaseTable(
                DG.mainPage.get('docView'), null,
                {position: 'top', dataContext: dataContext});
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
      } else if (SC.none(dataContext) && action === 'openNewDataSetFromClipboard') {
        this.openNewDataSetFromClipboard();
      } else {
        foundView = documentController.tableCardRegistry.getViewForContext(dataContext);
        if (foundView) {
          // find its view and make it selected
          selectView(foundView);
        } else {
          DG.UndoHistory.execute(DG.Command.create({
            name: 'caseTable.open',
            undoString: 'DG.Undo.caseTable.open',
            redoString: 'DG.Redo.caseTable.open',
            log: 'openCaseTable: {name: "%@"}'.fmt(dataContext.get('name')),
            executeNotification: DG.UndoHistory.makeComponentNotification( 'create', 'table'),
            undoNotification: DG.UndoHistory.makeComponentNotification( 'delete', 'table'),
            execute: function () {
              caseTable = documentController.addCaseTable(
                  DG.mainPage.get('docView'), null,
                  {position: 'top', dataContext: dataContext});
              selectView(caseTable);
            },
            undo: function () {
              removeCaseDisplay(caseTable.getPath('model.id'));
            },
            redo: function () {
              this.execute();
            }
          }));
        }
      }
      return caseTable && caseTable.controller;
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
              tItemView.$().addClass('dg-component-view-staging');
              tItemView.scrollToVisible();
            }
            if (tPrevItemView && tPrevItemView !== tItemView)
              tPrevItemView.$().removeClass('dg-component-view-staging');
          }.observes('currentMenuItem', 'previousMenuItem'),
          willRemoveFromDocument: function () {
            var tItem = this.get('currentMenuItem'),
              tPrevItem = this.get('previousMenuItem');
            if (tItem)
              tItem.getPath('content.target').$().removeClass('dg-component-view-staging');
            if (tPrevItem)
              tPrevItem.getPath('content.target').$().removeClass('dg-component-view-staging');
          }
        });
        this.caseTableMenuPane = DG.MenuPane.create({
          showMenu: function (iAnchor) {
            this.set('items', DG.appController.get('caseTableMenuItems'));
            this.popup(iAnchor);
          },
          selectedItemDidChange: function () {
            DG.appController.showCaseDisplayFor(this.get('selectedItem'));
          }.observes('selectedItem'),
          itemLayerIdKey: 'id',
          layout: {width: 150}
        });
        this.pluginMenuPane = DG.MenuPane.create({
          init: function () {
            sc_super();
            var pluginMetadataURL = DG.get('pluginMetadataURL');
            if (!pluginMetadataURL) {
              DG.logWarn('Plugin metadata URL absent.');
            }
            // Retrieve plugin metadata for later reference
            $.ajax(pluginMetadataURL, {
              success: function (data) {
                SC.run(function () {
                DG.set('pluginMetadata', data);
                this.set('items', DG.appController.get('pluginMenuItems'));
                }.bind(this));
              }.bind(this),
              error: function () {
                DG.logError('Plugin Metadata Get failed: ' + pluginMetadataURL);
              }
            });
          },
          showMenu: function (iAnchor) {
            this.popup(iAnchor);
          },
          openStandardPlugin: function (pluginDef) {
            var doc = DG.currDocumentController();
            var tComponent = DG.Component.createComponent({
              type: "DG.GameView",
              document: doc.get('content') ,
              layout: pluginDef.dimensions,
              componentStorage: {
                currentGameName: pluginDef.title,
                currentGameUrl: pluginDef.url,
                allowInitGameOverride: true
              }
            });
            doc.createComponentAndView( tComponent);
          },
          selectedItemDidChange: function () {
            var selectedItem = this.get('selectedItem');
            if (selectedItem) {
              this.openStandardPlugin(selectedItem);
              this.set('selectedItem', null);
            }
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
            (DG.get('embeddedMode') === 'no') &&
            (DG.get('componentMode') === 'no')) {
          return 'DG.AppController.beforeUnload.confirmationMessage'.loc();
        }
      };
    },


    dataSetDeleteAgent: SC.Object.extend({
      deleteWithAlert: function (menu) {
        DG.AlertPane.warn({
          dataContext: this.dataContext,
          doDelete: function () {
            DG.currDocumentController().destroyDataContext(this.get('dataContext').get('id'));
          },
          message: 'DG.TableController.deleteDataSet.confirmMessage'.loc(
              this.get('dataContext').get('title')),
          description: 'DG.TableController.deleteDataSet.confirmDescription'.loc(),
          buttons: [{
            title: 'DG.TableController.deleteDataSet.okButtonTitle',
            action: 'doDelete',
            localize: YES
          }, {
            title: 'DG.TableController.deleteDataSet.cancelButtonTitle',
            localize: YES
          }],
          localize: false
        });
      }
    }),
    caseTableMenuItems: function () {
      var documentController = DG.currDocumentController();
      var dataContexts = documentController.get('contexts');
      var menuItems = dataContexts.map(function (dataContext) {
        var viewType = documentController.tableCardRegistry.getActiveViewTypeForContext(dataContext.get('id'));//'DG.CaseTable' || 'DG.CaseCard'
        return {
          localize: false,
          title: dataContext.get('title'),
          toolTip: 'DG.AppController.caseTableMenu.openCaseTableToolTip',
          target: DG.appController,
          icon: viewType==='DG.CaseCard'? 'tile-icon-card': 'tile-icon-table',
          dataContext: dataContext,
          rightIcon: 'dg-trash-icon',
          rightTarget: this.dataSetDeleteAgent.create({dataContext: dataContext}),
          rightAction: 'deleteWithAlert',
          rightToolTip: 'DG.AppController.caseTableMenu.deleteDataSetToolTip'
        };
      }.bind(this));
      menuItems.push({
        localize: true,
        title: 'DG.AppController.caseTableMenu.clipboardDataset',
        toolTip: 'DG.AppController.caseTableMenu.clipboardDatasetToolTip',
        target: DG.appController,
        isEnabled: DG.ClipboardUtilities.canPaste(),
        dgAction: 'openNewDataSetFromClipboard',
        icon: 'tile-icon-table'
      });
      menuItems.push({
        localize: true,
        title: 'DG.AppController.caseTableMenu.newDataSet',
        toolTip: 'DG.AppController.caseTableMenu.newDataSetToolTip',
        target: DG.mainPage,
        dgAction: 'openCaseTableForNewContext',
        icon: 'tile-icon-table'
      });
      return menuItems;
    }.property(),
    pluginMenuItems: function () {
      // DG.log('Making plugin menu items');
      var baseURL = DG.get('pluginURL');
      var pluginMetadata = DG.get('pluginMetadata');
      var items = pluginMetadata? pluginMetadata.map(function (pluginData) {
        return {
          localize: true,
          title: pluginData.title,
          url: baseURL + pluginData.path,
          target: this,
          toolTip: pluginData.description,
          dgAction: 'openPlugin',
          dimensions: {
            width: pluginData.width || 400,
            height: pluginData.height || 300
          },
          icon: pluginData.icon? baseURL + pluginData.icon: 'tile-icon-mediaTool',
          // replace spaces with hyphens when creating the id
          id: 'dg-pluginMenuItem-' + pluginData.title.replace(/ /g, '-')
        };
      }): [];
      return items;
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
        { localize: true, title: 'DG.AppController.optionMenuItems.help-forum', // "Help...",
          target: this, dgAction: 'showHelpForum', id: 'dg-optionMenuItem-help-forum' },
        { localize: true, title: 'DG.AppController.optionMenuItems.toWebSite', // "CODAP website...",
          target: this, dgAction: 'showWebSite', id: 'dg-optionMenuItem-codap-website' },
        { localize: true, title: 'DG.AppController.optionMenuItems.toPrivacyPage', // "CODAP privacy...",
          target: this, dgAction: 'showPrivacyPage', id: 'dg-optionMenuItem-privacy-page' }
        // { localize: true, title: 'DG.AppController.optionMenuItems.reportProblem', // "Report Problem..."
        //   target: this, dgAction: 'reportProblem', id: 'dg-optionMenuItems-report-problem' }
      ];
    }.property(),

    openNewDataSetFromClipboard: function() {
      var _this = this;

      window.focus();
      if (document.activeElement) {
        document.activeElement.blur();
      }

      window.navigator.clipboard.readText().then(
          function(data) {
            SC.run(function () {
              if (/^https?:\/\/[^\n]*$/.test(data)) {
                _this.importURL(data);
              } else {
                _this.openCSVImporter({
                  contentType: 'text/csv',
                  text: data,
                  datasetName: 'clipboard data',
                  showCaseTable: true
                });
              }
            });
          },
          function (err) {
            // maybe user didn't grant access to read from clipboard
            console.log('Error importing from clipboard: ', err);
          }
      );
    },

    extractNameFromURLPath: function (iURL) {
      function parseURL(url) {
        var a = document.createElement('a');
        a.href = url;
        return a;
      }
      var parsedURL = parseURL(iURL);
      if (parsedURL.protocol === 'data:') {
        return 'data';
      }
      var fullPathname = parsedURL.pathname;
      var path = fullPathname?fullPathname
          .replace(/\/$/, '')
          .replace(/.*\//, '')
          .replace(/\.[^.]*$/, '')||iURL:iURL;
      return path;
    },
    /**
     * Imports text (e.g. from a CSV file) to the document from a URL.
     *
     * @param {string} iURL The url of a text (e.g. CSV) file
     * @param {Boolean} iShowCaseTable
     * @return {Deferred|undefined}
     */
    importTextFromUrl: function (iURL, iShowCaseTable, iName) {
      var name = iName || this.extractNameFromURLPath(iURL);
      this.openCSVImporter({
        contentType: 'text/csv',
        url: iURL,
        datasetName: name,
        showCaseTable: iShowCaseTable
      });
    },
    importGeoJSONFromURL: function (iURL) {
      var name = this.extractNameFromURLPath(iURL);
      this.openGeoJSONImporter({
        contentType: 'application/geo+json',
        url: iURL,
        datasetName: name,
        showCaseTable: false
      });
    },

    openImporterPlugin: function(iName, iPath, iGameState) {
      var tComponent = DG.Component.createComponent({
        type: 'DG.GameView',
        layout: {
          isVisible: false
        },
        document: DG.currDocumentController(),
        componentStorage: {
          currentGameName: iName,
          currentGameUrl: DG.get('pluginURL') + iPath,
          savedGameState: iGameState,
          title: iName,
        }
      });
      DG.currDocumentController().createComponentAndView(tComponent);
    },
    /**
     * Opens the CSV Importer plugin, preconfigured with the information
     * it needs to perform the import.
     * @param iConfig {Object} Configuration, as follows (iConfig must have
     *                         one of url or data, but not both)
     *
     *                           url: url refering to a CSV or tab delimited file
     *                           data: an array of arrays
     *                           datasetName: the name of the dataset
     *                           showCaseTable: whether to display the case
     *                                  table for the new context
     */
    openCSVImporter: function (iConfig) {
      this.openImporterPlugin('Importer', '/Importer/', iConfig);
    },

    openGeoJSONImporter: function (iConfig) {
      this.openImporterPlugin('Importer', '/Importer/', iConfig);
    },

    openHTMLImporter: function (iConfig) {
      this.openImporterPlugin('Importer', '/Importer/', iConfig);
    },

    openGoogleSheetsImporter: function (iConfig) {
      this.openImporterPlugin('Importer', '/Importer/', iConfig);
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
     * @param iColumnName {string}
     * @param iContextName {string}
     * @return {DG.DataContext}
     */
    createMinimalDataContext: function (iColumnName, iContextName) {
      // Create document-specific store.
      var context, contextRecord,
          documentController = DG.currDocumentController(),
          baseContextName = iContextName.replace(/.*[\\\/]/g, '').replace(/\.[^.]*/, ''),
          contextName = baseContextName,
          collectionName = 'DG.AppController.createDataSet.collectionName'.loc(),
          i = 1;

      // guarantee uniqueness of data context name/title
      while (documentController.getContextByName(contextName) ||
              documentController.getContextByTitle(contextName)) {
        contextName = baseContextName + " " + (++i);
      }

      // Create the context record.
      contextRecord = DG.DataContextRecord.createContext({
        title: contextName,
        name: contextName,
        collections: [{
          name: collectionName,
          attrs: [{
            name: iColumnName
          }]
        }],
        contextStorage: {}
      });

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
    importText: function( iText, iName, iFilename, iShowCaseTable) {
      this.openCSVImporter({
        contentType: 'text/csv',
        text: iText,
        datasetName: iName,
        filename: iFilename,
        showCaseTable: iShowCaseTable
      });
      return true;
    },

    importHTMLTable: function (iText) {
      this.openHTMLImporter({
        contentType: 'text/html',
        text: iText
      });
      return true;
    },

    importGoogleSheets: function (iURL) {
      var config = {
        contentType: 'application/vnd.google-apps.spreadsheet',
        url: iURL,
        showCaseTable: true
      };
      this.openGoogleSheetsImporter(config);
    },
    importImage: function(iURL, iName) {
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
      var tName = iName? iName.slice(0,30): '';
      determineImageSize(iURL, function (iWidth, iHeight) {
        SC.run(function () {
          documentController.addImageView(  DG.mainPage.get('docView'), null,
              iURL, tName, {width: Math.min(iWidth, 480),
                height: Math.min(iHeight + 25, 385) });
        });
      });
    },
    /**
     *
     * @param iURL - the URL of a webpage, data interactive, csv or json document based on
     * file extension in pathname.
     * @param iComponentType - (optional) the type of the component, defaults to DG.GameView
     * @returns {Boolean}
     */
    importURL: function (iURL, iComponentType, iName) {

      var addInteractive = function () {
        var tDoc = DG.currDocumentController(),
            tComponent;

        switch (iComponentType || "DG.GameView") {
          case "DG.GameView":
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
            break;
          case "DG.WebView":
            tDoc.addWebView(DG.mainPage.get('docView'), null, iURL, 'Web Page', {width: 600, height: 400});
            break;
        }
      }.bind(this);

      // from: http://www.abeautifulsite.net/parsing-urls-in-javascript/
      var urlParser = document.createElement('a');
      urlParser.href = iURL;
      var baseURL = urlParser.protocol + urlParser.host + urlParser.pathname;

      var mimeSpec = this.matchMimeSpec(baseURL, iComponentType);

      if (!mimeSpec) { mimeSpec = {group:'UNKOWN',mime: ['unkown']}; }
      DG.log('Opening url "%@" of type %@'.loc(iURL, mimeSpec.mime[0]));
      if (mimeSpec) {
        switch (mimeSpec.group) {
          case 'TEXT':
            this.importTextFromUrl(iURL, false, iName);
            break;
          case 'GEOJSON':
            this.importGeoJSONFromURL(iURL);
            break;
          case 'JSON':
            DG.cfmClient.openUrlFile(iURL);
            break;
          case 'IMAGE':
            this.importImage(iURL, iName);
            break;
          case 'SHEETS':
            this.importGoogleSheets(iURL);
            break;
          default:
            addInteractive();
        }
      }

      return true;
    },

    importDrawToolWithDataURL: function(iDataURL, iTitle) {
      var kWidth = 600, kHeight = 400,
          kComponentType = 'DG.GameView',
          layout = { width : kWidth, height: kHeight },
          drawToolUrl = DG.get('drawToolPluginURL'),
          title = "DG.DataDisplayMenu.imageOfTitle".loc(iTitle),
          tDoc = DG.currDocumentController(),
          tComponent = DG.Component.createComponent({
            type: kComponentType,
            document: tDoc.get('content'),
            layout: layout,
            componentStorage: {
              currentGameName: title,
              currentGameUrl: drawToolUrl,
              allowInitGameOverride: true
            }
          }),
          tComponentArgs = { initiatedViaCommand: true },
          tView = tDoc.createComponentAndView(tComponent, kComponentType, tComponentArgs),
          tSuperView = tView && tView.get('parentView'),
          tController = tView && tView.get('controller');
      if (tSuperView && tSuperView.positionNewComponent)
        tSuperView.positionNewComponent(tView, 'top', true);
      if (tController && tController.sendCommand)
        tController.sendCommand({ action: 'update', resource: 'backgroundImage', values: { image: iDataURL }});
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
        mime: ['text/csv', 'application/csv'],
        extensions: ['csv']
      },
      {
        group: 'TEXT',
        mime: ['text/plain'],
        extensions: ['txt']
      },
      {
        group: 'TEXT',
        mime: ['text/tab-separated-values'],
        extensions: ['tsv', 'tab']
      },
      {
        group: 'JSON',
        mime: ['application/json', 'application/x-javascript', 'text/x-json'],
        extensions: ['json', 'codap']
      },
      {
        group: 'GEOJSON',
        mime: ['application/geo+json','application/vnd.geo+json'],
        extensions: ['geojson']
      },
      {
        group: 'IMAGE',
        mime: ['image/gif'],
        extensions: ['gif']
      },
      {
        group: 'IMAGE',
        mime: ['image/jpeg'],
        extensions: ['jpeg','jpg']
      },
      {
        group: 'IMAGE',
        mime: ['image/png'],
        extensions: ['png']
      },
      {
        group: 'IMAGE',
        mime: ['image/svg+xml'],
        extensions: ['svg', 'svgz']
      }/*,
      {
        group: 'IMAGE',
        mime: 'application/pdf',
        xtensions: 'pdf'
      }*/,
      {
        group: 'SHEETS',
        mime: ['application/vnd.google-apps.spreadsheet'],
        extensions: []
      }
    ],
    /**
     * Attempts to match a filename or URL or a type to an entry in the above
     * spec list.
     * @param name: a filename or URL
     * @param type: a type string. May be missing.
     */
    matchMimeSpec: function (name, type) {
      var isSheetsURL = /docs.google.com\/spreadsheets/.test(name);
      var isDataURIMatch = /^data:([^;]+);.+$/.exec(name);
      var match = name && name.match(/\.([^.\/]+)$/);
      var mySuffix = match && match[1].toLowerCase();
      var typeDesc;
      // if we haven't a type and its a data URI, use its mime type
      if (type == null && isDataURIMatch) {
        type = isDataURIMatch[1];
      }
      if (isSheetsURL) {
        type = 'application/vnd.google-apps.spreadsheet';
      }
      typeDesc = typeDesc || type && this.mimeTypesAndExtensions.find(function (mimeDef) {
        return (type != null) && mimeDef.mime.find(function (str) {
          return str === type;
        });
      });
      typeDesc = typeDesc || this.mimeTypesAndExtensions.find(function (mimeDef) {
        return mySuffix && mimeDef.extensions.find(function (ext) {
          return mySuffix === ext;
        });
      });
      return typeDesc;
    },
    /**
      Imports a dragged or selected file
      */
    importFile: function ( iFile) {
      var typeDesc = this.matchMimeSpec(iFile.name, iFile.type);
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

      DG.log('Opening file "%@" of type %@'.loc(iFile && iFile.name, typeDesc? typeDesc.mime[0]: 'unknown'));
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
              else if (iType === 'GEOJSON') {
                that.openGeoJSONImporter({
                  contentType: 'application/geo+json',
                  text: this.result,
                  datasetName: iFile.name.replace(/\.[^.]*$/, ''),
                  filename: iFile.name,
                  showCaseTable: true
                });
              }
              else if (iType === 'TEXT') {
                that.importText(this.result,
                    iFile.name.replace(/\.[^.]*$/, ''), iFile.name);
              }
              else if (iType === 'IMAGE') {
                that.importImage(this.result, iFile.name);
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
            if (iType === 'IMAGE') {
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

      window.open(kWebsiteURL); //If tab with site is already open, no new tabs are generated, but tab with page does not come forward
    },

    showPrivacyPage: function () {
      var kWebsiteURL = DG.get('showPrivacyURL');
      window.open(kWebsiteURL);
    },

    /**
     Open a new tab with the CODAP help pages.
     */
    showHelpSite: function () {
      var tLang = DG.get('currentLanguage');
      var tHelpURL = DG.get('showHelpURL_' + tLang) || DG.get('showHelpURL'),
          tWidth = 400, tHeight = 400;
      this.openWebView( tHelpURL, 'DG.AppController.showHelpTitle'.loc(), tWidth, tHeight);
    },

    /**
     Open a new tab with the CODAP help forum.
     */
    showHelpForum: function () {
      var tHelpForumURL = DG.get('showHelpForumURL'),
          tWidth = 400, tHeight = 400,
          tBrowser = SC.browser;
      if(tBrowser.name === SC.BROWSER.safari && tBrowser.os === SC.OS.ios) {
        this.openWebView( tHelpForumURL, 'DG.AppController.showHelpForumTitle'.loc(), tWidth, tHeight);
      }
      else {
        window.open(tHelpForumURL);
      }
    },

    openPlugin: function (iURL) {
      this.importURL(iURL);
    }

  }; // end return from closure

}())); // end closure
