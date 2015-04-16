// ==========================================================================
//                          DG.DocumentServerStorage
//
//  Copyright (c) 2015 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('utilities/storage/storage_api');
sc_require('utilities/storage/codap_common_storage');

/* globals pako */
sc_require('libraries/pako-deflate');

/** @class

  Interface class for interacting with the CODAP Document Server.

 @extends SC.Object
 */
DG.DocumentServerStorage = DG.StorageAPI.extend(DG.CODAPCommonStorage, {
  canSave: YES,
  isLoggedIn: NO,

  // Pop up a dialog for logging in to this storage backend.
  promptLogin: function() {
    var kVSpace = 2,
        top = 0,
        height = 0,
        nextTop = function(n) { top += (height + n); return top; },
        lastHeight = function(n) { height = n; return height; };

    var sheetPane = SC.PanelPane.create({
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
          classNames: ['dg-loginguest-button'],
          title: 'DG.Authorization.loginPane.loginAsGuest',         // "Login as guest"
          localize: YES,
          target: 'DG.authorizationController',
          action: 'sendLoginAsGuestRequest',
          isDefault: NO
        }),

        loginButton: SC.ButtonView.design({
          layout: { top: top, height: lastHeight(24), right:20, width:100 },
          classNames:['dg-login-button'],
          title: 'DG.Authorization.loginPane.login',                // "Log in"
          localize: YES,
          target: this,
          action: '_showLoginFrame',
          isDefault: YES
        })
       })
     });

    sheetPane.append();
    return sheetPane;
  },

  _showLoginFrame: function() {
    function computeScreenLocation(w, h) {
      // Fixes dual-screen position                         Most browsers      Firefox
      var dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : screen.left;
      var dualScreenTop = window.screenTop !== undefined ? window.screenTop : screen.top;

      var width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
      var height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;

      var left = ((width / 2) - (w / 2)) + dualScreenLeft;
      var top = ((height / 2) - (h / 2)) + dualScreenTop;
      return {left: left, top: top};
    }
    var url = DG.getVariantString('DG.Authorization.loginPane.documentStoreSignInHref').loc( DG.documentServer );
    var width=1000;
    var height = 480;
    var position = computeScreenLocation(width, height);
    var windowFeatures = [
      'width=' + width,
      'height=' + height,
      'top=' + position.top || 200,
      'left=' + position.left || 200,
      'dependent=yes',
      'resizable=no',
      'location=no',
      'dialog=yes',
      'menubar=no'
    ];
    DG.log("WindowFeatures=[" + windowFeatures.join() + ']');
    var panel = window.open(url, 'auth', windowFeatures.join());
    var timer = SC.Timer.schedule({
      interval: 200,
      repeats: YES,
      action: function() {
        try {
          /* This is a bit of a hack. Accessing an iframe's location throws a security exception
           * when the url is cross-origin. Since the Document Server forwards us back to the parent
           * window's location after authenticating (not cross-origin), we can detect when the
           * authentication process is complete and react.
           */
          var href = panel.location.href;
          if (href === window.location.href) {
            timer.invalidate();
            panel.close();
            this.sendLoginRequest('user');
          }
        } catch(e) {}
      }.bind(DG.authorizationController)
    });
  },

  login: function() {
    return new Promise(function(resolve, reject) {
      var url = '%@user/info'.fmt(DG.documentServer);
      if (DG.runKey) {
        url = this._appendParams(url, {runKey: DG.runKey});
      }

      this._urlForGetRequests(url)
        .notify(null, function(response) {
          var body;
          try {
            body = JSON.parse(response.get('body'));
          } catch(e) {
            body = {message: 'error.parseError'};
          }
          if (SC.ok(response)) {
            resolve(body);
          } else {
            // if the server gets a 500 error(server script error),
            // then there will be no message return
            var errorCode = (body && body.message) || "";
            if (response.get('status') === 401) {
              if (DG.runAsGuest) {
                DG.authorizationController.sendLoginAsGuestRequest();
                resolve({skipLogin: true});
                return;
              } else {
                errorCode = 'error.notLoggedIn';
              }
            }
            reject(errorCode);
          }
        })
        .send();
    }.bind(this));
  },

  logout: function() {
    return Promise.reject(new Error('Cannot logout with Document Server.'));
  },

  list: function() {
    return new Promise(function(resolve, reject) {
      var url = '%@document/all'.fmt(DG.documentServer);
      if (DG.runKey) {
        url = this._appendParams(url, {runKey: DG.runKey});
      }
      this._urlForGetRequests(url)
        .notify(this, '_handleResponse', resolve, reject)
        .send();
    }.bind(this));
  },

  open: function(options) {
    return new Promise(function(resolve, reject) {
      var url = '%@document/open'.fmt(DG.documentServer),
          params = options.params || {};
      if (!SC.none(options.id)) {
        params.recordid = options.id;
      } else if (!SC.none(options.name) && !SC.none(options.owner)) {
        params.recordname = options.name;
        params.owner = options.owner;
      } else {
        reject(new Error("Must supply either 'id' or 'name' and 'owner' in the options!"));
        return;
      }
      if (DG.runKey) {
        params.runKey = DG.runKey;
      }

      url = this._appendParams(url, params);

      this._urlForGetRequests(url)
        .notify(this, '_handleResponse', resolve, reject)
        .send();
    }.bind(this));
  },

  save: function(options) {
    return new Promise(function(resolve, reject) {
      var url,
          params = options.params || {},
          documentContent = JSON.stringify(options.content),
          req;

      if (options.differential) {
        url = '%@document/patch'.fmt(DG.documentServer);
      } else {
        url = '%@document/save'.fmt(DG.documentServer);
      }

      if (!SC.none(options.id)) {
        params.recordid = options.id;
      } else if (!SC.none(options.name)) {
        params.recordname = options.name;
      } else {
        reject(new Error("Must supply either 'id' or 'name' in the options!"));
        return;
      }
      if (DG.runKey) {
        params.runKey = DG.runKey;
      }

      url = this._appendParams(url, params);

      req = this._urlForPostRequests(url)
              .header('Content-Type', 'application/x-codap-document');

      if (DG.USE_COMPRESSION) {
        documentContent = pako.deflate(documentContent);
        req = req.header('Content-Encoding', 'deflate');
      }

      req.notify(this, '_handleResponse', resolve, reject)
        .timeoutAfter(60000)
        .send(documentContent);
    }.bind(this));
  },

  revert: function(options) {
    options.params = {original: 'true'};
    return this.open(options);
  },

  rename: function(options) {
    return new Promise(function(resolve, reject) {
      var url = '%@document/rename'.fmt(DG.documentServer),
          params = options.params || {};
      if (!SC.none(options.id)) {
        params.recordid = options.id;
      } else if (!SC.none(options.name) && !SC.none(options.owner)) {
        params.recordname = options.name;
        params.owner = options.owner;
      } else {
        reject(new Error("Must supply either 'id' or 'name' and 'owner' in the options!"));
        return;
      }
      if (DG.runKey) {
        params.runKey = DG.runKey;
      }
      params.newRecordname = options.newName;

      url = this._appendParams(url, params);

      this._urlForGetRequests(url)
        .notify(this, '_handleResponse', resolve, reject)
        .send();
    }.bind(this));
  },

  deleteDoc: function(options) {
    return new Promise(function(resolve, reject) {
      var url = '%@document/delete'.fmt(DG.documentServer),
          params = options.params || {};

      if (!SC.none(options.id)) {
        params.recordid = options.id;
      } else if (!SC.none(options.name)) {
        params.recordname = options.name;
      } else {
        reject(new Error("Must supply either 'id' or 'name' in the options!"));
        return;
      }
      if (DG.runKey) {
        params.runKey = DG.runKey;
      }
      params.newRecordname = options.newName;

      url = this._appendParams(url, params);

      this._urlForGetRequests(url)
        .notify(this, '_handleResponse', resolve, reject)
        .send();
    }.bind(this));
  }
});
