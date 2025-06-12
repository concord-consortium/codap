//                          DG.DragBorderView
//
//  Views for managing component resizing
//
//  Author:   William Finzer / Kirk Swenson
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

var kMinComponentSize = 50,
    kMaxComponentSize = Number.MAX_VALUE,
    kRightBorderCursor = SC.Cursor.create({cursorStyle: SC.E_RESIZE_CURSOR}),
    kBottomBorderCursor = SC.Cursor.create({cursorStyle: SC.S_RESIZE_CURSOR}),
    kLeftBorderCursor = SC.Cursor.create({cursorStyle: SC.W_RESIZE_CURSOR}),
    kBottomLeftBorderCursor = SC.Cursor.create({cursorStyle: SC.SW_RESIZE_CURSOR}),
    kBottomRightBorderCursor = SC.Cursor.create({cursorStyle: SC.SE_RESIZE_CURSOR});

/** @class

    DragBorderView is typically a thin view configured to lie on the border of a component
 view. It implements the dragging functionality except for the actual change in the
 frame's layout.

 @extends SC.View
 */
DG.DragBorderView = SC.View.extend(
    (function () {

      return {
        /** @scope DG.DragBorderView.prototype */
        cursor: function () {
          if (this.canBeDragged())
            return this.dragCursor;
          else
            return null;
        }.property('dragCursor').cacheable(),
        isResizableDidChange: function() {
          this.set('isVisible', this.canBeDragged());
        }.observes('parentView.isResizable'),
        mouseDown: function (evt) {
          if (evt.button === 2 || evt.ctrlKey) {
            return NO;
          }
          DG.globalEditorLock.commitCurrentEdit();
          var tView = this.viewToDrag(),
              tParentView = tView.get('parentView');
          // Make sure the enclosing view will be movable
          DG.ViewUtilities.convertViewLayoutToAbsolute(tView);
          // A click on a border should bring the view to the front
          tView.select();
          if (!this.canBeDragged())
            return NO;  // We won't get other events either
          if( tParentView.coverUpComponentViews)
            tParentView.coverUpComponentViews('cover');

          var layout = this.viewToDrag().get('layout');
          this._mouseDownInfo = {
            pageX: evt.pageX, // save mouse pointer loc for later use
            pageY: evt.pageY, // save mouse pointer loc for later use
            left: layout.left,
            top: layout.top,
            height: layout.height,
            width: layout.width
          };
/*  We don't want to send this notification because we might only click and not drag.
          var tViewToDrag = this.viewToDrag();
          DG.currDocumentController().notificationManager.sendNotification({
            action: 'notify',
            resource: 'component',
            values: {
              operation: 'beginMoveOrResize',
              type: tViewToDrag.getPath('controller.model.type'),
              id: tViewToDrag.getPath('controller.model.id')
            }
          });
*/
          tView.get('controller').updateModelLayout();
          return YES; // so we get other events
        },

        mouseUp: function (evt) {
          var tViewToDrag = this.viewToDrag(),
              tComponentID = tViewToDrag.getPath('controller.model.id'),
              tContainer = tViewToDrag.get('parentView'),
              tOldLayout = this._mouseDownInfo,
              tNewLayout = tViewToDrag.get('layout'),
              isResize = (!SC.none(this.getPath('cursor.cursorStyle'))) && this.getPath('cursor.cursorStyle').indexOf('-resize') !== -1;
          // apply one more time to set final position
          this.mouseDragged(evt);
          this._mouseDownInfo = null; // cleanup info
          if( tContainer.coverUpComponentViews) {
            tContainer.coverUpComponentViews('uncover');
            tContainer.updateFrame();
          }
          if ((tOldLayout.left !== tNewLayout.left) || (tOldLayout.top !== tNewLayout.top) ||
              (tOldLayout.height !== tNewLayout.height) || (tOldLayout.width !== tNewLayout.width)) {

            DG.UndoHistory.execute(DG.Command.create({
              name: (isResize ? 'component.resize' : 'component.move'),
              undoString: (isResize ? 'DG.Undo.componentResize' : 'DG.Undo.componentMove'),
              redoString: (isResize ? 'DG.Redo.componentResize' : 'DG.Redo.componentMove'),
              executeNotification: {
                action: 'notify',
                resource: 'component',
                values: {
                  operation: isResize ? 'resize' : 'move',
                  type: tViewToDrag.getPath('controller.model.type'),
                  id: tComponentID,
                  title: tViewToDrag.getPath('controller.model.title')
                }
              },
              log: '%@ component "%@"'.fmt((isResize ? 'Resized' : 'Moved'), tViewToDrag.get('title')),
              _componentId: tViewToDrag.getPath('controller.model.id'),
              _controller: function () {
                return DG.currDocumentController().componentControllersMap[this._componentId];
              },
              _oldLayout: null,
              execute: function () {
                this._oldLayout = this._controller().updateModelLayout();
                if (!this._oldLayout) {
                  this.causedChange = false;
                }
              },
              undo: function () {
                if( !tViewToDrag)
                  return; // got nulled out because redo wasn't possible
                var layout = SC.clone(this._oldLayout);
                if (tViewToDrag.isMinimized()) {
                  this._oldHeight = this._oldLayout.height;
                  layout.height = 25;
                }
                tViewToDrag.animate(layout,
                    {duration: 0.4, timing: 'ease-in-out'},
                    function () {
                      // bizarre bug leaves the last animated transition property still
                      // with a delay even after the end of an animation, so we clear it by hand
                      tViewToDrag._view_layer.style.transition = "";
                      // set actual model layout once animation has completed
                      this._oldLayout = this._controller().revertModelLayout(layout);
                      tContainer.updateFrame();
                    }.bind(this));
                if (DG.KEEP_IN_BOUNDS_PREF) {
                  tViewToDrag.configureViewBoundsLayout({height:layout.height,
                                             width:layout.width,
                                             x:layout.left,
                                             y:layout.top});
                }
              },
              redo: function () {
                var layout = SC.clone(this._oldLayout);
                var documentController = DG.currDocumentController();
                var component = documentController.componentControllersMap[tComponentID];
                if(component) {
                  tViewToDrag = component.get('view');
                  if (tViewToDrag.isMinimized()) {
                    layout.height = 25;
                  }
                  tViewToDrag.animate(layout,
                      {duration: 0.4, timing: 'ease-in-out'},
                      function () {
                        tViewToDrag._view_layer.style.transition = "";
                        this._oldLayout = this._controller().revertModelLayout(this._oldLayout);
                        tContainer.updateFrame();
                      }.bind(this));
                  if (DG.KEEP_IN_BOUNDS_PREF) {
                    tViewToDrag.configureViewBoundsLayout({
                      height: layout.height,
                      width: layout.width,
                      x: layout.left,
                      y: layout.top
                    });
                  }
                }
                else  // Probably trying to work with a component that has been-recreated. Bail.
                  tViewToDrag = null; // So undo will be a no-op
              }
            }));
          }
          if (DG.KEEP_IN_BOUNDS_PREF) {
            DG.currDocumentController().computeScaleBounds();
          }
          return YES; // handled!
        },

        mouseDragged: function (evt) {
          var info = this._mouseDownInfo;

          if (info) {
            this.dragAdjust(evt, info);
            return YES; // event was handled!
          }
          else
            return NO;
        },
        touchStart: function (evt) {
          return this.mouseDown(evt);
        },
        touchEnd: function (evt) {
          return this.mouseUp(evt);
        },
        touchesDragged: function (evt, touches) {
          return this.mouseDragged(evt);
        },
        dragAdjust: function (evt, info) {
          // default is to do nothing
        },
        viewToDrag: function () {
          return DG.ComponentView.findComponentViewParent(this);
        },
        getContainerWidth: function () {
          return $('#codap').width();
        },
        getContainerHeight: function () {
          var tDocView = this.viewToDrag();
          while (!SC.none(tDocView.parentView.parentView)) {
            tDocView = tDocView.parentView;
          }
          return $('#codap').height() - tDocView.get('frame').y;
        }
      };
    }())
);

