// ==========================================================================
//                        DG.CaseTableOwnAttributeDragHelper
//                        DG.CaseTableForeignAttributeDragHelper
//
//  One of these helpers gets created during an attribute drag operation
//
//  Author:   William Finzer
//
//  Copyright (c) 2020 by The Concord Consortium, Inc. All rights reserved.
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
    A CaseTableDragHelper is the base class for the two kinds of helpers
 @extends SC.Object
 */
DG.CaseTableDragHelper = SC.Object.extend((function () // closure
    /** @scope DG.CaseTableDragHelper.prototype */ {

  return {  // return from closure

    /**
     * @property {DG.CaseTableView}
     */
    caseTableView: null,

    dragInfo: null,

    dataObject: null,

    /**
     * @property {DG.TipView}
     */
    tipView: null,

    tipString: null,

    init: function() {
      sc_super();
      this.tipView = DG.mainPage.getPath('mainPane.tipView');
    },

    destroy: function () {
      this.caseTableView = null;
      this.tipView = null;
      sc_super();
    },

    computeDragOperations: function (iDrag) {
      if (this.isValidAttribute(iDrag))
        return SC.DRAG_LINK;
      else
        return SC.DRAG_NONE;
    },

    dragStarted: function (iDrag) {
      this.set('dataObject', iDrag.data);
    },

    dragEnded: function () {
      this.set('dataObject', null);
    },

    dragEntered: function (iDragObject, iEvent) {
    },

    removeHighliting: function() {
      if (this.dragInfo) {
        this.caseTableView.$(this.dragInfo.headerNode)
            .removeClass(this.dragInfo.highliteClass);
      }
      this.get('tipView').hide();
    },

    acceptDragOperation: function (drag, op) {
      $('.sc-ghost-view').hide();
      var $dragTarget = $(document.elementFromPoint(drag.location.x, drag.location.y));//$(drag.event.target);
      var isOverHeader = $dragTarget.parents('.slick-header').length > 0;
      $('.sc-ghost-view').show();
      if (!isOverHeader) {
        this.removeHighliting();
      }
      return isOverHeader;
    },

    /**
     *
     * @param location{{x:number, y:number}}
     */
    updateHighliting: function (location) {
      var tParentView = this.caseTableView.parentView,
          slickGrid = tParentView._slickGrid,
          newDragInfo = this._computeDragInfo(slickGrid, location);

      if (newDragInfo) {
        newDragInfo.headerNode = (newDragInfo.columnIndex >= 0)
            && this.caseTableView.$('.slick-header-column',
                slickGrid.getHeaderRow())[newDragInfo.columnIndex];

        // if unchanged, we are done
        if (this.dragInfo &&
            (this.dragInfo.columnIndex === newDragInfo.columnIndex)
            && (this.dragInfo.nearerBound === newDragInfo.nearerBound)) {
          return;
        }
      }
      this.removeHighliting();
      this.dragInfo = newDragInfo;
      if (this.dragInfo) {
        this.dragInfo.highliteClass = this.highliteClassFor( this.dragInfo);
        this.caseTableView.$(this.dragInfo.headerNode).addClass(this.dragInfo.highliteClass);
        var tTipString = this.get('tipString');
        if( tTipString) {
          var tCellBox = slickGrid.getCellNodeBox(0, this.dragInfo.columnIndex),
              tBoxHeight = tCellBox.bottom - tCellBox.top,
              tTopLeft = DG.ViewUtilities.viewToWindowCoordinates(
                  {x: tCellBox.left, y: tCellBox.bottom + tBoxHeight}, this.caseTableView);
          this.get('tipView').show(tTopLeft, tTipString);
        }
      }
    },

    dragUpdated: function (iDragObject, iEvent) {
      this.updateHighliting(iDragObject.location);
    },

    dragExited: function (iDragObject, iEvent) {
      this.removeHighliting();
      this.dragInfo = null;
    },

    performDragOperation: function (iDragObject, iDragOp) {
      this.removeHighliting();
      var dragData = iDragObject.data;
      this._performDragOperation(dragData);
    }

  };
})()); // end closure

