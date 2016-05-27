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
      nextZIndex: 1,

      /**
       * @property {DG.InspectorView}
       */
      inspectorView: null,

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
        this.set('inspectorView', DG.InspectorView.create( {
          componentContainer: this
        }));
        this.appendChild( this.get('inspectorView'));
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

      /**
       * @property {Array of Object }
       */
      tileMenuItems: function() {

        function componentViewToClassName(iView) {
          switch( iView.get('contentView').constructor) {
            case DG.TableView:
              return 'tile-icon-table';
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
        var componentViews = this.get('componentViews');
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
          this.incrementProperty('nextZIndex');
        }
      },
      
      /* sendToBack - The given child view will be placed at the beginning of the list, thus
        rendered first and appearing behind all others.
      */
      sendToBack: function( iChildView) {
        var domThisElement = this.get('layer'),
            domChildElement = iChildView.get('layer'),
            scChildViews = this.get('childViews'),
            scChildViewCount = scChildViews.get('length'),
            i;

        // move the specified SC child view to the beginning of the child views
        // no need to check the first child, since it wouldn't need to be moved
        for( i = 1; i < scChildViewCount; ++i) {
          if(scChildViews[i] === iChildView) {
            // remove it from its current location
            scChildViews.splice(i, 1);
            // add it to the beginning of the array
            scChildViews.unshift(iChildView);
            break;
          }
        }

        // move the specified child DOM element before the first DOM child
        if(domThisElement.firstChild !== domChildElement) {
          // will automatically remove it from its current location, if necessary
          domThisElement.insertBefore(domChildElement, domThisElement.firstChild);
        }
      },

      /** positionNewComponent - It is assumed that the given view has not yet been added
        and that its layout has the desired width and height.
        We find a non-overlapping position for the view and place it there.
        @param{DG.ComponentView} - the view to be positioned
        @param {String} Default is 'top'
      */
      positionNewComponent: function( iView, iPosition) {
        var tViewRect = iView.get( 'frame'),
            tDocRect = this.parentView.get('clippingFrame');
        var tLoc = DG.ViewUtilities.findEmptyLocationForRect(
                                      tViewRect,
                                      tDocRect,
                                      this.get('componentViews'),
                                      iPosition);
        iView.adjust( 'left', tLoc.x);
        iView.adjust( 'top', tLoc.y);
        this.invokeNext( function() {
          this.select( iView);
        }.bind( this));
      },
      
      /** coverUpComponentViews - Request each component view to cover up its contents with a see-through layer.
       * We need to do this when we're dragging or resizing one component, so that the event handlers in components
       * we are passing over don't get in the way.
       * @param{String} either 'cover' or 'uncover'
      */
      coverUpComponentViews: function( iAction) {
        this.get('componentViews').forEach( function( iView) {
          iView.cover( iAction);
        });
      },

      mouseDown: function( iEvent) {
        this.select(null);
        return true;
      },

      touchStart: function(iEvent) {
        return this.mouseDown( iEvent);
      }

    };  // object returned closure
  }()) // function closure
);

