// ==========================================================================
//                          DG.DraggableView
// 
//  A View that can be dragged
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

/** @class

    DraggableView is typically a thin view configured to lie on the border of a component
 view. It implements the dragging functionality except for the actual change in the
 frame's layout.

 @extends SC.View
 */
DG.DraggableView = SC.View.extend(
    (function () {

      return {
        /** @scope DG.DraggableView.prototype */
        classNames: 'dg-draggable'.w(),

        mouseDown: function (iEvent) {
          DG.globalEditorLock.commitCurrentEdit();

          var tLayout = this.get('layout');
          this._mouseDownInfo = {
            pageX: iEvent.pageX, // save mouse pointer loc for later use
            pageY: iEvent.pageY, // save mouse pointer loc for later use
            left: tLayout.left,
            top: tLayout.top,
            height: tLayout.height,
            width: tLayout.width
          };
          return YES; // so we get other events
        },

        mouseUp: function (iEvent) {
          // apply one more time to set final position
          this.mouseDragged(iEvent);
          this._mouseDownInfo = null; // cleanup info
          return YES; // handled!
        },

        mouseDragged: function (iEvent) {
          var info = this._mouseDownInfo;

          if (info) {
            this.dragAdjust(iEvent, info);
            return YES; // event was handled!
          }
          else
            return NO;
        },
        touchStart: function (iEvent) {
          return this.mouseDown(iEvent);
        },
        touchEnd: function (iEvent) {
          return this.mouseUp(iEvent);
        },
        touchesDragged: function (iEvent, touches) {
          return this.mouseDragged(iEvent);
        },
        dragAdjust: function (iEvent, info) {
          // default is to do nothing
        }
      };
    }())
);
