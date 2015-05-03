// ==========================================================================
//                      DG.authorizationController
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

sc_require('models/authorization_model');

sc_require('utilities/storage/default_storage');
sc_require('utilities/storage/document_server_storage');

/**
  Logs the specified message, along with any additional properties, to the server.

  @param    iLogMessage   {String}    The main message to log
  @param    iProperties   {Object}    Additional properties to pass to the server,
                                      e.g. { type: DG.Document }
  @param    iMetaArgs     {Object}    Additional flags/properties to control the logging.
                                      The only meta-arg currently supported is { force: true }
                                      to force logging to occur even when logging is otherwise
                                      disabled for a given user. This is used to guarantee that
                                      login/logout events get logged even when other user actions
                                      are not logged (e.g. for guest users). Clients using the
                                      utility functions (e.g. DG.logUser()) can add an additional
                                      argument, which must be a JavaScript object, and which will
                                      be passed on to the logToServer function as the meta-args.
 */
DG.logToServer = function( iLogMessage, iProperties, iMetaArgs) {
  DG.authorizationController.logToServer( iLogMessage, iProperties, iMetaArgs);
};

/** @class

  (Document Your Controller Here)

  @extends SC.Object
*/
DG.authorizationController = SC.Controller.create( (function() {

return {
/** @scope DG.authorizationController.prototype */

  currEdit: null,   // DG.Authorization

  currLogin: null,  // DG.Authorization

  isValid: function() {
    return this.getPath('currLogin.isValid');
  }.property('currLogin.isValid'),

  isSaveEnabled: function() {
    return this.getPath('currLogin.isSaveEnabled');
  }.property('currLogin.isSaveEnabled'),

  isUserDeveloper: function() {
    // 1 === developer according to the server
    return this.getPath('currLogin.privileges') === 1;
  }.property('currLogin.privileges'),

  init: function() {
    sc_super();

    this.set('currEdit', DG.Authorization.create({user: '', passwd: ''}));
    this.set('currLogin', DG.Authorization.create({}));

    if (DG.documentServer) {
      this.set('storageInterface', DG.DocumentServerStorage.create());
      this.loadLoginFromDocumentServer();
    } else if( DG.Browser.isCompatibleBrowser()) {
      this.set('storageInterface', DG.DefaultStorage.create());
      this.loadLoginCookie();
    }
  },

  sendLoginAsGuestRequest: function() {
    this.setPath('currLogin.user', 'guest');
    var save = (!!DG.documentServer && !!DG.runKey) || false;
    this.logIn({ enableLogging: true, enableSave: save, privileges: 0,
  sessiontoken: "guest" + new Date().valueOf(), useCookie: false, valid: true}, 200);
    //this.sendLoginRequest('DG.Authorization.guestUserName'.loc(),
    //                      'DG.Authorization.guestPassword'.loc());
  },

  sendLoginRequestFromDialog: function() {
    this.sendLoginRequest( this.getPath('currEdit.user'), this.getPath('currEdit.passwd'));
  },

  sendLoginRequest: function( iUser, iPassword, iSessionID) {
    if (!SC.empty( iUser)) {
      // Set the user so we can update the UI while waiting for a server response
      this.setPath('currLogin.user', iUser);
      this.setPath('currLogin.failedLoginAttempt', false);
      if (iSessionID) {
        this.get('currLogin').set('sessionID', iSessionID);
      }

      this.get('storageInterface').login({username: iUser, password: iPassword, sessiontoken: iSessionID}).then(
        function(body) {
          this.receiveLoginSuccess(body);
        }.bind(this),
        function(errorCode) {
          this.receiveLoginFailure(errorCode);
        }.bind(this)
      );
    }
  },

  /**
   * Expires the session in the database to make it invalid.
   *
   * @param iUser{string} user's username
   * @param iSessionID session token as a string
   */
  sendLogoutRequest: function( iUser, iSessionID ) {
    if (!SC.empty( iUser )) {
      this.get('storageInterface').logout({username: iUser, sessiontoken: iSessionID}).then(
        function(body) {
          // Don't bother doing anything
        },
        function(errorCode) {
          // Don't bother doing anything
        }
      );
    }
  },

  loadLoginFromDocumentServer: function() {
    var login = this.get('currLogin'),
      currEdit = this.get('currEdit'),
      user = 'user',
      sessionID = 'abc123';

    login.beginPropertyChanges();
    login.set('user', user); // so UI can be updated ("user logging in...")
    login.set('status', 0); // not yet logged in
    login.endPropertyChanges();

    // Pending login information is stored in the currEdit object
    if( currEdit) {
      currEdit.beginPropertyChanges();
      currEdit.set('user', user);
      currEdit.set('sessionID', sessionID);
      currEdit.endPropertyChanges();
    }
  },

  /**
   * Cookie used to store login credentials between launches.
   * @property {SC.Cookie}
   */
  cookie: null,

  /**
   * Saves the contents of the authorization in the 'login' cookie.
   */
  saveLoginCookie: function() {
    this.cookie = this.findLoginCookie() ||
        SC.Cookie.create({name: 'login', value: '', domain:this.getLoginCookieDomain()});

    var login = this.get('currLogin'),
        c = [login.get('user'), login.get('status'), login.get('sessionID'),
             login.get('logIndex'), login.get('isLoggingEnabled')].join('\t');
    this.cookie.set('value', c);
    this.cookie.write();
  },

  /**
   * Loads the contents of the authorization from the 'login' cookie.
   */
  loadLoginCookie: function() {
    var login = this.get('currLogin'),
        currEdit = this.get('currEdit');
    this.cookie = this.findLoginCookie();

    if( this.cookie) {
      var c = this.cookie.get('value').split('\t'),
          user = c[0],
          sessionID = c[2];
      //var logIndex = c[3],
      //    enableLogging = c[4];
      login.beginPropertyChanges();
      login.set('user', user); // so UI can be updated ("kswenson logging in...")
      login.set('status', 0); // not yet logged in
      login.endPropertyChanges();

      // Pending login information is stored in the currEdit object
      if( currEdit) {
        currEdit.beginPropertyChanges();
        currEdit.set('user', user);
        currEdit.set('sessionID', sessionID);
        currEdit.endPropertyChanges();
      }
    }
  },

  findLoginCookie: function() {
    if (!SC.empty(this.cookie)) return this.cookie;
    this.cookie = SC.Cookie.find('login');
    if (!SC.empty(this.cookie)) this.cookie.domain = this.getLoginCookieDomain();
    return this.cookie;
  },

  /**
   * This returns the domain attribute that should be used for setting the domain attribute on a cookie key/value.  This
   * should NOT be used for other purposes because this returns an empty string if localhost is found to be in the
   * domain.  The reason for this behavior is that the cookie domain on some browsers require that there be at least one
   * period in the domain url, and browsers like Chrome reject a cookie if the domain is set to "domain=localhost".  In
   * these situations, there should be no domain attribute set when it's desired for the "domain" to actually be localhost.
   * If this behavior is desired, they go ahead and use this.
   *
   * @return {String}
   */
  getLoginCookieDomain: function() {
    //configuring the domain of the cookie to be the second level domain
    //i.e. if url of dg is dg.kcptech.com, domain of cookie should be kcptech.com
    var dotPos = document.domain.indexOf('.'),
    domainStr = dotPos >= 0 ? document.domain.slice( dotPos + 1) : document.domain;
    //localhost is actually invalid for the domain on a cookie for some browsers, don't set domain instead
    if (domainStr.indexOf('localhost') >= 0) return '';
    return domainStr;
  },

  /**
    Saves the specified document object to the server.

    @param    iDocumentId       The ID of the document object
    @param    iDocumentArchive  The document object to be archived. This should be
                                a JavaScript object suitable for JSON-encoding.
    @param    iReceiver         The receiver object whose receivedSaveDocumentResponse()
                                method will be called when the response from the server
                                is received. The called method should check for errors
                                and perform any other appropriate tasks upon completion.
   */
  saveDocument: function(iDocumentId, iDocumentArchive, iReceiver, isCopying) {
    return this.get('storageInterface').save({name: iDocumentId, content: iDocumentArchive}).then(
      function(body) {
        return iReceiver.receivedSaveDocumentSuccess.call(iReceiver, body, isCopying);
      },
      function(errorCode) {
        return iReceiver.receivedSaveDocumentFailure.call(iReceiver, errorCode, isCopying);
      }
    );
  },

  saveExternalDataContext: function(contextModel, iDocumentId, iDocumentArchive, iReceiver, isCopying, isDifferential) {
    var opts = {content: iDocumentArchive},
        externalDocumentId = contextModel.get('externalDocumentId'),
        parentDocumentId = DG.currDocumentController().get('externalDocumentId');

    if (!isCopying && !SC.none(externalDocumentId)) {
      opts.id = externalDocumentId;
      if (isDifferential) {
        opts.differential = true;
      }
    } else {
      opts.name = '%@-context-%@'.fmt(iDocumentId, SC.guidFor(contextModel));
    }

    if (!SC.none(parentDocumentId)) {
      opts.params = {parentDocumentId: parentDocumentId};
    }

    return this.get('storageInterface').save(opts).then(
      function(body) {
        return iReceiver.receivedSaveExternalDataContextSuccess.call(iReceiver, body, isCopying, contextModel);
      },
      function(errorCode) {
        return iReceiver.receivedSaveExternalDataContextFailure.call(iReceiver, errorCode, isCopying, contextModel);
      }
    );
  },

  /**
    Deletes the specified document object to the server.

    @param    iDocumentId       The ID of the document object
    @param    iReceiver         The receiver object whose receivedDeleteDocumentResponse()
                                method will be called when the response from the server
                                is received. The called method should check for errors
                                and perform any other appropriate tasks upon completion.
   */
  deleteDocument: function(iDocumentId, iReceiver) {
    this.get('storageInterface').deleteDoc({id: iDocumentId}).then(
      function(body) {
        iReceiver.receivedDeleteDocumentSuccess.call(iReceiver, body);
      },
      function(errorCode) {
        iReceiver.receivedDeleteDocumentFailure.call(iReceiver, errorCode);
      }
    );
  },

  documentList: function(iReceiver) {
    this.get('storageInterface').list().then(
      function(body) {
        iReceiver.receivedDocumentListSuccess.call(iReceiver, body);
      },
      function(errorCode) {
        iReceiver.receivedDocumentListFailure.call(iReceiver, errorCode);
      }
    );
  },

  exampleList: function(iReceiver) {
    var url = 'https://codap-resources.concord.org/examples/index.json';
    SC.Request.getUrl( url )
      .notify(iReceiver, 'receivedExampleListResponse')
      .send();
  },

  openDocument: function(iDocumentId, iReceiver) {
    this.get('storageInterface').open({id: iDocumentId}).then(
      function(body) {
        iReceiver.receivedOpenDocumentSuccess.call(iReceiver, body, false);
      },
      function(errorCode) {
        iReceiver.receivedOpenDocumentFailure.call(iReceiver, errorCode);
      }
    );
  },

  openDocumentByName: function(iDocumentName, iDocumentOwner, iReceiver) {
    this.get('storageInterface').open({name: iDocumentName, owner: iDocumentOwner}).then(
      function(body) {
        iReceiver.receivedOpenDocumentSuccess.call(iReceiver, body, false);
      },
      function(errorCode) {
        iReceiver.receivedOpenDocumentFailure.call(iReceiver, errorCode);
      }
    );
  },

  loadExternalDocuments: function(iDocumentIds) {
    var promises = [], i, len;

    var sendRequest = function(id) {
      return this.get('storageInterface').open({id: id}).then(
        function(body) {
          DG.ExternalDocumentCache.cache(id, body);
        },
        function(errorCode) {
          DG.logError('openDocumentFailed:' + JSON.stringify({id: id, message: errorCode }) );
        }
      );
    }.bind(this);

    for (i = 0, len = iDocumentIds.length; i < len; i++) {
      promises.push(sendRequest(iDocumentIds[i]));
    }

    return promises;
  },

  revertCurrentDocument: function(iReceiver) {
    if (!DG.currDocumentController().get('canBeReverted')) { return; }

    this.get('storageInterface').revert({id:DG.currDocumentController().get('externalDocumentId')}).then(
      function(body) {
        iReceiver.receivedOpenDocumentSuccess.call(iReceiver, body, true);
      },
      function(errorCode) {
        iReceiver.receivedOpenDocumentFailure.call(iReceiver, errorCode);
      }
    );
  },

  renameDocument: function(iOriginalName, iNewName, iReceiver) {
    this.get('storageInterface').rename({id: DG.currDocumentController().get('externalDocumentId'), newName: iNewName}).then(
      function(body) {
        iReceiver.receivedRenameDocumentSuccess.call(iReceiver, body);
      },
      function(errorCode) {
        iReceiver.receivedRenameDocumentFailure.call(iReceiver, errorCode);
      }
    );
  },

  /**
    Sends a request to expire the session connected the session
    token in the database.

   */
  logout: function() {
    if (DG.documentServer && this.getPath('currLogin.user') !== 'guest') { return; }  // Don't allow logging out, for now...
    if (!DG.documentServer) {
    this.sendLogoutRequest(this.getPath('currLogin.user'), this.getPath('currLogin.sessionID'));
    DG.logUser("Logout: %@", this.getPath('currLogin.user'), { force: true });
    }
    this.get('currEdit').clear();
    this.get('currLogin').clear();
    this.saveLoginCookie();

    this.requireLogin();
  },

  logIn: function(loginData, status) {
      var currLogin = this.get('currLogin'),
          isValid = loginData.valid,
          sessionID = loginData.sessiontoken,
          isLoggingEnabled = true,  //loginData.enableLogging,
          isSaveEnabled = loginData.enableSave,
          realUsername = loginData.username,
          privileges = loginData.privileges;
    if (currLogin) {
      if (isValid) {
        // If we've received a valid login, we can remove the login dialog.
        if (this.sheetPane) {
          this.sheetPane.remove();
          this.sheetPane = null;
        }
        currLogin.beginPropertyChanges();
        currLogin.set('status', status);
        // if request was sent using session token(saved from login cookies),
        // then we already know the session token,
        // so the server doesn't send it back to us.
        if (sessionID) {
          currLogin.set('sessionID', sessionID);
        }
        if (realUsername) {
          currLogin.set('user', realUsername);
        }
        currLogin.set('isLoggingEnabled', isLoggingEnabled);
        currLogin.set('isSaveEnabled', isSaveEnabled);
        currLogin.set('privileges', privileges);
        currLogin.set('logIndex', 0);
        currLogin.endPropertyChanges();
        if (loginData.useCookie)
          this.saveLoginCookie();
        DG.logUser("Login: %@", currLogin.get('user'), { force: true });
      } else {
        currLogin
          .clear()
          .set('errorCode', "Login Failed")
          .set('failedLoginAttempt', true);
      }
    } else {
      DG.logWarn("Login: no currLogin record");
    }
  },

  sessionTimeoutPrompt: function(resolve) {
    DG.AlertPane.error({
      localize: true,
      message: 'DG.Authorization.sessionExpired.message',
      buttons: [
        {
          localize: true,
          title: 'DG.Authorization.sessionExpired.loginButtonText',
          toolTip: 'DG.Authorization.sessionExpired.loginButtonTooltip',
          isDefault: true,
          target: this,
          action: 'logInViaDocumentServer'
        },
        {
          localize: true,
          title: 'DG.Authorization.sessionExpired.ignoreButtonText',
          toolTip: 'DG.Authorization.sessionExpired.ignoreButtonTooltip',
          action: function() { if(resolve) { resolve(false); } },
          isCancel: true
        },
      ]
    });
  },

  logInViaDocumentServer: function() {
    this.get('storageInterface').promptLogin();
  },

  receiveLoginSuccess: function(body) {
    if (SC.none(body.skipLogin)) {
      this.logIn(body, 200);
    }
  },

  receiveLoginFailure: function(errorCode) {
    var currLogin = this.get('currLogin');
    currLogin
      .clear()
      .set('errorCode', errorCode)
      .set('failedLoginAttempt', true);
  },

  /**
    Logs the specified message, along with any additional properties, to the server.

    description and signature TODO
   */
  logToServer: function(event, iProperties, iMetaArgs) {
    function extract(obj, prop) {
      var p = obj[prop];
      obj[prop] = undefined;
      return p;
    }
    var shouldLog = this.getPath('currLogin.isLoggingEnabled') ||
                    (!DG.documentServer && iMetaArgs && iMetaArgs.force),
        time = new Date(),
        eventValue,
        parameters,
        body;

    if( !shouldLog) {
      // The logging path below indirectly triggers SproutCore notifications.
      // Calling SC.run() allows the same notifications to get triggered without the logging.
      SC.run();
      return;
    }

    this.currLogin.incrementProperty('logIndex');

    eventValue = extract(iProperties, 'args');

    try {
      parameters = JSON.parse(eventValue);
      // If the value of parameters is not an object, then wrap the value in
      // an object. Otherwise the log manager will reject it.
      if (typeof parameters !== 'object') {
        parameters = {value: parameters};
      }
    } catch(e) {
      parameters = {};
    }

    // hack to deal with pgsql 'varying' type length limitation

    if (eventValue && eventValue.length > 255) {
      eventValue = eventValue.substr(0, 255);
    }

    body = {
      activity:    extract(iProperties, 'activity') || 'Unknown',
      application: extract(iProperties, 'application'),
      username:    this.getPath('currLogin.user'),
      session:     this.getPath('currLogin.sessionID'),
      // avoids TZ ambiguity; getTime returns milliseconds since the epoch (1-1-1970 at 0:00 *UTC*)
      time:        time.getTime(),
      event:       event,
      event_value: eventValue,
      parameters:  parameters
    };

    if (DG.logServerUrl) {
      $.ajax(DG.logServerUrl, {
        type: 'POST',
        contentType: 'application/json',
        data: SC.json.encode(body),
        xhrFields: {
          withCredentials: false
        }
      });
    }
  },

  requireLogin : function() {
    var currLogin = this.get('currLogin'),
        currEdit = this.get('currEdit'),
        isValid = currLogin && currLogin.get('isValid');

    // If we are already logged in, then there's nothing to do
    if( isValid) return;

    // If we're not going to run anyway, don't try to log in
    if( !DG.Browser.isCompatibleBrowser()) return;

    // If we're already showing the login dialog, don't show it again
    if( this.sheetPane) return;

    // If we have pending login credentials, e.g. from a saved cookie,
    // send them to the server for verification.
    var pendingUser = currEdit && currEdit.get('user'),
        pendingSession = currEdit && currEdit.get('sessionID');
    if( !SC.empty( pendingUser) && pendingSession) {
      this.sendLoginRequest( pendingUser, null, pendingSession);
    }

    this.sheetPane = this.get('storageInterface').promptLogin();
  },

  _loginSessionDidChange: function() {
    // We only create the flash component if we have a valid session ID
    if( this.get('isValid')) {
      // Use invokeLater() so that the client that sets the 'sessionID' can finish
      // what it was doing, e.g. creating/setting the logIndex, before we
      // proceed to process the result.
      this.invokeLater( this._setupGameOrDocument);
    }
  // Chained observer fires if 'currLogin' or 'currLogin.status' is changed
  }.observes('.currLogin.status'),

  _setupGameOrDocument: function() {
    function openDataInteractive(iURL) {
      if (iURL) {
        // Create document-specific store.
        var archiver = DG.DocumentArchiver.create({}),
          newDocument;

        DG.currDocumentController().closeDocument();

        // Make a data interactive iFrame using the given URL
        newDocument = archiver.importURLIntoDocument(iURL);

        DG.currDocumentController().setDocument(newDocument);
      }
    }
    if( !SC.empty( DG.startingDocName)) {
      var owner = !SC.empty( DG.startingDocOwner) ? DG.startingDocOwner : DG.iUser;
      DG.appController.openDocumentNamed( DG.startingDocName, owner);
      DG.startingDocName = '';  // Signal that there is no longer a starting doc to open
    }
    else if( !SC.empty( DG.startingDocId)) {
      DG.appController.openDocumentWithId( DG.startingDocId);
      DG.startingDocId = '';  // Signal that there is no longer a starting doc to open
    } else if ( !SC.empty( DG.startingDataInteractive)) {
      openDataInteractive(DG.get('startingDataInteractive'));
    } else {
      DG.gameSelectionController.setDefaultGame();
      DG.mainPage.addGameIfNotPresent();
    }
    if (SC.browser.name === SC.BROWSER.firefox) {
      // BZ506-508 Refer to a Firefox-only bug in which the app initially appears
      // with an unnecessary document scroll bar and incorrectly believing that
      // the initial document position is scrolled. Resizing the window fixes the
      // problem. We attempt to address it here by signaling a layout size change
      // after the user logs in, which is just after it's calculated(incorrectly) and
      // cached so we can clear the incorrect cache
      var scrollView = DG.mainPage.mainPane.scrollView;
      if( scrollView) {
        this.invokeLater( function() { scrollView.layoutDidChange();}, 10);
      }
    }
  }

}; })());
