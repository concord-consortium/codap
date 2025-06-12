// ==========================================================================
//                              DG.InspectorPickerPane
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

    DG.InspectorPickerPane adds functionality to SC.PickerPane so that it can
 appear non-modal in that clicks outside click through to other objects and
 the cursor responds to hovering over other objects, but a click outside
 removes the pane. This is done by registering with DG.MainPage.MainPane which
 will remove it on receiving a mouseDown.

 @extends SC.PickerPane
 */
DG.InspectorPickerPane = SC.PickerPane.extend(
    /** @scope DG.InspectorPickerPane.prototype */ {

      /**
       * We will set this to true if we find ourselves responding to a mousedown in this pickerpane's
       * icon button, so that this fact can be detected and we'll be left removed.
       */
      removedByClickInButton: false,

      isModal: false,
      acceptsKeyPane: false,  // So that we don't prevent text entry elsewhere

      init: function () {
        sc_super();
        DG.set('inspectorPicker', this);
        this.set('removeTarget', this);
      },
      popup: function () {
        var kLeading = 5,
            tHeight = 0;
        this.getPath('contentView.childViews').forEach(function (iView) {
          tHeight += iView.frame().height + kLeading;
        });
        this.adjust('height', tHeight);
        sc_super();
      },
      transitionIn: SC.View.SCALE_IN,
      removeAction: function () {
        console.log('removeAction');
      }
    });

/*
 * Closes any open inspector pane.
 * If no iClass is specified, returns true if an inspector was closed.
 * If iClass is specified, returns true if an inspector with the specified class was closed.
 */
DG.InspectorPickerPane.close = function (iClass) {
  var tInspectorPicker = DG.get('inspectorPicker'),
      hasClass = tInspectorPicker && (tInspectorPicker.get('buttonIconClass') === iClass);
  if (tInspectorPicker) {
    SC.run(function () {
      tInspectorPicker.remove();
      tInspectorPicker.destroy();
      DG.set('inspectorPicker', null);
    });
  }
  return (tInspectorPicker != null) && (!iClass || hasClass);
};
