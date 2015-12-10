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
};

/* jshint unused:false */
function main() { DG.main(); }

/* Cloud File Manager Integration */
var cfm = parent && parent.CloudFileManager ? parent.CloudFileManager : null,
    client;

if (cfm) {
  cfm.clientConnect(function (event) {
    console.log(event);
    switch (event.type) {
      case 'connected':
        client = event.data.client;
        client.setProviderOptions("documentStore",
          {appName: DG.APPNAME,
           appVersion: DG.VERSION,
           appBuildNum: DG.BUILD_NUM
          });
        client._ui.setMenuBarInfo("Version "+DG.VERSION+" ("+DG.BUILD_NUM+")");
        break;

      case 'getContent':
        DG.serializeDocument().then(event.callback);
        break;

      case 'newedFile':
        DG.newDocument();
        break;

      case 'openedFile':
        DG.loadDocument(JSON.parse(event.data.content));
        break;
    }
  });
}

/* External API for saving and loading documents */

/**
 * Starts a new document
 */
DG.newDocument = function() {
  DG.appController.closeAndNewDocument()
}

/**
 * Capture the current document as an object
 *
 * @returns Promise
 */
DG.serializeDocument = function() {
  var documentController = DG.currDocumentController();
  return documentController.captureCurrentDocumentState(true);
}

/**
 * Loads a document
 *
 * @param {Object} doc
 */
DG.loadDocument = function(doc) {
  DG.appController.closeAndNewDocument()
  DG.store = DG.ModelStore.create();
  var newDocument = DG.Document.createDocument(doc);
  DG.currDocumentController().setDocument(newDocument);
}
