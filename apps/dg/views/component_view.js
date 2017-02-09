// ==========================================================================
//                          DG.ComponentView
// 
//  Routines for changing coordinates along an animation path
//  
//  Author:   William Finzer
//
//  Copyright (c) 2014 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('views/titlebar_button_view');

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
        dragCursor: null,
        cursor: function () {
          if (this.parentView.get('isResizable'))
            return this.dragCursor;
          else
            return null;
        }.property('dragCursor').cacheable(),
        mouseDown: function (evt) {
          if( evt.button === 2 || evt.ctrlKey) {
            return NO;
          }
          DG.globalEditorLock.commitCurrentEdit();
          var tView = this.viewToDrag();
          // Make sure the enclosing view will be movable
          DG.ViewUtilities.convertViewLayoutToAbsolute(tView);
          // A click on a border should bring the view to the front
          tView.select();
          if (!this.canBeDragged())
            return NO;  // We won't get other events either
          tView.get('parentView').coverUpComponentViews('cover');

          var layout = this.viewToDrag().get('layout');
          this._mouseDownInfo = {
            pageX: evt.pageX, // save mouse pointer loc for later use
            pageY: evt.pageY, // save mouse pointer loc for later use
            left: layout.left,
            top: layout.top,
            height: layout.height,
            width: layout.width
          };
          tView.get('controller').updateModelLayout();
          return YES; // so we get other events
        },

        mouseUp: function (evt) {
          var tViewToDrag = this.viewToDrag(),
              tContainer = tViewToDrag.get('parentView'),
              tOldLayout = this._mouseDownInfo,
              tNewLayout = tViewToDrag.get('layout'),
              isResize = (!SC.none(this.getPath('cursor.cursorStyle'))) && this.getPath('cursor.cursorStyle').indexOf('-resize') !== -1;
          // apply one more time to set final position
          this.mouseDragged(evt);
          this._mouseDownInfo = null; // cleanup info
          tContainer.coverUpComponentViews('uncover');
          tContainer.updateFrame();
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
                  id: tViewToDrag.getPath('controller.model.id')
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
                    this._oldLayout.height = layout.height;
                    tContainer.updateFrame();
                  }.bind(this));
              },
              redo: function () {
                var layout = SC.clone(this._oldLayout);
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
              }
            }));
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
        canBeDragged: function () {
          return NO;  // default
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
          return window.innerWidth; // go global
        },
        getContainerHeight: function () {
          var tDocView = this.viewToDrag();
          while (!SC.none(tDocView.parentView.parentView)) {
            tDocView = tDocView.parentView;
          }
          return window.innerHeight - tDocView.get('frame').y;
        }
      };
    }())
);

/** @class

    ComponentView provides a draggable and resizable container for components such as plots and
 tables. The structure is as follows:
 - outerView
 - containerView is inset by the border width
 - titlebarView
 - contentView passed in by clients positioned under the titlebarView
 - 4 drag views laid on top of the containerView's borders and allowing resize

 @extends SC.View
 */
