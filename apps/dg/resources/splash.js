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

var splashPanel;
var kHeight = 200, kPadding = 20, kRatio = 1936 / 649;

DG.splash = SC.Object.create({

  isShowing: false,

  showSplash: function (hideSplashImage, timeOut) {
    if (hideSplashImage && DG.get('componentMode') !== 'yes') {
      if (this.get('isShowing')) {
        DG.splash.hideSplash();
      }
      splashPanel = SC.PanelPane.create({
        classNames: ['dg-splash'],
        layout: {width: 0, height: 0, left: -20, top: 0},
        contentView: null,
        close: function () {
          this.timer && this.timer.invalidate();
          this.destroy();
          DG.splash.set('isShowing', false);
        },
        timer: null,
        init: function () {
          if (timeOut) {
            this.timer = SC.Timer.schedule({
              interval: timeOut, action: DG.splash.hideSplash, target: this
            });
          }
        }
      }).append();
      this.set('isShowing', true);
    } else if (DG.Browser.isCompatibleBrowser()
          && !this.get('isShowing')
          && DG.get('componentMode') !== 'yes'
          && DG.get('hideSplashScreen') !== 'yes') {
      splashPanel = SC.PanelPane.create({
        classNames: ['dg-splash'],
        layout: { width: kRatio * kHeight + 2 * kPadding, height: kHeight + 2 * kPadding, centerX: 0, centerY: 0},
        contentView: SC.View.extend({
          childViews: 'splash spinner'.w(),
          backgroundColor: '#FFF',

          splash: SC.ImageView.extend({
            layout: { left: kPadding, right: kPadding, top: kPadding, bottom: kPadding},
            value: DG.get('splashURL'),
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
              window.setTimeout(function () {
                _this.set('isVisible', YES);
              }, 2000);
            },
            layout: {centerX: 0, bottom: kPadding + 6, height: 32, width: 32},
            value: static_url('images/spinner.gif'),
            canLoadInBackground: YES,
            useCanvas: NO,
            isVisible: NO
          })
        }),
        acceptsKeyPane: true,
        close: function () {
          this.destroy();
          DG.splash.set('isShowing', false);
        }
      }).append();
      splashPanel.contentView && splashPanel.contentView.becomeFirstResponder();
      this.set('isShowing', true);
    }
  },

  hideSplash: function() {
    if(splashPanel) { splashPanel.close(); }
  }

});


