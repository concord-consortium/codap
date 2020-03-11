// ==========================================================================
//                          DG.InspectorView
// 
//  An inspector that reconfigures based on selected tile
//  
//  Author:   William Finzer
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

sc_require('views/draggable_view');
/** @class

    InspectorView floats above tiles, pinned to the right edge. I reconfigures based on
 currently selected tile.

 @extends DG.DraggableView
 */
DG.InspectorView = DG.DraggableView.extend(
    /** @scope DG.InspectorView.prototype */
    (function () {
      var kAnimationTime = 0.2,
          kCollapsedWidth = 0,
          kExpandedWidth = 50,
          kCellHeight = 50,
          kDefaultIconSize = 32,
          kPadding = (kCellHeight - kDefaultIconSize) / 2;
      return {
        classNames: ['dg-inspector-palette', 'dg-inspector-view'],
        transitionIn: SC.View,
        isResizable: false,
        isClosable: false,

        componentContainer: null,
        targetComponent: null,

        init: function () {
          sc_super();
          this.set('layout', { height: kCellHeight, width: kCollapsedWidth});
          this.selectedComponentDidChange();
        },

        adjustLayout: function () {
          var tChildren = this.get('childViews'),
              tCurrTop = kPadding;
          tChildren.forEach(function (iChild, iIndex) {
            if (iChild.get('isVisible')) {
              iChild.adjust({top: tCurrTop, left: (kCellHeight - iChild.iconExtent.width) / 2});
              tCurrTop += iChild.iconExtent.height + 2 * kPadding;
            }
          });
          this.animate('height', Math.max(kCellHeight, tCurrTop - kPadding), kAnimationTime,
                        function() { this.invokeLater(this.scrollToVisible); }.bind(this));
        },

        targetComponentDidChange: function () {

          var removeChildren = function () {
                var tChildren = this.get('childViews'),
                    tChild;
                // We call removeChild for each member of the array. This has the side effect of modifying the array
                                                  // eslint-disable-next-line no-cond-assign
                while (tChild = tChildren[0]) {   // jshint ignore:line
                  this.removeChild(tChild);
                }
              }.bind(this);

          var tTarget = this.get('targetComponent');
          if (tTarget) {
            tTarget.addObserver('layout', this, 'targetLayoutDidChange');
          }
          this.targetLayoutDidChange();
          this.get('childViews').forEach( function( iChild) {
            iChild.removeObserver( 'isVisible', this, 'adjustLayout');
          }.bind(this));
          removeChildren();
          this.inspectorButtonsDidChange();
        }.observes('targetComponent'),

        selectedComponentDidChange: function () {
          var tTarget = this.get('targetComponent');
          if (tTarget) {
            tTarget.removeObserver('layout', this, 'targetLayoutDidChange');
          }
          this.set('targetComponent', this.getPath('componentContainer.selectedChildView'));
        }.observes('*componentContainer.selectedChildView'),

        targetLayoutDidChange: function () {
          var tTargetFrame = this.getPath('targetComponent.frame');
          if (tTargetFrame) {
            this.adjust('top', tTargetFrame.y);
            this.adjust('left', tTargetFrame.x + tTargetFrame.width);
          }
        },

        inspectorButtonsDidChange: function () {
          var tWidth,
              tButtons = this.getPath('targetComponent.inspectorButtons');
          if (tButtons && tButtons.length > 0) {
            tButtons.forEach(function (iButton) {
              this.appendChild(iButton);
              iButton.addObserver('isVisible', this, 'adjustLayout');
            }.bind(this));
            tWidth = kExpandedWidth;
          }
          else {
            tWidth = kCollapsedWidth;
          }
          this.animate('width', tWidth, kAnimationTime, this, 'adjustLayout');
        }.observes('*targetComponent.inspectorButtons'),

        /**
         * Called during drag
         * @param iEvent
         * @param iInfo {pageX: mouse starting X
                         pageY: pageY, mouse starting Y
                         left: original layout.left
                         top: original layout.top,
                         height: original layout.height,
                         width: original layout.width }
         */
        dragAdjust: function (iEvent, iInfo) {
          var tTargetFrame = this.getPath('targetComponent.frame'),
              tMouseMovedY = iEvent.pageY - iInfo.pageY,
              tNewTop = iInfo.top + tMouseMovedY;
          tNewTop = Math.max(tTargetFrame.y, tNewTop);
          tNewTop = Math.min(tNewTop, tTargetFrame.y + tTargetFrame.height);
          this.adjust('top', tNewTop);
        }

      };  // object returned closure
    }()) // function closure
);