DG.DragLeftBorderView = DG.DragBorderView.extend({
  dragCursor: kLeftBorderCursor,
  canBeDragged: function() {
    var tCanBeDragged = this.getPath('parentView.isWidthResizable');
    return tCanBeDragged;
  },
  dragAdjust: function (evt, info) {
    var tMaxWidth = this.parentView.get('contentMaxWidth') || kMaxComponentSize,
        tMinWidth = this.get('contentMinWidth') || kMinComponentSize,
        tContainerWidth = this.getContainerWidth();
    if (DG.KEEP_IN_BOUNDS_PREF) {
      evt.pageX = Math.max(0, evt.pageX);
    }
    var tNewWidth = DG.ViewUtilities.roundToGrid(info.width - (evt.pageX - info.pageX)),
        tLoc;
    tNewWidth = Math.min(Math.max(tNewWidth, tMinWidth), tMaxWidth);
    tLoc = info.left + info.width - tNewWidth;
    if (tLoc < tContainerWidth - tMinWidth) {
      this.parentView.adjust('width', tNewWidth);
      this.parentView.adjust('left', tLoc);
    }
    if (DG.KEEP_IN_BOUNDS_PREF) {
      var tInBoundsScaling = DG.currDocumentController().get('inBoundsScaling'),
          tScaleFactor = tInBoundsScaling.scaleFactor;
      this.parentView.originalLayout.width = tNewWidth / tScaleFactor;
      this.parentView.originalLayout.left = tLoc / tScaleFactor;
    }
  }
});

