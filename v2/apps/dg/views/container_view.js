// ==========================================================================
//                          DG.ContainerView
//
//  The top level view in a DG document.
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

sc_require('views/inspector/inspector_view');

/** @class

  DG.ContainerView is the superview for the component views in the document.

  @extends SC.View
*/
DG.ContainerView = SC.View.extend(
/** @scope DG.ContainerView.prototype */
  (function() {
    var kDocMargin = 16;
    return {
      classNames: 'dg-container-view'.w(),

      isResizable: YES,

      /**
       * To bring a component frontmost, we assign it this value and then increment the value.
       * We don't worry about running out of numbers.
       * @property{Number}
       */
      nextZIndex: function() {
        var tMaxZIndex = 100;
        this.get('componentViews').forEach( function( iView) {
          var tZIndex = iView.get('layout').zIndex;
          if( tZIndex)
              tMaxZIndex = Math.max( tMaxZIndex, tZIndex);
        });
        return tMaxZIndex + 1;
      }.property(),
      lowerZIndex: function() {
        var tMinZIndex = 100;
        this.get('componentViews').forEach( function( iView) {
          var tZIndex = iView.get('layout').zIndex;
          if( tZIndex)
              tMinZIndex = Math.min( tMinZIndex, tZIndex);
        });
        return tMinZIndex - 1;
      }.property(),

      /**
       * @property {DG.InspectorView}
       */
      inspectorView: null,

      /**
       * These rectangles are in addition to rectangles occupied by componentViews. Typically,
       * they are reserved for the duration of an animation of a component to its final location, and
       * then given up.
       * @property { [{{left: {Number}, top: {Number}, width: {Number}, height: {Number}}}]
       */
      reservedRects: null,

      // We want the container to encompass the entire window or the
      // entire content, whichever is greater.
      layout: { left: 0, top: 0, minWidth: '100%', minHeight: '100%' },

      /**
        Indicates that this view's layout should never be considered fixed.
        A fixed layout has a fixed width and height and is unaffected by changes
        to the parent view's size/layout. This view sometimes has a "fixed" width
        and/or height in it layout (for scrolling purposes) but should always
        refresh its layout when its parent view changes. Therefore, we override
        this base class computed property to always return false, so that it can
        respond appropriately when its parent view changes.
        @returns  {Boolean} false -- this view's layout is never fixed
       */
      isFixedLayout: function() {
        return false;
      }.property(),

      init: function() {
        sc_super();
        this.reservedRects = [];
        this.set('inspectorView', DG.InspectorView.create( {
          componentContainer: this
        }));
        this.appendChild( this.get('inspectorView'));
      },

      parentViewDidResize: function( iParentFrame) {
        sc_super();
        if( DG.STANDALONE_MODE) {
          // Needed for SageModeler so that inspector pane doesn't disappear off right edge.
          this.adjust({width: iParentFrame.width});
        }
      },

      /**
       * There may be child views other than DG.ComponentView. E.g. in one prototype of showing
       * the map in the background, the map view was a child but not a ComponentView.
       * In standalone mode, we don't return those with content DG.GameView
       * @property {Array of DG.ComponentView }
       */
      componentViews: function() {
        return this.get('childViews' ).filter( function (iChildView) {
          return (iChildView instanceof DG.ComponentView) &&
              !(DG.STANDALONE_MODE && iChildView.contentIsInstanceOf(DG.GameView));
        });
      }.property( 'childViews'),

      allComponentViews: function() {
        var tSavedMode = DG.STANDALONE_MODE;
        DG.STANDALONE_MODE = false; // temporarily
        var tViews = this.get('componentViews');
        DG.STANDALONE_MODE = tSavedMode;
        return tViews;
      }.property('childViews'),

      /**
       * @property {Array of Object }
       */
      tileMenuItems: function() {

        function componentViewToClassName(iView) {
          var tContentView = iView.get('contentView');
          if( tContentView) {
            switch (tContentView.constructor) {
              case DG.TableView:
                return 'tile-icon-table';
              case DG.CaseCardView:
                return 'tile-icon-card';
              case DG.GraphView:
                return 'tile-icon-graph';
              case DG.MapView:
                return 'tile-icon-map';
              case DG.SliderView:
                return 'tile-icon-slider';
              case DG.Calculator:
                return 'tile-icon-calc';
              case DG.TextView:
                return 'tile-icon-comment';
              case DG.GuideView:
                return 'tile-icon-guide';
              case DG.GameView:
                return 'tile-icon-dataTool';
              case DG.WebView:
              case SC.WebView:
                return 'tile-icon-mediaTool';
              default:
                return 'tile-icon-dataTool';
            }
          }
        }

        var tItems = [];
        this.get('componentViews').forEach( function( iComponentView) {
          if( iComponentView.get( 'isVisible')) {
            tItems.push({
              title: iComponentView.get('title'),
              target: iComponentView,
              action: 'maximizeAndSelect',
              icon: componentViewToClassName(iComponentView)
            });
          }
        });
        return tItems;
      }.property(),

      /**
        Computes/returns the bounding rectangle for the view.
       */
      updateFrame: function() {
        if( DG.STANDALONE_MODE) // Our frame is independent of our child views, so just bail.
          return;
        // Note that we're not providing scroll bars to scroll to left or above document
        var tWidth = 0, tHeight = 0;

        // Compute the content size as the bounding rectangle of the child views.
        this.get('childViews').forEach(
                          function( iView) {
                            var tLayout = iView.get('layout');
                            // Rarely, a layout will be missing the fields we need
                            // NB: Attempting to call get('frame') causes infinite recursion
                            tWidth = Math.max( tWidth, (tLayout.left || 0) + (tLayout.width || 0));
                            tHeight = Math.max( tHeight, (tLayout.top || 0) + (tLayout.height || 0));
                          });
        // Add a margin around the components as part of the content
        tWidth += kDocMargin;
        tHeight += kDocMargin;

        this.adjust({ width: tWidth, height: tHeight });
      },

      removeComponentView: function( iComponentView) {
        var tCloseAction = iComponentView.get('closeAction');
        if( tCloseAction) {
          tCloseAction.action.apply( tCloseAction.target, tCloseAction.args );
        }
        else {
          this.select(null);
          DG.currDocumentController().removeComponentAssociatedWithView( iComponentView);
          iComponentView.destroy();
        }
        this.updateFrame();
      },

      /**
       Removes all children from the parentView.

       @returns {SC.View} receiver
       */
      destroyAllChildren: function () {
        this.select(null);  // To close inspector
        var componentViews = this.get('allComponentViews');
        componentViews.forEach(function (iView) {
          if (iView && iView.willDestroy)
            iView.willDestroy();
          iView.destroy();
        });
        return this;
      },

      /**
       * @property{DG.ComponentView}
       */
      selectedChildView: null,

      /**
       * The given child view, if not minimized, will become the currently selected childView.
       * @param iChildView
       */
      select: function( iChildView) {
        var tCurrentSelected = this.get('selectedChildView'),
            tIsMinimized = iChildView && iChildView.get('isMinimized');
        if( iChildView) {
          this.bringToFront( iChildView);
        }
        if( iChildView !== tCurrentSelected && !tIsMinimized) {
          DG.globalEditorLock.commitCurrentEdit();
          if( tCurrentSelected)
            tCurrentSelected.set('isSelected', false);
          this.set('selectedChildView', iChildView);
          if( iChildView) {
            iChildView.set('isSelected', true);
          }
        }
      },

      /* bringToFront - The given child view will be placed at the end of the list, thus
        rendered last and appearing in front of all others.
      */
      bringToFront: function( iChildView) {
        if( iChildView.assignZ) {
          iChildView.assignZ(this.get('nextZIndex'));
        }
      },

      /* sendToBack - The given child view will be placed at the beginning of the list, thus
        rendered first and appearing behind all others.
      */
      sendToBack: function( iChildView) {
        if (iChildView.assignZ) {
          iChildView.assignZ(this.get('lowerZIndex'));
        }
      },

      /** positionNewComponent - It is assumed that the given view has not yet been added
        and that its layout has the desired width and height.
        We find a non-overlapping position for the view and place it there.
        @param{DG.ComponentView} iView - the view to be positioned
        @param {String} iPosition Default is 'top'
        @param {boolean} iPositionGameViews - true to set GameView positions as well as sizes
      */
      positionNewComponent: function( iView, iPosition, iPositionGameViews) {
        var this_ = this,
            tViewRect = iView.get( 'frame'),
            tDocRect = this.parentView.get('clippingFrame'),
            tFrameWithinParent = this.computeFrameWithParentFrame(),
            tOffset = { x: -tFrameWithinParent.x, y: -tFrameWithinParent.y},
            tViewRects = this.get('componentViews').map(function (iView) {
              return iView.get('isVisible') ? iView.get('frame') : {x: 0, y: 0, width: 0, height: 0};
            }),
            tReservedRects = this.get('reservedRects'),
            tLoc = DG.ViewUtilities.findEmptyLocationForRect(
                                      tViewRect,
                                      tDocRect,
                                      tOffset,
                                      tViewRects.concat( tReservedRects),
                                      iPosition);
        if (DG.KEEP_IN_BOUNDS_PREF) {
          var HORIZONTALBUFFER = 50,
              containerWidth = $('#codap').width();
          if ((tLoc.x + tViewRect.width + HORIZONTALBUFFER) > containerWidth) {
            tLoc.x = Math.max(0, containerWidth - tViewRect.width - HORIZONTALBUFFER);
          }
          var tDocView = this.parentView;
          while (!SC.none(tDocView.parentView.parentView)) {
            tDocView = tDocView.parentView;
          }
          var containerHeight = $('#codap').height() - tDocView.get('frame').y;
          if ((tLoc.y + tViewRect.height) > containerHeight) {
            tLoc.y = Math.max(0, containerHeight - tViewRect.height);
          }
        }
        var tFinalRect = { x: tLoc.x, y: tLoc.y, width: tViewRect.width, height: tViewRect.height},
            tOptions = { duration: 0.5, timing: 'ease-in-out'},
            tIsGameView = iView.get('contentView').constructor === DG.GameView;
        if( tIsGameView) {
          // As of 2016-10-26, tFinalRect was being passed to iView.adjust() directly for GameViews,
          // apparently with the intent that the game view would be moved to the rectangle specified.
          // The adjust() function takes a layout object with { left, right }, rather than a rectangle
          // with { x, y }, however, so since then the size of GameViews has been set but not their location.
          // Rather than changing that behavior at this point, we introduce the iPositionGameViews
          // parameter which allows clients aware of the issue to specify that they do want the
          // location of GameViews to be set as well.
          var newLayout = { width: tFinalRect.width, height: tFinalRect.height };
          if (iPositionGameViews) {
            newLayout.left = tFinalRect.x;
            newLayout.top = tFinalRect.y;
          }
          iView.adjust(newLayout);
        }
        else {
          tReservedRects.push(tFinalRect);
          // Hack: deferring this command fixes an issue where the animation
          // was failing for case tables in InBounds mode.
          // Todo 1/2021: ferret out cause and fix more properly
          this.invokeLater(function () {
            iView.adjust({
              left: DG.ViewUtilities.kGridSize, top: DG.ViewUtilities.kGridSize,
              width: 0, height: 0
            });
            iView.animate({left: tLoc.x, top: tLoc.y, width: tViewRect.width, height: tViewRect.height}, tOptions,
                function () {
                  // map component doesn't come out right without the following kludge
                  // Todo: Figure out how to do this with less kludge. Possibly install the contentView
                  // after the animation has completed? Or set the size of the contentView and simply
                  // expand onto it.
                  this.adjust('width', tViewRect.width + 1);
                  this.adjust('width', tViewRect.width);
                  this.adjust('height', tViewRect.height + 1);
                  this.adjust('height', tViewRect.height);
                  this.select();
                  this_.updateFrame();
                  tReservedRects.splice(tReservedRects.indexOf(tFinalRect), 1);
                  // beginEditing applies only to text component, but couldn't find a better place to put this
                  // Better would be to define something like 'didReachFinalPosition' as a generic component
                  this.didReachInitialPosition();
                });
          }.bind(this), 100);
          iView.adjust({width: 0, height: 0});
        }
        return tFinalRect;
      },

      /** coverUpComponentViews - Request each component view to cover up its contents with a see-through layer.
       * We need to do this when we're dragging or resizing one component, so that the event handlers in components
       * we are passing over don't get in the way.
       * @param{String} either 'cover' or 'uncover'
      */
      coverUpComponentViews: function( iAction) {
        this.allComponentViews().forEach( function( iView) {
          if( iView.get('isVisible'))
            iView.cover( iAction);
        });
      },

      mouseDown: function( iEvent) {
        this.select(null);
        return true;
      },

      touchStart: function(iEvent) {
        return this.mouseDown( iEvent);
      },

      containingScrollView: function () {
        var v = this;
        while (v.parentView != null && !(v.parentView instanceof SC.ScrollView)) {
          v = v.parentView;
        }
        return v && v.parentView;
      }.property(),

      visibleLeft: function() {
        var scrollView = this.get('containingScrollView');
        var visibleLeft = scrollView.get('horizontalScrollOffset');
        return visibleLeft;
      }.property(),

      visibleTop: function() {
        var scrollView = this.get('containingScrollView');
        var visibleTop = scrollView.get('verticalScrollOffset');
        return visibleTop;
      }.property(),

    };  // object returned closure
  }()) // function closure
);