DG.ComponentView = SC.View.extend(
    /** @scope DG.ComponentView.prototype */
    (function () {
      var kTitleBarHeight = DG.ViewUtilities.kTitleBarHeight,
          kMinSize = 50,
          kMaxSize = Number.MAX_VALUE,
          kDragWidth = DG.ViewUtilities.kDragWidth,
          kBorderWidth = DG.ViewUtilities.kBorderWidth,
          kRightBorderCursor = SC.Cursor.create({cursorStyle: SC.E_RESIZE_CURSOR}),
          kBottomBorderCursor = SC.Cursor.create({cursorStyle: SC.S_RESIZE_CURSOR}),
          kLeftBorderCursor = SC.Cursor.create({cursorStyle: SC.W_RESIZE_CURSOR}),
          kCornerBorderCursor = SC.Cursor.create({cursorStyle: SC.SE_RESIZE_CURSOR})
          ;
      return {
        classNames: ['component-view'],
        classNameBindings: ['isSelected:component-view-selected'],
        isResizable: YES,
        isClosable: YES,
        showTitleBar: YES,

        /**
         * @property {DG.ComponentController}
         */
        controller: null,

        /**
         * @property {DG.ComponentModel}
         */
        model: null,

        /**
         * @property {Array of DG.InspectorButtonView}
         */
        inspectorButtonsBinding: SC.Binding.from('*controller.inspectorButtons').oneWay(),

        /**
         * Is this component view the one selected component view in the container?
         * @property {Boolean}
         */
        isSelected: false,

        isSelectedChanged: function () {
          this.setPath('containerView.titlebar.isSelected', this.get('isSelected'));
        }.observes('isSelected'),

        _modelSavedHeightBinding: SC.Binding.from('*model.savedHeight').oneWay(),

        isMinimized: function () {
          return !SC.none(this.get('_modelSavedHeight'));
        }.property('_modelSavedHeight'),

        init: function() {
          sc_super();
          if( !this.get('showTitleBar')) {
            this.getPath('containerView.titlebar').adjust('height', 0);
          }
        },

        contentView: SC.outlet('containerView.contentView'),
        childViews: 'containerView borderRight borderBottom borderLeft borderTop borderCorner'.w(),
        containerView: SC.View.design({
          layout: {left: 0, bottom: 0, right: 0},
          childViews: 'titlebar coverSheet'.w(),
          titlebar: DG.DragBorderView.design({
            layout: {height: kTitleBarHeight},
            classNames: ['titlebar'],
            isSelected: false,
            userEdit: false,
            classNameBindings: ['isSelected:titlebar-selected'],
            childViews: 'statusView versionView minimize closeBox titleView'.w(),
            titleView: SC.LabelView.design(DG.MouseAndTouchView, SC.AutoResize, {
              classNames: ['titleview'],
              classNameBindings: ['valueIsEmpty:titleview-empty'],
              isEditable: YES,
              exampleNode: null,
              _value: null,
              value: function (key, iValue) {
                if (!SC.none(iValue)) {
                  this._value = iValue;
                }
                return this._value;
              }.property(),
              inlineEditorWillBeginEditing: function (iEditor, iValue, iEditable) {
                sc_super();
                var tComponentView = DG.ComponentView.findComponentViewParent(this),
                    tParent = this.get('parentView'),
                    tFrame = tParent.get('frame'),
                    kXGap = 4, kYGap = 2,
                    tOrigin = DG.ViewUtilities.viewToWindowCoordinates({x: kXGap, y: kYGap}, tParent);
                tComponentView.select();
                tParent.set('userEdit', true);

                // SC 1.10 introduced a new inline editor model in which
                // an 'exampleNode' is used to adjust inline editor style.
                var exampleNode = this.get('exampleNode');
                if(!exampleNode) {
                  exampleNode = this.get('layer').cloneNode(false);
                  exampleNode.id = exampleNode.id + "-clone";
                  exampleNode.style.visibility = 'hidden';
                  exampleNode.style.textAlign = 'center';
                  exampleNode.className = exampleNode.className.replace('titleview', '');
                  tParent.get('layer').appendChild(exampleNode);
                  this.set('exampleNode', exampleNode);
                }
                exampleNode.style.left =   3 + 'px';
                exampleNode.style.top =   12 + 'px';

                iEditor.set({ exampleElement: exampleNode,
                              exampleFrame: {
                                x: tOrigin.x, y: tOrigin.y,
                                width: tFrame.width - 2 * kXGap, height: tFrame.height - 2 * kYGap
                              }});
              },
              valueChanged: function () {
                var tComponentView = DG.ComponentView.findComponentViewParent(this),
                    tParent = this.get('parentView'),
                    value = this.get('value'),
                    this_ = this;
                if (!tParent.userEdit) {
                  return;
                }
                if (tComponentView) {
                  tParent.userEdit = false;
                  DG.UndoHistory.execute(DG.Command.create({
                    name: 'component.titleChange',
                    undoString: 'DG.Undo.componentTitleChange',
                    redoString: 'DG.Redo.componentTitleChange',
                    execute: function () {
                      this._beforeStorage = tComponentView.getPath('model.title');
                      // If the title has already been changed (e.g. due to notification),
                      // then use the previous title for purposes of logging the change.
                      if (this._beforeStorage === value)
                        this._beforeStorage = tComponentView.getPath('model._prevTitle');
                      tComponentView.setPath('model.title', value);
                      this.log = "Change title '%@' to '%@'".fmt(this._beforeStorage, value);
                    },
                    undo: function () {
                      var prev = this._beforeStorage;
                      tComponentView.setPath('model.title', prev);
                      // we have to set this as well, as 'value' is not tightly bound
                      this_._value = prev;
                      this_.propertyDidChange('value');
                    },
                    redo: function() {
                      tComponentView.setPath('model.title', value);
                      // we have to set this as well, as 'value' is not tightly bound
                      this_._value = value;
                      this_.propertyDidChange('value');
                    }
                  }));
                }
                return true;
              }.observes('value'),
              doIt: function () {
                this.beginEditing();
              },
              valueIsEmpty: function () {
                return SC.empty(this.get('value'));
              }.property('.value')
            }),
            statusView: SC.LabelView.design({
              textAlign: SC.ALIGN_LEFT,
              classNames: ['dg-status-view'],
              layout: {left: 5},
              value: ''
            }),
            versionView: SC.LabelView.design({
              textAlign: SC.ALIGN_RIGHT,
              classNames: ['dg-version-view'],
              layout: {right: 2 * kTitleBarHeight, top: 5},
              value: ''
            }),
            minimize: DG.TitleBarMinimizeButton.design({
              layout: {right: kTitleBarHeight, top: 10, width: 24, height: kTitleBarHeight},
              classNames: ['dg-minimize-view'],
              isVisible: SC.platform.touch
            }),
            closeBox: DG.TitleBarCloseButton.design({
              layout: {right: 0, top: 4, width: kTitleBarHeight, height: kTitleBarHeight},
              classNames: ['dg-close-view'],
              isVisible: SC.platform.touch
            }),
            mouseEntered: function (evt) {
              this.setPath('minimize.isVisible', true);
              this.setPath('closeBox.isVisible', true);
              return YES;
            },
            mouseExited: function (evt) {
              this.setPath('minimize.isVisible', false);
              this.setPath('closeBox.isVisible', false);
              return YES;
            },
            dragAdjust: function (evt, info) {
              var tOuterView = this.viewToDrag(),
                  tX = DG.ViewUtilities.roundToGrid(info.left + (evt.pageX - info.pageX)),
                  tY = DG.ViewUtilities.roundToGrid(info.top + (evt.pageY - info.pageY)),
                  tContainerWidth = this.getContainerWidth(),
                  tContainerHeight = this.getContainerHeight();

              tX = Math.min(Math.max(tX, -info.width + kMinSize),
                  tContainerWidth - kMinSize);
              tOuterView.adjust('left', tX);

              tY = Math.min(Math.max(tY, -kTitleBarHeight / 2),
                  tContainerHeight - kTitleBarHeight / 2);
              tOuterView.adjust('top', tY);
            },
            canBeDragged: function () {
              return YES;
            }
          }),
          coverSheet: SC.View.design({
            backgroundColor: DG.RenderingUtilities.kSeeThrough,
            isVisible: false
          }),
          classNames: ['component-border'],
          setContentView: function (iContentView) {
            this.set('contentView', iContentView);
          }

        }), // containerView
        borderRight: DG.DragBorderView.design(
            {
              layout: {top: kTitleBarHeight, right: 0, width: kDragWidth},
              dragCursor: kRightBorderCursor,
              dragAdjust: function (evt, info) {
                // Don't let user drag right edge off left of window
                var tMinWidth = this.get('contentMinWidth') || kMinSize,
                    tLoc = Math.max(evt.pageX, tMinWidth),
                    tNewWidth = DG.ViewUtilities.roundToGrid(info.width + (tLoc - info.pageX)),
                    tMaxWidth = this.parentView.get('contentMaxWidth') || kMaxSize;
                // Don't let width of component become too small
                tNewWidth = Math.min(Math.max(tNewWidth, tMinWidth), tMaxWidth);
                this.parentView.adjust('width', tNewWidth);
              },
              canBeDragged: function () {
                return this.parentView.get('isResizable');
              }
            }),
        borderBottom: DG.DragBorderView.design(
            {
              layout: {bottom: 0, height: kDragWidth},
              dragCursor: kBottomBorderCursor,
              dragAdjust: function (evt, info) {
                var tMinHeight = this.get('contentMinHeight') || kMinSize;
                var tMaxHeight = this.get('contentMaxHeight') || kMaxSize;
                var tNewHeight = info.height + (evt.pageY - info.pageY);
                tNewHeight = DG.ViewUtilities.roundToGrid(Math.min(
                    Math.max(tNewHeight, tMinHeight), tMaxHeight));
                this.parentView.adjust('height', tNewHeight);
              },
              canBeDragged: function () {
                return this.parentView.get('isResizable');
              }
            }),
        borderLeft: DG.DragBorderView.design(
            {
              layout: {left: 0, width: kDragWidth},
              dragCursor: kLeftBorderCursor,
              dragAdjust: function (evt, info) {
                var tMaxWidth = this.parentView.get('contentMaxWidth') || kMaxSize;
                var tMinWidth = this.get('contentMinWidth') || kMinSize;
                var tContainerWidth = this.getContainerWidth(),
                    tNewWidth = DG.ViewUtilities.roundToGrid(info.width - (evt.pageX - info.pageX)),
                    tLoc;
                tNewWidth = Math.min(Math.max(tNewWidth, tMinWidth), tMaxWidth);
                tLoc = info.left + info.width - tNewWidth;
                if (tLoc < tContainerWidth - tMinWidth) {
                  this.parentView.adjust('width', tNewWidth);
                  this.parentView.adjust('left', tLoc);
                }
              },
              canBeDragged: function () {
                return this.parentView.get('isResizable');
              }
            }),
        borderTop: DG.DragBorderView.design(
            {
              layout: {top: 0, height: 0},
              canBeDragged: function () {
                return false;
              }
            }),
        borderCorner: DG.DragBorderView.design(
            {
              layout: {right: 0, width: 2 * kDragWidth, bottom: 0, height: 2 * kDragWidth},
              dragCursor: kCornerBorderCursor,
              dragAdjust: function (evt, info) {
                // Don't let user drag right edge off left of window
                var tMinHeight = this.get('contentMinHeight') || kMinSize;
                var tMaxHeight = this.get('contentMaxHeight') || kMaxSize;
                var tMinWidth  = this.get('contentMinWidth') || kMinSize,
                    tLoc = Math.max(evt.pageX, tMinWidth),
                    tNewWidth = DG.ViewUtilities.roundToGrid(info.width + (tLoc - info.pageX)),
                    tNewHeight = DG.ViewUtilities.roundToGrid(info.height + (evt.pageY - info.pageY)),
                    tMaxWidth = this.parentView.get('contentMaxWidth') || kMaxSize;

                // Don't let width or height of component become too small
                tNewWidth = Math.min(Math.max(tNewWidth, tMinWidth), tMaxWidth);
                this.parentView.adjust('width', tNewWidth);
                tNewHeight = Math.min(Math.max(tNewHeight, tMinHeight), tMaxHeight);
                this.parentView.adjust('height', tNewHeight);
              },
              canBeDragged: function () {
                return this.parentView.get('isResizable');
              }
            }),

        title: function (iKey, iValue) {
          if (!SC.none(iValue))
            this.setPath('containerView.titlebar.titleView.value', iValue);
          return this.getPath('containerView.titlebar.titleView.value');
        }.property(),

        modelTitleChanged: function (iModel, iKey, iValue) {
          if (!SC.none(iValue))
            this.set('title', iValue);
        }.observes('*model.title'),

        modelDimensionsChanged: function (iModel, iKey, iValue) {
          if (!SC.none(iValue)) {
            if( iValue.width)
                this.adjust('width', iValue.width);
            if( iValue.height)
                this.adjust('height', iValue.height);
          }
        }.observes('*model.dimensions'),

        version: null,
        versionBinding: '.containerView.titlebar.versionView.value',

        modelVersionChanged: function (iModel, iKey, iValue) {
          if (!SC.none(iValue))
            this.set('version', iValue);
        }.observes('*model.version'),

        status: null,
        statusBinding: '.containerView.titlebar.statusView.value',

        contentMinWidth: function () {
          if (this.get('contentView')) {
            return this.getPath('contentView.containerMinWidth');
          }
        }.property(),
        contentMaxWidth: function () {
          if (this.get('contentView')) {
            return this.getPath('contentView.containerMaxWidth');
          }
        }.property(),
        contentMinHeight: function () {
          if (this.get('contentView')) {
            return this.getPath('contentView.containerMinHeight');
          }
        }.property(),
        contentMaxHeight: function () {
          if (this.get('contentView')) {
            return this.getPath('contentView.containerMaxHeight');
          }
        }.property(),

        destroy: function () {
          if (this.containerView.contentView)
            this.containerView.contentView.destroy();
          sc_super();
        },

        /**
         * @property {Object} { action: {function}, target: {Object}, args: {Array}} or null
         */
        closeAction: function () {
          return this.getPath('contentView.closeAction');
        }.property(),

        addContent: function (iView) {
          var tFrame = iView.get('frame');
          if (tFrame.width > 0)
            this.adjust('width', tFrame.width + 2 * kBorderWidth);
          if (tFrame.height > 0)
            this.adjust('height', tFrame.height + 2 * kBorderWidth + kTitleBarHeight);
          iView.set('layout', {top: this.get('showTitleBar') ? kTitleBarHeight : 0});
          this.containerView.appendChild(iView);
          this.containerView.setContentView(iView);
        },

        /**
         * @param iZ {Number}
         */
        assignZ: function( iZ) {
          if (!this.getPath('controller.preventBringToFront')) {
            this.adjust('zIndex', iZ);
          }
        },

        select: function () {
          this.parentView.select(this);
        },
        bringToFront: function () {
          this.parentView.bringToFront(this);
        },
        mouseDown: function (evt) {
          this.select();
          return true;
        },
        click: function (evt) {
          return this.mouseDown( evt);
        },
        touchStart: function( evt) {
          return this.mouseDown( evt);
        },

        maximizeAndSelect: function () {
          if (this.get('isMinimized')) {
            this.toggleMinimization();
          }
          this.select();
        },

        toggleMinimization: function () {

          var setBorderVisibility = function (iVisibility) {
            ['Bottom', 'Corner', 'Left', 'Right'].forEach(function (iLoc) {
              this.setPath('border' + iLoc + '.isVisible', iVisibility);
            }.bind(this));
          }.bind(this);

          if (this.get('isMinimized')) {
            var tSavedHeight = this.getPath('model.savedHeight');
            this.animate({height: tSavedHeight - 1},
                {duration: 0.4, timing: 'ease-in-out'},
                // This fires after the animation and has the effect of causing a refresh. Map need this to get
                // the correct portion of the map actually showing.
                function () {
                  this.adjust('height', tSavedHeight);
                }.bind(this));
            setBorderVisibility(true);
            this.setPath('model.savedHeight', null);
          }
          else {
            this.setPath('model.savedHeight', this.get('layout').height);
            this.animate({height: 25},
                {duration: 0.4, timing: 'ease-in-out'});
            setBorderVisibility(false);
            if (this.get('isSelected')) {
              this.parentView.select(null);
            }
          }
        },

        contentIsInstanceOf: function (aPrototype) {
          return this.get('contentView') instanceof aPrototype;
        },

        cover: function (iAction) {
          var tContainer = this.get('containerView'),
              tCover = tContainer.get('coverSheet');
          tContainer.removeChild(tCover);
          tContainer.appendChild(tCover);
          tCover.set('isVisible', iAction === 'cover');
        },

        didAppendToDocument: function () {
          var contentView = this.get('contentView');
          if (contentView && contentView.didAppendToDocument) {
            contentView.didAppendToDocument();
          }
        },

        /**
         * When a component view is created by the user, it animates to its initial position, expanding
         * from zero size to its initial size. Then it is selected This process is problematic for some
         * content views. E.g. a text component will have lost editing focus, a case table will not be displaying
         * its cases any longer, and a map will no longer have the correct bounds. If the content view defines
         * this method, we'll pass it along and thus give it a chance to fix things up.
         */
        didReachInitialPosition: function () {
          var contentView = this.get('contentView');
          if (contentView && contentView.didReachInitialPosition) {
            contentView.didReachInitialPosition();
          }
        }
      };  // object returned closure
    }()) // function closure
);

