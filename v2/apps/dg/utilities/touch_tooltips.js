// ==========================================================================
//                          DG.TouchTooltips
//
//  Utility class to support tooltips on touch-hold gestures.
//
//  Author:   Kirk Swenson
//
//  Copyright (c) 2018 by The Concord Consortium, Inc. All rights reserved.
//
//  Permission is hereby granted, free of charge, to any person obtaining a
//  copy of this software and associated documentation files (the "Software"),
//  to deal in the Software without restriction, including without limitation
//  the rights to use, copy, modify, merge, publish, distribute, sublicense,
//  and/or sell copies of the Software, and to permit persons to whom the
//  Software is furnished to do so, subject to the following conditions:
//
//  The above copyright notice and this permission notice shall be included
//  in all copies or substantial portions of the Software.
//
//  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
//  OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
//  THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
//  IN THE SOFTWARE.
// ==========================================================================
/* global Tooltip */

DG.TouchTooltips = (function() {

  var kTouchTooltipDefault = 5000,
      kTouchTooltipMax = 8000,

      tooltips = {};

  return {
    showTouchTooltip: function(touch, triggerView, title, placement) {
      var touchID = touch.identifier,
          layer = triggerView instanceof SC.View
                    ? triggerView.get('layer')
                    : triggerView,
          container = DG.mainPage.getPath('mainPane.layer'),
          _placement = placement || 'top-start',
          tooltip = new Tooltip(layer, {
                                  boundariesElement: container,
                                  container: container,
                                  placement: _placement,
                                  trigger: 'manual',
                                  title: title
                                });

      DG.TouchTooltips.hideAllTouchTooltips();

      tooltip.show();
      tooltips[touchID] = { touch: touch, tooltip: tooltip };

      DG.TouchTooltips.hideTouchTooltip(touchID, kTouchTooltipMax);

      return touchID;
    },

    hideTouchTooltip: function(touchID, delay) {
      var entry = tooltips[touchID],
          hideTooltip = function() {
            var entry = tooltips[touchID];
            if (entry) {
              if (entry.tooltip) {
                entry.tooltip.dispose();
                entry.tooltip = null;
              }
              entry.timer = null;
              if (entry.finished)
                delete tooltips[touchID];
            }
          };
      if (!entry) return;
      
      if (entry.timer) {
        clearTimeout(entry.timer);
        entry.timer = null;
      }

      if (delay == null) delay = kTouchTooltipDefault;
      if (delay) {
        entry.timer = setTimeout(hideTooltip, delay);
      }
      else {
        hideTooltip();
      }
    },

    clearTouchTooltip: function(touchID) {
      var entry = tooltips[touchID];
      if (entry) {
        entry.finished = true;
        DG.TouchTooltips.hideTouchTooltip(touchID);
        return true;
      }
      return false;
    },

    hideAllTouchTooltips: function() {
      DG.ObjectMap.forEach(tooltips,
                          function(touchID) {
                            DG.TouchTooltips.hideTouchTooltip(touchID, 0);
                          });
    }

  };
})();
