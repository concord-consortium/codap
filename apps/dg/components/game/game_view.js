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

sc_require('components/game/game_controller');
sc_require('views/web_view');

/** @class
 *
 *  A container for a Data Interactive.
 *
 * @extends DG.WebView
 */

DG.GameView = DG.WebView.extend(
/** @scope DG.GameView.prototype */ {

      classNames: ['dg-game-view'],
      classNameBindings: ['connected:dg-interactive-connected'],

      /**
       * @property {DG.GameController}
       */
      controller: null,

      connected: null,

      didConnect: function () {
        this.set('connected', !SC.none(this.getPath('controller.activeChannel')));
      }.observes('.controller.activeChannel'),

      backgroundColor: 'white',

      destroy: function () {
        this.controller.gameViewWillClose();
        sc_super();
      },

      webView: SC.WebView.extend({
        classNames: ['dg-web-view-frame'],

        // we modify the SC.WebView rendering to allow geolocation
        render: function(context, firstTime) {
          var src = this.get('value') || '',
              iframe;

          if (firstTime) {
            context.push('<iframe allow="geolocation; microphone; camera; bluetooth; clipboard-read; clipboard-write" src="' + src +
                '" style="position: absolute; width: 100%; height: 100%; border: 0; margin: 0; padding: 0;"></iframe>');
          }
          else if(src!==this._lastSrc) {
            iframe = this.$('iframe');
            // clear out the previous src, to force a reload
            iframe.attr('src', 'javascript:;');
            iframe.attr('src', src);
          }

          this._lastSrc = src;
        },


        // append language string to url as a query parameter
        value: function () {
          function parseUrl( url ) {
            var a = document.createElement('a');
            a.href = url;
            return a;
          }
          var url = this.getPath('parentView._url');
          var parsedUrl = parseUrl(url);
          var qp = parseUrl(url).search;
          var lang = DG.get('currentLanguage');
          var isBinaryDataURL = parsedUrl.protocol === 'data:';
          if (!isBinaryDataURL) {
            if (!qp || qp.length === 0) {
              qp = '?lang=' + lang;
            } else {
              qp += '&lang=' + lang;
            }
          }
          parsedUrl.search = qp;
          return parsedUrl.href;
        }.property(),

        controllerBinding: '*parentView.controller',

        _previousValue: null,

        // Setup iframePhone communication with the child iframe before it loads, so that connection
        // (iframe src will change when 'value' changes, but observers fire before bindings are synced)
        valueDidChange: function () {
          var tValue = this.get('value');
          var controller = this.parentView.get('controller');

          if (tValue !== this._previousValue) {
            controller.setUpChannels(this.$('iframe')[0], tValue);
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
