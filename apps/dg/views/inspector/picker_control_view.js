// ==========================================================================
//                              DG.PickerControlView
// 
//  SC.PickerControlView lays out a label on the left, and a control on the right.
//  It's commonly used in Inspector Picker panes.
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

    A PickerControlView displays a LabelView on the left and control view on the right.

 @extends SC.View
 */
DG.PickerControlView = SC.View.extend(
    /** @scope DG.PickerControlView.prototype */ {

      /**
       Label displayed on the left
       @property {String}
       */
      label: null,

      toolTip: null,

      toolTipDidChange: function() {
        this.setPath('labelView.toolTip', this.get('toolTip'));
      }.observes('toolTip'),

      childViews: 'labelView controlView'.w(),

      labelView: SC.LabelView.extend({
        classNames: 'dg-inspector-picker-tag'.w(),
        localize: true
      }),

      /**
       @property {SC.View}
       */
      controlView: null,

      init: function () {
        sc_super();
        var tControlView = this.get('controlView');
        if (tControlView) {
          tControlView.adjust('right', 10);
        }
        this.setPath('labelView.value', this.get('label'));
        this.setPath('labelView.toolTip', this.get('toolTip'));
      }
    });

