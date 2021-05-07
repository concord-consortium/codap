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
/*global sc_static */

sc_require('components/case_table/case_table_drop_target');
sc_require('views/raphael_base');

// The width of the area between the left and right tables
DG.RDV_DIVIDER_WIDTH = 48;

/**
  The DG.RelationDividerView is the divider view between case tables in which relationship
  lines are drawn to indicate the parent-child relationships.
 */
DG.RelationDividerView = DG.CaseTableDropTarget.extend( (function() {

      // The width of the horizontal portion of the relationship curves
  var RDV_RELATION_LEFT_MARGIN = 12,
      RDV_RELATION_RIGHT_MARGIN = 4,
      
      // The color of the lines bounding the relationship regions
      RDV_RELATION_STROKE_COLOR = '#808080', // middle gray
      
      // The color of the shaded area of the relationship regions
      RDV_RELATION_FILL_COLOR = '#EEEEEE',   // pale gray
      
      // The expand/collapse icon images
      RDV_NO_ACTION_ICON_URL = sc_static('slickgrid/images/no-action.png'),
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
      this.setPath('headerView.leftTable', iValue);
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
  }.observes('leftTable','rightTable'),
  
  childViews: [ 'headerView', 'dividerView', 'labelView' ],

  /** Shows the drop-target message when an attribute is dragged over. It needs to be added to the childViews array above. */
  labelView: SC.LabelView.extend({
    value: '',
    layout: {
      left: 2, right: 2, top: 2, bottom: 2
    }
  }),
  
  headerView: DG.RaphaelBaseView.extend({
    layout: { left: 0, top: 0, right: 0, height: 54 },
    
    render: function( iContext, iFirstTime) {
      sc_super();
      iContext.resetClasses();
      iContext.addClass( ['slick-header','ui-state-default'], YES);
    },
    
    classNames: [],
    
    backgroundColor: '#E6E6E6',

    expandCollapseIcon: null,

    expandCollapseMap: {
      'collapse': RDV_COLLAPSE_ICON_URL,
      'expand': RDV_EXPAND_ICON_URL,
      'noAction': RDV_NO_ACTION_ICON_URL
    },

    doDraw: function() {
      function computeAction () {
        var dataModel = leftAdapter.get('model');
        var tableCollection = leftAdapter.get('collection');
        var rowCount = gridDataView.getLength();
        var ix;
        var myCase;
        var isCollapsed;
        var hasCollapsed = false;
        var action = 'noAction';

        DG.assert(dataModel, "No data model");
        DG.assert(tableCollection, 'No associated collection');

        for (ix = 0; ix < rowCount; ix += 1) {
          myCase = gridDataView.getItem(ix);
          isCollapsed = dataModel.isCollapsedNode(myCase);
          // if the case is not an ancestor case for this collection and has
          // children, then it is either expanded or collapsed
          if ((myCase.get('collection').get('id') === tableCollection.get('id')) &&
              (myCase.children.length > 0)) {
            if (!isCollapsed) {
              action = 'collapse';
              return action;
            } else {
              hasCollapsed = true;
            }
          }
        }
        if (hasCollapsed) {
          action = 'expand';
        }
        return action;
      }
      
      function expandCollapseAll( iEvent) {
        SC.run(function () {
          var action = computeAction();
          switch (action) {
            case 'collapse':
              table.expandCollapseAll( false);
              break;
            case 'expand':
              table.expandCollapseAll( true);
              break;
          }
        });
      }

      var table = this.get('leftTable'),
          leftAdapter = this.getPath('leftTable.gridAdapter'),
          gridDataView = leftAdapter && leftAdapter.get('gridDataView'),
          action = computeAction(),
          imageUrl = this.expandCollapseMap[action],
          imageTitle = (action === 'collapse')? "DG.CaseTable.dividerView.collapseAllTooltip".loc():
              (action === 'expand')? "DG.CaseTable.dividerView.expandAllTooltip".loc(): '',
          imagePos = { x: 3, y: 38 },
          imageSize = RDV_EXPAND_COLLAPSE_ICON_SIZE;

      this.action = action;

      if (SC.none(this.expandCollapseIcon)) {
        // The touch object is a transparent rectangle which is larger than the
        // expand/collapse icon which responds to touch. This makes it easier to
        // hit the expand/collapse icon on touch platforms.
        this._paper.path( getImageTouchZonePath( imagePos, imageSize))
            .attr({ fill: 'transparent', stroke: 'transparent' })
            .touchstart( function( iEvent) {
              SC.run( expandCollapseAll( iEvent));
            });
        this.expandCollapseIcon = this._paper.image( imageUrl,
            imagePos.x, imagePos.y,
            imageSize.width, imageSize.height)
            .click( function( iEvent) {
              SC.run( expandCollapseAll( iEvent));
            })
            .attr('title', imageTitle)
            .setClass(action);
      } else {
        this.expandCollapseIcon
            .attr({src: imageUrl, title: imageTitle, x: imagePos.x, y: imagePos.y})
            .setClass(action);
      }
    }
  }),

  dividerView: DG.RaphaelBaseView.extend({

    layout: { left: 0, top: 54, right: 0, bottom: 0 },
    
    backgroundColor: 'white',
    
    leftTable: null,
    
    rightTable: null,

    tableRefreshObserver: function() {
      this.notifyPropertyChange('tableDidRefresh');
    }.observes('*leftTable.gridAdapter.tableDidRefresh','*rightTable.gridAdapter.tableDidRefresh'),

    /**
     * This hash map maps parent case id to child group information.
     * @type {object}
     */
    _parentChildRelationsMap: null,
    
    displayProperties: ['tableDidRefresh'],

    doDraw: function() {
      var leftTable = this.get('leftTable'),
          leftAdapter = leftTable && leftTable.get('gridAdapter'),
          leftScrollTop = (leftTable && leftTable.getPath('scrollPos.scrollTop')) || 0,
          rightTable = this.get('rightTable'),
          rightAdapter = rightTable && rightTable.get('gridAdapter'),
          rightScrollTop = (rightTable && rightTable.getPath('scrollPos.scrollTop')) || 0,
          this_ = this;

      // We can get a request to draw before we are ready.
      if (!leftAdapter || !rightAdapter || SC.none(leftTable._slickGrid)) {
        //DG.log("DG.RelationDividerView.doDraw: BAILING! Missing adapter(s)");
        return;
      }

      // Lazy creation of the '_parentChildRelationsMap' property
      if (!this._parentChildRelationsMap) this._parentChildRelationsMap = [];

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
        Raphael event handler for the click on the expand/collapse icon.
        Sets the collapse/expand state internally and updates the SlickGrid DataView.
       */
      function expandCollapseClickHandler( iEvent) {
        var parentInfo = this.dgChildIDRange,
            isContained = (parentInfo && parentInfo.isContained),
            isCollapsed = (parentInfo && parentInfo.isCollapsed),
            parentID = this.dgParentID;
        parentInfo.isCollapsed = !isCollapsed;
        if( leftTable && !isContained) {
          DG.UndoHistory.execute(DG.Command.create({
            name: 'caseTable.expandCollapseOneCase',
            undoString: 'DG.Undo.caseTable.expandCollapseOneCase',
            redoString: 'DG.Redo.caseTable.expandCollapseOneCase',
            log: '%@ case %@'.loc(isCollapsed?'Expand':'Collapse', this.dgParentID),
            execute: function () {
              if(isCollapsed) {
                leftTable.expandCase( parentID);
              }
              else {
                leftTable.collapseCase( parentID);
              }
              rightTable.updateSelectedRows(true);
              rightTable.incrementProperty('expandCollapseCount');
            },
            undo: function () {
              if( isCollapsed)
                leftTable.collapseCase( parentID);
              else
                leftTable.expandCase( parentID);
              rightTable.updateSelectedRows(true);
              rightTable.incrementProperty('expandCollapseCount');
            },
            redo: function () {
              this.execute();
            }
          }));
        }
      }

      function determineImageURL(iChildIDRange) {
        return iChildIDRange.isContained
            ? RDV_NO_ACTION_ICON_URL
            : (iChildIDRange.isCollapsed
            ? RDV_EXPAND_ICON_URL
            : RDV_COLLAPSE_ICON_URL);
      }

      function getRowBounds(iLeftTable, iRightTable, iParentRow, topRightRow, bottomRightRow) {
        var leftRowBounds = iLeftTable.getRowBounds(iParentRow);
        var topRightRowBounds = iRightTable.getRowBounds(topRightRow);
        var bottomRightRowBounds = iRightTable.getRowBounds(bottomRightRow);
        var isTopLine = (iParentRow === 0) || (topRightRow === 0);
        if (leftRowBounds && topRightRowBounds && bottomRightRowBounds) {
          return {
            leftTop: leftRowBounds.top + (!isTopLine ? 1 : 0),
            leftBottom: leftRowBounds.bottom + 1,
            rightTop: topRightRowBounds.top + (!isTopLine ? 1 : 0),
            rightBottom: bottomRightRowBounds.bottom + 1
          };
        }
      }

      /**
       * Utility function which updates the path for the specified element if necessary
       * or hides it if it's no longer necessary.
       */
      function updatePathOrHide(iElement, iIsRequired, iPathStr) {
        if (iElement) {
          if (iIsRequired) {
            iElement.attr({path: iPathStr});
            iElement.show();
          } else {
            iElement.hide();
          }
        }
      }

      /**
       * Updates the parent-child lines. Creates new Raphael elements or updates
       * existing ones as necessary. Marks each object visited so that stale
       * objects can be removed.
       *
       * @param  iRelation {Object} Elements describing the relation between a parent
       *                       row and some number of children. This may consist
       *                       of a top line, an expand/collapse control, a touch
       *                       area, an area shape, and possibly a bottom line.
       * @param  iParentRow {number} Index of the parent row.
       * @param  iParentID  {number} The ID of the parent case
       * @param  iChildIDRange {{firstChildID: {number}, lastChildID: {number}, isCollapsed: {boolean}}}
       * The corresponding entry in the parentGroups map, which
       * should contain firstChildID and lastChildID properties.
       */
      function updateParentChildRelations(ix, iParentRow, iParentID, iChildIDRange) {
        var isRightCollapsed = iChildIDRange.isCollapsed || iChildIDRange.isContained;
        var topRightRow = rightAdapter.get('gridDataView').getRowById(
              isRightCollapsed ? iParentID : iChildIDRange.firstChildID);
        var bottomRightRow = rightAdapter.get('gridDataView').getRowById(
              isRightCollapsed ? iParentID : iChildIDRange.lastChildID);
        var rowBounds = getRowBounds(leftTable, rightTable, iParentRow,
              topRightRow, bottomRightRow);
        if (SC.none(rowBounds)) {
          return;
        }
        var isFillRequired = iParentRow % 2;
        var isBottomRequired = iChildIDRange.renderBottom;
        var imageUrl = determineImageURL(iChildIDRange);
        var imagePos = {x: 3, y: rowBounds.leftTop - leftScrollTop + 5};
        var imageSize = RDV_EXPAND_COLLAPSE_ICON_SIZE;
        var action = iChildIDRange.isContained? 'none': iChildIDRange.isCollapsed? 'expand': 'collapse';
        var imageTitle = (action === 'collapse')? "DG.CaseTable.dividerView.collapseGroupTooltip".loc():
            (action === 'expand')? "DG.CaseTable.dividerView.expandGroupTooltip".loc(): '';
        var touchPathStr = getImageTouchZonePath(imagePos, imageSize);
        var topPathStr = buildPathStr(rowBounds.leftTop - leftScrollTop,
              rowBounds.rightTop - rightScrollTop);
        var bottomPathStr = isBottomRequired? buildPathStr( rowBounds.leftBottom - leftScrollTop + 1,
            rowBounds.rightBottom - rightScrollTop + 1): '';
        var fillPathStr = isFillRequired ? buildFillPathStr(
              rowBounds.leftTop - leftScrollTop,
              rowBounds.rightTop - rightScrollTop,
              rowBounds.leftBottom - leftScrollTop + 1,
              rowBounds.rightBottom - rightScrollTop + 1) : '';

        var relation = this_._parentChildRelationsMap[ix];
        if (!relation) {
          relation = this_._parentChildRelationsMap[ix] = {};
          relation.top = this_._paper.path(topPathStr).attr(
              {stroke: RDV_RELATION_STROKE_COLOR});
          relation.bottom = this_._paper.path(bottomPathStr).attr(
              {stroke: RDV_RELATION_STROKE_COLOR});
          if (!isBottomRequired) {
            relation.bottom.hide();
          }
          relation.area = this_._paper.path(fillPathStr).attr(
                {fill: RDV_RELATION_FILL_COLOR, stroke: 'transparent'});
          if (!isFillRequired) relation.area.hide();
          // The touch object is a transparent rectangle which is larger than the
          // expand/collapse icon which responds to touch. This makes it easier to
          // hit the expand/collapse icon on touch platforms.
          if ((SC.browser.os === SC.OS.ios) || (SC.browser.os === SC.OS.android)) {
            relation.touch = this_._paper.path(touchPathStr)
                .attr({fill: 'transparent', stroke: 'transparent'})
                .touchstart(function (iEvent) {
                  SC.run(expandCollapseClickHandler.call(relation.icon,
                      iEvent));
                });
          }
          relation.icon = this_._paper
              .image(imageUrl, imagePos.x, imagePos.y, imageSize.width,
                  imageSize.height)
              .setClass(action)
              .click(function (iEvent) {
                SC.run(expandCollapseClickHandler.call(this, iEvent));
              }).attr('title', imageTitle);
        } else {
          updatePathOrHide(relation.top, true, topPathStr);
          updatePathOrHide(relation.bottom, isBottomRequired, bottomPathStr);
          updatePathOrHide(relation.area, isFillRequired, fillPathStr);
          updatePathOrHide(relation.touch, true, touchPathStr);
          relation.icon.attr({src: imageUrl, x: imagePos.x, y: imagePos.y, title: imageTitle})
              .setClass(action)
              .show();
        }
        relation.icon.dgParentID = iParentID;
        relation.icon.dgChildIDRange = iChildIDRange;
        return relation;
      }

      function hideRelationshipElements(ix) {
        var relation = this_._parentChildRelationsMap[ix];
        if (relation) {
          updatePathOrHide(relation.icon, false, '');
          updatePathOrHide(relation.top, false, '');
          updatePathOrHide(relation.bottom, false, '');
          updatePathOrHide(relation.area, false, '');
          updatePathOrHide(relation.touch, false, '');
        }
      }

      function updateRelationsLines() {
        if (!leftTable || !rightTable || leftTable.get('gridWidth') === 0 || rightTable.get('gridWidth') === 0) {
          //DG.log('DoDraw called on RelationDividerView, but tables not ready.');
          return;
        }
        var leftViewport = leftTable.get('gridViewport');
        var viewportCount = leftViewport.bottom - leftViewport.top;
        var leftDataView = leftAdapter.get('gridDataView');
        var rightDataView = rightAdapter.get('gridDataView');
        var rightProtoCase = rightAdapter.getProtoCase();
        var rightProtoCaseID = rightProtoCase && rightProtoCase.get('id');
        var rightProtoCaseIndex = rightDataView && rightDataView.getRowById(rightProtoCaseID);
        var protoCaseParentID = rightProtoCase && rightProtoCase.get('parentCaseID');
        var ix;
        var rowIx;
        var parentID;
        var parentCase;
        var nextParentCase;
        var lastParentCase;
        var childIDRange;
        var hasProtoCaseChild;
        var firstChildID;
        var firstChildIndex;
        var lastChildID;
        var lastChildIndex;

        DG.assert(leftViewport, 'leftViewport missing');
        DG.assert(leftDataView, 'leftDataView missing');

        for (ix = 0; ix < viewportCount; ++ix) {
          var parentItem = leftDataView.getItem(leftViewport.top + ix);
          if (parentItem && !parentItem._isProtoCase)
            lastParentCase = parentItem;
        }

        // for each visible row in the left-hand table compute the relationship
        // graphic
        for (ix = 0; ix < viewportCount; ix += 1) {
          rowIx = ix + leftViewport.top;
          parentCase = leftDataView.getItem(rowIx);
          nextParentCase = leftDataView.getItem(rowIx + 1);

          // if we found a parent case, compute the extent of its children and
          // its state, then make the appropriate graphics. Otherwise, hide
          // whatever elements may already be present.
          if (parentCase && parentCase.children[0]) {
            parentID = parentCase.get('id');
            hasProtoCaseChild = (protoCaseParentID === parentID) ||
                                  (!protoCaseParentID && (parentCase === lastParentCase));
            firstChildID = parentCase.children[0].get('id');
            firstChildIndex = rightDataView && rightDataView.getRowById(firstChildID);
            if (hasProtoCaseChild && (rightProtoCaseIndex < firstChildIndex)) {
              firstChildID = rightProtoCaseID;
            }
            lastChildID = parentCase.children[parentCase.children.length - 1].get('id');
            lastChildIndex = rightDataView && rightDataView.getRowById(lastChildID);
            if (hasProtoCaseChild && (rightProtoCaseIndex > lastChildIndex)) {
              lastChildID = rightProtoCaseID;
            }
            childIDRange = {
              firstChildID: firstChildID,
              lastChildID: lastChildID,
              isCollapsed: leftAdapter.model.isCollapsedNode(parentCase),
              isContained: (parentCase.get('collection').get('id') !==
                            leftAdapter.get('collection').get('id')),
              renderBottom: !nextParentCase || nextParentCase._isProtoCase
            };
            updateParentChildRelations(ix, rowIx, parentID, childIDRange);
          } else {
            hideRelationshipElements(ix);
          }
        }
        // if the viewport has shrunk, hide additional lines
        for (ix = viewportCount; ix < this_._parentChildRelationsMap.length; ix += 1) {
          hideRelationshipElements(ix);
        }
      }

      updateRelationsLines();
    }
  })

  };

}()));
