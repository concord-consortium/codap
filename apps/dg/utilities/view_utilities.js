// ==========================================================================
//                          DG.ViewUtilities
// 
//  A collection of utilities for manipulating views
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

DG.ViewUtilities = {

  kTitleBarHeight: 20,  // for component views
  kDragWidth: 8,  // for component views
  kBorderWidth: 4, // must correspond with .css constant

  /**
   * @returns {number} padding to add to interior of view to get view horizontal size.
   */
  horizontalPadding: function() {
    return 2 * DG.ViewUtilities.kDragWidth;  // kDragWidth width is used on left & right, and has 4 invisible pixels.
  },

  /**
   * @returns {number} padding to add tointerior of view to get view vertical size.
   */
  verticalPadding: function() {
    return DG.ViewUtilities.kDragWidth + // on bottom
      DG.ViewUtilities.kTitleBarHeight + DG.ViewUtilities.kBorderWidth; // on top
  },

  /**
    Transform a given point in window coordinates to coordinates in the
    given view.
    @param { Point as in {x: y: }}
    @param { SC.View }
    @return { Point as in {x: y: }}
  */
  windowToViewCoordinates: function( iWindowPt, iView) {
    var tFrame;
    do {
      tFrame = iView.get('frame');
      iWindowPt.x -= tFrame.x;
      iWindowPt.y -= tFrame.y;
      iWindowPt.x += iView.get('horizontalScrollOffset') || 0;
      iWindowPt.y += iView.get('verticalScrollOffset') || 0;
      iView = iView.parentView;
    } while( !SC.none( iView));
    return iWindowPt;
  },

  /**
    Transform a given point in window coordinates to coordinates in the
    given view.
    @param { Point as in {x: y: }}
    @param { SC.View }
    @return { Point as in {x: y: }}
  */
  viewToWindowCoordinates: function( iViewPt, iView) {
    var tFrame;
    do {
      tFrame = iView.get('frame');
      iViewPt.x += tFrame.x;
      iViewPt.y += tFrame.y;
      iViewPt.x -= iView.get('horizontalScrollOffset') || 0;
      iViewPt.y -= iView.get('verticalScrollOffset') || 0;
      iView = iView.parentView;
    } while( !SC.none( iView));
    return iViewPt;
  },

  /**
   * If the given view's layout is missing any of left, top, width, height,
   * set its layout to a new object reflecting its current position and dimensions.
   *
   * @param{SC.View} iView - The view whose layout is to be converted.
   */
  convertViewLayoutToAbsolute: function( iView) {
    var tLayout = iView.get('layout');
    if( SC.none( tLayout.left) || SC.none( tLayout.top) || SC.none( tLayout.width) || SC.none( tLayout.height)) {
      var tLayer = iView.get('layer');
      if( !SC.none( tLayer))
        iView.set('layout', { left: tLayer.offsetLeft, top: tLayer.offsetTop,
                            width: tLayer.offsetWidth, height: tLayer.offsetHeight });
    }
  },

  /* findEmptyLocationForRect: Given a component rectangle, a container rectangle and
    an array of views, return a location at which the component rectangle will fit.
    Note that the bottom of the container rectangle is ignored so that the location
    returned can be below the bottom.
    Note that given rectangles and view frames are expected to have form
      { x, y, width, height }.
    In fact, rectangles that come from components like the about box have NAN's for
    x and y. We just consider them to be floating on top of everything and not intersecting.
  */
  findEmptyLocationForRect: function( iItemRect, iContainerRect, iViews) {
    var
      kGap = 5, // Also used to increment during search
      tLoc = { x: kGap, y: kGap },
      tSuccess = false,
      tViewRects = iViews.map( function( iView) { return iView.get('frame'); })
      ;
    
    function intersectRect( r1, r2) {
      var tRes = (!isNaN( r1.x) && !isNaN( r1.y)) &&
                 !(r2.x > r1.x + r1.width ||
                 r2.x + r2.width < r1.x || 
                 r2.y > r1.y + r1.height ||
                 r2.y + r2.height < r1.y);
      return tRes;
    }
    
    /*  intersects - Iterate through iViews, returning true for the first view
        that intersects iItemRect placed at the given location, false
        if none intersect.
    */
    function intersects( iTopLeft) {
      return !tViewRects.every(
        function( iViewRect) {
          return !intersectRect( iViewRect, 
                  { x: iTopLeft.x,
                    y: iTopLeft.y,
                    width: iItemRect.width,
                    height: iItemRect.height
                  });
        });
    }
    
    // top to bottom
    while( !tSuccess) {
      tLoc.x = kGap;
      // left to right, making sure we got through at least once
      while( !tSuccess) {
        // Positioned at tLoc, does the item rect intersect any view rects?
        if( intersects( tLoc)) {
          tLoc.x += kGap;
          if( tLoc.x + iItemRect.width > iContainerRect.x + iContainerRect.width)
            break;
        }
        else
          tSuccess = true;
      }
      if( !tSuccess)
        tLoc.y += kGap;
    }
    return tLoc;
  },
  
  /* normalFormForRect: The given rectangle is expected to have properties left, top,
    right, and bottom. Return a rectangle with left <= right and bottom <= top.
  */
  normalFormForRect: function( iRect) {
    return { left: Math.min( iRect.left, iRect.right),
              top: Math.max( iRect.bottom, iRect.top),
              right: Math.max( iRect.left, iRect.right),
              bottom: Math.min( iRect.bottom, iRect.top)
        };
  },

  /* ptInRect: The given point should have properties x and y. The given rectangle should
    be in the form { x, y, width, height }. width and height >= 0.
    Return true if the given point is within or on the boundary of the given rectangle.
  */
  ptInRect: function( iPoint, iRect) {
    return (iPoint.x >= iRect.x) && (iPoint.x <= iRect.x + iRect.width) &&
           (iPoint.y >= iRect.y) && (iPoint.y <= iRect.y + iRect.height);
  }

};
