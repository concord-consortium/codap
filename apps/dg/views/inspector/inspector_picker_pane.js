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

      isModal: false,

      init: function () {
        sc_super();
        DG.mainPage.mainPane.set('inspectorPicker', this);
      }
    });