DG.DragRightBorderView = DG.DragBorderView.extend({
  dragCursor: kRightBorderCursor,
  canBeDragged: function() {
    var tCanBeDragged = this.getPath('parentView.isWidthResizable');
    return tCanBeDragged;
  },
  dragAdjust: function (evt, info) {
    // Don't let user drag right edge off left of window
    var tMinWidth = this.get('contentMinWidth') || kMinComponentSize,
        tLoc = Math.max(evt.pageX, tMinWidth),
        tNewWidth = DG.ViewUtilities.roundToGrid(info.width + (tLoc - info.pageX)),
        tMaxWidth = this.parentView.get('contentMaxWidth') || kMaxComponentSize,
        tContainerWidth = this.getContainerWidth();
    if (DG.KEEP_IN_BOUNDS_PREF) {
      var tInspectorDimensions = this.parentView.getInspectorDimensions();
      tMaxWidth = Math.min(tMaxWidth, tContainerWidth - (info.left + tInspectorDimensions.width));
    }
    // Don't let width of component become too small
    tNewWidth = Math.min(Math.max(tNewWidth, tMinWidth), tMaxWidth);
    this.parentView.adjust('width', tNewWidth);
    if (DG.KEEP_IN_BOUNDS_PREF) {
      var tInBoundsScaling = DG.currDocumentController().get('inBoundsScaling'),
          tScaleFactor = tInBoundsScaling.scaleFactor;
      this.parentView.originalLayout.width = tNewWidth / tScaleFactor;
    }
  }
});

DG.DragBottomBorderView = DG.DragBorderView.extend({
  dragCursor: kBottomBorderCursor,
  canBeDragged: function() {
    var tCanBeDragged = this.getPath('parentView.isHeightResizable');
    return tCanBeDragged;
  },
  dragAdjust: function (evt, info) {
    var tMinHeight = this.get('contentMinHeight') || kMinComponentSize,
        tMaxHeight = this.get('contentMaxHeight') || kMaxComponentSize,
        tNewHeight = info.height + (evt.pageY - info.pageY),
        tContainerHeight = this.getContainerHeight();
    if (DG.KEEP_IN_BOUNDS_PREF) {
      tMaxHeight = Math.min(tMaxHeight, tContainerHeight - info.top);
    }
    tNewHeight = DG.ViewUtilities.roundToGrid(Math.min(
        Math.max(tNewHeight, tMinHeight), tMaxHeight));
    this.parentView.adjust('height', tNewHeight);
    if (DG.KEEP_IN_BOUNDS_PREF) {
      var tInBoundsScaling = DG.currDocumentController().get('inBoundsScaling'),
          tScaleFactor = tInBoundsScaling.scaleFactor;
      this.parentView.originalLayout.height = tNewHeight / tScaleFactor;
    }
  }
});

