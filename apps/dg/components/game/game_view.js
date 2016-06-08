// ==========================================================================
//                          DG.GameView
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

/* globals iframePhone */
sc_require('components/game/game_controller');
sc_require('controllers/game_selection');
sc_require('libraries/iframe-phone');

/** @class

    (Document Your View Here)

 @extends SC.WebView
 */

DG.GameView = SC.View.extend(
/** @scope DG.GameView.prototype */ {

  /**
   * @property {DG.GameController}
   */
  controller: null,

  childViews: ['loadingView', 'webView'],

  phone: null,

  /**
   * Handles the old-style 'game' API using async iframePhone post-messaging
   * @property {DG.GamePhoneHandler}
   */
  gamePhoneHandler: null,

  /**
   * Handles the new-style 'data interactive' API using async iframePhone post-messaging
   * Brought into existence in March, 2016
   * @property {DG.DataInteractivePhoneHandler}
   */
  dataInteractivePhoneHandler: null,

  init: function () {
    sc_super();
    this.gamePhoneHandler = DG.GamePhoneHandler.create({controller: this.get('controller')});
    this.dataInteractivePhoneHandler = DG.DataInteractivePhoneHandler.create({ model: this.getPath('controller.model')});
  },

  destroy: function () {
    this.controller.gameViewWillClose();
    if (this.gamePhoneHandler) {
      this.gamePhoneHandler.destroy();
      this.gamePhoneHandler = null;
    }
    if (this.dataInteractivePhoneHandler) {
      this.dataInteractivePhoneHandler.destroy();
      this.dataInteractivePhoneHandler = null;
    }
    if (this.phone) {
      this.phone.disconnect();
    }
    sc_super();
  },

  setUpChannels: function (iFrame, iUrl) {
    var setupHandler = function (iHandler, iKey) {
      var wrapper = function (command, callback) {
        iHandler.set('isPhoneInUse', true);
        iHandler.doCommand(command, function (ret) {
          // Analysis shows that the object returned by DG.doCommand may contain Error values, which
          // are not serializable and thus will cause DataCloneErrors when we call 'callback' (which
          // sends the 'ret' to the game window via postMessage). The 'requestFormulaValue' and
          // 'requestAttributeValues' API commands are the guilty parties. The following is an
          // ad-hoc attempt to clean up the object for successful serialization.

          if (ret && ret.error && ret.error instanceof Error) {
            ret.error = ret.error.message;
          }

          if (ret && ret.values && ret.values.length) {
            ret.values = ret.values.map(function (value) {
              return value instanceof Error ? null : value;
            });
          }

          // If there's a DataCloneError anyway, at least let the client know something is wrong:
          try {
            callback(ret);
          } catch (e) {
            if (e instanceof window.DOMException && e.name === 'DataCloneError') {
              callback({success: false});
            }
          }
        });
      };

      //First discontinue listening to old interactive.
      if (iHandler.phone) {
        iHandler.phone.disconnect();
      }

      // Global flag used to indicate whether calls to application should be made via phone, or not.
      iHandler.set('isPhoneInUse', false);

      iHandler.phone = new iframePhone.IframePhoneRpcEndpoint(wrapper.bind(this),
          iKey, this.$('iframe')[0], this.extractOrigin(iUrl), this.phone);
      // Let games/interactives know that they are talking to CODAP, specifically (rather than any
      // old iframePhone supporting page) and can use its API.
      iHandler.phone.call({message: "codap-present"}, function (reply) {
        DG.log('Got codap-present reply on channel: "' + iKey + '": ' + JSON.stringify(reply));
        // success or failure, getting a reply indicates we are connected
      });
    }.bind( this);

    // We create a parent endpoint. The rpc endpoints will live within
    // the raw parent endpoint.
    this.phone = new iframePhone.ParentEndpoint(iFrame,
        this.extractOrigin(iUrl), function () {DG.log('connected');});
    setupHandler(this.get('gamePhoneHandler'), 'codap-game');
    setupHandler(this.get('dataInteractivePhoneHandler'), 'data-interactive');
  },

  /**
   * If the URL is a web URL return the origin.
   *
   * The origin is scheme://domain_name.port
   */
  extractOrigin: function (url) {
    var re = /([^:]*:\/\/[^\/]*)/;
    if (/^http.*/i.test(url)) {
      return re.exec(url)[1];
    }
  },

  loadingView: SC.LabelView.extend({
    urlBinding: '*parentView.value',
    isLoadingBinding: '*parentView.isLoading',
    didConnectBinding: '*parentView.didConnect',
    classNames: ['dg-web-view'],
    classNameBindings: ['isLoading:dg-loading'],
    value: function () {
      if (this.getPath('isLoading')) {
        return 'DG.GameView.loading'.loc(this.get('url'));
      } else if (!this.get('didConnect')) {
        return 'DG.GameView.loadError'.loc(this.get('url'));
      } else {
        return '';
      }
    }.property('url', 'isLoading', 'didConnect')
  }),

  webView: SC.WebView.extend({
    classNames: ['dg-web-view-frame'],

    valueBinding: '*parentView.value',

    controllerBinding: '*parentView.controller',

    _previousValue: null,

    // Setup iframePhone communication with the child iframe before it loads, so that connection
    // (iframe src will change when 'value' changes, but observers fire before bindings are synced)
    valueDidChange: function () {
      var tValue = this.get('value');

      if (tValue !== this._previousValue) {
        this.parentView.setUpChannels(this.$('iframe')[0], tValue);
      }

      this._previousValue = tValue;

    }.observes('value'),

    /**
     * @override SC.WebView.iframeDidLoad
     */
    iframeDidLoad: function () {
      if (!SC.none(this.value)) {
        this.setPath('parentView.isLoading', false);
      }
      var iframe = this.$('iframe')[0];
      if (this.value) {
        this.valueDidChange();
      }
      if (iframe && iframe.contentWindow) {
        // Allow the iframe to take over the entire screen (requested by InquirySpace)
        $(iframe).attr('allowfullscreen', true)
            .attr('webkitallowfullscreen', true)
            .attr('mozallowfullscreen', true);

      } else {
        DG.logWarn("DG.GameView:iframeDidLoad no contentWindow\n");
      }
      sc_super();
    }

  })
});
