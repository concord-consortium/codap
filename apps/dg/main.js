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

  DG.getPath('mainPage.mainPane').append();

  var documentLoaded = false;

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
    var documentServer = DG.get('documentServer');
    var startingDocId = DG.get('startingDocId');
    var startingDataInteractive = DG.get('startingDataInteractive');

    if (DG.get('runKey'))
      DG.set('showUserEntryView', false);

    hash = hash && hash.length >= 1 && hash.slice(1);

    if (SC.empty(hash)) {
      if (documentServer && startingDocId) {
        // translate to new form
        parsedURL.hash = '#file=documentStore:%@'.loc(startingDocId);
        window.history.replaceState(null, window.document.title, parsedURL.href);
      } else if (startingDataInteractive) {
        DG.set('showUserEntryView', false);
        openDataInteractive(startingDataInteractive);
      }
    }
  }
  function cfmGlobalsLoaded() {
    return new Promise(function(resolve, reject) {
                $.ajax({
                  url: static_url('cloud-file-manager/js/globals.js.ignore'),
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
                  url: static_url('cloud-file-manager/js/app.js.ignore'),
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
          wrapFileContent: false,
          mimeType: 'application/x-codap-document',
          // extension: '.codap', <-- disabled for now
          enableLaraSharing: true,
          providers: [
            {
              "displayName": "Example Documents",
              "name": "readOnly",
              "src": DG.exampleListURL,
              alphabetize: true,
              // json: [
              //   {
              //     type: "folder",
              //     name: "Unsorted Examples",
              //     url: 'DG.AppController.exampleList.ExampleListURL'.loc()
              //   },
              //   {
              //     type: "folder",
              //     name: "Alphabetized Examples",
              //     alphabetize: true,
              //     url: 'DG.AppController.exampleList.ExampleListURL'.loc()
              //   }
              // ]
            },
            {
              "name": "documentStore",
              "displayName": "Concord Cloud",
              "patch": true,
              "patchObjectHash": function(obj) {
                return obj.guid || JSON.stringify(obj);
              }
            },
            {
              "name": "googleDrive",
              "mimeType": "application/json",
              "clientId": "1095918012594-svs72eqfalasuc4t1p1ps1m8r9b8psso.apps.googleusercontent.com"
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
    });
  }

  function syncProperty(iDstObj, iSrcObj, iProperty) {
    if(typeof(iSrcObj[iProperty]) !== "undefined")
      iDstObj[iProperty] = iSrcObj[iProperty];
    else
      delete iDstObj[iProperty];
  }

  function cfmShowUserEntryView() {
    var hasFileInUrl = (window.location.search.indexOf('file=') >= 0) ||
                            (window.location.hash.indexOf('file=') >= 0),

    DialogContents = React.createFactory(React.createClass({
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
        if (hasFileInUrl)
          this.refs.authorizeButton.focus();
        else
          this.refs.newButton.focus();
      },
      render: function () {
        return React.DOM.div({onKeyDown: function(evt) {
                                // escape key
                                if (evt.keyCode === 27) this.createNewDocument();
                                // return/enter
                                else if (evt.keyCode === 13) {
                                  if (hasFileInUrl)
                                    this.authorizeUrlDocument();
                                  else
                                    this.createNewDocument();
                                }
                              }.bind(this)}, [
          React.DOM.div({style: {margin: 10}, key: 0}, 
                        React.DOM.button({ref: 'authorizeButton',
                                          onClick: this.authorizeUrlDocument}, 
                                          "Authorize Startup Document")),
          React.DOM.div({style: {margin: 10}, key: 1},
                        React.DOM.button({ref: 'newButton',
                                          onClick: this.createNewDocument},
                                          "Create New Document")),
          React.DOM.div({style: {margin: 10}, key: 2},
                        React.DOM.button({ref: 'openButton',
                                          onClick: this.openDocument},
                                          "Open Document or Browse Examples"))
        ].filter(function(div, index) {
          // only include authorization option if a document was specified in the URL
          return hasFileInUrl || (index !== 0);
        }));
      }
    }));
    if (DG.get('showUserEntryView')) {
      DG.cfmClient.showBlockingModal({
        title: "What would you like to do?",
        message: DialogContents({}), // jshint ignore:line
        onDrop: function () { DG.cfmClient.hideBlockingModal(); }}
      );
    }
  }

  function cfmConnect(iCloudFileManager) {
    DG.cfm = iCloudFileManager;

    if (DG.cfm) {
      DG.cfm.clientConnect(function (event) {
        /* global jiff */
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
            DG.cfmClient.insertMenuItemAfter('openFileDialog', {
              name: "Import ...",
              action: DG.cfmClient.importDataDialog.bind(DG.cfmClient)
            });
            DG.cfmClient.insertMenuItemAfter('openFileDialog', {
              name: "Close",
              action: function () {
                DG.cfmClient.closeFileDialog(function () {
                  SC.run(function() {
                    DG.appController.closeAndNewDocument();
                  });
                });
              }
            });

            // synchronize document dirty state on document change
            DG.currDocumentController().addObserver('hasUnsavedChanges', function() {
              syncDocumentDirtyState();
            });

            cfmShowUserEntryView();
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
            });
            break;

          case 'openedFile':
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
                      var diff = jiff.diff(docSharedMetadata, cfmSharedMetadata);
                      if(diff && diff.length) {
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
                      var diff = jiff.diff(docSharedMetadata, cfmSharedMetadata);
                      if(diff && diff.length) {
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
    }
  }

  if( DG.componentMode !== 'yes') { // Usual DG game situation is that we're not in component mode
    DG.splash.showSplash();
  }
  else {  // If componentMode is requested, open starting doc found in url params
    if( !SC.empty( DG.startingDocName)) {
      var owner = !SC.empty( DG.startingDocOwner) ? DG.startingDocOwner : DG.iUser;
      DG.appController.openDocumentNamed( DG.startingDocName, owner);
      DG.startingDocName = '';  // Signal that there is no longer a starting doc to open
      documentLoaded = true;
    } else if( !SC.empty( DG.startingDocId)) {
      DG.appController.openDocumentWithId( DG.startingDocId);
      DG.startingDocId = '';  // Signal that there is no longer a starting doc to open
      documentLoaded = true;
    } else if ( !SC.empty(DG.startingDocUrl)) {
      DG.appController.openDocumentFromUrl(DG.startingDocUrl);
      documentLoaded = true;
    }
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
function main() { DG.main(); }
