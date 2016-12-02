// ==========================================================================
//                               DG.main
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
/*globals React */
sc_require('controllers/app_controller');
sc_require('controllers/authorization');

// This is the function that will start your app running.  The default
// implementation will load any fixtures you have created then instantiate
// your controllers and awake the elements on your page.
//
// As you develop your application you will probably want to override this.
// See comments for some pointers on what to do next.
//
DG.main = function main() {

 DG.Browser.init(); // Import any DG specific browser hacks we need.

  SC.$('body' ).addClass( 'dg');

  // Fix to support touch events in non-SproutCore elements like jQuery UI widgets.
  // By default, SC.RootResponder swallows all touch events except for those
  // intended for specific browser tags (input, textarea, a, select). For non-SC
  // elements to work correctly on touch devices, they need to receive touch events
  // as well. To do so, we monkey-patch SC.RootResponder's ignoreTouchHandle() method
  // to ignore (i.e. allow to be dispatched) touch events in views that have the
  // 'dg-wants-touch' class (or any of its ancestors have the class), which we can
  // then apply to any element that needs it, such as the jQueryUI autocomplete menu.
  var orgIgnoreTouchHandle = SC.RootResponder.prototype.ignoreTouchHandle;
  SC.RootResponder.prototype.ignoreTouchHandle = function(evt) {
    return $(evt.target).closest('.dg-wants-touch').length || orgIgnoreTouchHandle(evt);
  };

  DG.getPath('mainPage.mainPane').append();

  DG.appController.documentNameDidChange();

  DG.showUserEntryView = true;

  /* begin CFM load/configuration */
  /* global Promise */

  function openDataInteractive(iURL) {
    if (iURL) {
      // Create document-specific store.
      var archiver = DG.DocumentArchiver.create({}), newDocument;

      DG.currDocumentController().closeDocument();

      // Make a data interactive iFrame using the given URL
      newDocument = archiver.createNewDocumentWithDataInteractiveURL(iURL);

      DG.currDocumentController().setDocument(newDocument);
    }
  }
  function translateQueryParameters() {
    var url = window.location.href;
    // parse url
    var parsedURL = $('<a>', {href:url})[0];
    var hash = parsedURL.hash;
    var startingDataInteractive = DG.get('startingDataInteractive');

    if (DG.get('runKey'))
      DG.set('showUserEntryView', false);

    hash = hash && hash.length >= 1 && hash.slice(1);

    if (SC.empty(hash)) {
      if (startingDataInteractive) {
        DG.set('showUserEntryView', false);
        openDataInteractive(startingDataInteractive);
      }
    }
  }
  function cfmUrl(filename) {
    var url = null,
        a;

    if (DG.cfmBaseUrl) {
      // safely parse the url and check to only allow codap.concord.org or a domain with no tld (like localhost or dev)
      a = document.createElement("A");
      a.href = DG.cfmBaseUrl;
      if ((a.hostname === 'codap.concord.org') || (a.hostname.indexOf('.') === -1)) {
        a.pathname = (a.pathname[a.pathname.length - 1] === '/' ? a.pathname : (a.pathname + '/')) + filename;
        url = a.href;
        DG.logWarn('Loading the ' + filename + ' CFM file from ' + url);
      }
      else {
        DG.logError('The cfmBaseUrl domain (' + a.hostname + ') either needs to be codap.concord.org or not have a TLD (like localhost)');
      }
    }

    if (!url) {
      // static_url is run at build time so we have to directly reference the paths
      if (filename === 'globals.js') {
        url = static_url('cloud-file-manager/js/globals.js.ignore');
      }
      else if (filename === 'app.js') {
        url = static_url('cloud-file-manager/js/app.js.ignore');
      }
    }

    return url;
  }
  function cfmGlobalsLoaded() {
    return new Promise(function(resolve, reject) {
                $.ajax({
                  url: cfmUrl('globals.js'),
                  dataType: 'script',
                  success: function() {
                    resolve(true);
                  },
                  failure: function() {
                    reject(false);
                  }
                });
              });
  }
  function cfmAppLoaded() {
    return new Promise(function(resolve, reject) {
                $.ajax({
                  url: cfmUrl('app.js'),
                  dataType: 'script',
                  success: function() {
                    resolve(true);
                  },
                  failure: function() {
                    reject(false);
                  }
                });
              });
  }

  function cfmInit(iCloudFileManager, iViewConfig) {
    var options = {
          autoSaveInterval: 5,
          appName: DG.APPNAME,
          appVersion: DG.VERSION,
          appBuildNum: DG.BUILD_NUM,
          appOrMenuElemId: iViewConfig.navBarId,
          hideMenuBar: DG.get('hideCFMMenu'),
          ui: {
            menu: [
              { name: 'DG.fileMenu.menuItem.newDocument'.loc(), action: 'newFileDialog' },
              { name: 'DG.fileMenu.menuItem.openDocument'.loc(), action: 'openFileDialog' },
              {
                name: 'DG.fileMenu.menuItem.closeDocument'.loc(),
                action: function () {
                          DG.cfmClient.closeFileDialog(function () {
                            SC.run(function() {
                              DG.appController.closeAndNewDocument();
                            });
                          });
                        }
              },
              { name: 'DG.fileMenu.menuItem.importFile'.loc(), action: 'importDataDialog' },
              {
                name: 'DG.fileMenu.menuItem.revertTo'.loc(),
                items: [
                  { name: 'DG.fileMenu.menuItem.revertToOpened'.loc(), action: 'revertToLastOpenedDialog'},
                  { name: 'DG.fileMenu.menuItem.revertToShared'.loc(), action: 'revertToSharedDialog'}
                ]
              },
              'separator',
              { name: 'DG.fileMenu.menuItem.saveDocument'.loc(), action: 'saveFileAsDialog' },
              { name: 'DG.fileMenu.menuItem.copyDocument'.loc(), action: 'createCopy' },
              {
                name: 'DG.fileMenu.menuItem.share'.loc(),
                items: [
                  { name: 'DG.fileMenu.menuItem.shareGetLink'.loc(), action: 'shareGetLink' },
                  { name: 'DG.fileMenu.menuItem.shareUpdate'.loc(), action: 'shareUpdate' }
                ]
              },
              { name: 'DG.fileMenu.menuItem.renameDocument'.loc(), action: 'renameDialog' }
            ],
          },
          wrapFileContent: false,
          mimeType: 'application/json',
          readableMimeTypes: ['application/x-codap-document'],
          extension: 'codap',
          readableExtensions: ["json", ""],
          enableLaraSharing: true,
          providers: [
            {
              "name": "readOnly",
              "displayName": "Example Documents",
              "urlDisplayName": "examples",
              "src": DG.exampleListURL,
              alphabetize: true
            },
            {
              "name": "lara",
              "patch": true,
              "patchObjectHash": function(obj) {
                return obj.guid || JSON.stringify(obj);
              }
            },
            {
              "name": "googleDrive",
              "mimeType": "application/json",
              "clientId": "891260722961-eqgr7i63p33k44jcfr367539n068m57k.apps.googleusercontent.com"
            },
            {
              "name": "documentStore",
              "displayName": "Concord Cloud",
              "deprecationPhase": (function() { // IIFE to keep code localized
                                    // queryParam overrides defaults for testing
                                    var phase = DG.getQueryParam('deprecationPhase');
                                    if (phase) return Number(phase);

                                    var currDate = new Date(),
                                        phase2Date = new Date(2016, 10, 15),
                                        phase3Date = new Date(2017, 0, 1);
                                    if (currDate >= phase3Date) return 3;
                                    if (currDate >= phase2Date) return 2;
                                    return 1;
                                  })(),
              "patch": true,
              "patchObjectHash": function(obj) {
                return obj.guid || JSON.stringify(obj);
              }
            },
            "localFile"//,
            //"localStorage"
          ]
        };
    iCloudFileManager.init(options);
  }

  /*
   * Resolve a single external document ID reference
   */
  function dataContextPromise(iDataContext) {
    return new Promise(function(resolve, reject) {
      // instantiate external document ID references
      var params = { recordid: iDataContext.externalDocumentId };
      if (DG.get('runKey')) {
        params.runKey = DG.get('runKey');
        var hashIndex = params.runKey.indexOf('#');
        if (hashIndex >= 0)
          params.runKey = params.runKey.substr(0, hashIndex);
      }
      if(iDataContext.externalDocumentId != null) {
        $.ajax({
          // external document references were only used with the
          // Concord Document Store
          url: '//document-store.concord.org/document/open',
          data: params,
          dataType: 'json',
          xhrFields: { withCredentials: true },
          success: function(iContents) {
            resolve(iContents);
          },
          error: function(jqXHR, textStatus, errorThrown) {
            reject(errorThrown || textStatus);
          }
        });
      }
      // standard data contexts can just be resolved
      else {
        resolve(iDataContext);
      }
    });
  }

  /*
   * Resolve any external document ID references
   */
  function docContentsPromise(iDocContents) {
    return new Promise(function(resolve, reject) {
      var dataContexts = iDocContents && iDocContents.contexts,
          dataContextPromises = dataContexts && dataContexts.map(function(iDataContext) {
                                  return dataContextPromise(iDataContext);
                                });
      // Once all external document references have been resolved...
      if (dataContextPromises) {
        Promise.all(dataContextPromises)
          .then(function(iResolvedDataContexts) {
                  // replace the array of pre-processed context objects
                  // with the array of resolved context promises
                  iDocContents.contexts = iResolvedDataContexts;
                  resolve(iDocContents);
                },
                function(iReason) {
                  reject(iReason);
                });
      }
      else {
        resolve(iDocContents);
      }
    });
  }

  function syncProperty(iDstObj, iSrcObj, iProperty) {
    if(typeof(iSrcObj[iProperty]) !== "undefined")
      iDstObj[iProperty] = iSrcObj[iProperty];
    else
      delete iDstObj[iProperty];
  }

  function cfmShowUserEntryView() {

    var DialogContents = React.createFactory(React.createClass({
      close: function () {
        DG.cfmClient.hideBlockingModal();
      },
      authorizeUrlDocument: function () {
        DG.cfmClient.parseUrlAuthorizeAndOpen();
      },
      createNewDocument: function () {
        this.close();
        DG.cfmClient.newFile();
      },
      openDocument: function () {
        this.close();
        DG.cfmClient.openFileDialog();
      },
      componentDidMount: function() {
        this.refs.openButton.focus();
      },
      render: function () {
        return React.DOM.div({onKeyDown: function(evt) {
                                // escape key
                                if (evt.keyCode === 27) this.createNewDocument();
                                // return/enter
                                else if (evt.keyCode === 13) this.openDocument();
                              }.bind(this)}, [
          React.DOM.div({style: {margin: 10}, key: 2},
                        React.DOM.button({ref: 'openButton',
                                          onClick: this.openDocument},
                                          'DG.main.userEntryView.openDocument'.loc())),
          React.DOM.div({style: {margin: 10}, key: 1},
                        React.DOM.button({ref: 'newButton',
                                          onClick: this.createNewDocument},
                                          'DG.main.userEntryView.newDocument'.loc()))
        ]);
      }
    }));
    if (DG.get('showUserEntryView')) {
      DG.cfmClient.showBlockingModal({
        title: 'DG.main.userEntryView.title'.loc(),
        message: DialogContents({}), // jshint ignore:line
        onDrop: function () { DG.cfmClient.hideBlockingModal(); }}
      );
    }
  }

  function cfmConnect(iCloudFileManager) {
    DG.cfm = iCloudFileManager;

    if (DG.cfm) {
      DG.cfm.clientConnect(function (event) {
        /* global nodeDeepEqual */
        var docController, docContent, docMetadata,
            cfmSharedMetadata;

        function syncDocumentDirtyState() {
          DG.cfmClient && DG.cfmClient.dirty(DG.currDocumentController().get('hasUnsavedChanges'));
        }

        switch (event.type) {
          case 'connected':
            DG.cfmClient = event.data.client;
            DG.cfmClient.setProviderOptions("documentStore",
                                            {appName: DG.APPNAME,
                                             appVersion: DG.VERSION,
                                             appBuildNum: DG.BUILD_NUM
                                            });
            DG.cfmClient._ui.setMenuBarInfo("Version "+DG.VERSION+" ("+DG.BUILD_NUM+")");

            // synchronize document dirty state on document change
            DG.currDocumentController().addObserver('hasUnsavedChanges', function() {
              syncDocumentDirtyState();
            });

            if ( !SC.empty(DG.startingDocUrl)) {
              DG.cfmClient.openUrlFile(DG.startingDocUrl);
            }

            break;

          case "ready":
            if ( SC.empty(DG.startingDocUrl)) {
              cfmShowUserEntryView();
            }
            DG.splash.hideSplash();
            break;

          case "closedFile":
            cfmShowUserEntryView();
            break;

          case 'getContent':
            DG.currDocumentController().captureCurrentDocumentState(true)
              .then(function(iContents) {
                var cfmSharedMetadata = event.data && event.data.shared || {},
                    docMetadata = iContents.metadata || {};
                // For now, _permissions must be stored at top-level for Document Store
                syncProperty(iContents, cfmSharedMetadata, '_permissions');
                // replace 'shared' metadata property with object passed from CFM
                docMetadata.shared = $.extend(true, {}, cfmSharedMetadata);
                // record changeCount as a form of savedVersionID
                docMetadata.changeCount = DG.currDocumentController().get('changeCount');
                // combine shared metadata with content to pass back to caller
                iContents.metadata = docMetadata;
                event.callback(iContents);
              });
            break;

          case 'newedFile':
            SC.run(function() {
              DG.appController.closeAndNewDocument();
              DG.splash.hideSplash();
            });
            break;

          case 'openedFile':
            SC.run(function() {
              DG.splash.showSplash();
            });

            setTimeout(function(){
              SC.run(function() {
                DG.cfmClient.hideBlockingModal();
                docContentsPromise(event.data.content)
                  .then(function(iDocContents) {
                    SC.run(function() {
                      var metadata = event.data.content.metadata,
                            sharedMetadata = metadata && metadata.shared,
                            cfmSharedMetadata = sharedMetadata
                                                  ? $.extend(true, {}, sharedMetadata)
                                                  : {};
                        DG.appController.closeAndNewDocument();
                        DG.store = DG.ModelStore.create();
                        DG.currDocumentController()
                          .setDocument(DG.Document.createDocument(iDocContents));
                        DG.set('showUserEntryView', false);
                        if(event.callback) {
                          // acknowledge successful open; return shared metadata
                          event.callback(null, cfmSharedMetadata);
                        }
                      },  // then() error handler
                      function(iReason) {
                        DG.AlertPane.error({
                          localize: true,
                          message: 'DG.AppController.openDocument.error.general'
                        });
                      });
                    });
              });
            }, 0);
            break;

          case 'savedFile':
            SC.run(function() {
              docContent = event.data.content;
              docMetadata = docContent && docContent.metadata;
              var docContentChangeCount = docContent && docContent.changeCount,
                  docMetadataChangeCount = docMetadata && docMetadata.changeCount,
                  savedChangeCount = docContentChangeCount || docMetadataChangeCount;
              if(DG.currDocumentController().get('changeCount') === savedChangeCount) {
                // Marking CODAP document clean iff document hasn't changed since getContent()
                DG.currDocumentController().updateSavedChangeCount();
              }
              // synchronize document dirty state after saving, since we may not be clean
              syncDocumentDirtyState();
            });
            break;

          case 'sharedFile':
            SC.run(function() {
              cfmSharedMetadata = (event.data && event.data.shared) || {};
              if(DG.appController.get('_undoRedoShareInProgressCount')) {
                DG.currDocumentController().set('sharedMetadata', cfmSharedMetadata);
              }
              else {
                DG.UndoHistory.execute(DG.Command.create({
                  name: 'document.share',
                  undoString: 'DG.Undo.document.share',
                  redoString: 'DG.Redo.document.share',
                  log: 'Shared document',
                  execute: function() {
                    var docSharedMetadata;
                    this._cfmSharedMetadata = $.extend(true, {}, cfmSharedMetadata);
                    this.causedChange = false;
                    if(!DG.appController.get('_undoRedoShareInProgressCount')) {
                      docSharedMetadata = DG.currDocumentController().get('sharedMetadata');
                      if(!nodeDeepEqual(docSharedMetadata, cfmSharedMetadata)) {
                        DG.currDocumentController().set('sharedMetadata', cfmSharedMetadata);
                        this.causedChange = true;
                      }
                    }
                  },
                  undo: function() {
                    DG.appController.incrementProperty('_undoRedoShareInProgressCount');
                    DG.cfmClient.unshare(function() {
                      DG.appController.decrementProperty('_undoRedoShareInProgressCount');
                    });
                  },
                  redo: function () {
                    DG.appController.incrementProperty('_undoRedoShareInProgressCount');
                    DG.cfmClient.reshare(this._cfmSharedMetadata, function() {
                      DG.appController.decrementProperty('_undoRedoShareInProgressCount');
                    });
                  }
                }));
              }
            });
            break;

          case 'unsharedFile':
            SC.run(function() {
              docController = DG.currDocumentController();
              docContent = docController && docController.get('content');
              docMetadata = docContent && docContent.metadata;
              var docSharedMetadata = docController.get('sharedMetadata') || {};
              cfmSharedMetadata = (event.data && event.data.shared) || {};
              if(DG.appController.get('_undoRedoShareInProgressCount')) {
                DG.currDocumentController().set('sharedMetadata', cfmSharedMetadata);
              }
              else {
                DG.UndoHistory.execute(DG.Command.create({
                  name: 'document.unshare',
                  undoString: 'DG.Undo.document.unshare',
                  redoString: 'DG.Redo.document.unshare',
                  log: 'Unshared document',
                  execute: function() {
                    this.causedChange = false;
                    if(!DG.appController.get('_undoRedoShareInProgressCount')) {
                      docSharedMetadata = DG.currDocumentController().get('sharedMetadata');
                      this._orgSharedMetadata = $.extend(true, {}, docSharedMetadata);
                      if(!nodeDeepEqual(docSharedMetadata, cfmSharedMetadata)) {
                        DG.currDocumentController().set('sharedMetadata', cfmSharedMetadata);
                        this.causedChange = true;
                      }
                    }
                  },
                  undo: function() {
                    DG.appController.incrementProperty('_undoRedoShareInProgressCount');
                    DG.cfmClient.reshare(this._orgSharedMetadata, function() {
                      DG.appController.decrementProperty('_undoRedoShareInProgressCount');
                    });
                  },
                  redo: function () {
                    DG.appController.incrementProperty('_undoRedoShareInProgressCount');
                    DG.cfmClient.unshare(function() {
                      DG.appController.decrementProperty('_undoRedoShareInProgressCount');
                    });
                  }
                }));
              }
            });
            break;

          case "importedData":
            SC.run(function() {
              // we don't need to call the following on via == "drop" because the CODAP drop handler will also respond to the drop
              if (event.data.file && (event.data.via === "select")) {
                DG.appController.importFile(event.data.file.object);
              }
              else if (event.data.url && (event.data.via === "select")) {
                DG.appController.importURL(event.data.url);
              }
            });
            break;

          case "renamedFile":
            SC.run(function() {
              DG.currDocumentController().set('documentName', event.state.metadata.name);
            });
            break;
        }
      });

      // Add CFM-specific global functions
      DG.exportFile = function(data, extension, mimetype, callback) {
        DG.cfmClient.saveSecondaryFileAsDialog(data, extension, mimetype, callback);
      };
    }
  }

  if( DG.componentMode !== 'yes') { // Usual DG game situation is that we're not in component mode
    DG.splash.showSplash();
  }

  translateQueryParameters();

  // load the CFM library
  var cfmLoaded = cfmGlobalsLoaded().then(cfmAppLoaded);
  // Configure the CFM once the library is loaded and the views are configured
  Promise.all([cfmLoaded, DG.cfmViewConfig]).then(
    function(iValues) {
      /* global CloudFileManager */
      var viewConfig = iValues[1];
      cfmInit(CloudFileManager, viewConfig);
      cfmConnect(CloudFileManager);
    });
  /* end CFM load/configuration */
};

/* exported main */
window.main = function() { DG.main(); };
