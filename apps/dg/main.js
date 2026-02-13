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
/*globals createReactClassFactory, ReactDOMFactories, iframePhone */
sc_require('controllers/app_controller');
sc_require('controllers/authorization');
sc_require('utilities/iframe-phone-emulator');

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
    var dgWantsTouch = $(evt.target).closest('.dg-wants-touch').length,
        wantsSCTouch = $(evt.target).closest('.dg-wants-sc-touch').length;
    return wantsSCTouch
              ? NO
              : (dgWantsTouch ? YES : orgIgnoreTouchHandle.call(this, evt));
  };

  // Fix to prevent assignment of touches that have already ended.
  var orgAssignTouch = SC.RootResponder.prototype.assignTouch;
  SC.RootResponder.prototype.assignTouch = function(touch, view) {
    if (touch.hasEnded) {
      console.warn("Attempt to assign a touch that is already finished.");
    }
    else {
      orgAssignTouch.call(this, touch, view);
    }
  };

  var orgIgnoreMouseHandle = SC.RootResponder.prototype.ignoreMouseHandle;
  SC.RootResponder.prototype.ignoreMouseHandle = function(evt) {
    var dgWantsMouse = $(evt.target).closest('.dg-wants-mouse').length,
        dgWantsWheel = $(evt.target).closest('.dg-wants-wheel').length && evt.type === 'mousewheel',
        wantsSCMouse = $(evt.target).closest('.dg-wants-sc-mouse').length;
    return wantsSCMouse
              ? NO
              : (dgWantsMouse ? YES
                : (dgWantsWheel ? YES
                  : orgIgnoreMouseHandle(evt)));
  };

  var orgIgnoreKeyHandle = SC.RootResponder.prototype.ignoreKeyHandle;
  SC.RootResponder.prototype.ignoreKeyHandle = function(evt) {
    var dgWantsKeys = $(evt.target).closest('.dg-wants-keys').length;
    return dgWantsKeys ? YES : orgIgnoreKeyHandle.call(this, evt);
  };

  var orgIgnoreSelectHandle = SC.RootResponder.prototype.ignoreSelectHandle;
  SC.RootResponder.prototype.ignoreSelectHandle = function(evt) {
    var dgWantsSelect = $(evt.target).closest('.dg-wants-select').length;
    return dgWantsSelect ? YES : orgIgnoreSelectHandle.call(this, evt);
  };

  DG.getPath('mainPage.mainPane').appendTo($('#codap'));

  DG.showUserEntryView = true;

  /* begin CFM load/configuration */
  /* global Promise */

  function openDataInteractives(iURLs) {
    if (iURLs) {
      // Create document-specific store.
      var archiver = DG.DocumentHelper.create({}), newDocument;

      DG.currDocumentController().closeDocument();

      // Make a data interactive iFrame using the given URL
      newDocument = archiver.createNewDocumentWithDataInteractives(iURLs);

      DG.currDocumentController().setDocument(newDocument);
    }
  }
  function startEmbeddedServer() {
    function createParentConnection() {
      var tController = DG.ComponentController.extend({}).create(),
          tDataInteractiveHandler = DG.DataInteractivePhoneHandler.create({
            controller: tController
          }),
          iframePhoneHandler = function (command, callback) {
            tDataInteractiveHandler.set('isPhoneInUse', true);
            tDataInteractiveHandler.doCommand(command, function (ret) {
              DG.doCommandResponseHandler(ret, callback);
            });
          };
      tDataInteractiveHandler.rpcEndpoint = new iframePhone.IframePhoneRpcEndpoint(
          iframePhoneHandler, "data-interactive", window.parent);
      tDataInteractiveHandler.rpcEndpoint.call({message: "codap-present"},
          function (reply) {
            DG.log('Got codap-present reply on embedded server data-interactive channel: ' +
                JSON.stringify(reply));
          }
        );
      return tDataInteractiveHandler;
    }

    function createSharedConnection() {
      var tController = DG.ComponentController.extend({}).create(),
          tDataInteractiveHandler = DG.DataInteractivePhoneHandler.create({
            controller: tController
          }),
          iframePhoneHandler = function (command, callback) {
            tDataInteractiveHandler.set('isPhoneInUse', true);
            tDataInteractiveHandler.doCommand(command, function (ret) {
              DG.doCommandResponseHandler(ret, callback);
            });
          };

      tDataInteractiveHandler.rpcEndpoint = new DG.IFramePhoneEmulator(iframePhoneHandler, 'data-interactive', 'codap');
      DG.localIFramePhoneEndpoint = tDataInteractiveHandler.rpcEndpoint;

      tDataInteractiveHandler.rpcEndpoint.call({message: "codap-present"}, function (reply) {
        DG.log('Got codap-present reply on embedded server data-interactive channel: ' + JSON.stringify(reply));
      });
      return tDataInteractiveHandler;
    }


    DG.embeddedModePhoneHandlers = [];

    // if there is a real parent for this page try connecting using IFramePhone,
    if (window.parent !== window) {
      DG.embeddedModePhoneHandlers.push(createParentConnection());
    }

    // otherwise we are embedded in the same context as our host, so we create
    // an emulated connection
    DG.embeddedModePhoneHandlers.push(createSharedConnection());
  }
  function validateDocument(content) {
    if (!content) return null;
    if (typeof content === 'string' && content[0] !== '{') {
      return content;
    }

    // October, 2017: There have been as-yet-unexplained occurrences of documents
    // with duplicate cases. Rather than failing outright, we eliminate the
    // duplicate cases, logging their existence so that (1) users can continue to
    // use the previously corrupt documents and (2) the logs can be used to try
    // to narrow down the circumstances under which the corruption occurs.
    content = removeDuplicateCaseIDs(content);

    // Legacy documents created manually using scripts can have empty metadata fields.
    // We grandfather these documents in by requiring that the metadata fields exist and are empty.
    // We log when these files are encountered, however, in hopes that they eventually get fixed.
    if ((content.appName === "") && (content.appVersion === "") && (content.appBuildNum === "")) {
      DG.log("File '%@' bypassed validation with empty metadata." +
              " This file should be re-saved with valid metadata.", content.name);
      return content;
    }

    return (content.appName === DG.APPNAME) && !!content.appVersion && !!content.appBuildNum ? content : null;
  }
  function translateQueryParameters() {
    var startingDataInteractive = DG.get('startingDataInteractive');
    var diURLs = [];
    if (startingDataInteractive) {
      var diLen = startingDataInteractive.length;
      if ((diLen > 2) && (startingDataInteractive[0] === '[') &&
          (startingDataInteractive[diLen - 1] === ']')) {
        var diStrings = startingDataInteractive.substr(1, diLen - 2);
        diURLs = diStrings.split(',');
      }
      else {
        diURLs.push(startingDataInteractive);
      }
    }

    if (DG.get('runKey'))
      DG.set('showUserEntryView', false);

    if (diURLs.length) {
      DG.set('showUserEntryView', false);
      openDataInteractives(diURLs);
    }
  }

  function removeDuplicateCaseIDs(content) {
    var cases = {},
        duplicates = {};

    if (content.contexts) {
      content.contexts.forEach(function(context) {
        if (context.collections) {
          context.collections.forEach(function(collection) {
            if (collection.cases) {
              collection.cases.forEach(function(iCase) {
                var id = iCase.guid;
                if (!cases[id]) {
                  cases[id] = iCase;
                }
                else {
                  duplicates[id] = iCase;
                }
              });
            }
            DG.ObjectMap.forEach(duplicates, function(id, aCase) {
              var found = collection.cases.indexOf(aCase);
              if (found >= 0) {
                collection.cases.splice(found, 1);
                DG.logUser("validateDocument: removed case with duplicate ID: '%@'", id);
              }
            });
            duplicates = {};
          });
        }
      });
    }
    return content;
  }

  function cfmUrl(filename) {
    var url = null,
        a;

    if (DG.cfmBaseUrl) {
      // safely parse the url and check to only allow *.concord.org or a domain with no tld (like localhost or dev)
      a = document.createElement("A");
      a.href = DG.cfmBaseUrl;
      if (/\.concord\.org$/.test(a.hostname) || (a.hostname.indexOf('.') === -1)) {
        a.pathname = (a.pathname[a.pathname.length - 1] === '/' ? a.pathname : (a.pathname + '/')) + filename;
        url = a.href;
        DG.logWarn('Loading the ' + filename + ' CFM file from ' + url);
      }
      else {
        DG.logError('The cfmBaseUrl domain (' + a.hostname + ') either needs to be *.concord.org or not have a TLD (like localhost)');
      }
    }

    if (!url) {
      // static_url is run at build time so we have to directly reference the paths
      if (filename === 'app.js') {
        url = static_url('cloud-file-manager/js/app.js.ignore');
      }
    }

    return url;
  }

  /**
   * Returns a promise which is resolved when the CFM is loaded.
   */
  function cfmLoaded() {
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

  function makeNewLocaleUrl(digraph, location) {
    var locMatch = location.pathname.match(/(^.*\/static\/dg\/)[^\/]+(\/cert\/.*$)/);
    var baseURL = 'https://codap.concord.org/releases/latest/static/dg/%@/cert/'.loc(digraph);
    if (locMatch) {
      baseURL = location.schema + location.host + locMatch[1] + digraph + locMatch[2];
    }
    var hash = location.hash;
    if (location.pathname.indexOf('static/dg')>0) {
      baseURL = '../../%@/cert'.loc(digraph);
    }
    if (hash.startsWith('#file=examples:')) {
      hash = '';
    }
    return baseURL + location.search+hash;
  }

  function handleLogLaraData(obj) {
    if (obj.run_remote_endpoint) {
      DG.set('run_remote_endpoint', obj.run_remote_endpoint);
    }
    DG.logUser("laraData: %@".fmt(JSON.stringify(obj)));
  }

  function cfmInit(iCloudFileManager, iViewConfig) {
    // Height of the toolbar; must match kToolbarHeight in main_page.js
    var kToolbarHeight = DG.STANDALONE_MODE ? 0 : 66;

    var options = {
          autoSaveInterval: 5,
          appName: DG.APPNAME,
          appVersion: DG.VERSION,
          appBuildNum: DG.BUILD_NUM,
          appOrMenuElemId: iViewConfig.navBarId,
          hideMenuBar: DG.get('hideCFMMenu'),
          ui: {
            menuBar: {
              info: "Language menu",
              languageMenu: {
                currentLang: SC.Locale.currentLanguage,
                options: DG.locales.map(function (locale) {
                  return {
                    label: locale.langName,
                    langCode: locale.langDigraph,
                  };
                }),
                onLangChanged: function (langCode) {
                  DG.log('Changed language: ' + langCode);
                  window.location = makeNewLocaleUrl(langCode, window.location);
                }
              }
            },
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
          banner: 'https://codap-resources.concord.org/notifications/announcing-v3-banner.json',
          appSetsWindowTitle: true, // CODAP takes responsibility for the window title
          wrapFileContent: false,
          mimeType: 'application/json',
          readableMimeTypes: [
            'application/x-codap-document',
            'application/json',
            'text/csv',
            'text/tab-separated-values'
          ],
          extension: 'codap',
          readableExtensions: ["json", "", "codap", "csv", "txt"],
          enableLaraSharing: true,
          log: function(event, eventData) {
            var params = eventData ? JSON.stringify(eventData) : "";
            DG.logUser("%@: %@", event, params);
          },
          providers: [
            {
              "name": "readOnly",
              "displayName": "DG.fileMenu.provider.examples.displayName".loc(),
              "urlDisplayName": "examples",
              "src": DG.get('exampleListURL'),
              alphabetize: false
            },
/*
            {
              "name": "readOnly",
              "displayName": "Community Examples",
              "urlDisplayName": "examples",
              "src": DG.get('exampleListURL'),
              alphabetize: true
            },
*/
            {
              "name": "lara",
              "patch": true,
              patchObjectHash: function(obj) {
                return obj.guid || JSON.stringify(obj);
              },
              logLaraData: function(obj) {
                handleLogLaraData(obj);
              }
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
                                  }()),
              "patch": true,
              "patchObjectHash": function(obj) {
                return obj.guid || JSON.stringify(obj);
              }
            },
            "localFile"//,
            //"localStorage"
          ],
          // Callback for when CFM UI height changes (e.g., when banner is shown/hidden)
          onHeightChange: function(cfmHeight) {
            SC.run(function() {
              var mainPane = DG.mainPage.mainPane;
              var navBar = mainPane.get('navBar');
              var topView = mainPane.get('topView');
              var scrollView = mainPane.get('scrollView');

              // Adjust navBar to fit CFM's new height
              navBar.adjust('height', cfmHeight);

              // Cascade adjustments to views positioned below navBar
              topView.adjust('top', cfmHeight);
              scrollView.adjust('top', cfmHeight + kToolbarHeight);
            });
          }
        };
    // only enable Google Drive if origin is ssl or localhost
     if (document.location.protocol === 'https:' || document.location.hostname === 'localhost' || document.location.hostname === '127.0.0.1') {
      options.providers.splice(1, 0, {
        "name": "googleDrive",
        "mimeType": "application/json",
        "clientId": DG.get('googleDriveClientID'),
        "apiKey": DG.get('googleDriveAPIKey'),
        "appId": DG.get('googleDriveAppId'),
      });
     }
    if (DG.cfmConfigurationOverride) {
      options = Object.assign(options, DG.cfmConfigurationOverride);
    }
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

  function parseURL(url) {
    var a = document.createElement('a');
    a.href = url;
    return a;
  }
  /**
   * find expected content from mimeType or URL path extension
   * @param mimeType
   * @param url
   * @return mimeType
   */
  function getExpectedContentType(mimeType, url) {
    var extensionMap = {
      codap: 'application/vnd.codap+json',
      json: 'application/json',
      geojson: 'application/geo+json',
      csv: 'application/csv',
      txt: 'application/csv'
    };
    var parsedURL = url && parseURL(url);
    var path = parsedURL && parsedURL.pathname;
    if (mimeType) {
      return mimeType;
    }
    if (path) {
      return extensionMap[path.replace(/.*\./g, '')];
    }
  }

  function resolveDocument(iDocContents, iMetadata) {
    return new Promise(function (resolve, reject) {
      function makeEmptyDocument() {
        return {
          name: "Untitled Document",
          components: [],
          contexts: [],
          globals: [],
          appName: DG.APPNAME,
          appVersion: DG.VERSION,
          appBuildNum: DG.BUILD_NUM,
          lang: SC.Locale.currentLanguage
        };
      }
      function makePluginDocument(gameState, pluginName, pluginPath) {
        return {
          name: "Untitled Document",
          components: [
            {
              type: 'DG.GameView',
              document: DG.currDocumentController().content,
              layout: {
                isVisible: false
              },
              componentStorage: {
                currentGameName: pluginName,
                currentGameUrl: DG.get('pluginURL') + pluginPath,
                savedGameState: gameState
              }
            }
          ],
          contexts: [],
          globals: [],
          appName: DG.APPNAME,
          appVersion: DG.VERSION,
          appBuildNum: DG.BUILD_NUM,
          lang: SC.Locale.currentLanguage
        };
      }
      function makeCSVDocument(contents, urlString, datasetName) {
        var gameState = {
          contentType: 'text/csv',
          url: urlString,
          text: contents,
          datasetName: datasetName,
          showCaseTable: true
        };
        return makePluginDocument(gameState, 'Import CSV', '/Importer/');
      }
      function makeGeoJSONDocument(contents, urlString, datasetName) {
        var gameState = {
          contentType: 'application/geo+json',
          text: contents,
          name: urlString,
          datasetName: datasetName
        };
        return makePluginDocument(gameState, 'Import GeoJSON', '/Importer/');
      }
      var metadata = iMetadata || {};
      var urlString = metadata.url || ('file:' + metadata.filename);
      var expectedContentType = getExpectedContentType(metadata.contentType, urlString);
      var url = urlString && parseURL(urlString);
      var urlPath = url && url.pathname;
      var datasetName = urlPath?
          urlPath.replace(/.*\//g, '').replace(/\..*/, ''): 'data';
      var contentType;

      if (expectedContentType === 'application/json' || typeof iDocContents === 'object') {
        if (typeof iDocContents === 'string') {
          try {
            iDocContents = JSON.parse(iDocContents);
          }
          catch (ex) {
            reject('JSON parse error in "%@"'.fmt(urlString));
            return;
          }
        }
        if (iDocContents.appName != null &&
            iDocContents.appVersion != null) {
          contentType = 'application/vnd.codap+json';
        } else if (iDocContents.type &&
            (iDocContents.type === 'FeatureCollection' ||
                iDocContents.type === 'Topology')) {
          contentType = 'application/vnd.geo+json';
        }
      } else {
        contentType = expectedContentType;
      }

      // CFM: empty document contents => blank document associated with a particular Provider
      if (!iDocContents) {
        resolve(makeEmptyDocument());
      }
      else if (contentType === 'application/csv') {
        resolve(makeCSVDocument(iDocContents, urlString, datasetName));
      }
      else if (contentType === 'application/vnd.geo+json') {
        resolve(makeGeoJSONDocument(iDocContents, urlString, datasetName));
      }
      else if (contentType === 'application/vnd.codap+json') {
        docContentsPromise(iDocContents).then(
          function (contents) {
            // check if this is a valid CODAP document
            var docContents = validateDocument(iDocContents);
            if (!docContents) {
              reject('DG.AppController.openDocument.error.invalid_format'.loc());
            } else {
              resolve(docContents);
            }
          },
          function (message) {
            reject(message);
          }
        );
      }
      else {
        reject ('Error opening document: %@ -- unknown mime type: %@'
            .loc(urlString, contentType));
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

    var DialogContents = createReactClassFactory({
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
        var button = ReactDOMFactories.button,
            div = ReactDOMFactories.div;

        return div({onKeyDown: function(evt) {
                    // escape key
                    if (evt.keyCode === 27) this.createNewDocument();
                    // return/enter
                    else if (evt.keyCode === 13) this.openDocument();
                  }.bind(this)}, [
                div({style: {margin: 10}, key: 2},
                    button({ref: 'openButton', onClick: this.openDocument},
                            'DG.main.userEntryView.openDocument'.loc())),
                div({style: {margin: 10}, key: 1},
                    button({ref: 'newButton', onClick: this.createNewDocument},
                            'DG.main.userEntryView.newDocument'.loc()))
        ]);
      }
    });
    if (DG.get('showUserEntryView')) {
      DG.cfmClient.showBlockingModal({
        title: 'DG.main.userEntryView.title'.loc(),
        message: DialogContents({}), // jshint ignore:line
        onDrop: function () { DG.cfmClient.hideBlockingModal(); }}
      );
    }
  }

  function cfmConnect(iCloudFileManager) {
    var presaveChangeCount;
    var disableDirtySync = false;
    DG.cfm = iCloudFileManager;

    if (DG.cfm) {
      /*
       * @param event {object} Event properties:
       *     event.type  { 'closedFile' | 'connected' | 'getContent' | 'importedData' |
       *             'log' | 'newedFile' | 'openedFile' | 'ready' | 'renamedFile' |
       *             'savedFile' | 'sharedFile' | 'stateChanged' | 'unsharedFile' |
       *             'willOpenFile' }
       *     event.data {object}
       *     event.state {object}
       *     event.callback {function}
       *
       * These activities generate the following event streams:
       *   startup: connected, ready
       *   open file: willOpenFile, openedFile, ready
       *   save locally: getContent (2x), savedFile
       *   autosave: getContent, savedFile
       *   close document: closedFile
       *   import file: importedData
       */
      DG.cfm.clientConnect(function (event) {
        /* global _ */
        var docController, /*docContent, docMetadata,*/
            cfmSharedMetadata;

        function syncDocumentDirtyState() {
          !disableDirtySync && DG.cfmClient && DG.cfmClient.dirty(DG.currDocumentController().get('hasUnsavedChanges'));
        }

        function normalizeDocumentName(name) {
          return name?name.replace(/\.codap$/, '').replace(/\.json$/, ''): 'unknown';
        }

        // DG.log('CFM Event: ' + JSON.stringify({
        //   type: event.type,
        //   state: event.state && {
        //     dirty: event.state.dirty,
        //     failures: event.state.failures,
        //     metadata: event.state.metadata && {
        //       autoSaveDisabled: event.state.metadata.autoSaveDisabled,
        //       description: event.state.metadata.description,
        //       filename: event.state.metadata.filename,
        //       name: event.state.metadata.name,
        //       providerName: event.state.metadata.provider.name,
        //
        //       type: event.state.metadata.type,
        //       url: event.state.metadata.url
        //     },
        //     saved: event.state.saved
        //   }
        // }) );
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

          // hide the splash screen if CFM requires interaction with the user
          case 'requiresUserInteraction':
            SC.run(function() {
              DG.splash.hideSplash();
            });
            break;

          case "ready":
            if ( SC.empty(DG.startingDocUrl)) {
              cfmShowUserEntryView();
            }
            DG.splash.hideSplash();
            if (event.state.metadata && event.state.metadata.name) {
              DG.currDocumentController().set('documentName',
                  normalizeDocumentName(event.state.metadata.name));
            }
            break;

          case "closedFile":
            cfmShowUserEntryView();
            break;

          case 'getContent':
            DG.currDocumentController().captureCurrentDocumentState(true)
              .then(function(iContents) {
                var cfmSharedMetadata = event.data && event.data.shared || {},
                    docMetadata = iContents.metadata || {},
                    // validate before saving as well as when opening
                    contents = validateDocument(iContents);
                // We save the change count before save so, when the save is
                // complete, we can tell whether there were new changes requiring
                // an additional save.
                presaveChangeCount = DG.currDocumentController().get('changeCount');
                if (contents) {
                  // For now, _permissions must be stored at top-level for Document Store
                  syncProperty(contents, cfmSharedMetadata, '_permissions');
                  // replace 'shared' metadata property with object passed from CFM
                  docMetadata.shared = $.extend(true, {}, cfmSharedMetadata);
                  // combine shared metadata with content to pass back to caller
                  contents.metadata = docMetadata;
                }
                else {
                  DG.logUser("getContent: attempted to return invalid document!");
                }
                event.callback(contents);
              }, function (msg) {
                DG.log(msg);
              });
            break;

          case 'willOpenFile':
            SC.run(function() {
              DG.splash.showSplash();
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

            setTimeout(function() {
              SC.run(function() {
                DG.cfmClient.hideBlockingModal();
                if (event && event.state && event.state.metadata &&
                    event.state.metadata.provider &&
                    event.state.metadata.provider.name === 'localFile') {
                  event.data.metadata.filename = event.state.metadata.providerData.file.name;
                }
                resolveDocument(event.data.content, event.data.metadata)
                  .then(
                    function(iDocContents) {
                      SC.run(function () {
                        var metadata = event.data.content
                                        ? event.data.content.metadata
                                        : event.data.metadata,
                            sharedMetadata = metadata && metadata.shared,
                            cfmSharedMetadata = sharedMetadata
                                                  ? $.extend(true, {}, sharedMetadata)
                                                  : {};

                        // disable the dirty sync while the existing document is unloaded
                        // and the new document is loaded
                        disableDirtySync = true;
                        DG.appController.closeDocument();
                        DG.store = DG.ModelStore.create();
                        DG.currDocumentController()
                          .setDocument(DG.Document.createDocument(iDocContents));
                        DG.set('showUserEntryView', false);
                        // acknowledge successful open; return shared metadata
                        event.callback(null, cfmSharedMetadata);
                        disableDirtySync = false;
                      });
                    },  // then() error handler
                    function(iReason) {
                      DG.logWarn(iReason);
                      event.callback('DG.AppController.openDocument.error.general'.loc());
                      // we force the state to be clean to avoid the CFM overriding
                      // the file that failed to open with whatever was the previous
                      // document, then close the file.
                      event.state.dirty = false;
                      DG.cfmClient.closeFile();
                      disableDirtySync = false;
                    }
                  );
              });
            }, 0);
            break;

          case 'savedFile':
            SC.run(function() {
              if(DG.currDocumentController().get('changeCount') === presaveChangeCount) {
                // Marking CODAP document clean iff document hasn't changed since getContent()
                DG.currDocumentController().updateSavedChangeCount();
              }
              // synchronize document dirty state after saving, since we may not be clean
              syncDocumentDirtyState();

              // once the file has been saved, we no longer need the 'di'-related URL params
              DG.removeQueryParams(['di', 'di-override']);
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
                      if(!_.isEqual(docSharedMetadata, cfmSharedMetadata)) {
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
              // docContent = docController && docController.get('content');
              // docMetadata = docContent && docContent.metadata;
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
                      if(!_.isEqual(docSharedMetadata, cfmSharedMetadata)) {
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
              if (event.data.file) {
                DG.appController.importFile(event.data.file.object);
              }
              else if (event.data.url && (event.data.via === "select")) {
                DG.appController.importURL(event.data.url, event.data.componentType, event.data.name);
              }
              else if (event.data.text && event.data.name) {
                DG.appController.importText(event.data.text, event.data.name);
              }
            });
            break;

          case "renamedFile":
            SC.run(function() {
              var document = DG.currDocumentController();
              var name = event.state.metadata.name;
              document.set('documentName', name);
            });
            break;

          case "log":
            SC.run(function() {
              if (event.data.logEvent === "logLaraData") {
                handleLogLaraData(event.data.logEventData);
              }
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

  DG.splash.showSplash();

  if (DG.get('embeddedMode') === 'yes') {
    $('html').addClass('dg-embedded-mode');

    startEmbeddedServer();
    translateQueryParameters();
  }
  else {
    // only start embedded server if embeddedMode is not on
    if (DG.get('embeddedServer') === 'yes') {
      startEmbeddedServer();
    }
    translateQueryParameters();
  }

  // Load the CFM library and configure the CFM once the
  // library is loaded and the views are configured.
  Promise.all([cfmLoaded(), DG.cfmViewConfig]).then(
    function(iValues) {
      /* global CloudFileManager */
      var viewConfig = iValues[1];
      cfmInit(CloudFileManager, viewConfig);
      cfmConnect(CloudFileManager);
    });
  /* end CFM load/configuration */
};

/* exported main */
window.main = function() {
  DG.main();
  // This Kludge causes the mainPage to get the window's height. Without, it will _sometimes_
  // be the wrong height, apparently because of something to do with timing.
  DG.mainPage.invokeLater( function() {
    DG.mainPage.mainPane.adjust({height: window.innerHeight});
    DG.mainPage.invokeLater( function() {
      DG.mainPage.mainPane.adjust({height: null});
    }, 20);
  },2000);
};
