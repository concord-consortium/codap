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

  destroy: function () {
    this.controller.gameViewWillClose();
    sc_super();
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
