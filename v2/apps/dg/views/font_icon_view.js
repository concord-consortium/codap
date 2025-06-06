// ==========================================================================
//                              DG.FontIconView
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

    A simple view class to display an icon embedded as a character in a font.

 @extends SC.View
 */
DG.FontIconView = SC.View.extend(
    /** @scope DG.FontIconView.prototype */ {

      iconClass: null,

      init: function() {
        sc_super();
      },

      /**
       Install the toolTip and alternate text at render time.
       @param {SC.RenderContext} context the render context instance
       */
      render: function (iContext) {
        iContext.push('<span class="' + this.get('iconClass') + '"></span>');
      }
    });

