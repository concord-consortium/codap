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
 * only indication the user has of the failure.
 * @extends SC.View
 */
DG.WebView = SC.View.extend(
/** @scope DG.WebView.prototype */ {
      classNames: ['dg-web-view'],
      childViews: DG.get('hideWebViewLoading') !== 'yes' ? ['loadingView', 'webView'] : ['webView'],

      isTextSelectable: YES,

      /**
       * The URL provided.
       * @type {String}
       */
      value: '',

      /**
       * The URL to load.
       *
       * We load protocol relative URLs to maximize the likelihood of success.
       * See: https://www.paulirish.com/2010/the-protocol-relative-url/
       *
       * @type {String)
       */
      _url: function () {
        return this.get('value').replace(/^https?:/, '');
      }.property('value'),

      /**
       * Whether we are loading.
       * @type {boolean}
       */
      isLoading: true,

      loadingMessage: function () {
        return this.isLoading ? 'DG.GameView.loading'.loc() : 'DG.GameView.loadError'.loc();
      }.property('isLoading'),

      /**
       * The purpose of this view is to provide a background to the WebView
       * while it is loading and, if it fails, provide an error message.
       * When the iframe loads, if it loads correctly, it will cover this view.
       */
      loadingView: SC.View.extend({
        childViews: ['urlLabel', 'messageLabel'],
        isLoadingBinding: '*parentView.isLoading',
        classNames: ['dg-web-view-backdrop'],
        classNameBindings: [
          'isLoading:dg-interactive-loading'
        ],
        urlLabel: SC.LabelView.extend({
          layout: { left: 10, right: 0, top: 0, height: 36 },
          valueBinding: '*parentView.parentView.value',
          classNames: ['dg-web-view-url']
        }),
        messageLabel: SC.LabelView.extend({
          layout: { left: 20, right: 20, top: 40, height: 40 },
          valueBinding: '*parentView.parentView.loadingMessage',
          classNames: ['dg-web-view-message']
        })
      }),

      webView: SC.WebView.extend({
        classNames: ['dg-web-view-frame'],

        value: function () {
          return this.getPath('parentView._url');
        }.property(),

        urlDidChange: function () {
          this.notifyPropertyChange('value');
        }.observes('*parentView.value'),

        /**
         * @override SC.WebView.iframeDidLoad
         */
        iframeDidLoad: function () {
          if (!SC.none(this.get('value'))) {
            this.setPath('parentView.isLoading', false);
          }
          sc_super();
        }
      })
});