DG.ComponentView._createComponent = function (iParams) {
  var tComponentClass = iParams.componentClass.constructor;
  SC.Benchmark.start('createComponent: ' + tComponentClass);

  var tIsStandaloneInteractive = DG.STANDALONE_MODE && (tComponentClass === DG.GameView),
      tMakeItVisible = (iParams.layout.isVisible === undefined) || iParams.layout.isVisible,
      tIsResizable = iParams.isResizable,
      tComponentView = DG.ComponentView.create({
        layout: iParams.layout,
        isVisible: tMakeItVisible,
        showTitleBar: !tIsStandaloneInteractive,
        isResizable: !tIsStandaloneInteractive
      });
  tComponentView.addContent(tComponentClass.create(iParams.contentProperties));

  if(iParams.controller)
    tComponentView.set('controller', iParams.controller);
  if( tIsStandaloneInteractive)
    tIsResizable = false;
  if (!SC.none(tIsResizable))
    tComponentView.set('isResizable', tIsResizable);
  if (!SC.none(iParams.isVisible))
    tComponentView.set('isVisible', iParams.isVisible);

  SC.Benchmark.end('createComponent: ' + tComponentClass);
  SC.Benchmark.log('createComponent: ' + tComponentClass);
  return tComponentView;
};

DG.ComponentView.restoreComponent = function (iParams) {

  var tComponentView = this._createComponent(iParams),
      tSuperView = iParams.parentView,
      tUseLayoutForPosition = iParams.useLayout;

  if(iParams.controller)
    tComponentView.set('controller', iParams.controller);

  //default to use the existing layout if present, even when requested otherwise.
  if (SC.none(tUseLayoutForPosition) && !SC.none(iParams.layout.left) && !SC.none(iParams.layout.top)) {
    tUseLayoutForPosition = true;
  }
  if (!tUseLayoutForPosition) {
    tSuperView.positionNewComponent(tComponentView, iParams.position);
  }
  tSuperView.appendChild(tComponentView);
  tSuperView.updateFrame();

  return tComponentView;
};