/** @class
    A CaseTableOwnAttributeDragHelper helps when the attribute being dragged is one of the attributes
 belonging to the table's data context.
 @extends DG.CaseTableDragHelper
 */
DG.CaseTableOwnAttributeDragHelper = DG.CaseTableDragHelper.extend((function () // closure
    /** @scope DG.CaseTableOwnAttributeDragHelper.prototype */ {

  return {

    highliteClassFor: function( iDragInfo) {
      return 'drag-insert-' + iDragInfo.nearerBound;
    },

    _performDragOperation: function (dragData) {
      var attr = dragData.attribute;
      var position;
      // if we have an insert point, then we initiate the move.
      // Otherwise we ignore the drop.
      if (this.dragInfo) {
        position = (this.dragInfo.nearerBound === 'right')
            ? this.dragInfo.columnIndex + 1
            : this.dragInfo.columnIndex;
        this.caseTableView.parentView.gridAdapter.requestMoveAttribute(attr, position);
      }
    },

    isValidAttribute: function (iDrag) {
      var tDragAttr = iDrag.data.attribute;
      return !SC.none(tDragAttr)
          && this.caseTableView.parentView.gridAdapter.canAcceptDrop(iDrag.data.attribute);
    },

    /**
     *
     * @param slickGrid
     * @param location {{x:number,y:number}}
     * @return {{columnIndex: number, nearerBound: string}|{columnIndex: *, nearerBound: string}}
     * @private
     */
    _computeDragInfo: function (slickGrid, location) {
      var gridPosition = slickGrid.getGridPosition(),
          headerRowHeight = slickGrid.getOptions().headerRowHeight,
          // compute cursor location relative to grid
          loc = {x: location.x - gridPosition.left, y: location.y - gridPosition.top},
          locX = loc.x,
          inHeader = loc.y < headerRowHeight,
          newDragInfo = null;
      if (inHeader) {
        var columnDefs = slickGrid.getColumns(),
            x = 0,
            colMiddle,
            colWidth,
            // Find the column with the closest boundary to locX. That is,
            // find the first column index whose midpoint is greater than locX.
            // If we don't find it, then the last column must be it.
            columnIndex = columnDefs.findIndex(function (def, ix, defs) {
              var result = false;
              colWidth = def.width || 0;
              colMiddle = x + (colWidth / 2);
              // skip row index
              if (ix > 0 && locX < colMiddle) {
                result = true;
              }
              x += colWidth;
              return result;
            });

        if (columnIndex >= 0) {
          newDragInfo = {
            columnIndex: columnIndex,
            nearerBound: 'left'
          };
        } else {
          newDragInfo = {
            columnIndex: columnDefs.length - 1,
            nearerBound: 'right'
          };
        }
      }
      return newDragInfo;
    }
  };
})()); // end closure

/** @class
    A CaseTableForeignAttributeDragHelper helps when the attribute being dragged belongs to a foreign
 data context.
 @extends DG.CaseTableDragHelper
 */
