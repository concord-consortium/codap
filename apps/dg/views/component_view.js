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

sc_require('views/drag_border_view');
sc_require('views/titlebar_button_view');

var kResizeHandleSize = 26, // total size of interactable area
    kResizeHandleInset = 4; // size of interactable area outside the component
                            // difference is the size of the visible handle

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
          kDragWidth = DG.ViewUtilities.kDragWidth,
          kBorderWidth = DG.ViewUtilities.kBorderWidth,
          kViewInComponentMode = DG.get('componentMode') === 'yes',
          kViewInEmbeddedMode = DG.get('embeddedMode') === 'yes',
          kHideUndoRedoInComponent = DG.get('hideUndoRedoInComponent') === 'yes',
          kShowUndoRedoButtons = (kViewInComponentMode || kViewInEmbeddedMode) && !kHideUndoRedoInComponent,
          kLockThingsDown = kViewInComponentMode;
      return {
        classNames: ['dg-component-view'],
        classNameBindings: ['isSelected:dg-component-view-selected'],

        /**
         * Returns true if model has both width and height as resizable, false otherwise
         * @property {boolean}
         */
        isResizable: function( iKey, iValue) {
          if( !SC.empty(iValue))
            this.setPath('model.isResizable', iValue);
          return this.getPath('model.isResizable');
        }.property(),
        isResizableDidChange: function() {
          this.propertyDidChange('isResizable');
        }.observes('model.isResizable'),
        isWidthResizable: function() {
          return this.getPath('model.isWidthResizable');
        }.property(),
        isHeightResizable: function() {
          return this.getPath('model.isHeightResizable');
        }.property(),

        isClosable: YES,
        showTitleBar: YES,

        /**
         * These buttons are provided by the controller and are specific to the type of component.
         * The buttons that toggle between case card and case table are an example.
         * @property {[SC.View]}
         */
        specialTitleBarButtons: function() {
          var tController = this.get('controller');
          return tController ? tController.get('specialTitleBarButtons') : [];
        }.property('controller'),

        /**
         * @property {DG.ComponentController}
         */
        controller: null,

        controllerDidChange: function() {
          var tTitleBar = this.getPath('containerView.titlebar'),
              tTitleView = tTitleBar && tTitleBar.get('titleView'),
              tTitleViewLayer = tTitleView && tTitleView.get('layer'),
              tSpecialButtons = this.get('specialTitleBarButtons');
          tSpecialButtons.forEach( function( iButton, iIndex) {
            iButton.adjust({ left: 5 + iIndex * 30, width: 25 });
            tTitleBar.appendChild( iButton);
          });
          if( tTitleView && tTitleViewLayer) {
            tTitleView.adjust({left: 0, right: 0});
            tTitleViewLayer.style.paddingLeft = (tSpecialButtons.length * 10 + 5) + 'px';
          }
        }.observes('controller'),

        /**
         * @property {DG.Component}
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

        modelDidChange: function() {
          // Title bar needs to know about my model to decide whether to show closebox or not
          this.setPath('containerView.titlebar.model', this.get('model'));
        }.observes('model'),

        isMinimized: function () {
          return !SC.none(this.get('_modelSavedHeight'));
        }.property('_modelSavedHeight'),

        isMinimizedChanged: function() {
          var tIsMinimize = this.get('isMinimized');
          this.setPath('contentView.isVisible', !tIsMinimize);
        }.observes('isMinimized'),

        init: function () {
          sc_super();
          if (!this.get('showTitleBar')) {
            this.getPath('containerView.titlebar').adjust('height', 0);
          }
          // If we are in component mode we select the component after it is
          // rendered.
          if (kViewInComponentMode && this.get('isVisible')) {
            this.invokeLater(function () {
              this.select();
            }.bind(this));
          }
          if (DG.KEEP_IN_BOUNDS_PREF && !this.originalLayout) {
            this.originalLayout = {};
          }
          if (this.get('isStandaloneComponent')) {
            this.hideBorders();
          }
          this.set('title', this.getPath('model.title'));
        },
        hideBorders: function () {
          this.get('borderRight').set('isVisible', false);
          this.get('borderBottom').set('isVisible', false);
          this.get('borderLeft').set('isVisible', false);
          this.get('borderBottomLeft').set('isVisible', false);
          this.get('borderBottomRight').set('isVisible', false);
          this.get('resizeBottomRight').set('isVisible', false);
        },
        /**
         * Makes a component view standalone. This means:
         *  * Hiding borders
         *  * Hiding title bar
         *  * Binding component dimensions to the parent container
         *  * Making component lowest in view hierarchy (sendToBack)
         */
        makeStandalone: function () {
          this.set('isStandaloneComponent', true);
          this.hideBorders();
          this.getPath('containerView.titlebar').adjust('height', 0);
          this.getPath('containerView.contentView').adjust('top', 0);
          this.parentView.sendToBack(this);
          this.layout = {};
        },
        setFocusToComponentTitle: function () {
          var titleView = this.getPath('containerView.titlebar.titleView');
          if (titleView) {
            titleView.beginEditing();
          }
        },
        contentView: function( iKey, iValue) {
          if( iValue) {
            this.setPath('containerView.contentView', iValue);
          }
          return this.getPath('containerView.contentView');
        }.property(),
        childViews: ('containerView' +
                      (DG.get('componentMode') === 'no'
                        ? ' borderRight borderBottom borderLeft borderBottomLeft borderBottomRight resizeBottomRight'
                        : '')).w(),
        containerView: SC.View.design({
          classNames: ['dg-component-container'],
          layout: {left: 0, bottom: 0, right: 0},
          childViews: 'titlebar coverSheet'.w(),
          titlebar: DG.DragBorderView.design({
            layout: {height: kTitleBarHeight},
            classNames: ['dg-titlebar'],
            isSelected: false,
            userEdit: false,
            classNameBindings: ['isSelected:dg-titlebar-selected'],
            isSelectedDidChange: function() {
              this.setPath('closeBox.isSelected', this.get('isSelected'));
              this.setPath('minimize.isSelected', this.get('isSelected'));
            }.observes('isSelected'),
            childViews: ('statusView versionView titleView ' +
            (!kLockThingsDown ? 'minimize closeBox ' : '') +
            (kShowUndoRedoButtons ? 'undo redo ' : '')).w(),
            titleView: SC.LabelView.design(DG.MouseAndTouchView, SC.AutoResize, {
              classNames: ['dg-titleview'],
              classNameBindings: ['valueIsEmpty:dg-titleview-empty'],
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
                tParent.set('userEdit', true);
                tComponentView.select();

                // SC 1.10 introduced a new inline editor model in which
                // an 'exampleNode' is used to adjust inline editor style.
                var exampleNode = this.get('exampleNode');
                if (!exampleNode) {
                  exampleNode = this.get('layer').cloneNode(false);
                  exampleNode.id = exampleNode.id + "-clone";
                  exampleNode.style.visibility = 'hidden';
                  exampleNode.style.textAlign = 'center';
                  exampleNode.className = exampleNode.className.replace('dg-titleview', '');
                  tParent.get('layer').appendChild(exampleNode);
                  this.set('exampleNode', exampleNode);
                }
                exampleNode.style.left = 3 + 'px';
                exampleNode.style.top = 12 + 'px';

                iEditor.set({
                  exampleElement: exampleNode,
                  exampleFrame: {
                    x: tOrigin.x, y: tOrigin.y,
                    width: tFrame.width - 2 * kXGap, height: tFrame.height - 2 * kYGap
                  }
                });
              },
              inlineEditorDidEndEditing: function () {
                sc_super();
                this.get('parentView').set('userEdit', false);
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
                    executeNotification: {
                      action: 'notify',
                      type: tComponentView.getPath('model.type'),
                      resource: 'component['+tComponentView.getPath('model.id') + ']',
                      values: {
                        operation: 'titleChange',
                        from: tComponentView.getPath('model.title'),
                        to: value
                      }
                    },
                    undoString: 'DG.Undo.componentTitleChange',
                    redoString: 'DG.Redo.componentTitleChange',
                    _userPreviouslySetTitle: tComponentView.getPath('model.userSetTitle'),
                    execute: function () {
                      this._beforeStorage = tComponentView.getPath('model.title');
                      // If the title has already been changed (e.g. due to notification),
                      // then use the previous title for purposes of logging the change.
                      if (this._beforeStorage === value)
                        this._beforeStorage = tComponentView.getPath('model._prevTitle');
                      tComponentView.setPath('model.title', value);
                      tComponentView.setPath('model.userSetTitle', true);
                      this.log = "Change title '%@' to '%@'".fmt(this._beforeStorage, value);
                    },
                    undo: function () {
                      var prev = this._beforeStorage;
                      tComponentView.setPath('model.title', prev);
                      tComponentView.setPath('model.userSetTitle', this._userPreviouslySetTitle);
                      // we have to set this as well, as 'value' is not tightly bound
                      this_._value = prev;
                      this_.propertyDidChange('value');
                    },
                    redo: function () {
                      tComponentView.setPath('model.title', value);
                      tComponentView.setPath('model.userSetTitle', true);
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
              textAlign: SC.ALIGN_LEFT,
              classNames: ['dg-version-view'],
              layout: {left: 5, top: 5},
              value: ''
            }),
            minimize: !kLockThingsDown ?
                DG.TitleBarMinimizeButton.design({
                  layout: {right: kTitleBarHeight, top: 10, width: 24, height: kTitleBarHeight},
                  classNames: ['dg-minimize-view'],
                  isVisible: SC.platform.touch
                }) :
                null,
            closeBox: !kLockThingsDown ?
                DG.TitleBarCloseButton.design({
                  layout: {right: 0, top: 4, width: kTitleBarHeight, height: kTitleBarHeight},
                  classNames: ['dg-close-view'],
                  isVisible: SC.platform.touch
                }) :
                null,
            undo: kShowUndoRedoButtons ?
                DG.TitleBarUndoButton.design({
                  layout: {right: (kViewInEmbeddedMode ? kTitleBarHeight * 3 : kTitleBarHeight),
                           top: 10, width: 24, height: kTitleBarHeight},
                  classNames: ['dg-undo'],
                }) :
                null,
            redo: kShowUndoRedoButtons ?
                DG.TitleBarRedoButton.design({
                  layout: {right: (kViewInEmbeddedMode ? kTitleBarHeight * 2 : 0),
                           top: 4, width: kTitleBarHeight, height: kTitleBarHeight},
                  classNames: ['dg-redo'],
                }) :
                null,
            mouseEntered: function (evt) {
              var tComponentView = DG.ComponentView.findComponentViewParent(this),
                  tCannotClose = tComponentView && tComponentView.getPath('model.cannotClose');
              this.setPath('minimize.isVisible', true);
              this.setPath('closeBox.isVisible', !tCannotClose);
              this.setPath('undo.isVisible', true);
              this.setPath('redo.isVisible', true);
              return YES;
            },
            mouseExited: function (evt) {
              this.setPath('minimize.isVisible', false);
              this.setPath('closeBox.isVisible', false);
              return YES;
            },
            dragAdjust: function (evt, info) {
              var tOuterView = this.viewToDrag(),
                  tX = DG.ViewUtilities.roundToGrid(info.left + (evt.pageX - info.pageX)), // delta
                  tY = DG.ViewUtilities.roundToGrid(info.top + (evt.pageY - info.pageY)), // delta
                  tContainerWidth = this.getContainerWidth(), // viewport coordinate system
                  tContainerHeight = this.getContainerHeight(), // viewport coordinate system
                  tScrollView = tOuterView.parentView.get('containingScrollView'),
                  tScrollBarThickness = tScrollView?tScrollView.getPath('horizontalScrollerView.scrollbarThickness'):0,
                  tScrollHeight = (tScrollView && tScrollView.get('canScrollHorizontal'))?tScrollBarThickness:0,
                  tViewframeTop = tOuterView.parentView.get('visibleTop'),
                  tViewframeLeft = tOuterView.parentView.get('visibleLeft'),
                  tMinX = -info.width + kMinSize,
                  tMaxX = tViewframeLeft + tContainerWidth - kMinSize,
                  tMinY = -kTitleBarHeight / 2,
                  tMaxY = tViewframeTop + tContainerHeight - tScrollHeight - kTitleBarHeight / 2;
              if (DG.KEEP_IN_BOUNDS_PREF) {
                var tInspectorDimensions = tOuterView.getInspectorDimensions();
                tMinX = 0;
                tMaxX = tContainerWidth - (info.width + tInspectorDimensions.width);
                tMinY = 0;
                tMaxY = tContainerHeight - (Math.max(info.height, tInspectorDimensions.height));
              }

              tX = Math.min(Math.max(tX, tMinX), tMaxX);
              tOuterView.adjust('left', tX);

              tY = Math.min(Math.max(tY, tMinY), tMaxY);
              tOuterView.adjust('top', tY);

              if (DG.KEEP_IN_BOUNDS_PREF) {
                var tInBoundsScaling = DG.currDocumentController().get('inBoundsScaling'),
                    tScaleFactor = tInBoundsScaling.scaleFactor;
                tOuterView.originalLayout.top = tY / tScaleFactor;
                tOuterView.originalLayout.left = tX / tScaleFactor;
              }
            },
            canBeDragged: function () {
              return !kLockThingsDown;
            }
          }),
          coverSheet: SC.View.design({
            backgroundColor: DG.RenderingUtilities.kSeeThrough,
            isVisible: false,
            mouseDown: function( iEvent) {
              // It can happen that we get left as visible when the mouseUp of a component drag slips
              // through the cracks. That's the only situation in which we should get a mouseDown as the
              // user tries to make things work.
              DG.mainPage.mainPane.getPath('scrollView.contentView').coverUpComponentViews('uncover');
            }
          }),
          setContentView: function (iContentView) {
            this.set('contentView', iContentView);
          }

        }), // containerView
        borderRight: DG.DragRightBorderView.design(
            {
              classNames: ['dg-component-border'],
              layout: {top: kTitleBarHeight, right: 0, width: kDragWidth}
            }),
        borderBottom: DG.DragBottomBorderView.design(
            {
              classNames: ['dg-component-border'],
              layout: {bottom: 0, height: kDragWidth}
            }),
        borderLeft: DG.DragLeftBorderView.design(
            {
              classNames: ['dg-component-border'],
              layout: {left: 0, width: kDragWidth}
            }),
        borderBottomLeft: DG.DragBottomLeftBorderView.design(
            {
              layout: {left: 0, width: 2 * kDragWidth, bottom: 0, height: 2 * kDragWidth}
            }),
        borderBottomRight: DG.DragBottomRightBorderView.design(
            {
              layout: {right: 0, width: 2 * kDragWidth, bottom: 0, height: 2 * kDragWidth}
            }),
        resizeBottomRight: DG.DragBottomRightBorderView.design(
            {
              classNames: ['dg-component-resize-handle'],
              layout: {right: -kResizeHandleInset, bottom: -kResizeHandleInset,
                        width: kResizeHandleSize, height: kResizeHandleSize},
              didCreateLayer: function() {
                this.set('isVisible', this.canBeDragged());
              },
              childViews: ['interior'],
              interior: SC.View.design({
                classNames: ['dg-component-resize-handle-interior'],
                layout: {left: 0, top: 0,
                        right: kResizeHandleInset, bottom: kResizeHandleInset}
              })
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
            if (iValue.width)
              this.adjust('width', iValue.width);
            // Plugins change dimensions of component model after component view has
            // set its dimensions from the saved layout. But this defeats the minimization
            // so we protect against it.
            if (iValue.height && !this.get('isMinimized'))
              this.adjust('height', iValue.height);
          }
        }.observes('*model.dimensions'),

        modelPositionChanged: function (iModel, iKey, iValue) {
          if (!SC.none(iValue)) {
            if (iValue.top)
              this.adjust('top', iValue.top);
            if (iValue.left)
              this.adjust('left', iValue.left);
          }
        }.observes('*model.position'),

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

        getInspectorDimensions : function () {
            var tInspectorWidth = 0,
                tInspectorHeight = 0,
                tButtons = this.get('inspectorButtons');
            if (tButtons && tButtons.length) {
              if (tButtons[0].parentView && tButtons[0].parentView.layout) {
                tInspectorWidth = tButtons[0].parentView.layout.width;
                tInspectorHeight = tButtons[0].parentView.layout.height;
              } else {
                var BUTTONHORIZONTALSPACE = 50,
                    BUTTONVERTICALSPACE = 43;
                tInspectorWidth = BUTTONHORIZONTALSPACE;
                tInspectorHeight = BUTTONVERTICALSPACE * tButtons.length;
              }
            }
            return {width : tInspectorWidth, height : tInspectorHeight};
        },
        enforceViewBounds : function () {
          var tTitleBar = this.getPath('containerView.titlebar'),
              type = this.getPath('controller.model.type'),
              tInspectorDims = this.getInspectorDimensions(),
              tLayout = this.get('layout'),
              tOriginalLayout = this.get('originalLayout'),
              tContainerWidth = tTitleBar.getContainerWidth(),
              tContainerHeight = tTitleBar.getContainerHeight(),
              tInBoundsScaling = DG.currDocumentController().get('inBoundsScaling'),
              tScaleFactor = tInBoundsScaling.scaleFactor,
              tScaleBoundsX = tInBoundsScaling.scaleBoundsX,
              tScaleBoundsY = tInBoundsScaling.scaleBoundsY,
              tMinWidth = this.get('contentMinWidth') || kMinSize,
              tMinHeight = this.get('contentMinWidth') || kMinSize;
              if (tScaleBoundsX < (tLayout.left + tLayout.width + tInspectorDims.width)) {
                var tNewBoundsX = tLayout.left + tLayout.width + tInspectorDims.width;
                DG.currDocumentController().setInBoundsScaleBounds(tNewBoundsX, tScaleBoundsY);
              }
              if ((tScaleBoundsY < (tLayout.top + tLayout.height) ||
                  tScaleBoundsY < (tLayout.top + tInspectorDims.height))) {
                var tHeight = (tLayout.height > tInspectorDims.height) ? tLayout.height : tInspectorDims.height;
                var tNewBoundsY = tLayout.top + tHeight;
                DG.currDocumentController().set('scaleBoundsY', tNewBoundsY);
              }
              if (type === DG.Calculator) {
                tMinWidth = tLayout.width;
                tMinHeight = tLayout.height;
              }
          var tNewWidth = Math.max(tMinWidth,
              DG.ViewUtilities.floorToGrid(tOriginalLayout.width * tScaleFactor)),
              tNewHeight = Math.max(tMinHeight,
              DG.ViewUtilities.floorToGrid(tOriginalLayout.height * tScaleFactor)),
              tNewLeft = DG.ViewUtilities.floorToGrid(tOriginalLayout.left * tScaleFactor),
              tNewTop = DG.ViewUtilities.floorToGrid(tOriginalLayout.top * tScaleFactor);
          if ((tNewLeft + tNewWidth + tInspectorDims.width) > tContainerWidth) {
            tNewLeft = Math.max(0,  tContainerWidth - tNewWidth - tInspectorDims.width);
          }
          if (tNewTop + tNewHeight > tContainerHeight) {
            tNewTop = Math.max(0, tContainerHeight - tNewHeight);
          }
          if(!(isNaN(tNewWidth) || isNaN(tNewHeight) || isNaN(tNewLeft) || isNaN(tNewTop) ))
            this.adjust({width: tNewWidth, height: tNewHeight, left: tNewLeft, top: tNewTop});
          else {
            var tMeasures = [tNewWidth, tNewHeight, tNewLeft, tNewTop];
            console.log('Got NaN for adjust layout: tNewWidth, tNewHeight, tNewLeft, tNewTop: ' + tMeasures.join());
          }
          var controller = this.get('controller');
          if (controller && controller.view)
            controller.updateModelLayout();
        },
        configureViewBoundsLayout : function (iNewPos) {
          var tOriginalLayout = this.get('originalLayout'),
              tInBoundsScaling = DG.currDocumentController().get('inBoundsScaling'),
              tScaleFactor = tInBoundsScaling.scaleFactor;
          tOriginalLayout.top = iNewPos.y / tScaleFactor;
          tOriginalLayout.left = iNewPos.x / tScaleFactor;
          tOriginalLayout.height = iNewPos.height / tScaleFactor;
          tOriginalLayout.width = iNewPos.width / tScaleFactor;
        },

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
          if( iView.adjustComponentViewClasses) {
            iView.adjustComponentViewClasses( this);
          }
        },

        /**
         * @param iZ {Number}
         */
        assignZ: function (iZ) {
          if (!this.getPath('controller.preventBringToFront')) {
            this.adjust('zIndex', iZ);
          }
        },

        select: function () {
          var savedLayout = this.savedLayout;
          this.set('isVisible', true);  // note that case table may have visibility set to false
          if( savedLayout) {
            // we only want to animate to saved layout one time, so delete it
            // from the object.
            this.set('savedLayout', null);
            this.animate( savedLayout,
                {duration: 0.4, timing: 'ease-in-out'},
                function () {
                  // We make a minor change to trigger a resize of the internal
                  // divs. Case table, otherwise displays empty table.
                  this.adjust({height: savedLayout.height - 1});
                });
          }
          if( this.parentView && this.parentView.select)
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
          return this.mouseDown(evt);
        },
        touchStart: function (evt) {
          return this.mouseDown(evt);
        },

        /**
         *
         */
        showAndSelect: function () {
          if (this.get('isMinimized')) {
            this.set('savedLayout', null);
            this.toggleMinimization();
          }
          if (DG.KEEP_IN_BOUNDS_PREF && !this.get('isStandaloneComponent')) {
            DG.currDocumentController().enforceViewBounds();
          }
          this.set('isVisible', true);
          this.select();
        },

        /**
         * Selects a component. If it is minimized, first make it normal sized.
         */
        maximizeAndSelect: function () {
          if (this.get('isMinimized')) {
            this.toggleMinimization();
          }
          this.select();
        },

        toggleMinimization: function () {
          DG.log('toggleMinimization');

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
                  this.setPath('model.savedHeight', null);
                }.bind(this));
            setBorderVisibility(true);
          }
          else {
            var tHeightToBeSaved = this.get('layout').height;
            this.animate({height: kTitleBarHeight},
                {duration: 0.4, timing: 'ease-in-out'}, function() {
                  this.setPath('model.savedHeight', tHeightToBeSaved);
                });
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

  var tMakeItVisible = (iParams.layout.isVisible === undefined) || iParams.layout.isVisible,
      tIsResizable = iParams.isResizable,
      tComponentView = DG.ComponentView.create({
        layout: iParams.layout,
        originalLayout: iParams.layout,
        isVisible: tMakeItVisible,
        showTitleBar: !iParams.isStandaloneComponent,
        isStandaloneComponent: iParams.isStandaloneComponent,
        model: iParams.model
      });
  if( iParams.controller)
    iParams.controller.set('view', tComponentView);
  iParams.contentProperties.controller = iParams.controller;
  tComponentView.addContent(tComponentClass.create(iParams.contentProperties));

  if (iParams.controller) {
    tComponentView.set('controller', iParams.controller);
    iParams.controller.set('contentView', tComponentView.getPath('containerView.contentView'));
  }
  if (iParams.isStandaloneComponent)
    tIsResizable = false;
  if (!SC.none(tIsResizable))
    tComponentView.set('isResizable', tIsResizable);
  if (!SC.none(iParams.isVisible))
    tComponentView.set('isVisible', iParams.isVisible);

  return tComponentView;
};