/**
 * Create a component view and add it as a subview to the given super view.
 * @param iParams {Object}
 *   parentView {SC.View}
 *   layout
 *   componentClass - The class of the content view to be contained in the component view
 *   contentProperties - These properties are passed to the new instance of the content during creation
 *   isResizable
 *   useLayout - if true, forgo auto-positioning and just use the layout.
 *   isVisible {Boolean}
 *   position {String} Default is 'top'. Also possible is 'bottom'
 */
DG.ComponentView.addComponent = function (iParams) {
  var tParams = $.extend({}, iParams, { layout: $.extend(true, {}, iParams.layout) }),
      tSuperView = tParams.parentView,
      tUseLayoutForPosition = tParams.useLayout || false;
  if (!SC.none(tParams.layout.width))
    tParams.layout.width += DG.ViewUtilities.horizontalPadding();
  if (!SC.none(tParams.layout.height))
    tParams.layout.height += DG.ViewUtilities.verticalPadding();

  var tComponentView = this._createComponent(iParams);

  if (!tUseLayoutForPosition) {
    tSuperView.positionNewComponent(tComponentView, iParams.position);
  }
  tSuperView.appendChild(tComponentView);
  tComponentView.bringToFront();
  tSuperView.updateFrame();

  return tComponentView;
};

DG.ComponentView.findComponentViewParent = function (iView) {
  // Work our way up the view hierarchy until our parent is a component view (or NULL)
  while (iView && !(iView instanceof DG.ComponentView))
    iView = iView.get('parentView');

  return iView;
};
