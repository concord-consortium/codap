// ==========================================================================
//                              DG.splash
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

var tSplash;

DG.splash = SC.Object.create({

  isShowing: false,

  showSplash: function () {
    if (DG.Browser.isCompatibleBrowser() && !this.get('isShowing')) {
      var kHeight = 200,
          kPadding = 20,
          kRatio = 1936 / 649;
      tSplash = SC.PanelPane.create({
        classNames: ['dg-splash'],
        layout: {width: kRatio * kHeight + 2 * kPadding, height: kHeight + 2 * kPadding, centerX: 0, centerY: 0},
        contentView: SC.View.extend({
          childViews: 'splash spinner'.w(),
          backgroundColor: '#FFF',

          splash: SC.ImageView.extend({
            layout: { left: kPadding, right: kPadding, top: kPadding, bottom: kPadding },
            value: static_url('images/codap-splash-screen.png'),
            click: function () {
              DG.splash.hideSplash();
            },
            keyDown: function () {
              DG.splash.hideSplash();
            },
            acceptsFirstResponder: true
          }),

          spinner: SC.ImageView.extend({
            init: function () {
              sc_super();
              var _this = this;
              window.setTimeout(function() {
                _this.set('isVisible', YES);
              }, 2000);
            },
            layout: { centerX: 0, bottom: kPadding+6, height: 32, width: 32 },
            value: static_url('images/spinner.gif'),
            canLoadInBackground: YES,
            useCanvas: NO,
            isVisible: NO
          })
        }),
        acceptsKeyPane: true,
        close: function() {
          this.destroy();
          DG.splash.set('isShowing', false);
        }
      }).append();
      tSplash.contentView.becomeFirstResponder();
      this.set('isShowing', true);
    }
  },

  hideSplash: function() {
    if(tSplash) { tSplash.close(); }
  }

});