DG.ComponentView.restoreComponent = function (iParams) {

  var tComponentView = this._createComponent(iParams),
      tNewPos,
      tSuperView = iParams.parentView,
      tUseLayoutForPosition = iParams.useLayout;

  if (iParams.controller) {
    iParams.controller.set('view', tComponentView);
    tComponentView.set('controller', iParams.controller);
  }

  //default to use the existing layout if present, even when requested otherwise.
  if (SC.none(tUseLayoutForPosition) && !SC.none(iParams.layout.left) && !SC.none(iParams.layout.top)) {
    tUseLayoutForPosition = true;
  }
  if (!tUseLayoutForPosition) {
    tNewPos = tSuperView.positionNewComponent(tComponentView, iParams.position, iParams.positionOnCreate);
  }
  tSuperView.appendChild(tComponentView);
  if (DG.KEEP_IN_BOUNDS_PREF && !tComponentView.get('isStandaloneComponent')) {
    if (!tUseLayoutForPosition) {
      tComponentView.configureViewBoundsLayout(tNewPos);
    }
    tComponentView.enforceViewBounds();
  }
  // Do the following _after_ the above so we are using the possibly updated coordinates
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
  var tParams = $.extend({}, iParams, {layout: $.extend(true, {}, iParams.layout)}),
      tSuperView = tParams.parentView,
      tNewPos,
      tUseLayoutForPosition = tParams.useLayout || false;
  if (!SC.none(tParams.layout.width))
    tParams.layout.width += DG.ViewUtilities.horizontalPadding();
  if (!SC.none(tParams.layout.height))
    tParams.layout.height += DG.ViewUtilities.verticalPadding();

  var tComponentView = this._createComponent(iParams);

  if (!tUseLayoutForPosition) {
    tNewPos = tSuperView.positionNewComponent(tComponentView, iParams.position);
  }
  tSuperView.appendChild(tComponentView);
  tComponentView.bringToFront();
  tSuperView.updateFrame();

  if (DG.KEEP_IN_BOUNDS_PREF && !tUseLayoutForPosition) {
    tComponentView.configureViewBoundsLayout(tNewPos);
    DG.currDocumentController().computeScaleBounds(tNewPos);
  }

  return tComponentView;
};

DG.ComponentView.findComponentViewParent = function (iView) {
  // Work our way up the view hierarchy until our parent is a component view (or NULL)
  while (iView && !(iView instanceof DG.ComponentView))
    iView = iView.get('parentView');

  return iView;
};

DG.ComponentView.isComponentViewForViewSelected = function (iView) {
  return DG.ComponentView.findComponentViewParent( iView) === DG.mainPage.docView.get('selectedChildView');
};