DG.CaseTableForeignAttributeDragHelper = DG.CaseTableDragHelper.extend((function () // closure
    /** @scope DG.CaseTableForeignAttributeDragHelper.prototype */ {

  return {

    highliteClassFor: function( iDragInfo) {
      return 'drag-hover';
    },

    /**
     * @property {string | null}
     */
    tipString: function() {
      var tResult = null,
          tDataObject = this.get('dataObject');
      if( tDataObject) {
        var tSourceKeyAttributeName = tDataObject.attribute.get('name'),
            tSourceCollectionName = tDataObject.collection.get('name'),
            tSourceContextName = tDataObject.context.get('name'),
            tGridAdapter = this.caseTableView.parentView.gridAdapter,
            tDestCollectionName = tGridAdapter && tGridAdapter.getPath('collection.name'),
            tDestContextName = tGridAdapter && tGridAdapter.getPath('dataContext.name'),
            tDestKeyAttributeName = tGridAdapter &&
                tGridAdapter.getAttributeFromColumnIndex(this.dragInfo.columnIndex).get('name');
        tResult = "DG.Collection.joinTip".loc(tSourceCollectionName,
            tSourceContextName, tDestCollectionName, tDestContextName,
            tSourceKeyAttributeName, tDestKeyAttributeName);
      }
      return tResult;
    }.property(),

    /**
     * We will define as many new attributes for each of the attributes in the foreign collection except
     *    the one being dragged.
     * The attribute being dragged will function as the "key attribute" in the "other dataset".
     * The attribute for the column we are on top of will be the "key value attribute."
     * The formula we will be writing will look like:
     *    lookupByKey("other dataset name", "name of attribute from other collection whose value we want",
     *                "name of key attribute", key value attribute)
     * @param dragData
     * @private
     */
    _performDragOperation: function (dragData) {
      var tKeyAttribute = dragData.attribute,
          tGridAdapter = this.caseTableView.parentView.gridAdapter,
          tThisContext = tGridAdapter && tGridAdapter.get('dataContext'),
          tThisCollection = tGridAdapter && tGridAdapter.get('collection'),
          tKeyValueAttribute = tGridAdapter && tGridAdapter.getAttributeFromColumnIndex(this.dragInfo.columnIndex);
      if( tKeyAttribute && tKeyValueAttribute && tThisContext) {
        DG.DataContextUtilities.joinSourceToDestCollection( tKeyAttribute, tThisContext,
            tThisCollection, tKeyValueAttribute);
      }
    },

    /**
     * If we've gotten here we can be sure our table view's context does not own the attribute.
     * We just need to make sure the attribute exists and has a collection.
     * @param iDrag
     * @return {boolean|*}
     */
    isValidAttribute: function (iDrag) {
      var tDragAttr = iDrag.data.attribute;
      return !SC.none(tDragAttr)
          && tDragAttr && tDragAttr.collection;
    },
    /**
     *
     * @param slickGrid
     * @param location {{x:number,y:number}}
     * @return {{columnIndex: number, nearerBound: string}|{columnIndex: *, nearerBound: string}}
     * @private
     */
    _computeDragInfo: function (slickGrid, location) {
      var gridPosition = slickGrid.getGridPosition(),
          headerRowHeight = slickGrid.getOptions().headerRowHeight,
          // compute cursor location relative to grid
          loc = {x: location.x - gridPosition.left, y: location.y - gridPosition.top},
          locX = loc.x,
          inHeader = loc.y < headerRowHeight,
          newDragInfo = null;
      if (inHeader) {
        var columnDefs = slickGrid.getColumns(),
            x = 0,
            colWidth,
            // Find the column with the closest boundary to locX. That is,
            // find the first column index whose midpoint is greater than locX.
            // If we don't find it, then the last column must be it.
            columnIndex = columnDefs.findIndex(function (def, ix, defs) {
              var result = false;
              colWidth = def.width || 0;
              // skip row index
              if (ix > 0 && locX < x + colWidth) {
                result = true;
              }
              x += colWidth;
              return result;
            });

        if (columnIndex >= 0) {
          newDragInfo = {
            columnIndex: columnIndex,
          };
        } else {
          newDragInfo = {
            columnIndex: columnDefs.length - 1,
          };
        }
      }
      return newDragInfo;
    }

  };
})()); // end closure

/**
 *
 * @param iTableView {DG.CaseTableView}
 * @param iDrag
 * @return {DG.CaseTableDragHelper || null}
 */
DG.CaseTableDragHelper.createHelper = function (iTableView, iDrag) {
  var tAttribute = iDrag.data.attribute,
      tContext = iTableView.parentView.gridAdapter && iTableView.parentView.gridAdapter.get('dataContext'),
      tAttributeCollection = tAttribute && tAttribute.collection,
      tContextOwnsAttribute = !!(tAttribute && tContext &&
          !SC.none(tContext.getCollectionByID(tAttributeCollection.id)));
  return tContextOwnsAttribute ?
      DG.CaseTableOwnAttributeDragHelper.create({caseTableView: iTableView}) :
      (tAttributeCollection ?
          DG.CaseTableForeignAttributeDragHelper.create({caseTableView: iTableView}) :
          null);
};