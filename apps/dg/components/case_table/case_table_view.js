// ==========================================================================
//                        DG.CaseTableView
// 
//  A wrapper view that holds a SlickGridView.
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
/*global Slick */

/** @class

  A CaseTableView contains a scrollable data grid view.
  In DG, it corresponds to a table of cases from a single collection.

  @extends SC.View
*/
DG.CaseTableView = SC.View.extend( (function() // closure
/** @scope DG.CaseTableView.prototype */ {

  /*
   * kHeaderHeight is used purely for event-handling purposes, particularly
   * the touch-handling code, for converting clicks in the SproutCore
   * view to the cells in which those clicks occurred. It should be set
   * so that clicks on row boundaries have the expected user effect.
   */
  var kHeaderHeight = 29,
      kAutoScrollInterval = 200;  // msec == 5 rows/sec

  return {  // return from closure
  
  classNames: ['dg-case-table'],
  
  layout: { left: 0, right: 0, top: 0, bottom: 0 },
  
  backgroundColor: "white",

  childViews: '_hiddenDragView'.w(),

  _hiddenDragView: SC.LabelView.design({
    classNames: 'drag-label'.w(),
    layout: { width: 100, height: 20, top: -50, left: 0 },
    value: ''
//    cursor: DG.Browser.customCursorStr(static_url('cursors/ClosedHandXY.cur'), 8, 8)
  }),

  /**
    The adapter used for adapting the case data for use in SlickGrid.
    @property   {DG.CaseTableAdapter}
   */
  gridAdapter: null,
  
  /**
    The SlickGrid DataView object for filtering/accessing the row data.
    @property   {Slick.Data.DataView}
   */
  gridDataView: null,
  
  /**
    Notification-only property. The value of this property is meaningless.
    It is used purely as a property name to notify when clients should
    respond to a complete change in the underlying SlickGrid. We don't
    want clients to have access to the private _slickGrid Property, however,
    so we signal changes by notifying with this property name instead.
    @property   {undefined}
   */
  gridView: undefined,

  /**
    The SlickGrid itself.
    @property   {Slick.Grid}
    @private
   */
  _slickGrid: null,
  
  /**
    The event handler for registering interest in SlickGrid events.
    @property   {Slick.EventHandler}
   */
  _gridEventHandler: null,
  
  /**
    @private
    The current width of the table/grid. Used to compute the gridWidth()
    and gridWidthChange() properties.
    @property   {Number}
   */
  _gridWidth: 0,

  /**
    @private
    The previous width of the table/grid. Used to compute the gridWidthChange() property.
    @property   {Number}
   */
  _prevGridWidth: 0,
  
  /**
    The current width of the table/grid. Designed to be used for clients to observe
    when the table width changes and to respond appropriately.
    @property   {Number}
   */
  gridWidth: function( iKey, iValue) {
    if( !SC.none( iValue)) {
      this._prevGridWidth = this._gridWidth;
      this._gridWidth = iValue;
      return this;
    }
    return this._gridWidth;
  }.property(),
  
  /**
    The delta from the previous width to the current width.
    Clients may use this to determine how much adjustment is required.
    @property   {Number}
   */
  gridWidthChange: function() {
    return this._gridWidth - this._prevGridWidth;
  }.property(),
  
  /**
    The number of rows in the table. This property is updated as rows are added/removed.
    Clients may observe or bind to it to be notified when the rowCount changes.
    @property   {Number}
   */
  rowCount: 0,
  
  /**
    The current scroll position within the table. This property is updated as the table
    is scrolled. Clients may observe or bind to it to be notified when scroll pos changes.
    @property   {Object}  scrollPos
                {Number}  scrollPos.scrollTop -- The vertical scroll position
                {Number}  scrollPos.scrollLeft -- The horizontal scroll position
   */
  scrollPos: null,
  
  /**
    Incremented whenever an expand/collapse occurs.
    Clients may observe this property to respond.
    @property   {Number}
   */
  expandCollapseCount: 0,
  
  displayProperties: ['gridAdapter','gridDataView','_slickGrid'],
  
  /**
    Called when the view is resized, in which case the SlickGrid should resize as well.
   */
  viewDidResize: function() {
    if( this._slickGrid) {
      // We must use invokeLast() here because at this point the SproutCore
      // 'layout' has changed, but the corresponding DOM changes haven't
      // necessarily happened yet. Since SlickGrid queries the DOM objects
      // directly (via jQuery), we don't want to resize until the views have
      // finished updating the DOM.
      this.invokeLast( function() {
                          this._slickGrid.resizeCanvas();
                          this.setIfChanged('gridWidth', this._slickGrid.getContentSize().width);
                        }.bind(this));
    }
  },
  
  /**
    Initializes the SlickGrid from the contents of the adapter (DG.CaseTableAdapter).
   */
  initGridView: function() {
    var gridSelector = "#" + this.get('layerId'),
        gridAdapter = this.get('gridAdapter'),
        dataView = gridAdapter && gridAdapter.gridDataView;
    this._slickGrid = new Slick.Grid( gridSelector, gridAdapter.gridDataView, 
                                      gridAdapter.gridColumns, gridAdapter.gridOptions);
    
    this._slickGrid.setSelectionModel(new Slick.RowSelectionModel({ selectActiveRow: false }));
    
    /*
     * Add a column header menu to each column.
     * Wrapped in @if(debug) so that only developers see it for now.
     */
    if( DG.supports('caseTableHeaderMenus')) {
      var headerMenuPlugin = new Slick.Plugins.HeaderMenu({
                                                buttonIsCell: true,
                                                buttonImage: static_url("images/down.gif")
                                              });
      this._slickGrid.registerPlugin(headerMenuPlugin);

      headerMenuPlugin.onBeforeMenuShow.subscribe(function(e, args) {
        var enabledItems = 0;
        // call any associated updater functions, e.g. to enable/disable
        if( args.menu && args.menu.items && args.menu.items.length) {
          args.menu.items.forEach( function( ioMenuItem) {
                                      if( ioMenuItem.updater) {
                                        ioMenuItem.updater( args.column, args.menu, ioMenuItem);
                                      }
                                      if( !ioMenuItem.disabled)
                                        ++enabledItems;
                                   });
        }
        // Only show the menu if there's at least one enabled item
        return (enabledItems > 0);
      });

      headerMenuPlugin.onCommand.subscribe(function(e, args) {
        var controller;
        for( var view = this; view && !controller; view = view.get('parentView')) {
          controller = view.get('controller');
        }
        // Dispatch the command to the controller
        if( controller)
          controller.doCommand( args);
      }.bind(this));
    } // DG.supports('caseTableHeaderMenus')

    this._gridEventHandler = new Slick.EventHandler();
    
    // Subscribe to SlickGrid events which call our event handlers directly.
    this.subscribe('onScroll', this.handleScroll);
    this.subscribe('onHeaderClick', this.handleHeaderClick);
    this.subscribe('onHeaderDragInit', function( iEvent, iDragData) {
                      // dragging should complete any current edit
                      DG.globalEditorLock.commitCurrentEdit();
                      // prevent the grid from cancelling drag'n'drop by default
                      iEvent.stopImmediatePropagation();
                    });
    this.subscribe('onHeaderDragStart', this.handleHeaderDragStart);
    this.subscribe('onCanvasWidthChanged', function(e, args) {
                      SC.run( function() {
                        this.setIfChanged('gridWidth', this._slickGrid.getContentSize().width);
                      }.bind( this));
                    }.bind( this));

    // wire up model events to drive the grid
    dataView.onRowCountChanged.subscribe(function (e, args) {
      SC.run( function() {
        this._slickGrid.updateRowCount();
        this._slickGrid.render();
        this.set('rowCount', args.current);
      }.bind( this));
    }.bind( this));
    
    dataView.onRowsChanged.subscribe(function (e, args) {
      if( this._slickGrid) {
        this._slickGrid.invalidateRows(args.rows);
        this._slickGrid.render();
      }
    }.bind( this));
    
    $(gridSelector).show();

    // Let clients know when there's a new _slickGrid
    this.notifyPropertyChange('gridView');
  },
  
  /**
    Destroys the SlickGrid object and its DataView.
    Used to respond to a change of game, where we recreate the SlickGrid from scratch.
   */
  destroySlickGrid: function() {
    if( this._slickGrid)
      this._slickGrid.destroy();
    this._slickGrid = null;
    this.gridDataView = null;
  },
  
  /**
    Destroys the SlickGrid object, its DataView object, and the CaseTableAdapter.
   */
  _destroy: function() {
    this.destroySlickGrid();
    
    if( this.gridAdapter)
      this.gridAdapter.destroy();
    this.gridAdapter = null;
  },
  
  /**
    Called when the component is about to be destroyed.
   */
  willDestroy: function() {
    this._destroy();
  },
  
  /**
    Destroys the DG.CaseTableView instance.
   */
  destroy: function() {
    this._destroy();
    sc_super();
  },
  
  /**
    Utility function to assist with subscribing to (expressing interest in)
    SlickGrid events.
    @param    {String}    iEventName
    @param    {Function}  iHandler -- The function to be called when the event occurs
   */
  subscribe: function( iEventName, iHandler) {
    var _inHandler,
        wrapHandler = function( iHandler) {
          return function () {
            if (!_inHandler) {
              _inHandler = true;
              iHandler.apply( this, arguments);
              _inHandler = false;
            }
          }.bind( this);
        }.bind( this);

    this._gridEventHandler.subscribe( this._slickGrid[ iEventName], wrapHandler( iHandler));
  },
  
  /**
   Returns the bounding rectangle of the specified row of the table.
   The rectangle returned is relative to the content of the table --
   the header row is not included, so the initial top coordinate is 0.
   
   @param   {Number}  iRowIndex -- the index of the row whose bounds are being requested
   @returns {Object}  The bounding rectangle of the specified row
                      Object.left -- the left edge of the bounding rectangle
                      Object.top -- the top edge of the bounding rectangle
                      Object.right -- the right edge of the bounding rectangle
                      Object.bottom -- the bottom edge of the bounding rectangle
   */
  getRowBounds: function( iRowIndex) {
    // start with the bounds of the first (left-most) cell in the row
    var rowBounds = this._slickGrid && this._slickGrid.getCellNodeBox( iRowIndex, 0),
        columns = this._slickGrid && this._slickGrid.getColumns(),
        colCount = columns && columns.length;
    if( rowBounds && colCount) {
      // Expand the right edge to include the bounds of the last cell in the row
      var lastCellBounds = this._slickGrid.getCellNodeBox( iRowIndex, colCount - 1);
      rowBounds.right = lastCellBounds.right;
    }
    return rowBounds;
  },
  
  /**
    Respond to a change in DG.CaseTableAdapter by destroying the SlickGrid.
    A new one will be recreated on render() if there is a valid adapter.
   */
  gridAdapterDidChange: function() {
    if( this._slickGrid) {
      this.destroySlickGrid();
      this.displayDidChange();
      this.notifyPropertyChange('gridView');
    }
  }.observes('gridAdapter'),
  
  /**
    Refreshes the Slick.DataView and re-renders the Slick.Grid.
   */
  refresh: function() {
    var gridAdapter = this.get('gridAdapter');
    if( gridAdapter) gridAdapter.refresh();
    if( this._slickGrid) this._slickGrid.invalidate();
  },
  
  /**
    SproutCore render method.
   */
  render: function( iContext, iFirstTime) {
    sc_super();
  
    // SlickGrid requires that we pass it a reference to its container element,
    // which in this case is the <div> created by this view. But that <div>
    // element doesn't exist the first time through render() -- it's created
    // as a result of the first time through -- so the first time we get here
    // we simply call displayDidChange() to make sure we get a second call to
    // render(), by which time the <div> has been created and we can pass it
    // to SlickGrid.
    if( iFirstTime) {
      this.displayDidChange();
    }
    else if( !this._slickGrid && this.get('gridAdapter')) {
      this.initGridView();
      this.set('gridWidth', this._slickGrid.getContentSize().width);
    }
    else if( this._slickGrid) {
      var gridAdapter = this.get('gridAdapter');
      if( this._rowDataDidChange) {
        gridAdapter.buildRowData();
        gridAdapter.refresh();
      }
      
      // Render with our changes
      this._slickGrid.render();
      
      // Clear our invalidation flags
      this._rowDataDidChange = false;
      this._renderRequired = false;
    }
    
    // SlickGrid adds to the set of CSS classes. We need to capture these
    // and add them to the context or else the context will overwrite
    // the CSS classes and eliminate the ones added by SlickGrid.
    // This is not a particularly elegant solution in that it clobbers
    // the complete set of classes every time we render. It's not
    // obvious how to do better, however, in that the view's 'classNames'
    // are copied to the context before render() is called, but the
    // SlickGrid isn't created until render(), so setting 'classNames'
    // wouldn't have the desired effect until the next time we render().
    if( this._slickGrid)
      iContext.classNames( this.$().attr("class"), YES);
  },

  mouseDown: function( iEvent) {
    // TODO: Consider the effects of modifier keys
    return this.touchStart( iEvent);
  },
  
  mouseDragged: function( iEvent) {
    this.touchesDragged( iEvent);
  },

  mouseUp: function( iEvent) {
    this.touchEnd( iEvent);
  },

  /**
    Returns the touch position in view coordinates.
    @param    {Object}    The touch event
    @returns  {Object}    The { x:, y: } location of the touch in view coordinates
   */
  touchPosInView: function( iTouch) {
    return this.convertFrameFromView({ x: iTouch.pageX, y: iTouch.pageY }, null, true);
  },
  
  /**
    Returns the touch position in table body content coordinates.
    @param    {Object}    The touch event
    @returns  {Object}    The { x:, y: } location of the touch in table body content coordinates
   */
  touchPosInBodyContent: function( iTouch) {
    var touchPos = this.touchPosInView( iTouch),
        scrollPos = this.get('scrollPos');
    touchPos.y -= kHeaderHeight;
    if( scrollPos) {
      touchPos.x += scrollPos.scrollLeft;
      touchPos.y += scrollPos.scrollTop;
    }
    return touchPos;
  },
  
  /**
    Returns the cell in which the specified touch event occurred.
    @param    {Object}    The touch event
    @returns  {Object}    The { row:, cell: } indices of the touched cell
   */
  cellFromTouch: function( iTouch) {
    var cell = {}, touchPos = this.touchPosInView( iTouch);
    if( touchPos.y < kHeaderHeight) {
      // we only care about the column here
      cell = this._slickGrid.getCellFromPoint( touchPos.x, 0);
      cell.row = -1;  // signals header row
    }
    else {
      cell = this.bodyCellFromTouch( iTouch);
    }
    return cell;
  },
  
  bodyCellFromTouch: function( iTouch) {
    var touchPos = this.touchPosInBodyContent( iTouch);
    return this._slickGrid.getCellFromPoint( touchPos.x, touchPos.y);
  },
  
  _touchStartTouch: null,
  _touchStartCell: null,
  _touchDragCell: null,
  
  captureTouch: function(touch) {
    return YES;
  },
  
  /**
    Handle the initial touch-down event.
    For body cells, selects the clicked cell.
    @param    {Object}    The touch event
    @returns  {Boolean}   YES, indicating that further touch events are desired
   */
  touchStart: function(touch) {
    // Without this check for whether the click is in the visible part of the table,
    // we can get here for clicks that are actually handled by the platform scroll bar.
    // This is particularly bad, because we get the down but not the corresponding up
    // (which is apparently swallowed by the scroll bar), so we end up starting the
    // mousemove tracker and possibly the autoscroll timer without ever having a
    // means to end them. Better to avoid handling such clicks entirely.
    // Note that in my testing there are a couple pixels outside the scroll bar which
    // are rejected by this test but should not be. I'm choosing not to attempt to
    // tweak it by a couple pixels because a false negative (incorrect rejection)
    // is much less noticeable than a false positive (incorrect acceptance), so
    // a couple pixels of margin between us and the danger zone seems acceptable.
    var viewPos = this.touchPosInView( touch),
        tableSize = this._slickGrid && this._slickGrid.getVisibleSize();
    if( !tableSize ||
        (viewPos.x > tableSize.width) ||
        (viewPos.y - kHeaderHeight > tableSize.height)) {
       return NO;
    }
    
    // The click is in the visible part of the table. Start the drag-select process.
    this._touchStartTouch = touch;
    this._touchStartCell = this.cellFromTouch( touch);
    if( this._touchStartCell && (this._touchStartCell.row >= 0)) {
      // body touch -- selects the clicked cell
      var isExtending = DG.Core.isExtendingFromEvent( touch);
      this.get('gridAdapter').handleCellClick( isExtending, this._touchStartCell);
    }
    return YES;
  },
  
  _autoScrollRow: null,
  _autoScrollIncrement: 0,
  _autoScrollTimer: null,
  
  /**
    Timer function called when the auto-scroll timer fires.
    Attempts to show one more row in the direction of scroll.
   */
  _autoScrollTimerFunc: function() {
    var adapter = this.get('gridAdapter'),
        rowCount = adapter && adapter.get('visibleRowCount'),
        nextRow = this._autoScrollRow + this._autoScrollIncrement;
    if( this._slickGrid && adapter) {
      if( (nextRow >= 0) && (nextRow < rowCount)) {
        // Select the range from the start row to the current row,
        // and scroll the new row into view.
        var minRow = Math.min( this._touchStartCell.row, nextRow),
            maxRow = Math.max( this._touchStartCell.row, nextRow);
        this._autoScrollRow = nextRow;
        adapter.selectRowsInRange( minRow, maxRow);
        this._slickGrid.scrollRowIntoView( this._autoScrollRow);
      }
    }
    // If the table or adapter are gone, kill the timer
    else if( this._autoScrollTimer) {
      this._autoScrollTimer.invalidate();
      this._autoScrollTimer = null;
    }
  },
  
  /**
    Handle touch-drag events, which are sent repeatedly during a drag.
    For header cells, drag the attribute name
    For body cells, selects all rows touched by the drag.
    @param    {Object}    The touch event
   */
  touchesDragged: function( iEvent, iTouches) {
    var touchStartRow = this._touchStartCell && this._touchStartCell.row;
    if( !SC.none( touchStartRow)) {
      if( touchStartRow < 0) {
        // header drag
        if( SC.none( this._touchDragCell)) {
          // table header drag -- drag attribute from column header
          this._touchDragCell = this._touchStartCell;
          var columnInfo = this.get('gridAdapter').gridColumns[this._touchDragCell.cell];
          this.handleHeaderDragStart( iEvent, { column: columnInfo });
        }
      }
      else if( this._touchStartCell.row >= 0) {
        // table body drag -- select range from start row to current row
        // mousemoves don't have the touches array, so we simulate an array of one event
        if( !iTouches) iTouches = [ iEvent ];
        iTouches.forEach( function( iTouch) {
                            var viewPos = this.touchPosInView( iTouch),
                                tableSize = this._slickGrid.getVisibleSize(),
                                cell = this.bodyCellFromTouch( iTouch),
                                minRow = Math.min( this._touchStartCell.row, cell.row),
                                maxRow = Math.max( this._touchStartCell.row, cell.row);
                            this.get('gridAdapter').selectRowsInRange( minRow, maxRow);
                            // make sure the newly-selected row is visible
                            this._autoScrollRow = cell.row >= 0 ? cell.row : Math.max( 0, minRow - 1);
                            this._slickGrid.scrollRowIntoView( this._autoScrollRow);
                            
                            // If we're off the edge of the table, set up an autoscroll timer
                            // First determine the direction (if any) to autoscroll
                            if( viewPos.y < kHeaderHeight)
                              this._autoScrollIncrement = -1; // autoscroll at the top
                            else if (viewPos.y > tableSize.height)
                              this._autoScrollIncrement = 1;  // autoscroll at the bottom
                            else
                              this._autoScrollIncrement = 0;  // no autoscroll
                            // If necessary, set up the autoscroll timer
                            if( this._autoScrollIncrement !== 0) {
                              if( !this._autoScrollTimer) {
                                this._autoScrollTimer = SC.Timer.schedule({
                                                                  target: this,
                                                                  action: '_autoScrollTimerFunc',
                                                                  interval: kAutoScrollInterval, 
                                                                  repeats: YES });
                              }
                              else {
                                // The timer already exists because it was set up previously.
                                // Reset the timer so that it doesn't fire until at least
                                // kAutoScrollInterval from now. This prevents mouse/touch moves from
                                // increasing the effective autoscroll rate beyond what's intended.
                                this._autoScrollTimer.set('lastFireTime', Date.now());
                                this._autoScrollTimer.schedule();
                              }
                            }
                            // no autoscroll required -- invalidate the timer if it exists.
                            else if( this._autoScrollTimer) {
                              this._autoScrollTimer.invalidate();
                              this._autoScrollTimer = null;
                            }
                          }.bind( this));
      }
    }
  },

  /**
    Ends the handling of this touch.
    @param    {Object}    The touch event
   */
  touchEnd: function(touch) {
    // Reset touch 
    if( this._autoScrollTimer) {
      // Release autoscroll timer
      this._autoScrollTimer.invalidate();
      this._autoScrollTimer = null;
    }
    this._touchStartTouch = this._touchStartCell = this._touchDragCell = null;
  },

  /**
    Called when the table is scrolled.
    @param  {Slick.Event}   iEvent -- the event which triggered the scroll
   */
  handleScroll: function( iEvent, iArgs) {
    this.set('scrollPos', iArgs);
  },
  
  /**
    Called when a drag is started in a column header cell.
    @param  {Slick.Event}   iEvent -- the event corresponding to the mouse click
    @param  {Object}        iDragData -- additional information about the drag
   */
  handleHeaderDragStart: function( iEvent, iDragData) {
    var column = iDragData.column;
    
    // stopImmediatePropagation() doesn't exist (and apparently isn't necessary)
    // when handling touch events.
    if( iEvent.stopImmediatePropagation)
      iEvent.stopImmediatePropagation();

    var tDragView = this._hiddenDragView,
        tAttributeName = column.attribute.get('name'),
        this_ = this;
    SC.run( function() {
      // Make sure dragView is in front. Won't actually happen without this runloop.
      tDragView.set('value', tAttributeName);
      this_.removeChild( tDragView);
      this_.appendChild( tDragView);
      // We could dynamically adjust the width here, but since the font used for the
      // drag image is currently different than the one used in the table, it's not
      // clear what the appropriate size should be, so we skip it for now.
      //if( column.width)
      //  tDragView.adjust('width', column.width);
    });
    // Initiate a drag
    DG.Drag.start({
      event: iEvent,
      source: this,
      dragView: tDragView,
      ghost: YES,
      ghostActsLikeCursor: YES,
      slideBack: YES,
      // The origin is supposed to be the point that the drag view will slide back to,
      // but this is not working.
      origin: { x: iEvent.clientX, y: iEvent.clientY },
      data: { collection: column.collection,
              attribute: column.attribute,
              text: tAttributeName }  // For use by clients like the text box
    });
  },
  
  /**
    Called when a table header cell is clicked.
    @param  {Slick.Event}   iEvent -- the event corresponding to the mouse click
   */
  handleHeaderClick: function( iEvent) {
    DG.globalEditorLock.commitCurrentEdit();
  },
  
  /**
    Called when a table cell has been edited by the user.
    @param  {Slick.Event}   iEvent
    @param  {} iArgs -- information on the changed cell
   */
  /* NOTE: we don't use this event, because the standard
     editor messes with our row 'item' data.  Instead
     our table adapter uses a custom cell editor that
     does the right applyChange() call. --CDM 2012-11-27
  handleCellEdited: function( iEvent, iArgs ) {
    var rowDataThatWasChanged = iArgs.item, // has Rank, id, parentID, theCase
        cellIndex = iArgs.cell, // index into table columns
        rowIndex = iArgs.row; // index into data rows
    this.get('gridAdapter').handleCellEdited( iEvent, iArgs );
  },
  */
  
  /**
    Refreshes the column headers to accommodate new attributes.
    Call when the column header info is required for new attributes.
   */
  updateColumnInfo: function() {
    if( this._slickGrid) {
      this.setColumns( this.get('gridAdapter').updateColumnInfo());
    }
  },
  
  /**
    Refreshes the column headers when attribute information has changed.
    @param  {Array of Objects}  iColumnsInfo -- Array of column entries
   */
  setColumns: function( iColumnsInfo) {
    if( this._slickGrid) {
      this._slickGrid.setColumns( iColumnsInfo);
      this._slickGrid.render();
    }
  },
  
  /**
    Expands/collapses all of the row groups at once.
    @param    {Boolean}   iExpand -- Expands all row groups if truthy;
                                      collapses all row groups otherwise
   */
  expandCollapseAll: function( iExpand) {
    var adapter = this.get('gridAdapter');
    if( adapter) {
      adapter.expandCollapseAll( iExpand);

      // Expanding/collapsing changes the set of rows that are selected
      this.updateSelectedRows();
      this.incrementProperty('expandCollapseCount');
    }
  },
  
  /**
    Refreshes the row data. Call when the table body needs to be refreshed.
   */
  updateRowData: function() {
    this._rowDataDidChange = true;
    this._renderRequired = true;
    this.displayDidChange();
  },
  
  /**
    Synchronizes the number of table rows with the number of cases.
    Tries to do so efficiently, but has to rebuild the table in some cases.
   */
  updateRowCount: function() {
    var adapter = this.get('gridAdapter'),
        handled = false;

    if( !this._slickGrid) return;

    if( adapter)
      handled = adapter.updateRowCount();
    
    if( handled) {
      // Simple append
      this._slickGrid.updateRowCount();
      this._slickGrid.scrollRowIntoView( this._slickGrid.getDataLength());
    }
    else {
      // For now, deletions require complete rebuild.
      // When deletion is handled via DataContext API we can do better.
      this.updateRowData();
      this.updateSelectedRows();
    }

    this._slickGrid.render();
  },
  
  /**
    Sets the set of selected rows.
    @param  {Array of Number}   Array of indices of selected rows
   */
  setSelectedRows: function( iSelectedRows) {
    if( this._slickGrid) {
      this._slickGrid.setSelectedRows( iSelectedRows);
      this._slickGrid.render();
    }
  },
  
  updateSelectedRows: function() {
    var adapter = this.get('gridAdapter'),
        selection = adapter && adapter.getSelectedRows();
    if( selection)
      this.setSelectedRows( selection);
    }
  
  }; // end return from closure
  
}())); // end closure
