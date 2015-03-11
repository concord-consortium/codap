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

/* globals pako */
sc_require('libraries/pako-deflate');

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
  var serverUrl = function(iRelativeUrl) {
    if (iRelativeUrl.match('://')) {
      return iRelativeUrl;
    } else {
    return '/DataGames/api/' + iRelativeUrl;
    }
  };

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
      this.loadLoginFromDocumentServer();
    } else if( DG.Browser.isCompatibleBrowser()) {
      this.loadLoginCookie();
    }
  },

  urlForGetRequests: function(iUrl) {
    return SC.Request.getUrl(iUrl);
  },

  urlForPostRequests: function(iUrl) {
    return SC.Request.postUrl(iUrl);
  },

  urlForJSONPostRequests: function(iUrl) {
    return this.urlForPostRequests(iUrl).json();
  },

  urlForJSONGetRequests: function(iUrl) {
    return this.urlForGetRequests(iUrl).json();
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
      var body = { username: iUser, password: iPassword, sessiontoken: iSessionID };
      if (iSessionID) {
        this.get('currLogin').set('sessionID', iSessionID);
      }
      if (DG.documentServer) {
        this.urlForJSONGetRequests(DG.documentServer + 'user/info' + (DG.runKey ? '?runKey=%@'.fmt(DG.runKey) : '') )
          .notify(this, 'receiveLoginResponse')
          .send({});
      } else {
        this.urlForJSONPostRequests(serverUrl('auth/login'))
        .notify(this, 'receiveLoginResponse')
        .send(body);
      }
    }
  },

  /**
   * Send a request to obtain a token to be used instead of
   * re-authenticating again for each further request before logging out.
   */
  sendTokenRequest: function( iUser, iPhrase, iPass ) {
      this.setPath('currLogin.user', iUser);
      var body = { username: iUser, phrase: iPhrase, pass: iPass};
      //response from server is same as with login requests
      if (DG.documentServer) {
        this.urlForJSONGetRequests(DG.documentServer + 'user/info' + (DG.runKey ? '?runKey=%@'.fmt(DG.runKey) : '') )
          .notify(this, 'receiveLoginResponse')
          .send({});
      } else {
        this.urlForJSONPostRequests(serverUrl('auth/login'))
        .notify(this, 'receiveLoginResponse')
        .send(body);
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
      var body = { username: iUser, sessiontoken: iSessionID };
      this.urlForJSONPostRequests(serverUrl('auth/logout'))
        .send(body);
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
    Return the "path" of the document, which we conceive as analogous to a unix "/" delimited path,
    except we'll use a ':', since "/" is overloaded with meaning in a url context (even when escaped).
    We'll return an absolute path, prefixing relative paths with the username - this will help
    ensure uniqueness of the path, so that it can be used as an id. Note that the "path" interpretation
    is not known to the server - to the server, this is just used as a unique Id.

    @private
    @param iDocumentId{String} A string to use as the document id.
  */
  _documentPath: function(iDocumentId) {
    var path = iDocumentId;

    // Prefix non-relative paths with user name.
    if( !/^:/.test( path))
      path = ':' + this.getPath('currLogin.user') + ':' + iDocumentId;

    return path;
  },

  /**
    Url for server get / save document
    @private
    @param iDocumentId{String} A string to use as the document id.
  */
  _documentUrl : function(iDocumentId) {
    var url = serverUrl('document');
    url += '/' + encodeURIComponent(this.getPath('currLogin.sessionID'));
    url += '/' + encodeURIComponent(this._documentPath(iDocumentId));

    return url;
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
    var url = DG.documentServer + 'document/save?username=%@&sessiontoken=%@&recordname=%@'.fmt(
                  this.getPath('currLogin.user'), this.getPath('currLogin.sessionID'), iDocumentId),
        deferred = $.Deferred();

    if (DG.runKey) {
      url += '&runKey=%@'.fmt(DG.runKey);
    }

    if (DG.USE_COMPRESSION) {
      var compressedDocumentArchive = pako.deflate(JSON.stringify(iDocumentArchive));
      this.urlForPostRequests( serverUrl(url) )
        .header('Content-Encoding', 'deflate')
        .header('Content-Type', 'application/x-codap-document')
        .notify(iReceiver, 'receivedSaveDocumentResponse', deferred, isCopying)
        .timeoutAfter(60000)
        .send(compressedDocumentArchive);
    } else {
      this.urlForPostRequests( serverUrl(url) )
        .header('Content-Type', 'application/x-codap-document')
        .notify(iReceiver, 'receivedSaveDocumentResponse', deferred, isCopying)
        .timeoutAfter(60000)
        .send(JSON.stringify(iDocumentArchive));
    }

    return deferred;
  },

  saveExternalDataContext: function(contextModel, iDocumentId, iDocumentArchive, iReceiver, isCopying, isDifferential) {
    var url,
        externalDocumentId = contextModel.get('externalDocumentId'),
        parentDocumentId = DG.currDocumentController().get('externalDocumentId'),
        deferred = $.Deferred();

    if (!isCopying && !SC.none(externalDocumentId)) {
      if (isDifferential) {
        url = DG.documentServer + 'document/patch?recordid=%@'.fmt(externalDocumentId);
      } else {
        url = DG.documentServer + 'document/save?recordid=%@'.fmt(externalDocumentId);
      }
    } else {
      url = DG.documentServer + 'document/save?recordname=%@-context-%@'.fmt(iDocumentId, SC.guidFor(contextModel));
    }

    if (!SC.none(parentDocumentId)) {
      url += '&parentDocumentId=%@'.fmt(parentDocumentId);
    }

    if (DG.runKey) {
      url += '&runKey=%@'.fmt(DG.runKey);
    }


    if (DG.USE_COMPRESSION) {
      var compressedDocumentArchive = pako.deflate(JSON.stringify(iDocumentArchive));
      this.urlForPostRequests( serverUrl(url) )
        .header('Content-Encoding', 'deflate')
        .header('Content-Type', 'application/x-codap-document')
        .notify(iReceiver, 'receivedSaveExternalDataContextResponse', deferred, isCopying, contextModel)
        .timeoutAfter(60000)
        .send(compressedDocumentArchive);
    } else {
      this.urlForPostRequests( serverUrl(url) )
        .header('Content-Type', 'application/x-codap-document')
        .notify(iReceiver, 'receivedSaveExternalDataContextResponse', deferred, isCopying, contextModel)
        .timeoutAfter(60000)
        .send(JSON.stringify(iDocumentArchive));
    }

    return deferred;
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
    var url = DG.documentServer + 'document/delete?recordid=%@'.fmt( iDocumentId );

    if (DG.runKey) {
      url += '&runKey=%@'.fmt(DG.runKey);
    }

    this.urlForGetRequests( serverUrl(url) )
      .notify(iReceiver, 'receivedDeleteDocumentResponse')
      .send();
  },

  documentList: function(iReceiver) {
    var url = DG.documentServer + 'document/all';
    url += '?username=' + this.getPath('currLogin.user');
    url += '&sessiontoken=' + encodeURIComponent(this.getPath('currLogin.sessionID'));
    if (DG.runKey) {
      url += '&runKey=%@'.fmt(DG.runKey);
    }
    this.urlForGetRequests( serverUrl(url))
      .notify(iReceiver, 'receivedDocumentListResponse')
      .send();
  },

  exampleList: function(iReceiver) {
    var url = 'https://codap-resources.concord.org/examples/index.json';
    this.urlForGetRequests( url )
      .notify(iReceiver, 'receivedExampleListResponse')
      .send();
  },

  openDocument: function(iDocumentId, iReceiver) {
    var url = DG.documentServer + 'document/open';
    url += '?username=' + this.getPath('currLogin.user');
    url += '&sessiontoken=' + this.getPath('currLogin.sessionID');
    url += '&recordid=' + iDocumentId;

    if (DG.runKey) {
      url += '&runKey=%@'.fmt(DG.runKey);
    }

    this.urlForGetRequests(serverUrl(url))
      .notify(iReceiver, 'receivedOpenDocumentResponse', true, false)
      .send();
  },
  openDocumentByName: function(iDocumentName, iDocumentOwner, iReceiver) {
    var url = DG.documentServer + 'document/open';
    url += '?username=' + this.getPath('currLogin.user');
    url += '&sessiontoken=' + this.getPath('currLogin.sessionID');
    url += '&recordname=' + iDocumentName;
    url += '&owner=' + iDocumentOwner;

    if (DG.runKey) {
      url += '&runKey=%@'.fmt(DG.runKey);
    }

    this.urlForGetRequests(serverUrl(url))
      .notify(iReceiver, 'receivedOpenDocumentResponse', true, false)
      .send();
  },

  loadExternalDocuments: function(iDocumentIds) {
    var deferreds = [],
        baseUrl = DG.documentServer + 'document/open'
          + '?username=' + this.getPath('currLogin.user')
          + '&sessiontoken=' + this.getPath('currLogin.sessionID'),
        i, len;

    if (DG.runKey) {
      baseUrl += '&runKey=%@'.fmt(DG.runKey);
    }

    var sendRequest = function(id) {
      var url = baseUrl + '&recordid=' + iDocumentIds[i],
          deferred = $.Deferred();

      this.urlForGetRequests(serverUrl(url))
        .json(YES)
        .notify(null, function(response) { this.receivedLoadExternalDocumentResponse(id, response); }.bind(this))
        .notify(null, function() { deferred.resolve(); })
        .send();

      return deferred;
    }.bind(this);

    for (i = 0, len = iDocumentIds.length; i < len; i++) {
      deferreds.push(sendRequest(iDocumentIds[i]));
    }

    return deferreds;
  },

  receivedLoadExternalDocumentResponse: function(id, response) {
    // FIXME What should we do on failure?
    if (SC.ok(response)) {
      var body = response.get('body');
      var docId = response.headers()['Document-Id'];
      if (docId) {
        // make sure we always have the most up-to-date externalDocumentId,
        // since the document server can change it for permissions reasons.
        body.externalDocumentId = ''+docId;
      }
      DG.ExternalDocumentCache.cache(id, body);
    } else {
      DG.logError('openDocumentFailed:' + JSON.stringify({id: id, status: response.status, body: response.body, address: response.address}) );
    }
  },

  revertCurrentDocument: function(iReceiver) {
    if (!DG.currDocumentController().get('canBeReverted')) { return; }

    var url = DG.documentServer + 'document/open';
    url += '?recordid=' + DG.currDocumentController().get('externalDocumentId');
    url += '&original=true';

    if (this.getPath('currLogin.user') !== 'guest') {
      url += '&owner=' + this.getPath('currLogin.user');
    }

    if (DG.runKey) {
      url += '&runKey=%@'.fmt(DG.runKey);
    }

    this.urlForGetRequests(serverUrl(url))
      .notify(iReceiver, 'receivedOpenDocumentResponse', true, true)
      .send();
  },

  renameDocument: function(iOriginalName, iNewName, iReceiver) {
    var url = DG.documentServer + 'document/rename';
    url += '?recordid=' + DG.currDocumentController().get('externalDocumentId');
    url += '&newRecordname=' + iNewName;

    if (this.getPath('currLogin.user') !== 'guest') {
      url += '&owner=' + this.getPath('currLogin.user');
    }

    if (DG.runKey) {
      url += '&runKey=%@'.fmt(DG.runKey);
    }

    this.urlForGetRequests(serverUrl(url))
      .notify(iReceiver, 'receivedRenameDocumentResponse')
      .send();
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

  sessionTimeoutPrompt: function(deferred) {
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
          action: function() { if(deferred) { deferred.resolve(false); } },
          isCancel: true
        },
      ]
    });
  },

  logInViaDocumentServer: function() {
    window.location = DG.getVariantString('DG.Authorization.loginPane.documentStoreSignInHref').loc( DG.documentServer );
  },

  receiveLoginResponse: function(iResponse) {
    var currLogin = this.get('currLogin'),
        status, body;
    if (SC.ok(iResponse)) {
      status = iResponse.get('status');
      body = iResponse.get('body');
      return this.logIn(body, status);
    } else {

      // if the server gets a 500 error(server script error),
      // then there will be no message return
      var errorCode = (body && body.message) || "";
      if (DG.documentServer && iResponse.get('status') === 401) {
        if (DG.runAsGuest) {
          return DG.authorizationController.sendLoginAsGuestRequest();
        } else {
          errorCode = 'error.notLoggedIn';
        }
      }
      // If we get here, then we didn't log in successfully.
      currLogin
        .clear()
        .set('errorCode', errorCode)
        .set('failedLoginAttempt', true);
    }
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

    var kVSpace = 2;
    var top = 0;
    var height = 0;
    var nextTop = function(n) { top += (height + n); return top; };
    var lastHeight = function(n) { height = n; return height; };
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

    if (DG.documentServer) {
      this.sheetPane = SC.PanelPane.create({
        layout: { top: 0, centerX: 0, width: 340, height: 140 },
        contentView: SC.View.extend({
          childViews: 'labelView loginButton loginAsGuestButton statusLabel'.w(),

          labelView: SC.LabelView.design({
            layout: { top: nextTop(0), left: 0, right: 0, height: lastHeight(54) },
            controlSize: SC.LARGE_CONTROL_SIZE,
            fontWeight: SC.BOLD_WEIGHT,
            textAlign: SC.ALIGN_CENTER,
            value: 'DG.Authorization.loginPane.dialogTitle',            // "Data Games Login"
            localize: YES
          }),

          statusLabel: SC.LabelView.design({
            escapeHTML: NO,
            layout: { top: nextTop( kVSpace ), left: 0, right: 0, height: lastHeight(48) },
            textAlign: SC.ALIGN_CENTER,
            valueBinding: 'DG.authorizationController.currLogin.statusMsg'
          }),

          loginAsGuestButton: SC.ButtonView.design({
            layout: { top: nextTop( kVSpace ), height: lastHeight(24), right:130, width:125 },
            title: 'DG.Authorization.loginPane.loginAsGuest',         // "Login as guest"
            localize: YES,
            target: 'DG.authorizationController',
            action: 'sendLoginAsGuestRequest',
            isDefault: NO
          }),

          loginButton: SC.ButtonView.design({
            layout: { top: top, height: lastHeight(24), right:20, width:100 },
            title: 'DG.Authorization.loginPane.login',                // "Log in"
            localize: YES,
            target: 'DG.authorizationController',
            action: 'logInViaDocumentServer',
            isDefault: YES
          })
         })
       });

      this.sheetPane.append();
    } else {
    this.sheetPane = SC.PanelPane.create({

      layout: { top: 0, centerX: 0, width: 340, height: 200 },
      contentView: SC.View.extend({
        childViews: 'labelView userLabel userText passwordLabel passwordText loginAsGuestButton loginButton statusLabel registerLink recoveryLink'.w(),

        labelView: SC.LabelView.design({
          layout: { top: nextTop(0), left: 0, right: 0, height: lastHeight(24) },
          controlSize: SC.LARGE_CONTROL_SIZE,
          fontWeight: SC.BOLD_WEIGHT,
          textAlign: SC.ALIGN_CENTER,
          value: 'DG.Authorization.loginPane.dialogTitle',            // "CODAP Login"
          localize: YES
        }),

        userLabel: SC.LabelView.design({
          layout: { top: nextTop(kVSpace), left: 0, right: 0, height: lastHeight(18)},
          textAlign: SC.ALIGN_CENTER,
          value: 'DG.Authorization.loginPane.userLabel',              // "User"
          localize: YES
        }),

        userText: SC.TextFieldView.design({
          layout: { top: nextTop(kVSpace), centerX: 0, width: 200, height: lastHeight(20) },
          autoCorrect: false,
          autoCapitalize: false,
          valueBinding: "DG.authorizationController.currEdit.user"
        }),

        passwordLabel: SC.LabelView.design({
          layout: { top: nextTop(kVSpace), left: 0, right: 0, height: lastHeight(18) },
          textAlign: SC.ALIGN_CENTER,
          value: 'DG.Authorization.loginPane.passwordLabel',        // "Password"
          localize: YES
        }),

        passwordText: SC.TextFieldView.design({
          layout: { top: nextTop(kVSpace), centerX: 0, height: lastHeight(20), width: 200 },
          type: 'password',
          autoCorrect: false,
          autoCapitalize: false,
          valueBinding: "DG.authorizationController.currEdit.passwd"
        }),

        loginAsGuestButton: SC.ButtonView.design({
          layout: { top: nextTop(6*kVSpace), height: lastHeight(24), left:20, width:125 },
          title: 'DG.Authorization.loginPane.loginAsGuest',         // "Login as guest"
          localize: YES,
          target: 'DG.authorizationController',
          action: 'sendLoginAsGuestRequest',
          isDefault: NO
        }),

        loginButton: SC.ButtonView.design({
          layout: { top: top, height: lastHeight(24), right:20, width:100 },
          title: 'DG.Authorization.loginPane.login',                // "Login"
          localize: YES,
          target: 'DG.authorizationController',
          action: 'sendLoginRequestFromDialog',
          isDefault: YES
        }),

        statusLabel: SC.LabelView.design({
          escapeHTML: NO,
          layout: { top: nextTop( kVSpace), left: 0, right: 0, height: lastHeight(18) },
          textAlign: SC.ALIGN_CENTER,
          valueBinding: 'DG.authorizationController.currLogin.statusMsg'
        }),

        registerLink: SC.StaticContentView.design({
          layout: { top: nextTop(kVSpace), left: 20, height: 18},
          textAlign: SC.ALIGN_CENTER,
          content: DG.getVariantString('DG.Authorization.loginPane.registerLink').loc( DG.getDrupalSubdomain()+this.getLoginCookieDomain())
        }),

        recoveryLink: SC.StaticContentView.design({
          layout: { top: 148, left: 200, height: 18},
          textAlign: SC.ALIGN_CENTER,
          content: DG.getVariantString('DG.Authorization.loginPane.recoveryLink').loc( DG.getDrupalSubdomain()+this.getLoginCookieDomain())
        })
       })
     });

    this.sheetPane.append();
    this.sheetPane.contentView.userText.becomeFirstResponder();
    }
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
