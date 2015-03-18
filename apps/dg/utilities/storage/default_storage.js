// ==========================================================================
//                          DG.DefaultStorage
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

sc_require('controllers/authorization');

/** @class

  Interface class for interacting with the default CODAP document storage.

 @extends SC.Object
 */
DG.DefaultStorage = DG.StorageAPI.extend(DG.CODAPCommonStorage, {
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

    sheetPane.append();
    sheetPane.contentView.userText.becomeFirstResponder();
    return sheetPane;
  },

  login: function(options) {
    return new Promise(function(resolve, reject) {
      this._urlForPostRequests('/DataGames/api/auth/login')
        .notify(this, '_handleResponse', resolve, reject)
        .send(options);
    }.bind(this));
  },

  logout: function(options) {
    return new Promise(function(resolve, reject) {
      this._urlForPostRequests('/DataGames/api/auth/logout')
        .notify(this, '_handleResponse', resolve, reject)
        .send(options);
    }.bind(this));
  },

  list: function() {
    return new Promise(function(resolve, reject) {
      var url = '/DataGames/api/document/all?username=%@&sessiontoken=%@'.fmt(
        DG.authorizationController.getPath('currLogin.user'),
        encodeURIComponent(DG.authorizationController.getPath('currLogin.sessionID'))
      );
      this._urlForGetRequests(url)
        .notify(this, '_handleResponse', resolve, reject)
        .send();
    }.bind(this));
  },

  open: function(options) {
    return new Promise(function(resolve, reject) {
      var url;
      if (!SC.none(options.id)) {
        url = '/DataGames/api/document/open?username=%@&sessiontoken=%@&recordid=%@'.fmt(
          DG.authorizationController.getPath('currLogin.user'),
          encodeURIComponent(DG.authorizationController.getPath('currLogin.sessionID')),
          options.id
        );
      } else if (!SC.none(options.name) && !SC.none(options.owner)) {
        url = '/DataGames/api/document/open?username=%@&sessiontoken=%@&recordname=%@&owner=%@'.fmt(
          DG.authorizationController.getPath('currLogin.user'),
          encodeURIComponent(DG.authorizationController.getPath('currLogin.sessionID')),
          options.name,
          options.owner
        );
      } else {
        reject(new Error("Must supply either 'id' or 'name' and 'owner' in the options!"));
        return;
      }
      this._urlForGetRequests(url)
        .notify(this, '_handleResponse', resolve, reject)
        .send();
    }.bind(this));
  },

  save: function(options) {
    return new Promise(function(resolve, reject) {
      var url,
          documentContent = JSON.stringify(options.content);
      if (!SC.none(options.id)) {
        url = '/DataGames/api/document/save?username=%@&sessiontoken=%@&recordid=%@'.fmt(
          DG.authorizationController.getPath('currLogin.user'),
          encodeURIComponent(DG.authorizationController.getPath('currLogin.sessionID')),
          options.id
        );
      } else if (!SC.none(options.name)) {
        url = '/DataGames/api/document/save?username=%@&sessiontoken=%@&recordname=%@'.fmt(
          DG.authorizationController.getPath('currLogin.user'),
          encodeURIComponent(DG.authorizationController.getPath('currLogin.sessionID')),
          encodeURIComponent(options.name)
        );
      } else {
        reject(new Error("Must supply either 'id' or 'name' in the options!"));
        return;
      }

      this._urlForPostRequests(url)
        .notify(this, '_handleResponse', resolve, reject)
        .timeoutAfter(60000)
        .send(documentContent);
    }.bind(this));
  },

  revert: function(options) {
    return Promise.reject(new Error('Cannot revert with DefaultStorage.'));
  },

  rename: function(options) {
    return Promise.reject(new Error('Cannot rename with DefaultStorage.'));
  },

  delete: function(options) {
    return Promise.reject(new Error('Cannot delete with DefaultStorage.'));
  }
});
