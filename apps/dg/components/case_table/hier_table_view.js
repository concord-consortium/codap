// ==========================================================================
//                        DG.HierTableView
// 
//  A wrapper view for multiple DG.CaseTableViews.
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

sc_require('components/case_table/case_table_view');
sc_require('components/case_table/relation_divider_view');

/** @class

  A HierTableView contains a multiple scrollable data grid views.

  The DG.HierTableView is the superview for the individual DG.CaseTableViews and the
  DG.RelationDividerViews that are used to divide them.
  Eventually, it will need to support an arbitrary number of collections, rather than
  being hard-coded at two as it is now.

  @extends SC.SplitView
*/
DG.HierTableView = SC.SplitView.extend( (function() {
/** @scope DG.HierTableView.prototype */

  var kColumnHeaderBackgroundColor = '#E6E6E6',
      kDefaultColumnWidth = 60,
      kMinTableWidth = kDefaultColumnWidth,
      kMinSlop = 7;

  return {
  
  /**
    The data context for which the table is displaying data.
    @property   {DG.DataContext}
   */
  dataContext: null,
  
  layout: { left: 0, top: 0, right: 0, bottom: 0 },
  
  /**
    Lay out subtables left-to-right.
    @property
   */
  layoutDirection: SC.LAYOUT_HORIZONTAL,
  
  /**
    Child views currently limited to two subtables, but should be extensible down the road.
   */
  childViews: [ 'parentTableView', 'relationDividerView', 'childTableView', 'slopView' ],
  
  /**
    The left table showing the parent cases.
   */
  parentTableView: DG.CaseTableView.extend( SC.SplitChild, {
                                              name: 'parentTableView', 
                                              minimumSize: kMinTableWidth,
                                              autoResizeStyle: SC.RESIZE_AUTOMATIC,
                                              compensatesForMovement: YES
                                            }),
  /**
    The space between the tables showing the case relations.
   */
  relationDividerView: DG.RelationDividerView.extend( SC.SplitChild, {
                                              name: 'relationDividerView',
                                              minimumSize: DG.RDV_DIVIDER_WIDTH,
                                              maximumSize: DG.RDV_DIVIDER_WIDTH,
                                              size: DG.RDV_DIVIDER_WIDTH,
                                              autoResizeStyle: SC.FIXED_SIZE,
                                              compensatesForMovement: NO,
                                              allowsIndirectAdjustments: NO
                                            }),
  /**
    The right table showing the child cases.
   */
  childTableView: DG.CaseTableView.extend( SC.SplitChild, {
                                              name: 'childTableView',
                                              minimumSize: kMinTableWidth,
                                              autoResizeStyle: SC.RESIZE_MANUAL,
                                              compensatesForMovement: function() {
                                                var slopSize = this.getPath('parentView.slopView.size');
                                                // We only compensate if the slop view can't
                                                return slopSize <= kMinSlop;
                                              }.property()
                                          }),
  slopView: SC.View.extend( SC.SplitChild, {
                                name: 'slopView',
                                minimumSize: kMinSlop,
                                size: kMinSlop,
                                autoResizeStyle: SC.RESIZE_MANUAL,
                                compensatesForMovement: YES,
                                
                                backgroundColor: kColumnHeaderBackgroundColor
                            }),
  
  /**
    An array of child table view object, one for each subtable.
    @property   {Array of DG.CaseTableView}
   */
  childTableViews: function() {
    var childViews = this.get('childViews') || [],
        childTableViews = [];
    childViews.forEach( function( iChildView) {
                          if( iChildView.kindOf( DG.CaseTableView))
                            childTableViews.push( iChildView);
                        });
    return childTableViews;
  }.property(),

  /**
    Destruction method.
   */
  willDestroy: function() {
    var childViews = this.get('childTableViews');
    childViews.forEach( function( iView) {
                          if( iView && iView.willDestroy)
                            iView.willDestroy();
                        });
  },

  /**
   * Returns a view instance to be used as a divider between two other views,
   * or null if no divider should be used.
   *
   * The value of the 'splitDividerView' property will be instantiated. The default
   * value of this property is 'SC.SplitDividerView'. If the value is null or undefined,
   * null will be returned, and the SplitView will not automatically create dividers.
   *
   * You may override this method in a delegate.
   *
   * @param {SC.SplitView} splitView The split view that is hte parent of the
   * two views.
   * @param {SC.View} view1 The first view.
   * @param {SC.View} view2 The second view. 
   * @returns {SC.View} The view instance to use as a divider.
  */
  splitViewDividerBetween: function(splitView, view1, view2){
    if (!this.get('splitDividerView')) return null;
    
    if( view1 === this.get('parentTableView'))
      return this.get('splitDividerView').create();
    return DG.InertSplitDividerView.create();
  },
  
  /**
    Refreshes each of the individual table views.
   */
  refresh: function() {
    var childTableViews = this.get('childTableViews');
    childTableViews.forEach( function( iTableView) { iTableView.refresh(); });
  },
  
  mouseDown: function() {
    // Background clicks should complete any current edit
    DG.globalEditorLock.commitCurrentEdit();
  },
  
  
  /**
    Observer function called when either of the child tables is changed.
    This occurs when changing from one game to another, for instance.
   */
  _klugeAdjust: false,
  gridViewDidChange: function( iNotifier) {
    this.get('relationDividerView').displayDidChange();

    // adjusting the width fixes initial redraw problems in Safari
    if( !this._klugeAdjust) {
      this._klugeAdjust = true;
      var tComponentView = DG.ComponentView.findComponentViewParent( this),
          tComponentFrame = tComponentView && tComponentView.get('frame'),
          tComponentWidth = tComponentFrame && tComponentFrame.width;
      if( tComponentWidth)
        tComponentView.adjust('width', tComponentWidth + 1);
    }
  }.observes('.parentTableView.gridView','.childTableView.gridView'),

  /**
    Observer function called when the overall gridWidth of the parent table changes.
    Note that this is a content width notification, rather than a view size notification.
    @param    {DG.CaseTableView}    iNotifier -- the table view whose width changed
   */
  gridWidthDidChange: function( iNotifier) {
    var curMaxWidth = iNotifier && iNotifier.get('maximumSize'),
        newMaxWidth = iNotifier && iNotifier.get('gridWidth'),
        isColumnResize = false; // currently, no way to know

    if( iNotifier && (newMaxWidth !== curMaxWidth)) {
      iNotifier.set('maximumSize', newMaxWidth);
      
      if( isColumnResize) {
        // In theory, a more tailored response is possible if we know
        // the user is resizing a column, but that information is not
        // straightforward to determine from SlickGrid and the generic
        // behavior seems reasonable at the moment. This logic is being
        // left in place in case the need arises down the road.
        this.columnWidthDidChange( iNotifier);
      }
      else {
        // Set the 'size' of the child table to its desired size
        iNotifier.set('size', newMaxWidth);
        this.invokeOnce('_scsv_tile');
      }
    }
  }.observes('.parentTableView.gridWidth','.childTableView.gridWidth'),
  
  childTableLayoutDidChange: function( iNotifier) {
    var parentTable = this.get('parentTableView'),
        dividerView = this.get('relationDividerView'),
        childTable = this.get('childTableView');
    // Force a repaint when layout changes. Not clear why invokeLater() is required,
    // but other options (e.g. invokeOnce(), invokeLast()) don't generate the necessary
    // updates at least on WebKit browsers.
    if( parentTable) this.invokeLater( function() { parentTable.displayDidChange(); });
    if( dividerView) this.invokeLater( function() { dividerView.displayDidChange(); });
    if( childTable) this.invokeLater( function() { childTable.displayDidChange(); });
  }.observes('.parentTableView.size','.childTableView.size'),
  
  /**
    Respond to a resize of a table column. There are special cases here that
    need to be handled separately to get reasonable response to column resizing.
    @param    {DG.CaseTableView}    iNotifier -- the table view whose column width changed
   */
  columnWidthDidChange: function( iNotifier) {
    var adjustment = iNotifier.get('gridWidthChange'),
        parentTable = this.get('parentTableView'),
        childTable = this.get('childTableView'),
        tableView = iNotifier,
        tableSize = tableView && tableView.get('size'),
        tableContent = tableView && tableView.get('gridWidth'),
        otherTableView = iNotifier === childTable ? parentTable : childTable,
        slopView = this.get('slopView'),
        slopSize = slopView && slopView.get('size'),
        slopAvailable = slopSize - kMinSlop;
    // Special case: increasing the width of a table in the presence of the slop view.
    // Eat up the slop before we start hiding parts of the resizing table view.
    if( (adjustment > 0) && (slopAvailable > 0)) {
      var slopAdjustment = Math.max( 0, Math.min( adjustment, slopAvailable));
      this.splitViewAdjustChildToFit( this, tableView, slopAdjustment);
      this.splitViewAdjustChildToFit( this, slopView, -slopAdjustment, slopSize);
      this.splitViewLayoutChildren( this);
    }
    // Special case: Shrinking a column in a fully visible table.
    // First, try to show more of the other table, then increase 
    // the slop once the other table is fully visible.
    else if( (adjustment < 0) && (tableContent + adjustment <= tableSize)) {
      var remainder, tableAdjustment;
      remainder = this.splitViewAdjustChildToFit( this, tableView, adjustment);
      tableAdjustment = adjustment - remainder;
      if( tableAdjustment !== 0)
        tableAdjustment = this.splitViewAdjustChildToFit( this, otherTableView, -tableAdjustment);
      if( tableAdjustment !== 0)
        this.splitViewAdjustChildToFit( this, slopView, tableAdjustment, slopSize + tableAdjustment);
      this.splitViewLayoutChildren( this);
    }
  },
  
  /**
    Observer function called when the number of rows in the parent table changes.
   */
  rowCountDidChange: function() {
    this.relationDividerView.displayDidChange();
  }.observes('.parentTableView.rowCount','.childTableView.rowCount'),
  
  /**
    Observer function called when the parent table is scrolled.
    Note that scroll handlers are triggered from jQuery event handlers,
    and so must use SC.run() for SC updates to be triggered appropriately.
   */
  tableDidScroll: function() {
    SC.run( function() {
      this.relationDividerView.displayDidChange();
    }.bind( this));
  }.observes('.parentTableView.scrollPos','.childTableView.scrollPos'),
  
  /**
    Observer function called when a row is expanded/collapsed.
   */
  tableDidExpandCollapse: function() {
    SC.run( function() {
      this.relationDividerView.displayDidChange();
    }.bind( this));
  }.observes('.parentTableView.expandCollapseCount','.childTableView.expandCollapseCount'),
  
  /**
    Attaches the specified set of DG.CaseTableAdapters to the individual child table views.
    @param  {Array of DG.CaseTableAdapter}
   */
  setCaseTableAdapters: function( iAdapters) {
    var childTableViews = this.get('childTableViews');
    childTableViews.forEach( function( iTableView, iIndex) {
                              var adapter = iAdapters.objectAt( iIndex);
                              iTableView.set('gridAdapter', adapter);
                            });
    var parentTable = this.get('parentTableView'),
        childTable = this.get('childTableView'),
        relationView = this.get('relationDividerView');
    if( relationView && parentTable && childTable) {
      relationView.set('leftTable', parentTable);
      relationView.set('rightTable', childTable);
    }
  },
  
  /**
    Refreshes the column header information for each subtable view.
   */
  updateColumnInfo: function() {
    var childTableViews = this.get('childTableViews') || [];
    childTableViews.forEach( function( iTableView) {
                                iTableView.updateColumnInfo();
                            });
  },
  
  /**
    Refreshes the row data for each subtable view.
   */
  updateRowData: function() {
    var childTableViews = this.get('childTableViews') || [];
    childTableViews.forEach( function( iTableView) {
                                iTableView.updateRowData();
                            });
  },

  /**
    Updates the row count for each subtable view.
   */
  updateRowCount: function() {
    var childTableViews = this.get('childTableViews') || [];
    childTableViews.forEach( function( iTableView) {
                                iTableView.updateRowCount();
                            });
  },
  
  /**
    Updates the set of selected rows for each subtable view.
   */
  updateSelectedRows: function() {
    var childTableViews = this.get('childTableViews') || [];
    childTableViews.forEach( function( iTableView) {
                                iTableView.updateSelectedRows();
                            });
  },

  /**
    Helper method used by splitViewResizeChildrenToFit.
    Resizes a single view to the specified parameters.
    @param    {SC.SplitView}  iSplitView -- The split view
    @param    {SC.SplitChild} iChildView -- The split child whose size is to be adjusted
    @param    {Number}        iAdjustmentRequired -- The required size adjustment, where
                                  positive values indicate increasing view sizes and
                                  negative values indicate decreasing view sizes
    @param    {Number}        iViewMax -- (Optional) The maximum size of the child view.
                                  If not specified, iChildView.get('gridWidth') will be used.
    @returns  {Number}        The remaining adjustmentRequired
   */
  splitViewAdjustChildToFit: function( iSplitView, iChildView, iAdjustmentRequired, iViewMax) {
    var minSize = iChildView && iChildView.get('minimumSize'),
        maxSize = !SC.none( iViewMax) ? iViewMax : Math.max( minSize, iChildView && iChildView.get('gridWidth')),
        viewSize = iChildView && iChildView.get('size'),
        adjustment = 0;
    if( iAdjustmentRequired > 0)
      adjustment = Math.min( iAdjustmentRequired, maxSize - viewSize);
    else if( iAdjustmentRequired < 0)
      adjustment = Math.max( iAdjustmentRequired, minSize - viewSize);
    if( adjustment !== 0)
      iChildView.set('size', viewSize + adjustment);
    return iAdjustmentRequired - adjustment;
  },
  
  /**
   * Attempts to resize the child views of the split view to fit in the SplitView's
   * frame. So it may proportionally adjust the child views, the current size of the
   * SplitView's content is passed.
   *
   * You may override this method in a delegate.
   *
   * @param {SC.SplitView} splitView The SC.SplitView whose children should be resized.
   * @param {Number} contentSize The current not-yet-resized size of the SplitView's content.
   */
  splitViewResizeChildrenToFit: function(splitView, contentSize) {
    var frameSize = this.get('_frameSize'),
        parentTable = this.get('parentTableView'),
        parentSize = parentTable && parentTable.get('size'),
        parentMax = parentTable && parentTable.get('gridWidth'),
        childTable = this.get('childTableView'),
        childSize = childTable && childTable.get('size'),
        childMax = childTable && childTable.get('gridWidth'),
        slopView = this.get('slopView'),
        slopSize = slopView && slopView.get('size'),
        slopAvailable = (slopSize - kMinSlop) || 0,
        adjustmentRequired = frameSize - contentSize,
        additionalAdjustment = 0;
    
    if( slopAvailable > 0) {
      // During initialization, slop can get very large temporarily.
      // The additional adjustment makes sure we eliminate the slop if possible.
      // In particular, we should never see slop in the initial table layout.
      if( (adjustmentRequired < 0) && (slopAvailable > -adjustmentRequired))
        additionalAdjustment = slopAvailable + adjustmentRequired;
    }

    // first, reduce slop
    if( (adjustmentRequired < 0) && (slopSize > kMinSlop)) {
      // Additional slop adjustment is handled by adjusting the amount passed to splitViewAdjustChildToFit(),
      // and then compensating for the adjustment on return from splitViewAdjustChildToFit().
      adjustmentRequired = this.splitViewAdjustChildToFit( this, slopView, adjustmentRequired - additionalAdjustment, frameSize);
      adjustmentRequired += additionalAdjustment;
    }
    // then adjust child table if not fully visible
    if( (adjustmentRequired !== 0) && (childSize < childMax))
      adjustmentRequired = this.splitViewAdjustChildToFit( this, childTable, adjustmentRequired);
    // then adjust parent table if not fully visible
    if( (adjustmentRequired !== 0) && (parentSize < parentMax))
      adjustmentRequired = this.splitViewAdjustChildToFit( this, parentTable, adjustmentRequired);
    // then increase slop if necessary
    if( adjustmentRequired > 0)
      adjustmentRequired = this.splitViewAdjustChildToFit( this, slopView, adjustmentRequired, frameSize);
    // if we're still not done, adjust the parent table even if fully visible
    if( adjustmentRequired !== 0)
      adjustmentRequired = this.splitViewAdjustChildToFit( this, parentTable, adjustmentRequired);
    // if we're still not done, adjust the child table even if fully visible
    if( adjustmentRequired !== 0)
      adjustmentRequired = this.splitViewAdjustChildToFit( this, childTable, adjustmentRequired);
  }
  
  }; // end return from closure
  
}()));

