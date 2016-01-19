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

/* exported main */
function main() { DG.main(); }

/* Cloud File Manager Integration */
DG.cfm = parent && parent.CloudFileManager ? parent.CloudFileManager : null;
DG.cfmClient = null;

if (DG.cfm) {
  DG.cfm.clientConnect(function (event) {
    var docContents, savedChangeCount;

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

        // synchronize document dirty state on document change
        DG.currDocumentController().addObserver('hasUnsavedChanges', function() {
          syncDocumentDirtyState();
        });
        break;

      case 'getContent':
        DG.currDocumentController().captureCurrentDocumentState(true)
          .then(function(iContents) {
            // record changeCount as a form of savedVersionID
            iContents.changeCount = DG.currDocumentController().get('changeCount');
            event.callback(iContents);
          });
        break;

      case 'newedFile':
        DG.appController.closeAndNewDocument();
        break;

      case 'openedFile':
        docContents = JSON.parse(event.data.content);
        DG.appController.closeAndNewDocument();
        DG.store = DG.ModelStore.create();
        DG.currDocumentController()
          .setDocument(DG.Document.createDocument(docContents));
        break;

      case 'savedFile':
        docContents = JSON.parse(event.data.content);
        savedChangeCount = docContents && docContents.changeCount;
        if(DG.currDocumentController().get('changeCount') === savedChangeCount) {
          // Marking CODAP document clean iff document hasn't changed since getContent()
          DG.currDocumentController().updateSavedChangeCount();
        }
        // synchronize document dirty state after saving, since we may not be clean
        syncDocumentDirtyState();
        break;
    }
  });
}
