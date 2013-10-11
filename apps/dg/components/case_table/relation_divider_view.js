// ==========================================================================
//                      DG.RelationDividerView
// 
//  A view for use with the DG.HierTableView which divides the individual
//  case tables in the hierarchical table view. The DG.RelationDividerView
//  provides feedback indicating the relationships between the parent cases
//  in the table to its left and the child cases in the table to its right.
//  The DG.RelationDividerView view may include curves, coloring, shading, etc.
//  
//  Author:   Kirk Swenson
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
/*global DG, sc_static */

sc_require('views/raphael_base');

/** @class

  A RelationDividerView divides the individual case tables in the hierarchical table view.

  @extends SC.RaphaelBaseView
*/

// The width of the area between the left and right tables
DG.RDV_DIVIDER_WIDTH = 48;

/**
  The DG.RelationDividerView is the divider view between case tables in which relationship
  lines are drawn to indicate the parent-child relationships.
 */
DG.RelationDividerView = SC.View.extend( (function() {

      // The width of the horizontal portion of the relationship curves
  var RDV_RELATION_LEFT_MARGIN = 12,
      RDV_RELATION_RIGHT_MARGIN = 4,
      
      // The color of the lines bounding the relationship regions
      RDV_RELATION_STROKE_COLOR = '#808080', // middle gray
      
      // The color of the shaded area of the relationship regions
      RDV_RELATION_FILL_COLOR = '#EEEEEE',   // pale gray
      
      // The expand/collapse icon images
      RDV_EXPAND_ICON_URL = sc_static('slickgrid/images/expand.gif'),
      RDV_COLLAPSE_ICON_URL = sc_static('slickgrid/images/collapse.gif'),
      RDV_EXPAND_COLLAPSE_ICON_SIZE = { width: 9, height: 9 },
      
      kTouchMargin = 5;
  
  function getImageTouchZonePath( iImagePos, iImageSize) {
    var touchWidth = iImageSize.width + 2 * kTouchMargin,
        touchHeight = iImageSize.height + 2 * kTouchMargin,
        touchPathStr = 'M%@,%@ h%@ v%@ h%@ z'.
                          fmt( iImagePos.x - kTouchMargin,  // left
                               iImagePos.y - kTouchMargin,  // top
                               touchWidth,                  // across to right
                               touchHeight,                 // down
                               -touchWidth);                // across to left
    return touchPathStr;
  }
  
  return {  // return from closure

  layout: { width: DG.RDV_DIVIDER_WIDTH },

  /**
    Forwards to 'dividerView.leftTable'.
    @property {DG.CaseTableView}
   */
  leftTable: function( iKey, iValue) {
    if( iValue !== undefined) {
      this.setPath('dividerView.leftTable', iValue);
      return this;
    }
    return this.getPath('dividerView.leftTable');
  }.property(),
  
  /**
    Forwards to 'dividerView.rightTable'.
    @property {DG.CaseTableView}
   */
  rightTable: function( iKey, iValue) {
    if( iValue !== undefined) {
      this.setPath('headerView.rightTable', iValue);
      this.setPath('dividerView.rightTable', iValue);
      return this;
    }
    return this.getPath('dividerView.rightTable');
  }.property(),

  /**
    Forwards to subviews.
   */
  displayDidChange: function() {
    sc_super();
    
    var headerView = this.get('headerView'),
        dividerView = this.get('dividerView');
    if( headerView) headerView.displayDidChange();
    if( dividerView) dividerView.displayDidChange();
  },
  
  childViews: [ 'headerView', 'dividerView' ],
  
  headerView: DG.RaphaelBaseView.extend({
    layout: { left: 0, top: 0, right: 0, height: 24 },
    
    render: function( iContext, iFirstTime) {
      sc_super();
      iContext.classNames( ['slick-header','ui-state-default'], YES);
    },
    
    classNames: ['slick-header-column'],
    
    backgroundColor: '#E6E6E6',
    
    doDraw: function() {

      function shouldShowExpandAll( iCounts) {
        return iCounts && ((iCounts.expanded === 0) && (iCounts.collapsed > 0));
      }
      
      var table = this.get('rightTable'),
          adapter = this.getPath('rightTable.gridAdapter'),
          imageUrl = shouldShowExpandAll( adapter && adapter.get('expandCollapseCounts'))
                        ? RDV_EXPAND_ICON_URL
                        : RDV_COLLAPSE_ICON_URL,
          imagePos = { x: 3, y: 8 },
          imageSize = RDV_EXPAND_COLLAPSE_ICON_SIZE;

      function expandCollapseAll( iEvent) {
        if( adapter && table) {
          var counts = adapter.get('expandCollapseCounts');
          table.expandCollapseAll( shouldShowExpandAll( counts));
        }
      }
      
      // The touch object is a transparent rectangle which is larger than the
      // expand/collapse icon which responds to touch. This makes it easier to
      // hit the expand/collapse icon on touch platforms.
      this._paper .path( getImageTouchZonePath( imagePos, imageSize))
                  .attr({ fill: 'transparent', stroke: 'transparent' })
                  .touchstart( function( iEvent) {
                                  SC.run( expandCollapseAll( iEvent));
                                });
      this._paper .image( imageUrl, 
                          imagePos.x, imagePos.y, 
                          imageSize.width, imageSize.height)
                  .click( function( iEvent) {
                            SC.run( expandCollapseAll( iEvent));
                          });
    }
  }),

  dividerView: DG.RaphaelBaseView.extend({
    
    layout: { left: 0, top: 24, right: 0, bottom: 0 },
    
    backgroundColor: 'white',
    
    leftTable: null,
    
    rightTable: null,
    
    _parentChildRelationsMap: null,
    
    displayProperties: ['leftTable','rightTable'],
    
    doDraw: function() {
      var leftTable = this.get('leftTable'),
          leftAdapter = leftTable && leftTable.get('gridAdapter'),
          leftScrollTop = (leftTable && leftTable.getPath('scrollPos.scrollTop')) || 0,
          rightTable = this.get('rightTable'),
          rightAdapter = rightTable && rightTable.get('gridAdapter'),
          rightScrollTop = (rightTable && rightTable.getPath('scrollPos.scrollTop')) || 0,
          parentGroups = rightAdapter && rightAdapter.get('parentIDGroups'),
          leftYCoordForFilteredRows = 0,
          rightYCoordForFilteredRows = 0,
          rowHeight = rightAdapter && rightAdapter.get('rowHeight'),
          lastParentID = 0,
          this_ = this;
      
      if( !leftAdapter || !rightAdapter) {
        //DG.log("DG.RelationDividerView.doDraw: BAILING! Missing adapter(s)"); 
        return;
      }
      
      // Lazy creation of the '_parentChildRelationsMap' property
      if( !this._parentChildRelationsMap) this._parentChildRelationsMap = {};
      
      /**
        Builds the SVG path string which renders from the specified Y coordinate
        on the left table (iStartY) to the specified Y coordinate on the right
        table (iEndY). The path consists of a short horizontal segment (width
        specified by RDV_RELATION_MARGINs) on each side and a Bezier curve 
        which connects them.
        @param    {Number}  iStartY   The Y coordinate on the left table where the path should start
        @param    {Number}  iEndY     The Y coordinate on the right table where the path should end
        @returns  {String}            The SVG path string
       */
      function buildPathStr( iStartY, iEndY) {
        
        // All we need is a horizontal line
        if( iStartY === iEndY)
          return 'M0,%@ h%@'.fmt( iStartY, DG.RDV_DIVIDER_WIDTH);
        
        // startPoint, endPoint, midPoint, controlPoint relate to the Bezier portion of the path
        var startPoint = { x: RDV_RELATION_LEFT_MARGIN, y: iStartY },
            endPoint = { x: DG.RDV_DIVIDER_WIDTH - RDV_RELATION_RIGHT_MARGIN, y: iEndY },
            midPoint = { x: (startPoint.x + endPoint.x) / 2, 
                         y: (startPoint.y + endPoint.y) / 2 },
            controlPoint = { x: midPoint.x, y: startPoint.y };
        return 'M0,%@ h%@ Q%@,%@ %@,%@ T%@,%@ h%@'.fmt(
                  // Start point
                  startPoint.y,
                  // Horizontal segment
                  RDV_RELATION_LEFT_MARGIN,
                  // Bezier control point
                  controlPoint.x, controlPoint.y,
                  // Midpoint of curve (endpoint of first Bezier curve)
                  midPoint.x, midPoint.y,
                  // Endpoint of second Bezier curve (assumes reflected control point)
                  endPoint.x, endPoint.y,
                  // Horizontal segment
                  RDV_RELATION_RIGHT_MARGIN);
      }
      
      /**
        Builds the SVG path string which defines the boundary of the area to be
        shaded when shading the area between a parent row in the left table and
        its child rows in the right table. The area is bounded on the top and
        bottom by the same Bezier curves used to draw the paths and on the left
        and right by the edge of the corresponding table.
        @param    {Number}  iStartY1  The Y coordinate on the left table where the path should start
        @param    {Number}  iEndY1    The Y coordinate on the right table where the path should end
        @param    {Number}  iStartY2  The Y coordinate on the left table where the path should start
        @param    {Number}  iEndY2    The Y coordinate on the right table where the path should end
        @returns  {String}            The SVG path string
       */
      function buildFillPathStr( iStartY1, iEndY1, iStartY2, iEndY2) {
            // startPoint, endPoint relate to the Bezier portion of the path
        var startPoint2 = { x: RDV_RELATION_LEFT_MARGIN, y: iStartY2 },
            endPoint2 = { x: DG.RDV_DIVIDER_WIDTH - RDV_RELATION_RIGHT_MARGIN, y: iEndY2 },
            midPoint2 = { x: (startPoint2.x + endPoint2.x) / 2, 
                          y: (startPoint2.y + endPoint2.y) / 2 },
            controlPoint2 = { x: midPoint2.x, y: endPoint2.y };
        return '%@ V%@ h%@ Q%@,%@ %@,%@ T%@,%@ h%@ Z'.fmt(
                  // Use existing function for the first section
                  buildPathStr( iStartY1, iEndY1),
                  // vertical line (V)
                  endPoint2.y,
                  // horizontal line (h)
                  - RDV_RELATION_RIGHT_MARGIN,
                  // Quadratic Bezier curve (Q)
                  controlPoint2.x, controlPoint2.y,
                  // Midpoint
                  midPoint2.x, midPoint2.y,
                  // Shorthand quadratic Bezier curve (T) (assumes reflected control point)
                  startPoint2.x, startPoint2.y,
                  // horizontal line (h)
                  - RDV_RELATION_LEFT_MARGIN);
                  // close path (Z)
      }
      
      /**
        Utility function for computing the bounds of a given case in the table.
        For visible rows, calls DG.CaseTableView.getRowBounds() method.
        For collapsed rows, keeps a running tally of the current Y position and
        returns it for all collapsed rows.
        @param    {DG.CaseTableView}    iTable
        @param    {DG.CaseTableAdapter} iAdapter
        @param    {String}              iCaseID -- The ID of the case whose bounds are desired
        @param    {Number}              iYCoordForFilteredRows -- The Y coordinate to use for
                                        collapsed/filtered rows. Should be maintained by the client
                                        as the bottom Y coordinate of the previous visible row.
        @returns  {Object}              Bounds (left, top, right, bottom)
       */
      function getRowBoundsForCase( iTable, iAdapter, iCaseID, iYCoordForFilteredRows, iRowHeight) {
        var rowIndex = iAdapter.getIndexForID( iCaseID),
            rowBounds;
        if( SC.none( rowIndex)) {
          rowBounds = { left: 0, top: iYCoordForFilteredRows, 
                        right: 0, bottom: iYCoordForFilteredRows + iRowHeight };
        }
        else {
          rowBounds = iTable.getRowBounds( rowIndex);
        }
        return rowBounds;
      }
      
      /**
        Raphael event handler for the click on the expand/collapse icon.
        Sets the collapse/expand state internally and updates the SlickGrid DataView.
       */
      function expandCollapseClickHandler( iEvent) {
        var parentInfo = this.dgChildIDRange,
            isCollapsed = parentInfo && parentInfo.isCollapsed,
            gridDataView = rightAdapter && rightAdapter.gridDataView;
        parentInfo.isCollapsed = !isCollapsed;
        if( gridDataView) {
          if( parentInfo.isCollapsed)
            gridDataView.collapseGroup( this.dgParentID);
          else
            gridDataView.expandGroup( this.dgParentID);
  
            // Expanding/collapsing changes the set of rows that are selected
            rightTable.updateSelectedRows();
            rightTable.incrementProperty('expandCollapseCount');
        }
      }
      
      function adjustForGroupHeaderRow( ioRowBounds, iAdapter, iParentID) {
        var showExpandedGroupRows = iAdapter && iAdapter.get('showExpandedGroupRows');
        if( showExpandedGroupRows) {
          var dataView = iAdapter && iAdapter.get('gridDataView'),
              isCollapsed = dataView && dataView.isGroupCollapsed( iParentID);
          if( !isCollapsed)
            ioRowBounds.top -= rowHeight;
        }
      }
      
      /**
        Utility function which updates the path for the specified element if necessary
        or removes it if it's no longer necessary.
       */
      function updatePathOrRemove( iElement, iIsRequired, iPathStr) {
        if( iElement) {
          if( iIsRequired)
            iElement.attr({ path: iPathStr });
          else
            iElement.remove();
        }
      }
      
      /**
        Updates the parent-child lines. Creates new Raphael elements or updates
        existing ones as necessary. Marks each object visited so that stale
        objects can be removed.
        @param  iParentID     The ID of the parent case
        @param  iChildIDRange The corresponding entry in the parentGroups map, which
                              should contain firstChildID and lastChildID properties.
       */
      var parentIndex = 0;
      function updateParentChildRelations( iParentID, iChildIDRange) {
        var leftRowBounds = getRowBoundsForCase( leftTable, leftAdapter, iParentID,
                                                  leftYCoordForFilteredRows, 0),
            topRightRowBounds = getRowBoundsForCase( rightTable, rightAdapter,
                                                    iChildIDRange.firstChildID,
                                                    rightYCoordForFilteredRows, rowHeight),
            bottomRightRowBounds = getRowBoundsForCase( rightTable, rightAdapter,
                                                    iChildIDRange.lastChildID,
                                                    rightYCoordForFilteredRows, rowHeight),
            theRelation = this_._parentChildRelationsMap[ iParentID];
        
        if( !leftRowBounds || !topRightRowBounds || !bottomRightRowBounds) {
          //DG.log("DG.RelationDividerView.updateParentChildRelations: BAILING! L: %@, TR: %@, BR: %@",
          //        leftRowBounds, topRightRowBounds, bottomRightRowBounds);
          return;
        }
        
        adjustForGroupHeaderRow( topRightRowBounds, rightAdapter, iParentID);
        
        leftYCoordForFilteredRows = Math.max( leftYCoordForFilteredRows, leftRowBounds.bottom);
        rightYCoordForFilteredRows = Math.max( rightYCoordForFilteredRows, bottomRightRowBounds.bottom);
        
        // Create/update the lines
        if( leftRowBounds && topRightRowBounds && bottomRightRowBounds) {
              // Top path is always drawn (currently)
          var isTopPathRequired = true,
              // Bottom path is only drawn for the last parent
              isBottomPathRequired = iParentID === lastParentID,
              // Filled area is only drawn for alternate parents
              isFillPathRequired = parentIndex % 2,
              // Note that we must take scroll position into account
              topPathStr = isTopPathRequired
                              ? buildPathStr( leftRowBounds.top - leftScrollTop,
                                              topRightRowBounds.top - rightScrollTop)
                              : '',
              botPathStr = isBottomPathRequired
                              ? buildPathStr( leftRowBounds.bottom - leftScrollTop + 1,
                                              bottomRightRowBounds.bottom - rightScrollTop + 1)
                              : '',
              fillPathStr = isFillPathRequired
                              ? buildFillPathStr( leftRowBounds.top - leftScrollTop,
                                                  topRightRowBounds.top - rightScrollTop,
                                                  leftRowBounds.bottom - leftScrollTop + 1,
                                                  bottomRightRowBounds.bottom - rightScrollTop + 1)
                              : '',
              imageUrl = iChildIDRange.isCollapsed
                            ? RDV_EXPAND_ICON_URL
                            : RDV_COLLAPSE_ICON_URL,
              imagePos = { x: 3, y: leftRowBounds.top - leftScrollTop + 5 },
              imageSize = RDV_EXPAND_COLLAPSE_ICON_SIZE,
              //kTouchMargin = 5,
              //kTouchWidth = imageSize.width + 2 * kTouchMargin,
              //kTouchHeight = imageSize.height + 2 * kTouchMargin,
              touchPathStr = getImageTouchZonePath( imagePos, imageSize);
          
          // Create/update each of the elements
          if( !theRelation) {
            // Create the lines if necessary
            this_._parentChildRelationsMap[ iParentID] = theRelation = {};
            // Filled area is only drawn for alternate parents
            theRelation.area = isFillPathRequired
                                ? this_._paper.path( fillPathStr)
                                              .attr({ fill: RDV_RELATION_FILL_COLOR,
                                                      stroke: 'transparent' })
                                : null;
            // Top line is always drawn
            theRelation.top = isTopPathRequired
                                ? this_._paper.path( topPathStr)
                                              .attr({ stroke: RDV_RELATION_STROKE_COLOR })
                                : null;
            // The touch object is a transparent rectangle which is larger than the
            // expand/collapse icon which responds to touch. This makes it easier to
            // hit the expand/collapse icon on touch platforms.
            if( (SC.browser.os === SC.OS.ios) || (SC.browser.os === SC.OS.android)) {
              theRelation.touch = this_._paper.path( touchPathStr)
                                              .attr({ fill: 'transparent', stroke: 'transparent' })
                                              .touchstart( function( iEvent) {
                                                  SC.run( expandCollapseClickHandler.call( theRelation.icon, iEvent));
                                                });
            }
            theRelation.icon = this_._paper .image( imageUrl, 
                                                    imagePos.x, imagePos.y, 
                                                    imageSize.width, imageSize.height)
                                            .click( function( iEvent) {
                                                      SC.run( expandCollapseClickHandler.call( this, iEvent));
                                                    });
            theRelation.icon.dgParentID = iParentID;
            theRelation.icon.dgChildIDRange = iChildIDRange;
            if( isBottomPathRequired) {
              // We only draw the bottom line for the last range
              theRelation.bottom = this_._paper .path( botPathStr)
                                                .attr({ stroke: RDV_RELATION_STROKE_COLOR });
            }
          }
          // Update the elements if they already exist
          else {
            updatePathOrRemove( theRelation.top, isTopPathRequired, topPathStr);
            updatePathOrRemove( theRelation.area, isFillPathRequired, fillPathStr);
            updatePathOrRemove( theRelation.touch, true, touchPathStr);
            if( theRelation.icon)
              theRelation.icon.attr({ src: imageUrl, x: imagePos.x, y: imagePos.y });
            updatePathOrRemove( theRelation.bottom, isBottomPathRequired, botPathStr);
          }
          // Unmark the line, indicating that it is not stale and should not be removed.
          theRelation.marked = false;
          ++ parentIndex;
        }
      }
      
      // Mark all objects for deletion if they aren't visited in update loop
      DG.ObjectMap.forEach( this_._parentChildRelationsMap,
                            function( iParentID, iParentChildRelation) {
                              iParentChildRelation.marked = true;
                            });
  
      // Identify the last parent case ID
      DG.ObjectMap.forEach( parentGroups, function( iParentID) {
                                            if( lastParentID < iParentID)
                                              lastParentID = iParentID;
                                          });
      // Create/update the necessary lines. Marks visited objects.
      //DG.log("DG.RelationDividierView.doDraw: adapterID: %@, parentGroups: %@",
      //        DG.Debug.scObjectID( rightAdapter), DG.ObjectMap.length( parentGroups));
      DG.ObjectMap.forEach( parentGroups, updateParentChildRelations);
      
      // Utility function for use with DG.ObjectMap.forEach() which calls
      // the remove() method for each value object in the map.
      // Used to remove all Raphael objects when appropriate.
      function callRemoveMethod( iKey, iValue) {
        if( iValue && (typeof iValue.remove === 'function'))
          iValue.remove();
      }
      
      // Prune the map of any objects still marked for removal.
      DG.ObjectMap.forEach( this_._parentChildRelationsMap,
                            function( iParentID, iParentChildLines) {
                              if( iParentChildLines.marked) {
                                // Remove each Raphael object
                                DG.ObjectMap.forEach( iParentChildLines, callRemoveMethod);
                                // Delete the object from the map
                                delete this_._parentChildRelationsMap[ iParentID];
                              }
                            });
    }
    
  })

  };

}()));

