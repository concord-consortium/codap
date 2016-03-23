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

//  var host = SC.$(location).attr('host'),
//      bodyclass = "";

 DG.Browser.init(); // Import any DG specific browser hacks we need.

 // We will set a CSS class on the <body> tag based on the hostname in the URL
 // This will allow e.g. different backgrounds on a local or dev build.
// if( !SC.empty(host))
// {
//    var patt=new RegExp(/[^:\.]*(?=[:\.])/);
//    bodyclass = patt.exec(host);
//    if( bodyclass)
//      bodyclass = bodyclass[0];
//    else
//      bodyclass = 'dg';
//  }
//
// if( !SC.empty(bodyclass)) {
//  SC.$('body').addClass(bodyclass);
// }

  SC.$('body' ).addClass( 'dg');

  DG.getPath('mainPage.mainPane').append();

  DG.splash.showSplash();

  var documentLoaded = false,
    splashChanged = function() {
      // When the splash screen times out, we will display the user entry dialog
      // unless the url contained information about the document to open
      if (!DG.splash.get('isShowing')
          && !documentLoaded
          && SC.empty(DG.startingDocName)
          && SC.empty(DG.startingDocId)
          && SC.empty(DG.startingDocUrl)
      ) {
        DG.userEntryController.setup(); // Create the user entry dialog.
        DG.splash.removeObserver('isShowing', splashChanged);
      }
    };
  // DG.splash.addObserver('isShowing', splashChanged);

  if( DG.componentMode !== 'yes') { // Usual DG game situation is that we're not in component mode
    if (DG.documentServer) {
      DG.authorizationController.requireLogin();
    } else {
      DG.authorizationController.sendLoginAsGuestRequest();
    }
  }
  else {  // If componentMode is requested, open starting doc found in url params
    DG.currGameController.set('gameIsReady', false);  // So user can't make graphs right away
    DG.mainPage.addGameIfNotPresent();
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
  // set initial game in title
  DG.appController.documentNameDidChange();

  /* begin CFM load/configuration */
  /* global Promise */
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
          wrapFileContent: false,
          mimeType: 'application/x-codap-document',
          extension: '.codap',
          providers: [
            {
              "displayName": "Example Documents",
              "name": "readOnly",
              "src": 'DG.AppController.exampleList.ExampleListURL'.loc(),
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
            "localFile",
            "localStorage"
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
      if(iDataContext.externalDocumentId != null) {
        $.ajax({
          // external document references were only used with the
          // Concord Document Store
          url: '//document-store.concord.org/document/open',
          data: { recordid: iDataContext.externalDocumentId },
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
    var DialogContents = React.createFactory(React.createClass({
      close: function () {
        DG.cfmClient.hideBlockingModal();
      },
      createNewDocument: function () {
        this.close();
      },
      openDocument: function () {
        this.close();
        DG.cfmClient.openFileDialog();
      },
      render: function () {
        return React.DOM.div({},
          React.DOM.div({style: {margin: 10}}, React.DOM.button({onClick: this.createNewDocument}, "Create New Document")),
          React.DOM.div({style: {margin: 10}}, React.DOM.button({onClick: this.openDocument}, "Open Document or Browse Examples"))
        );
      }
    }));
    DG.cfmClient.showBlockingModal({title: "What would you like to do?", message: DialogContents({}), onDrop: function () { DG.cfmClient.hideBlockingModal(); }});
  }

  function cfmConnect(iCloudFileManager) {
    DG.cfm = iCloudFileManager;

    if (DG.cfm) {
      DG.cfm.clientConnect(function (event) {
        /* global jiff */
        var docController, docContent, docMetadata,
            cfmSharedMetadata;

        function syncDocumentDirtyState() {
          if(DG.currDocumentController().get('hasUnsavedChanges')) {
            // Marking CFM client dirty
            DG.cfmClient && DG.cfmClient.dirty();
          }
        }

        console.log(event);
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
                  DG.appController.closeAndNewDocument();
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
            DG.appController.closeAndNewDocument();
            break;

          case 'openedFile':
            docContentsPromise(event.data.content)
              .then(function(iDocContents) {
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
            break;

          case 'savedFile':
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
            break;

          case 'sharedFile': {
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
            break;
          }

          case 'unsharedFile': {
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
            break;
          }

          case "importedData": {
            // we don't need to call the following on via == "drop" because the CODAP drop handler will also respond to the drop
            if (event.data.file && (event.data.via === "select")) {
              DG.appController.importText(event.data.file.content, event.data.file.name);
            }
            else if (event.data.url && (event.data.via === "select")) {
              DG.appController.importURL(event.data.url);
            }
            break;
          }
        }
      });
    }
  }

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
