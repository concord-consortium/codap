// ==========================================================================
//                        DG.HierTableView
//
//  A wrapper view for multiple DG.CaseTableViews.
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

sc_require('components/case_table/case_table_drop_target');
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
DG.HierTableView = SC.ScrollView.extend( (function() {
/** @scope DG.HierTableView.prototype */

  var /*kColumnHeaderBackgroundColor = '#E6E6E6',*/
      kDefaultColumnWidth = 60,
      kMinTableWidth = kDefaultColumnWidth;

  return {

    /**
     * We scroll horizontally. Vertical scrolling is within case tables.
     */
    hasHorizontalScroller: YES,
    hasVerticalScroller: NO,
    horizontalOverlay: NO, // default YES
    //horizontalFade: YES, // default YES, applies if horizontalOverlay is true
    autohidesHorizontalScroller: YES, // default YES
    horizontalAlign: SC.ALIGN_LEFT, // default SC.ALIGN_CENTER

    classNames: 'dg-hier-table-view',

    /**
     The data context for which the table is displaying data.
     @property   {DG.DataContext}
     */
    dataContext: null,
    layout: { left: 0, top: 0, right: 0, bottom: 8 },

    /**
     * Whether the component is ready.
     *
     * The component size will not be adjusted until it is ready.
     * @type {boolean}
     */
    isReady: false,

    /**
     * Observes when the component's selection state changes. We need to
     * remove header menus when the component goes out of selection.
     */
    isSelectedDidChange: function () {
      if (!this.getPath('parentView.parentView.isSelected')) {
        // DG.log('Hiding Header Menus');
        this.contentView.hideHeaderMenus();
      }
    }.observes('parentView.parentView.isSelected'),

    /**
     * The maximum width the DG.Component will permit by dragging.
     *
     * @type {number} pixels
     */
    containerMaxWidth: function () {
      return this.getPath('contentView.frame.width');
    }.property(),

    init: function() {
      sc_super();
      // Adjust the horizontal scrollbar so that the right scroll arrow can be hit.
      this.set('horizontalScrollerLayout', { left: 0, right: 18, top: 0, bottom: 8 });
    },

    /**
     * Adjustments needed to accommodate shared embedded mode CODAP
     * @override View.convertFrameToView
     **/
    convertFrameToView: function (frame, targetView) {
      var tOffset = $(this.containerLayer()).offset();
      return { x: tOffset.left - window.pageXOffset, y: tOffset.top - window.pageYOffset, width: frame.width, height: frame.height };
    },

    /**
     * Gives us a chance to add/remove classes to the component view in which I'm displayed.
     * For a hierarchical table view, the need is to give move the scroll bar up a bit so that
     * it is more accessible to the mouse.
     * @param iMyComponentView {DG.ComponentView}
     */
    adjustComponentViewClasses: function( iMyComponentView) {
      iMyComponentView.get('classNames').push('dg-case-table-component-view');
    },

    /**
     * This method is called by Sproutcore whenever the view is appended to
     * the document. In the case of component contents like this, this happens
     * whenever a component is selected or unselected. (It is removed from the
     * view and then reattached.
     *
     * The scroll positions of the case tables are not preserved through the
     * process of removal and reattachment. This confuses Slickgrid. So, we
     * scroll to the position that Sproutcore currently has.
     */
    didAppendToDocument: function () {
      var childViews = this.get('childTableViews');
      childViews.forEach(function (view) {
        view.refreshScroll();
      });
    },

    viewDidScrollHorizontally: function() {
      this.get('contentView').parentViewDidResizeOrScroll();
    }.observes('horizontalScrollOffset'),

    /**
     * The content view is where "the action" is in this class. It contains a
     * SplitView that, in turn contains a hierarchical arrangement of case tables.
     */
    contentView: SC.SplitView.extend({
      layout: { left: 0, top: 0, right: 0, bottom: 0 },
      /**
       Lay out subtables left-to-right.
       @property
       */
      layoutDirection: SC.LAYOUT_HORIZONTAL,

      childViews: [],

      /**
       * Children are kept full size.
       * @override
       */
      shouldResizeChildrenToFit: NO,

      /**
       * @overload
       * Normally, split-views would schedule a re-tile. We allow vertical changes
       * in the parent to be seen, but pin horizontal ones.
       */
      parentViewDidResize: function (frame) {
        frame.width = this.get('frameSize') || frame.width;

        this.parentViewDidResizeOrScroll();

        // sc_super generates a call that will pass 'arguments'
        return sc_super(); // jshint ignore:line
      },

      parentViewDidResizeOrScroll: function() {
        var childTableViews = this.get('childTableViews');
        childTableViews.forEach(function(tableView) {
          tableView.ancestorViewDidResizeOrScroll();
        });
      },

      frameSize: function () {
        this.get('_frameSize');
      }.property(),

      frameSizeDidChange: function() {
        this.notifyPropertyChange('frameSize');
      }.observes('_frameSize'),

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
        return DG.InertSplitDividerView.create();
      },

      /**
       An array of child table view object, one for each subtable.
       @property   {[DG.CaseTableView]}
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

      dividerViews: function () {
        var childViews = this.get('childViews') || [],
            dividerViews = [];
        childViews.forEach( function( iChildView) {
          if( iChildView.kindOf( DG.RelationDividerView))
            dividerViews.pushObject( iChildView); // Note: array.push is not SproutCore-friendly.
        });
        return dividerViews;
      }.property(),

      childTableLayoutDidChange: function( iNotifier) {
        this.hideHeaderMenus();
        this.displayDidChange();
      },

      /**
        Refreshes each of the individual table views.
       */
      refreshTables: function() {
        var childTableViews = this.get('childTableViews');
        childTableViews.forEach( function(tableView) { tableView.refresh(); });
      },

      /**
        Refreshes each of the individual table views.
       */
      refreshDividers: function() {
        var dividers = this.get('dividerViews');
        dividers.forEach(function (dividerView) { dividerView.displayDidChange(); });
      },

      /**
       Observer function called when the overall gridWidth of the parent table changes.
       Note that this is a content width notification, rather than a view size notification.
       @param    {DG.CaseTableView}    iNotifier -- the table view whose width changed
       */
      gridWidthDidChange: function( iNotifier) {
        var newMaxWidth = iNotifier.get('gridWidth');

        // Set the 'size' of the child table to its desired size
        iNotifier.set('size', newMaxWidth);
        this.scheduleTiling();
      },

      /**
       * Observer function called when the parent table is scrolled.
       *
       * Note that scroll handlers are triggered from jQuery event handlers,
       * and so must use SC.run() for SC updates to be triggered appropriately.
       *
       * The main job of this method is to manage propagation of scroll to the
       * left and to the right to maintain the rule that all parent cases of
       * a visible case should also be visible. We have gotten here from a
       * notification from a scroll event from slickgrid and any scrolling
       * of dependent tables will also produce scroll events, so we need to
       * avoid getting into feedback loops. We do this by keeping a propagation
       * count and, in each case table, a scroll event count. We increment the
       * propagation count and the event count for any case table that wasn't
       * scrolled from propagation. When a new notification arrives if its
       * table has a count less than the propagation count then it was a scroll
       * event from propagation and bypasses further propagation. If it has an event
       * count higher, it is a new event, so propagation should occur.
       *
       * @param iNotifier {DG.CaseTableView}
       */
      propagationCount: 0,
      tableDidScroll: function(iNotifier) {
        if (SC.none(iNotifier)) {
          return;
        }
        SC.run( function() {
          try {
            if (iNotifier._scrollEventCount < this.propagationCount) {
              //DG.log('tableDidScroll: %@ Ignoring. Propagation Count: %@/%@'.loc(
              //    iNotifier.get('collectionName'), this.propagationCount,
              //    iNotifier._scrollEventCount));
              iNotifier._scrollEventCount = this.propagationCount;
            } else {
              this.propagationCount++;
              iNotifier._scrollEventCount = this.propagationCount;

              //DG.log('tableDidScroll: %@ Propagating. Propagation Count: %@/%@'.loc(
                //    iNotifier.get('collectionName'), this.propagationCount,
                //        iNotifier._scrollEventCount));
                var leftTable = iNotifier.get('parentTable');
                var rightTable = iNotifier.get('childTable');
                var didScroll = true;
                while (leftTable) {
                  if (didScroll) {
                    didScroll = leftTable.scrollToAlignWithRight();
                    //if (didScroll) DG.log('tableDidScroll: %@ Propagated left: %@. (%@)'.loc(
                    //    iNotifier.get('collectionName'), leftTable.get('collectionName'), leftTable._scrollEventCount));
                  }
                  if (!didScroll) {
                    leftTable._scrollEventCount = this.propagationCount;
                  }
                  leftTable = leftTable.get('parentTable');
                }
                didScroll = true;
                while (rightTable) {
                  if (didScroll) {
                    didScroll = rightTable.scrollToAlignWithLeft();
                    //if (didScroll) DG.log('tableDidScroll: %@ Propagated right: %@. (%@)'.loc(
                    //    iNotifier.get('collectionName'), rightTable.get('collectionName'), rightTable._scrollEventCount));
                  }
                  if (!didScroll) {
                    rightTable._scrollEventCount = this.propagationCount;
                  }
                  rightTable = rightTable.get('childTable');
                }
            }
            this.get('dividerViews').forEach(function (dividerView) {
              if (dividerView.get('leftTable') === iNotifier || dividerView.get(
                      'rightTable') === iNotifier) {
                //DG.log('tableDidScroll reevaluating: %@ -> %@'.loc(dividerView.getPath('leftTable.collectionName'),
                //    dividerView.getPath('rightTable.collectionName')) );
                dividerView.displayDidChange();
                //} else {
                //DG.log('tableDidScroll omitting: %@ -> %@'.loc(dividerView.getPath('leftTable.collectionName'),
                //    dividerView.getPath('rightTable.collectionName'))
              }
            });
          } catch (ex) {
            DG.logWarn(ex);
          }
        }.bind( this));
      },

      /**
       Observer function called when the number of rows in the parent table changes.
       */
      rowCountDidChange: function(iNotifier) {
        if (!iNotifier) {
          return;
        }
        this.get('dividerViews').forEach(function (view) {
          if ((view.get('leftTable') === iNotifier) || (view.get('rightTable') === iNotifier)) {
            view.displayDidChange();
          }
        });
      },

      /**
       Observer function called when a row is expanded/collapsed.
       */
      tableDidExpandCollapse: function() {
        SC.run( function() {
          this.refreshDividers();
        }.bind( this));
      },

      hideHeaderMenus: function() {
        this.get('childTableViews').forEach(function (view) {
          view.hideHeaderMenu();
        });
      },

      model: SC.outlet('parentView.parentView.model')
    }),

    relationDividerView: DG.RelationDividerView.extend ( SC.SplitChild, {
      name: 'relationDividerView',
      minimumSize: DG.RDV_DIVIDER_WIDTH,
      maximumSize: DG.RDV_DIVIDER_WIDTH,
      size: DG.RDV_DIVIDER_WIDTH,
      autoResizeStyle: SC.FIXED_SIZE,
      compensatesForMovement: YES,
      allowsIndirectAdjustments: NO
    }),

   childTableView: DG.CaseTableView.extend ( SC.SplitChild, {
      name: 'childTableView',
      minimumSize: kMinTableWidth,
      autoResizeStyle: SC.RESIZE_AUTOMATIC,
      compensatesForMovement: YES
    }),

    leftDropTarget: null,

    makeRelationDividerView: function () {
      return this.relationDividerView.create({
        name: 'dividerTarget',
        dataContext: this.model.get('context')
      });
    },

    makeChildTableView: function () {
      return this.childTableView.create({});
    },

    /**
     * Removes the child table view and, if present, its divider.
     * @param {DG.CaseTableView} view
     */
    removeChildTableView: function (view) {
      var contentView = this.get('contentView');
      var viewIx = contentView.childViews.indexOf(view);
      var childCount = contentView.childViews.length;
      var dividerView;
      if (viewIx > 0) {
        dividerView = contentView.childViews[viewIx - 1];
      } else if (viewIx === 0 && childCount > 2) {
        dividerView = contentView.childViews[viewIx + 1];
      }
      if (dividerView) {
        contentView.removeChild(dividerView);
      }
      contentView.removeChild(view);
    },

    getChildTableViewForCollection: function(collectionID) {
      var childTableViews = this.get('childTableViews');
      return DG.ArrayUtils.firstMatch(childTableViews, function(tableView) {
                              return tableView.getPath('gridAdapter.collection.id') === collectionID;
                            });
    },

    /**
      An array of child table view object, one for each subtable.
      @property   {[DG.CaseTableView]}
     */
    childTableViews: function() {
      // delegate down
      var contentView = this.get('contentView');
      return contentView.childTableViews();
    }.property(),

    dividerViews: function () {
      // delegate down
      var contentView = this.get('contentView');
      return contentView.dividerViews();
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
      this.contentView.removeObserver('frameSize', this, 'contentWidthDidChange');
    },

  /**
    Refreshes each of the individual table views.
   */
  refresh: function() {
    this.get('contentView').refreshTables();

    // For when the table is updated by internal value change (no UI event)
    this.refreshDividers();
  },

  /**
    Refreshes each of the individual table views.
   */
  refreshDividers: function() {
    this.get('contentView').refreshDividers();
  },

  mouseDown: function(ev) {
    // if not in a current edit, background clicks should complete any edit
    if (ev.target.tagName !== 'INPUT') {
      DG.globalEditorLock.commitCurrentEdit();
    }
    return NO;
  },

    touchStart: function( ev) {
      this.mouseDown(ev);
      sc_super();
      return NO;
    },

    /**
     * @return {boolean}
     */
    isHorizontalScrollActive: function () {
      if (SC.none(this._lastContentWidth)) {
        this._lastContentWidth = this.getPath('contentView.frame.width');
      }
      return this.get('frame').width < this.get('_lastContentWidth');
    }.property(),

    _lastContentWidth: null,

  /**
   * Width of the contained table set changed.
   */
  contentWidthDidChange: function (sender, key, value) {
    var tContentWidth = this.getPath('contentView.frame.width');
    var tWidth = this.get('frame').width;
    var tComponentView = DG.ComponentView.findComponentViewParent( this);
    if (SC.none(tComponentView)) {
      return;
    }
    var horizontalScrollActive = this.get('isHorizontalScrollActive');

    if (!horizontalScrollActive || tWidth > tContentWidth) {
      tComponentView.adjust('width', tContentWidth);
    }
    this._lastContentWidth = tContentWidth;
  },

  /**
    Observer function called when any of the child tables is changed.
   */
  _klugeAdjust: false,
  gridViewDidChange: function( iNotifier) {
    this.refreshDividers();

    // adjusting the width fixes initial redraw problems in Safari
    if( !this._klugeAdjust) {
      this._klugeAdjust = true;
      var tComponentView = DG.ComponentView.findComponentViewParent( this),
          tComponentFrame = tComponentView && tComponentView.get('frame'),
          tComponentWidth = tComponentFrame && tComponentFrame.width;
      if( tComponentWidth)
        tComponentView.adjust('width', tComponentWidth + 1);
    }
  },

  /**
    Attaches the specified set of DG.CaseTableAdapters to the individual child table views.
    @param  {[DG.CaseTableAdapter]} iAdapters
   */
  setCaseTableAdapters: function( iAdapters) {
    function setUpDividerView(parentTable, childTable, relationView) {
      if( relationView && parentTable && childTable) {
        relationView.beginPropertyChanges();
        relationView.set('leftTable', parentTable);
        relationView.set('rightTable', childTable);
        relationView.endPropertyChanges();
      }
    }
    var contentView = this.get('contentView');
    var childTableViews = this.get('childTableViews');
    var caseTablesInAdapterOrder = [];
    var childTableView;
    var lastChildTableView = null;
    var x;

    // Remove all the contents of the view. We are going to recreate the order.
    while(!SC.none(x = contentView.get('childViews')[0])) {
      contentView.removeChild(x);
    }

    // find out which adapters are already mapped to views.
    iAdapters.forEach(function (adapter, ix) {
      caseTablesInAdapterOrder[ix] = childTableViews.findProperty('gridAdapter', adapter);
    });

    // now we are going to rebuild the view, left first...
    if (SC.none(this.leftDropTarget)) {
      this.leftDropTarget = DG.CaseTableDropTarget.create({
        name:'leftTarget',
        dataContext: this.model.get('context')
      });
    }
    contentView.appendChild(this.leftDropTarget);

    // if not mapped to views create new views
    iAdapters.forEach(function (adapter, ix) {
      var divider;
      if (!caseTablesInAdapterOrder[ix]) {
        childTableView = this.makeChildTableView();
        childTableView.set('gridAdapter', adapter);
        caseTablesInAdapterOrder[ix] = childTableView;
      }
      if (ix > 0) {
        divider = this.makeRelationDividerView();
        setUpDividerView(caseTablesInAdapterOrder[ix-1], caseTablesInAdapterOrder[ix], divider);
        contentView.appendChild(divider);
      }
      if (ix + 1 === iAdapters.length) {
        // We mark the rightmost case table. While initializing we need to
        // ignore width adjustments until we have generated all the case tables.
        // after this, we try to avoid empty space to the right of the rightmost
        // table.
        caseTablesInAdapterOrder[ix].set('isRightmost', true);
      }
      contentView.appendChild(caseTablesInAdapterOrder[ix]);
      if (lastChildTableView) {
        lastChildTableView.set('childTable', caseTablesInAdapterOrder[ix]);
        caseTablesInAdapterOrder[ix].set('parentTable', lastChildTableView);
      } else {
        caseTablesInAdapterOrder[ix].set('parentTable', null);
      }
      lastChildTableView = caseTablesInAdapterOrder[ix];
      lastChildTableView.set('childTable', null);
    }.bind(this));
    this.updateSelectedRows();
    contentView.scheduleTiling();
    if (!contentView.hasObserverFor('frameSize', this, 'contentWidthDidChange')) {
      contentView.addObserver('frameSize', this, 'contentWidthDidChange');
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
    this.refresh();
    this.refreshDividers();
  },

  /**
    Updates the row count for each subtable view.

    @param forceRedraw {Boolean} Whether to force a re-indexing of the rows
   */
  updateRowCount: function( forceRedraw) {
    var childTableViews = this.get('childTableViews') || [];
    childTableViews.forEach( function( iTableView) {
                                iTableView.updateRowCount( forceRedraw);
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

  scrollSelectionToView: function () {
    var childTableViews = this.get('childTableViews') || [];
    childTableViews.forEach( function( iTableView) {
      iTableView.scrollSelectionToView();
    });
  },

  scrollToCaseByID: function (collectionClient, caseID) {
    if (SC.none(collectionClient)) {
      return;
    }
    DG.assert(collectionClient.constructor === DG.CollectionClient, 'Correct type');
    var view = this.findViewForCollection(collectionClient);
    view.scrollToCase(caseID);
  },

  findViewForCollection: function (iCollection) {
    var childTableViews = this.get('childTableViews') || [];
    return childTableViews.find(function (childTableView) {
      var viewCollection = childTableView.getPath('gridAdapter.collection');
      return viewCollection === iCollection;
    });
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
  className: 'dg-split-divider',
  dividerSize: 1,

  // We would like the divider size to be exactly one pixel,
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
