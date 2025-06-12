// ==========================================================================
//                          DG.ViewUtilities
//
//  A collection of utilities for manipulating views
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

DG.ViewUtilities = {

  kTitleBarHeight: 25,  // for component views
  kDragWidth: 8,  // for component views
  kBorderWidth: 4, // must correspond with .css constant
  kGridSize: 5,

  roundToGrid: function( iNumber) {
    return DG.ViewUtilities.kGridSize * Math.round( iNumber / DG.ViewUtilities.kGridSize);
  },

  floorToGrid: function( iNumber) {
    return DG.ViewUtilities.kGridSize * Math.floor( iNumber / DG.ViewUtilities.kGridSize);
  },

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
/*
      iWindowPt.x += iView.get('horizontalScrollOffset') || 0;
      iWindowPt.y += iView.get('verticalScrollOffs et') || 0;
*/
      iView = iView.parentView;
    } while( !SC.none( iView));
    // When embedded, CODAP need not be at the window origin
    // todo: Store this offset globally and recompute only when there's a DOM resize
    var codapOffset = $('#codap').offset();
    return { x: iWindowPt.x - codapOffset.left, y: iWindowPt.y - codapOffset.top };
  },

  /**
    Transform a given point in window coordinates to coordinates in the
    given view.
    @param iViewPt { {x: number, y: number}}
    @param iView { SC.View }
    @return { {x: number, y: number}}
  */
  viewToWindowCoordinates: function( iViewPt, iView) {
    var tFrame;
    do {
      tFrame = iView.get('frame');
      iViewPt.x += tFrame.x;
      iViewPt.y += tFrame.y;
/*
      iViewPt.x -= iView.get('horizontalScrollOffset') || 0;
      iViewPt.y -= iView.get('verticalScrollOffset') || 0;
*/
      iView = iView.parentView;
    } while( !SC.none( iView));
    // When embedded, CODAP need not be at the window origin
    var codapOffset = $('#codap').offset();
    return { x: iViewPt.x + codapOffset.left, y: iViewPt.y + codapOffset.top };
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

    If there is no empty rectangle such that the given rectangle fits, position it in the
    center and adjust down and right until there is no component whose top left is the same
    as the proposed location.

    Note that given rectangles and view frames are expected to have form
      { x, y, width, height }.
    In fact, rectangles that come from components like the about box have NAN's for
    x and y. We just consider them to be floating on top of everything and not intersecting.
    iItemRect is the rect we are trying to place
    iContainerRect is the visible rect in the browser window, with an upper left corner of 0, 0
    iOffset is the offset of that rect from the true top of the frame
    iViewRects are the rectangles where we cannot place iItemRect
    iPosition is either 'top' or 'bottom'
    return the location { x, y } for the rectangle.
  */
  findEmptyLocationForRect: function (iItemRect, iContainerRect, iOffset, iViewRects, iPosition) {
    var
        kGap = DG.ViewUtilities.kGridSize, // Also used to increment during search
        tStartAtBottom = (iPosition === 'bottom'),
        tLoc = {x: kGap + iOffset.x,
          y: (tStartAtBottom ? iContainerRect.height - iItemRect.height - kGap : kGap) + iOffset.y },
        tSuccess = false;

    function intersectRect(r1, r2) {
      var tRes = (!isNaN(r1.x) && !isNaN(r1.y)) && !(r2.x > r1.x + r1.width ||
          r2.x + r2.width < r1.x ||
          r2.y > r1.y + r1.height ||
          r2.y + r2.height < r1.y);
      return tRes;
    }

    /*  intersects - Iterate through iViews, returning true for the first view
     that intersects iItemRect placed at the given location, false
     if none intersect.
     */
    function intersects(iTopLeft) {
      return !iViewRects.every(
          function (iViewRect) {
            return !intersectRect(iViewRect,
                {
                  x: iTopLeft.x,
                  y: iTopLeft.y,
                  width: iItemRect.width,
                  height: iItemRect.height
                });
          });
    }

    function onTopOfViewRectTopLeft(iTopLeft) {
      return !iViewRects.every(
          function (iViewRect) {
            return !( iTopLeft.x === iViewRect.x && iTopLeft.y === iViewRect.y);
          });
    }

    // If there are no other views or reserved areas, simply return the initial
    // candidate.
    if (iViewRects.length === 0) {
      return tLoc;
    }

    // Work our way through the visible portion of the document
    while (!tSuccess && tLoc.y + iItemRect.height < iOffset.y + iContainerRect.height &&
              tLoc.y >= iOffset.y + kGap) {
      tLoc.x = iOffset.x + kGap;
      // left to right, making sure we got through at least once
      while (!tSuccess) {
        // Positioned at tLoc, does the item rect intersect any view rects?
        if (intersects(tLoc)) {
          tLoc.x += kGap;
          if (tLoc.x + iItemRect.width > iOffset.x + iContainerRect.x + iContainerRect.width)
            break;
        }
        else
          tSuccess = true;
      }
      if (!tSuccess)
        tLoc.y += (tStartAtBottom ? -kGap : kGap);
    }

    if( !tSuccess) {
      // Choose a location that will center the item rect in the container
      tLoc = { x: iOffset.x +
                    Math.max( this.kGridSize, Math.round((iContainerRect.width - iItemRect.width) / 2)),
              y: iOffset.y +
                    Math.max( this.kGridSize, Math.round((iContainerRect.height - iItemRect.height) / 2))
      };
      // Adjust down and to the right until there tLoc is not on top of the upper-right corner of a view rect
      while( !tSuccess) {
        if( !onTopOfViewRectTopLeft( tLoc)) {
          tSuccess = true;
        }
        else {
          tLoc = { x: tLoc.x + kGap, y: tLoc.y + this.kTitleBarHeight };
        }
      }
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
  },

  /**
   *
   * @param iView {SC.View} normally a child view of a ComponentView
   */
  componentViewForView: function( iView) {
    while( iView && !(iView instanceof DG.ComponentView)) {
      iView = iView.get('parentView');
    }
    return iView;
  }

};
