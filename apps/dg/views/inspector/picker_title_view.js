// ==========================================================================
//                              DG.PickerTitleView
// 
//  DG.PickerTitleView lays out a small icon and text at the top of a PickerPane
//  that pops up from the inspector view.
//  
//  Authors:  William Finzer
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

/** @class

    A PickerTitleView displays a small icon on the left next to a LabelView.

 @extends SC.View
 */
DG.PickerTitleView = SC.View.extend(
    /** @scope DG.PickerTitleView.prototype */ {

      /**
       URL of the icon to display
       @property {String}
       */
      iconURL: null,

      /**
       The text to display
       @property {SC.String}
       */
      title: null,

      layout: {height: 26, right: 0},

      childViews: 'iconView titleView'.w(),

      iconView: SC.ImageView.extend(
          {
            classNames: 'dg-inspector-picker-icon'.w(),
            layout: {width: 18, height: 18}
          }
      ),

      titleView: SC.LabelView.extend({
        classNames: 'dg-inspector-picker-title'.w(),
        layout: {left: 27},
        localize: true
      }),

      init: function () {
        sc_super();
        this.setPath('iconView.value', this.get('iconURL'));
        this.setPath('titleView.value', this.get('title'));
      }
    });

