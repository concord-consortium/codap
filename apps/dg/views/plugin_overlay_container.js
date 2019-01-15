// ==========================================================================
//                          DG.PluginOverlayContainer
//
//  A View that can be dragged
//
//  Author:   Takahiko Tsuchiya
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


/**
 * @class DG.PluginOverlayContainer A dummy view that handles overlay elements and drag events for plugin iframes.
 */
DG.PluginOverlayContainer = SC.View.extend({
  overlayPanes: [],

  isVisibleInWindow: true,

  isDropTarget: YES,
  isDropEnabled: YES,

  acceptDragOperation: function() {
    return YES;
  },

  dragStarted: function (iDrag, iEvent) {
    var iFrames = document.getElementsByTagName("iframe");

    // Do not include the Google Analytics iframe.
    iFrames = Array.from(iFrames).filter(function (iframe) {
      return !iframe.id.includes('apiproxy');
    });

    for (var i = 0; i < iFrames.length; i++) {
      var iFrame = iFrames[i];
      var iFrameRect = iFrame.getBoundingClientRect();

      var overlayPane = SC.Pane.extend({
        context: iDrag.getPath('data.context'),

        layout: {
          top: iFrameRect.top,
          left: iFrameRect.left,
          height: iFrameRect.height,
          width: iFrameRect.width
        },

        targetIFrame: iFrame,

        dragData: null,

        isVisible: true,
        isVisibleInWindow: true,

        isDropTarget: YES,
        isDropEnabled: YES,

        acceptDragOperation: function() {
          return YES;
        },

        dragEntered: function (iDrag) {
          this.targetIFrame.contentWindow.postMessage({
            action: 'dragenter',
            values: this.formatDragData(iDrag.data)
          }, '*');
        },

        dragExited: function (iDrag) {
          this.targetIFrame.contentWindow.postMessage({
            action: 'dragleave',
            values: this.formatDragData(iDrag.data)
          }, '*');
        },

        formatDragData: function (iDragData) {
          return {
            text: iDragData.text,
            attribute: {
              id: iDragData.attribute.get('id'),
              name: iDragData.attribute.get('name'),
              title: iDragData.attribute.get('title')
            },
            collection: {
              id: iDragData.collection.get('id'),
              name: iDragData.collection.get('name'),
              title: iDragData.collection.get('title')
            },
            context: {
              id: iDragData.context.get('id'),
              name: iDragData.context.get('name'),
              title: iDragData.context.get('title')
            }
          };
        },

        dragUpdated: function (iDrag) {
          var iFrameRect = this.targetIFrame.getBoundingClientRect();
          var x = iDrag.getPath('location.x');
          var y = iDrag.getPath('location.y');

          // TODO: use drag enter / exit info?
          if (x >= iFrameRect.left && x <= iFrameRect.right && y >= iFrameRect.top && y <= iFrameRect.bottom) {
            var data = this.formatDragData(iDrag.data);

            this.targetIFrame.contentWindow.postMessage({
              action: 'drag',
              position: {
                x: x - iFrameRect.left,
                y: y - iFrameRect.top
              },
              values: data
            }, '*');
          }
        },

        isValidAttribute: function (iDrag) {
          var tDragAttr = iDrag.data.attribute;
          var tAttrs = this.get('context').getAttributes();
          return tAttrs.indexOf(tDragAttr) >= 0;
        },

        computeDragOperations: function (iDrag) {
          return this.isValidAttribute(iDrag) ? SC.DRAG_LINK : SC.DRAG_NONE;
        },

        performDragOperation: function (iDrag) {
          var iFrameRect = this.targetIFrame.getBoundingClientRect();
          var x = iDrag.getPath('location.x');
          var y = iDrag.getPath('location.y');

          if (x >= iFrameRect.left && x <= iFrameRect.right && y >= iFrameRect.top && y <= iFrameRect.bottom) {
            var data = this.formatDragData(iDrag.data);

            this.targetIFrame.contentWindow.postMessage({
              action: 'drop',
              position: {
                x: x - iFrameRect.left,
                y: y - iFrameRect.top
              },
              values: data
            }, '*');
          }
          return SC.DRAG_LINK;
        },

        dragStarted: function (iDrag) {
          this.targetIFrame.contentWindow.postMessage({
            action: 'dragstart',
            values: this.formatDragData(iDrag.data)
          }, '*');
        },

        dragEnded: function (iDrag) {
          this.targetIFrame.contentWindow.postMessage({
            action: 'dragend',
            values: this.formatDragData(iDrag.data)
          }, '*');
        }
      }).create();

      overlayPane.appendTo(document.body);
      this.overlayPanes.pushObject(overlayPane);

      // Manually add to the global pool of the drop targets.
      iDrag._cachedDropTargets.pushObject(overlayPane);
      // DG.Drag.addDropTarget(overlayPane); // Does not work this way?

      // Since the overlay views are created after the global drag-event notifications, we have to manually invoke the drag operation on them.
      overlayPane.tryToPerform('dragStarted', iDrag, iEvent);
    }
  },

  dragEnded: function (iDrag, iEvent) {
    this.overlayPanes.forEach(function (overlayPane) {
      // Manually invoke the drag operation.
      overlayPane.tryToPerform('dragEnded', iDrag, iEvent);

      // This seems to conflict with something else (possibly the native cache clearing?)
      // iDrag._cachedDropTargets.removeObject(overlayPane);
      // DG.Drag.removeDropTarget(overlayPane); // Does not work.

      overlayPane.remove();
      overlayPane.destroy();
    }.bind(this));

    this.overlayPanes = [];
  }
});