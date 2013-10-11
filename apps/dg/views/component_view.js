// ==========================================================================
//                          DG.ComponentView
// 
//  Routines for changing coordinats along an animation path
//  
//  Author:   William Finzer
//
//  Copyright ©2013 KCP Technologies, Inc., a McGraw-Hill Education Company
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
sc_require('views/titlebar_gear_view');

/** @class

  DragBorderView is typically a thin view configured to lie on the border of a component
  view. It implements the dragging functionality except for the actual change in the
  frame's layout.

  @extends SC.View
*/
DG.DragBorderView = SC.View.extend(
  (function() {

    /*
    function logDrag( iBorderView, iTag) {
      var layout = iBorderView.viewToDrag().get('layout'),
          tTitle = iBorderView.viewToDrag().get('title');
      DG.logUser("%@: { name: %@, left: %@, top: %@, width: %@, height: %@ }",
                  iTag, tTitle, layout.left, layout.top, layout.width, layout.height);
    }
    */

    return {
  /** @scope DG.DragBorderView.prototype */
      dragCursor: null,
      cursor: function() {
            if( this.parentView.get( 'isResizable'))
              return this.dragCursor;
            else
              return null;
          }.property( 'dragCursor').cacheable(),
      mouseDown: function(evt) {
        DG.globalEditorLock.commitCurrentEdit();
        var tView = this.viewToDrag();
        // Make sure the enclosing view will be movable
        DG.ViewUtilities.convertViewLayoutToAbsolute( tView);
        // A click on a border should bring the view to the front
        tView.bringToFront();
        if( !this.canBeDragged())
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
//        logDrag.call(this, "dragComponentBegin");
        return YES; // so we get other events
      },

      mouseUp: function(evt) {
        var tContainer = this.viewToDrag().get('parentView');
        // apply one more time to set final position
        this.mouseDragged(evt);
        this._mouseDownInfo = null; // cleanup info
        tContainer.coverUpComponentViews('uncover');
        tContainer.set('frameNeedsUpdate', true);

//        logDrag.call(this, "dragComponentEnd");
        return YES; // handled!
      },

      mouseDragged: function(evt) {
        var info = this._mouseDownInfo;

        if( info) {
          this.dragAdjust( evt, info);
          return YES; // event was handled!
        }
        else
          return NO;
      },
      canBeDragged: function() {
        return NO;  // default
      },
      touchStart: function(evt){
        return this.mouseDown(evt);
      },
      touchEnd: function(evt){
        return this.mouseUp(evt);
      },
      touchesDragged: function( evt, touches) {
        return this.mouseDragged( evt);
      },
      dragAdjust: function( evt, info) {
        // default is to do nothing
      },
      viewToDrag: function() {
        return DG.ComponentView.findComponentViewParent( this);
      },
      getContainerWidth: function() {
        return window.innerWidth; // go global
      },
      getContainerHeight: function() {
        var tDocView = this.viewToDrag();
        while( !SC.none( tDocView.parentView.parentView)) {
          tDocView = tDocView.parentView;
        }
        return window.innerHeight - tDocView.get( 'frame').y;
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
  (function() {
    var kTitleBarHeight = DG.ViewUtilities.kTitleBarHeight,
        kMinSize = 50,
        kDragWidth = DG.ViewUtilities.kDragWidth,
        kBorderWidth = DG.ViewUtilities.kBorderWidth,
        kRightBorderCursor = SC.Cursor.create( { cursorStyle: SC.E_RESIZE_CURSOR }),
        kBottomBorderCursor = SC.Cursor.create( { cursorStyle: SC.S_RESIZE_CURSOR }),
        kLeftBorderCursor = SC.Cursor.create( { cursorStyle: SC.W_RESIZE_CURSOR }),
        kTopBorderCursor = SC.Cursor.create( { cursorStyle: SC.N_RESIZE_CURSOR }),
        kCornerBorderCursor = SC.Cursor.create( { cursorStyle: SC.SE_RESIZE_CURSOR })
        ;
    return {
      classNames: ['component-view'],
      isResizable: YES,
      isClosable: YES,
      contentView: SC.outlet( 'containerView.contentView'),
      childViews: 'containerView borderRight borderBottom borderLeft borderTop borderCorner'.w(),
        containerView: SC.View.design(
          {
            // By insetting the container view by half the drag width, we fix a "box model" problem
            // on IE that prevents easy access to the drag views.
            layout: { left: kDragWidth / 2, bottom: kDragWidth / 2, right: kDragWidth / 2 },
            gearView: SC.outlet( 'titlebar.gearView'),
            childViews: 'titlebar coverSheet'.w(),
              titlebar: DG.DragBorderView.design(
                {   layout: { height: kTitleBarHeight },
                  backgroundColor: 'gray',
                  childViews: 'titleView versionView closeBox gearView'.w(),
                    titleView: SC.LabelView.design({
                      textAlign: SC.ALIGN_CENTER,
                      value: ''
                    }),
                  versionView: SC.LabelView.design({
                      textAlign: SC.ALIGN_RIGHT,
                      layout: { right: 15 },
                      value: ''
                    }),
                    closeBox: DG.TitleBarButtonView.design( {
                      layout: { left: 0, top: 0, width: kTitleBarHeight, height: kTitleBarHeight },
                      scale: SC.SCALE_NONE
                    }),
                    gearView: DG.TitleBarGearView.design( {
                      layout: { right: 5, centerY: 0, width: 16, height: 16 }
                    }),
                  dragAdjust: function( evt, info) {
                    var tOuterView = this.viewToDrag(),
                        tX = info.left + (evt.pageX - info.pageX),
                        tY = info.top + (evt.pageY - info.pageY),
                        tContainerWidth = this.getContainerWidth(),
                        tContainerHeight = this.getContainerHeight();

                    tX = Math.min( Math.max( tX, -info.width + kMinSize),
                                    tContainerWidth - kMinSize);
                    tOuterView.adjust('left', tX);

                    tY = Math.min( Math.max( tY, -kTitleBarHeight / 2),
                               tContainerHeight - kTitleBarHeight / 2);
                    tOuterView.adjust('top', tY);
                  },
                  canBeDragged: function() {
                    return YES;
                  }
                }),
              coverSheet: SC.View.design(
                { backgroundColor: DG.RenderingUtilities.kSeeThrough,
                  isVisible: false }
              ),
          classNames: ['component-border'],
          setContentView: function( iContentView) {
            this.set( 'contentView', iContentView);
            this.get( 'gearView').set( 'contentView', iContentView);
          }

        }), // containerView
        borderRight: DG.DragBorderView.design(
          { layout: { right: 0, width: kDragWidth },
            dragCursor: kRightBorderCursor,
            dragAdjust: function( evt, info) {
              // Don't let user drag right edge off left of window
              var tLoc = Math.max( evt.pageX, kMinSize),
                  tNewWidth = info.width + (tLoc - info.pageX);
              // Don't let width of component become too small
              tNewWidth = Math.max( tNewWidth, kMinSize);
              this.parentView.adjust( 'width', tNewWidth);
            },
            canBeDragged: function() {
              return this.parentView.get( 'isResizable');
            }
        }),
        borderBottom: DG.DragBorderView.design(
          { layout: { bottom: 0, height: kDragWidth },
            dragCursor: kBottomBorderCursor,
            dragAdjust: function( evt, info) {
              var tNewHeight = info.height + (evt.pageY - info.pageY);
              tNewHeight = Math.max( tNewHeight, kMinSize);
              this.parentView.adjust( 'height', tNewHeight);
            },
            canBeDragged: function() {
              return this.parentView.get( 'isResizable');
            }
        }),
        borderLeft: DG.DragBorderView.design(
          { layout: { left: 0, width: kDragWidth },
            dragCursor: kLeftBorderCursor,
            dragAdjust: function( evt, info) {
              var tContainerWidth = this.getContainerWidth(),
                tNewWidth = info.width - (evt.pageX - info.pageX),
                tLoc;
              tNewWidth = Math.max( tNewWidth, kMinSize);
              tLoc = info.left + info.width - tNewWidth;
              if( tLoc < tContainerWidth - kMinSize) {
                this.parentView.adjust( 'width', tNewWidth);
                this.parentView.adjust( 'left', tLoc);
              }
            },
            canBeDragged: function() {
              return this.parentView.get( 'isResizable');
            }
        }),
        borderTop: DG.DragBorderView.design(
          { layout: { top: 0, height: kDragWidth },
            dragCursor: kTopBorderCursor,
            dragAdjust: function( evt, info) {
              var tContainerHeight = this.getContainerHeight(),
                tNewHeight = info.height - (evt.pageY - info.pageY),
                tLoc;
              tNewHeight = Math.max( tNewHeight, kMinSize);
              tLoc = info.top + info.height - tNewHeight;
              // Don't let user drag top of component too close to doc bottom
              if( (tLoc < tContainerHeight - kTitleBarHeight / 2) &&
                  (tLoc > -kTitleBarHeight / 2)) {
                this.parentView.adjust( 'height', tNewHeight);
                this.parentView.adjust( 'top', tLoc);
              }
            },
            canBeDragged: function() {
              return this.parentView.get( 'isResizable');
            }
        }),
        borderCorner: DG.DragBorderView.design(
          { layout: { right: 0, width: 3 * kDragWidth, bottom: 0, height: 3 * kDragWidth },
            dragCursor: kCornerBorderCursor,
            dragAdjust: function( evt, info) {
              // Don't let user drag right edge off left of window
              var tLoc = Math.max( evt.pageX, kMinSize),
                tNewWidth = info.width + (tLoc - info.pageX),
                tNewHeight = info.height + (evt.pageY - info.pageY);
              // Don't let width or height of component become too small
              tNewWidth = Math.max( tNewWidth, kMinSize);
              this.parentView.adjust( 'width', tNewWidth);
              tNewHeight = Math.max( tNewHeight, kMinSize);
              this.parentView.adjust( 'height', tNewHeight);
            },
            canBeDragged: function() {
              return this.parentView.get( 'isResizable');
            }
        }),

      title: null,
      titleBinding: '.containerView.titlebar.titleView.value',

      version: null,
      versionBinding: '.containerView.titlebar.versionView.value',

      destroy: function() {
        DG.logUser( "closeComponent: %@", this.get('title'));
        if( this.containerView.contentView)
          this.containerView.contentView.destroy();
        sc_super();
      },

      addContent: function( iView) {
        var tFrame = iView.get('frame');
        if( tFrame.width > 0)
          this.adjust('width', tFrame.width + 2 * kBorderWidth);
        if( tFrame.height > 0)
          this.adjust('height', tFrame.height + 2 * kBorderWidth + kTitleBarHeight);
        iView.set('layout', { top: kTitleBarHeight });
        this.containerView.appendChild( iView);
        this.containerView.setContentView( iView);
      },
      bringToFront: function() {
        this.parentView.bringToFront( this);
      },
      contentIsInstanceOf: function( aPrototype) {
        return this.get('contentView') instanceof aPrototype;
      },

      cover: function( iAction) {
        var tContainer = this.get('containerView'),
            tCover = tContainer.get('coverSheet');
        tContainer.removeChild( tCover);
        tContainer.appendChild( tCover);
        tCover.set('isVisible', iAction === 'cover');
      }
    };  // object returned closure
  }()) // function closure
);

DG.ComponentView._createComponent = function(iComponentLayout, iComponentClass, iContentProperties,
                      iTitle, iIsResizable) {
  var tComponentView = DG.ComponentView.create({ layout: iComponentLayout });
  tComponentView.addContent( iComponentClass.create( iContentProperties));

  // The bindings are connected at the end of the run-loop.
  // When init-time bindings are connected, the initial synchronization
  // pulls the value from the remote property. Therefore, we must wait
  // to set the title until after the binding has been connected.
  tComponentView.invokeLast( function() {
                tComponentView.set('title', iTitle);
                DG.logUser( "componentCreated: %@", iTitle);
              });

  if( !SC.none( iIsResizable))
    tComponentView.set( 'isResizable', iIsResizable);

  return tComponentView;                    
};

DG.ComponentView.restoreComponent = function( iSuperView, iComponentLayout,
                      iComponentClass, iContentProperties,
                      iTitle, iIsResizable) {

  var tComponentView = this._createComponent(iComponentLayout, iComponentClass, iContentProperties, iTitle, iIsResizable);

  iSuperView.appendChild( tComponentView);
  iSuperView.set( 'frameNeedsUpdate', true);

  return tComponentView;
};

/**
 * Create a component view and add it as a subview to the given super view.
 * @param iSuperView
 * @param iComponentLayout
 * @param iComponentClass - The class of the content view to be contained in the component view
 * @param iContentProperties - These properties are passed to the new instance of the content during creation
 * @param iTitle - The title that appears in the component view's title bar
 * @param iIsResizable
 * @param iUseLayoutForPosition - if true, forgo auto-positioning and just use the layout.
 */
DG.ComponentView.addComponent = function( iSuperView, iComponentLayout,
                      iComponentClass, iContentProperties,
                      iTitle, iIsResizable, iUseLayoutForPosition) {
  iUseLayoutForPosition = iUseLayoutForPosition || false;
  if( !SC.none( iComponentLayout.width))
    iComponentLayout.width += DG.ViewUtilities.horizontalPadding();
  if( !SC.none( iComponentLayout.height))
    iComponentLayout.height += DG.ViewUtilities.verticalPadding();

  var tComponentView = this._createComponent(iComponentLayout, iComponentClass, iContentProperties, iTitle, iIsResizable);

  if( !iUseLayoutForPosition)
    iSuperView.positionNewComponent( tComponentView);
  iSuperView.appendChild( tComponentView);
  iSuperView.set( 'frameNeedsUpdate', true);

  // We want to be sure the component view is visible. iSuperView's parent is a scroll view
  // and it can accomplish this for us.
  tComponentView.scrollToVisible();
  return tComponentView;
};

DG.ComponentView.findComponentViewParent = function( iView) {
  // Work our way up the view hierarchy until our parent is a component view (or NULL)
  while( iView && !(iView instanceof DG.ComponentView))
    iView = iView.get('parentView');

  return iView;
};