DG.DragBottomLeftBorderView = DG.DragBorderView.extend({
  dragCursor: kBottomLeftBorderCursor,
  canBeDragged: function() {
    var tCanBeDragged = this.getPath('parentView.isWidthResizable') ||
        this.getPath('parentView.isHeightResizable');
    return tCanBeDragged;
  },
  dragAdjust: function (evt, info) {
    // Don't let user drag right edge off left of window
    var tMinHeight = this.get('contentMinHeight') || kMinComponentSize,
        tMaxHeight = this.get('contentMaxHeight') || kMaxComponentSize,
        tMinWidth = this.get('contentMinWidth') || kMinComponentSize,
        tLoc = Math.max(evt.pageX, tMinWidth),
        tNewWidth = DG.ViewUtilities.roundToGrid(info.width - (evt.pageX - info.pageX)),
        tNewHeight = DG.ViewUtilities.roundToGrid(info.height + (evt.pageY - info.pageY)),
        tMaxWidth = this.parentView.get('contentMaxWidth') || kMaxComponentSize,
        tContainerWidth = this.getContainerWidth(),
        tContainerHeight = this.getContainerHeight();
    if (DG.KEEP_IN_BOUNDS_PREF) {
      tMaxHeight = tContainerHeight - info.top;
      var tInspectorDimensions = this.parentView.getInspectorDimensions();
      tMaxWidth = Math.min(tMaxWidth, tContainerWidth - (info.left + tInspectorDimensions.width));
    }
    if( !this.getPath('parentView.isWidthResizable'))
      tNewWidth = info.width; // No change
    else {
      // Don't let width or height of component become too small
      tNewWidth = Math.min(Math.max(tNewWidth, tMinWidth), tMaxWidth);
      tLoc = info.left + info.width - tNewWidth;
      if (tLoc < tContainerWidth - tMinWidth) {
        this.parentView.adjust('width', tNewWidth);
        this.parentView.adjust('left', tLoc);
      }
    }
    if( !this.getPath('parentView.isHeightResizable'))
      tNewHeight = info.height;
    else {
      tNewHeight = Math.min(Math.max(tNewHeight, tMinHeight), tMaxHeight);
      this.parentView.adjust('height', tNewHeight);
    }
    if (DG.KEEP_IN_BOUNDS_PREF) {
      var tInBoundsScaling = DG.currDocumentController().get('inBoundsScaling'),
          tScaleFactor = tInBoundsScaling.scaleFactor;
      this.parentView.originalLayout.height = tNewHeight / tScaleFactor;
      this.parentView.originalLayout.width = tNewWidth / tScaleFactor;
    }
  }
});

DG.DragBottomRightBorderView = DG.DragBorderView.extend({
  dragCursor: kBottomRightBorderCursor,
  canBeDragged: function() {
    var tCanBeDragged = this.getPath('parentView.isWidthResizable') ||
        this.getPath('parentView.isHeightResizable');
    return tCanBeDragged;
  },
  dragAdjust: function (evt, info) {
    // Don't let user drag right edge off left of window
    var tMinHeight = this.get('contentMinHeight') || kMinComponentSize,
        tMaxHeight = this.get('contentMaxHeight') || kMaxComponentSize,
        tMinWidth = this.get('contentMinWidth') || kMinComponentSize,
        tLoc = Math.max(evt.pageX, tMinWidth),
        tNewWidth = DG.ViewUtilities.roundToGrid(info.width + (tLoc - info.pageX)),
        tNewHeight = DG.ViewUtilities.roundToGrid(info.height + (evt.pageY - info.pageY)),
        tMaxWidth = this.parentView.get('contentMaxWidth') || kMaxComponentSize,
        tContainerWidth = this.getContainerWidth(),
        tContainerHeight = this.getContainerHeight();
    if (DG.KEEP_IN_BOUNDS_PREF) {
      tMaxHeight = tContainerHeight - info.top;
      var tInspectorDimensions = this.parentView.getInspectorDimensions();
      tMaxWidth = Math.min(tMaxWidth, tContainerWidth - (info.left + tInspectorDimensions.width));
    }
    if( !this.getPath('parentView.isWidthResizable'))
      tNewWidth = info.width; // No change
    else {
      // Don't let width or height of component become too small
      tNewWidth = Math.min(Math.max(tNewWidth, tMinWidth), tMaxWidth);
      this.parentView.adjust('width', tNewWidth);
    }
    if( !this.getPath('parentView.isHeightResizable'))
      tNewHeight = info.height; // No change
    else {
      tNewHeight = Math.min(Math.max(tNewHeight, tMinHeight), tMaxHeight);
      this.parentView.adjust('height', tNewHeight);
    }
    if (DG.KEEP_IN_BOUNDS_PREF) {
      var tInBoundsScaling = DG.currDocumentController().get('inBoundsScaling'),
          tScaleFactor = tInBoundsScaling.scaleFactor;
      this.parentView.originalLayout.height = tNewHeight / tScaleFactor;
      this.parentView.originalLayout.width = tNewWidth / tScaleFactor;
    }
  }
});
