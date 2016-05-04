// ==========================================================================
//                          DG.WebView
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

/** @class
 * Implements a view of a web page in an IFrame that presents a loading message
 * and an error message, if the load fails. In particular, if the load of a
 * page from another origin fails, the underlying message will be visible. We
 * won't be able to interrogate the IFrame, so the error message will be the
 * only indication the software or the user has of the failure.
 * @extends SC.View
 */
DG.WebView = SC.View.extend(
/** @scope DG.WebView.prototype */ {
      childViews: ['loadingView', 'webView'],

      /**
       * The URL to load.
       * @type {String}
       */
      value: '',

      /**
       * Whether we are loading.
       * @type {boolean}
       */
      isLoading: true,

      /**
       * The purpose of this view is to provide a background to the WebView
       * while it is loading and, if it fails, provide an error message.
       * When the iframe loads, if it loads correctly, it will cover this view.
       */
      loadingView: SC.LabelView.extend({
        urlBinding: '*parentView.value',
        isLoadingBinding: '*parentView.isLoading',
        classNames: ['dg-web-view'],
        classNameBindings: ['isLoading:dg-loading'],
        value: function () {
          if (this.getPath('isLoading')) {
            return 'DG.GameView.loading'.loc(this.get('url'));
          } else {
            return 'DG.GameView.loadError'.loc(this.get('url'));
          }
        }.property('url', 'isLoading')
      }),

      webView: SC.WebView.extend({
        classNames: ['dg-web-view-frame'],
        valueBinding: '*parentView.value',
        controllerBinding: '*parentView.controller',

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

        /**
         * @override SC.WebView.iframeDidLoad
         */
        iframeDidLoad: function () {
          if (!SC.none(this.value)) {
            this.setPath('parentView.isLoading', false);
          }
          sc_super();
        }
      })
});
