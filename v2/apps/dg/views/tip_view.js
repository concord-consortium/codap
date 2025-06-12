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
      classNames: 'dg-tipview'.w(),

      isEditable: false,

      localize: true,

      show: function( iWindowLocation, iText) {
        var this_ = this,
            kWidth = 200,
            tViewLocation = DG.ViewUtilities.windowToViewCoordinates(iWindowLocation, this.get('parentView')),
            tParentFrame = this.getPath('parentView').clippingFrame(),
            tHeight;
        this_.set('value', iText);
        this_.adjust({left: 0, top: -500, width: kWidth, height: 0, opacity: 0 });
        this_.set('isVisible', true);
        this.invokeLater( function() {
          tHeight = this_._view_layer.scrollHeight;
          tViewLocation.x = Math.min(tViewLocation.x, tParentFrame.x + tParentFrame.width - kWidth);
          tViewLocation.y = Math.min(tViewLocation.y, tParentFrame.y + tParentFrame.height - tHeight);
          this_.set('isVisible', false);
          this_.adjust({left: tViewLocation.x, top: tViewLocation.y});
          this_.set('isVisible', true);
          this_.animate({height: tHeight - 10, opacity: 1},
              {duration: 0.5, delay: 0.25, timing: 'ease-in-out'});
        }, 10);
      },

      hide: function() {
        this.set('isVisible', false);
      }

    });