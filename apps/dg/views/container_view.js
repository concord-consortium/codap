// ==========================================================================
//                          DG.ContainerView
// 
//  The top level view in a DG document.
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

/** @class

  DG.ContainerView is the superview for the component views in the document.

  @extends SC.View
*/
DG.ContainerView = SC.View.extend(
/** @scope DG.ContainerView.prototype */ 
  (function() {
    var kDocMargin = 16;
    return {
      isResizable: YES,

      // We use this property as a channel for protovis to use to indicate that the
      // frame needs updating. The frame property defined below depends on it, and
      // protovis can explicitly set the frameNeedsUpdate property to trigger the
      // notification.
      frameNeedsUpdate: true,
      
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

      /**
       * There may be child views other than DG.ComponentView. E.g. in one prototype of showing
       * the map in the background, the map view was a child but not a ComponentView.
       * @property {Array of DG.ComponentView }
       */
      componentViews: function() {
        return this.get('childViews' ).filter( function (iChildView) {
          return iChildView instanceof DG.ComponentView;
        });
      }.property( 'childViews'),
      
      /**
        Computes/returns the bounding rectangle for the view.
       */
      frame: function() {
        // Note that we're not providing scroll bars to scroll to left or above document
        var tWidth = 0, tHeight = 0,
            tParentFrame = this.parentView.get('frame');

        // Compute the content size as the bounding rectangle of the child views.
        this.get('componentViews').forEach(
                          function( iView) {
                            var tLayout = iView.get('layout');
                            tWidth = Math.max( tWidth, tLayout.left + tLayout.width);
                            tHeight = Math.max( tHeight, tLayout.top + tLayout.height);
                          });
        // Add a margin around the components as part of the content
        tWidth += kDocMargin;
        tHeight += kDocMargin;
        this.frameNeedsUpdate = false;

        // The 'frame' determines the content size for scrolling purposes.
        // We want to return the content size when it's larger than the
        // container size (so that it is possible to scroll to the edge of
        // the content), but also to return the entire size of the container
        // when the content is smaller, so that new objects can be placed in
        // the entire visible document space.
        if( tHeight > tParentFrame.height) {
          this.adjust('bottom', null);    // deletes the 'bottom' property
          this.adjust('height', tHeight); // fixes the 'height' to the content height
        }
        else {
          this.adjust('height', null);  // deletes the 'height' property
          this.adjust('bottom', 0);     // locks the 'bottom' to the parent
        }
        if( tWidth > tParentFrame.width) {
          this.adjust('right', null);   // deletes the 'right' property
          this.adjust('width', tWidth); // fixes the 'width' as the content width
        }
        else {
          this.adjust('width', null); // deletes the 'width' property
          this.adjust('right', 0);    // locks the 'right' to the parent
        }
        return { x: 0, y: 0, width: tWidth, height: tHeight };
      }.property('frameNeedsUpdate').cacheable(),
      
      removeComponentView: function( iComponentView) {
        DG.currDocumentController().removeComponentAssociatedWithView( iComponentView);
        iComponentView.destroy();
      },
      
      /**
        Removes all children from the parentView.
    
        @returns {SC.View} receiver
      */
      destroyAllChildren: function() {
        var childViews = this.get('childViews'), view ;
        childViews.forEach( function( iView) {
                              if( iView && iView.willDestroy)
                                iView.willDestroy();
                            });
        while (!SC.none(view = childViews.objectAt(childViews.get('length')-1))) {
          // Destroying a view removes it from parents as well
          view.destroy();
        }
        return this;
      },

      /* bringToFront - The given child view will be placed at the end of the list, thus
        rendered last and appearing in front of all others.
        Note: For the flash view this has the very undesirable effect of causing the 
          Flash object to be reloaded!
      */
      bringToFront: function( iChildView) {
        var tSaved = iChildView.layoutDidChange;  // save this for after changes
        iChildView.layoutDidChange = null;  // prevent specious notification of resizing
        this.removeChild( iChildView);
        this.appendChild( iChildView);
        iChildView.layoutDidChange = tSaved;  // reinstate
      },
      
      /* sendToBack - The given child view will be placed at the beginning of the list, thus
        rendered first and appearing behind all others.
      */
      sendToBack: function( iChildView) {
        var tChildViews = this.get('childViews' ),
            tSaved = iChildView.layoutDidChange;  // save this for after changes
        if( tChildViews.length === 1)
          return;   // Only one child, so it's already in back.
        iChildView.layoutDidChange = null;  // prevent specious notification of resizing
        this.removeChild( iChildView);
        this.insertBefore( iChildView, tChildViews[ 0]);
        iChildView.layoutDidChange = tSaved;  // reinstate
      },

      /** positionNewComponent - It is assumed that the given view has not yet been added
        and that its layout has the desired width and height.
        We find a non-overlapping position for the view and place it there.
        @param{DG.ComponentView} - the view to be positioned
      */
      positionNewComponent: function( iView) {
        var tViewRect = iView.get( 'frame'),
            tDocRect = this.parentView.get('clippingFrame');
        var tLoc = DG.ViewUtilities.findEmptyLocationForRect(
                                      tViewRect,
                                      tDocRect,
                                      this.get('componentViews'));
        iView.adjust( 'left', tLoc.x);
        iView.adjust( 'top', tLoc.y);
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
      }

    };  // object returned closure
  }()) // function closure
);