/**
  @class DG.InertSplitDividerView

  An InertSplitDividerView is a variant of SC.SplitDividerView which
  doesn't allow the user to drag it and doesn't change the cursor,
  by not mixing in SC.SplitThumb.

  @extends SC.View, SC.SplitChild
  @author Kirk Swenson
*/
DG.InertSplitDividerView = SC.View.extend(SC.SplitChild,
{
  /** @scope SC.InertSplitDividerView.prototype */
  classNames: ['sc-split-divider-view'],
  
  // set to prevent SC.SplitView from automatically creating dividers
  // to sit between this divider and another view.
  isSplitDivider: YES,

  // NOTE: 'sc-fixed-size' is only hard-coded because SC.SplitView requires
  // this file, and SC.FIXED_SIZE is defined inside SC.SplitView.
  autoResizeStyle: 'sc-fixed-size',
  
  movesSibling: SC.MOVES_CHILD,
  
  size: SC.propertyFromRenderDelegate('dividerSize', 1),

  renderDelegateName: 'inertSplitDividerRenderDelegate'
});

/**
  The SC.BaseTheme.inertSplitDividerRenderDelegate is a variant of
  SC.BaseTheme.splitDividerRenderDelegate which minimizes its width
  so as to minimize its impact on mouse events, click events, etc.
  Without this adjustment, the divider intercepts all mouse events
  within five pixels to each side of the divider, which affects the
  ability to interact with scroll bars or other widgets along the
  edge of the subview.
*/
SC.BaseTheme.inertSplitDividerRenderDelegate = SC.RenderDelegate.create({
  className: 'split-divider',
  dividerSize: 1,

  // We would like the divider size to be exctly one pixel,
  // but offsets any smaller than these seem to prevent it from
  // rendering at all, so we stick with this for now.
  splitPositionOffset: -5,
  splitSizeOffset: 5,

  render: function(dataSource, context) {
    this.addSizeClassName(dataSource, context);

    // the divider view itself is the grabber, but the visible line
    // may be inside of it.
    context.push("<div class='line'></div>");
  },

  update: function(dataSource, jquery) {
    this.updateSizeClassName(dataSource, jquery);
  }
});

// For legacy compatibility
DG.TableView = DG.HierTableView;
