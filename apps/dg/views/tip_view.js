// ==========================================================================
//                          DG.TipView
// 
//  A simple view for displaying a tip during a drag.
//  There is one global instance.
//  
//  Author:   William Finzer
//
//  Copyright (c) 2020 by The Concord Consortium, Inc. All rights reserved.
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

    DG.TipView displays text in a popup LabelView

 */
DG.TipView = SC.LabelView.extend(
    /** @scope DG.TipView.prototype */ {
      classNames: 'dg.tipview'.w(),

      isEditable: false,

      localize: true,


    });