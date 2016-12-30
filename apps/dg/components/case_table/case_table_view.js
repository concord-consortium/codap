// ==========================================================================
//                        DG.CaseTableView
// 
//  A wrapper view that holds a SlickGridView.
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
/*global Slick */

sc_require('components/case_table/scroll_animation_utility');
sc_require('components/case_table/case_table_row_selection_model');
sc_require('views/mouse_and_touch_view');

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
  var kHeaderHeight = 59,//29,
                                  // eslint-disable-next-line no-unused-vars
      kAutoScrollInterval = 200;  // jshint ignore: line
                                  // msec == 5 rows/sec

  // returns the component controller associated with the specified view
  function getController(view) {
    var controller;
    for ( ; view && !controller; view = view.get('parentView')) {
      controller = view.get('controller');
    }
    return controller;
  }

  return {  // return from closure

    childViews: 'titleView tableView _hiddenDragView'.w(),

    dataContext: function () {
      return this.getPath('gridAdapter.dataContext');
    }.property(),

    titleView: SC.LabelView.extend(DG.MouseAndTouchView, {
      classNames: 'dg-case-table-title'.w(),
      layout: { left: 0, right: 0, top: 0, height: 22 },
      isEditable: function () {
        return !this.parentView.getPath('dataContext.hasDataInteractive');
      }.property(),

      /**
       * Assembles the value from collection name and count.
       */
      value: function () {
        return this.parentView.get('collectionName') + ' (' +
            this.parentView.get('caseCount') + ')';
      }.property(),

      valueDidChange: function() {
        this.notifyPropertyChange('value');
      }.observes('*parentView.collectionName', '*parentView.caseCount'),

      /**
       * We are displaying the collection name and count. We only want to
       * edit the name.
       * @override SC.InlineEditorDelegate
       * @param editor
       * @param value
       * @param editable
       */
      inlineEditorWillBeginEditing: function (editor, value, editable) {
        sc_super();
        editor.set('value', this.parentView.get('collectionName'));
      },
      /**
       * Capture the edit result.
       * @override SC.InlineEditorDelegate
       * @param editor
       * @param value
       * @param editable
       * @returns {*}
       */
      inlineEditorDidCommitEditing: function (editor, value, editable) {
        var tTableView = this.parentView,
            this_ = this;
        DG.UndoHistory.execute(DG.Command.create({
          name: 'caseTable.collectionNameChange',
          undoString: 'DG.Undo.caseTable.collectionNameChange',
          redoString: 'DG.Redo.caseTable.collectionNameChange',
          execute: function () {
            this._beforeStorage = tTableView.get('collectionName');
            tTableView.set('collectionName', value);
            this.log = "Change collection name from '%@' to '%@'".fmt(this._beforeStorage, value);
          },
          undo: function () {
            var prev = this._beforeStorage;
            tTableView.set('collectionName', prev);
            // we have to set this as well, as 'value' is not tightly bound
            this_._value = prev;
            this_.propertyDidChange('value');
          },
          redo: function() {
            tTableView.set('collectionName', value);
            // we have to set this as well, as 'value' is not tightly bound
            this_._value = value;
            this_.propertyDidChange('value');
          }
        }));
        return sc_super();
      },

      localize: true,
      doIt: function() {
        this.beginEditing();
      }
    }),

    tableView: SC.View.extend({
      classNames: ['dg-case-table'],
      layout: { left: 0, right: 0, top: 22, bottom: 0 },
      backgroundColor: "white",

      isDropTarget: true,

      computeDragOperations: function( iDrag) {
        if( this.isValidAttribute( iDrag))
          return SC.DRAG_LINK;
        else
          return SC.DRAG_NONE;
      },

      dragStarted: function( iDrag) {
        if (this.parentView.gridAdapter && this.parentView.gridAdapter.canAcceptDrop(iDrag.data.attribute)) {
          this.set('isDragInProgress', true);
        }
      },

      dragEnded: function () {
        this.set('isDragInProgress', false);
      },

      dragEntered: function( iDragObject, iEvent) {
        this.set('isDragEntered', true);
      },

      dragInsertPoint: null,

      dragUpdated: function( iDragObject, iEvent) {
        var slickGrid = this.parentView._slickGrid;
        var gridPosition =  slickGrid.getGridPosition();
        var loc = {x: iDragObject.location.x-gridPosition.left, y:iDragObject.location.y-gridPosition.top};
        var originLoc = {x: iDragObject.origin.x - gridPosition.left, y:1};

        var cell = slickGrid.getCellFromPoint(loc.x, loc.y);
        var originCell = slickGrid.getCellFromPoint(originLoc.x, originLoc.y);
        var columnIndex = cell.cell;
        var cellBox = slickGrid.getCellNodeBox(0, cell.cell);
        // It is possible to get a dragUpdated notification before a dragExited.
        // So we exit.
        if (!cellBox) {
          return;
        }
        var nearerBound = (loc.x - cellBox.left >= cellBox.right - loc.x) ? 'right': 'left';
        if (nearerBound === 'left' && columnIndex > 0) {
          columnIndex -= 1;
          nearerBound = 'right';
        }
        var headerNode = (columnIndex >=0 ) && this.$('.slick-header-column',
                slickGrid.getHeaderRow())[columnIndex];
        if (this.dragInsertPoint)  {
          if (this.dragInsertPoint.columnIndex !== columnIndex
              || this.dragInsertPoint.nearerBound !== nearerBound) {
            this.$(this.dragInsertPoint.headerNode).removeClass('drag-insert-'
                + this.dragInsertPoint.nearerBound);
          } else {
            return;
          }
        }
        if (iDragObject.source !== this
            || nearerBound === 'left'
            || columnIndex > originCell.cell
            || columnIndex < originCell.cell - 1) {
          this.dragInsertPoint = {
            headerNode: headerNode,
            columnIndex: columnIndex,
            nearerBound: nearerBound
          };
          this.$(this.dragInsertPoint.headerNode).addClass('drag-insert-'
              + this.dragInsertPoint.nearerBound);
          //DG.log('dragUpdated: ' + JSON.stringify({
          //      columnIndex: columnIndex,
          //      location: iDragObject.location,
          //      gridPosition: gridPosition,
          //      loc: loc,
          //      cellBox: cellBox,
          //      nearerBound: nearerBound}));
        }
      },

      dragExited: function( iDragObject, iEvent) {
        if (this.dragInsertPoint) {
          this.$(this.dragInsertPoint.headerNode).removeClass('drag-insert-'
              + this.dragInsertPoint.nearerBound);
        }
        this.dragInsertPoint = null;
        this.set('isDragEntered', false);
      },

      acceptDragOperation: function() {
        return YES;
      },

      performDragOperation:function ( iDragObject, iDragOp ) {
        var dragData = iDragObject.data;
        var attr = dragData.attribute;
        var position;

        // if we have an insert point, then we initiate the move.
        // Otherwise we ignore the drop.
        if (this.dragInsertPoint) {
          position = (this.dragInsertPoint.nearerBound === 'right')
              ? this.dragInsertPoint.columnIndex + 1
              : this.dragInsertPoint.columnIndex;
          this.parentView.gridAdapter.requestMoveAttribute(attr, position);
        }
        //DG.log('Got drop: ' + iDragObject.data.attribute.name);
      },

      isValidAttribute: function( iDrag) {
        var tDragAttr = iDrag.data.attribute;
        return !SC.none( tDragAttr)
            && this.parentView.gridAdapter.canAcceptDrop(iDrag.data.attribute);
      }

    }),

    parentTable: null,

    childTable: null,

    _hiddenDragView: SC.LabelView.design({
      classNames: 'drag-label'.w(),
      layout: { width: 100, height: 20, top: -50, left: 0 },
      value: ''
//    cursor: DG.Browser.customCursorStr(static_url('cursors/ClosedHandXY.cur'), 8, 8)
    }),

  layout: { left: 0, right: 0, top: 0, bottom: 0 },
  
  backgroundColor: "white",

  /**
   * Manages name of the current collection.
   * @return {String}
   */
  collectionName: function (key, value) {
    if (value !== undefined) {
      this.setPath('gridAdapter.collectionName', value);
    }
    return this.getPath('gridAdapter.collectionName');
  }.property(),

  collectionNameDidChange: function() {
    this.notifyPropertyChange('collectionName');
  }.observes('*gridAdapter.collectionName'),

  /**
   * Count for the current collection.
   * @return {number}
   */
  caseCount: function () {
    return this.getPath('gridAdapter.collection.casesController.length');
  }.property(),

  caseCountDidChange: function() {
    this.notifyPropertyChange('caseCount');
  }.observes('*gridAdapter.collection.casesController.length'),

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
    @private
    A timer for use in tracking proto-case editing.
    @property   {Number}  timerID
   */
  _protoCaseTimer: null,

  /**
    To commit proto-case values as a new case when the user finishes entering values,
    we set a timer whenever a proto-case cell is exited, and then clear it whenever
    a proto-case cell is entered. When the user finishes entering values, the timer
    expires and the case is created. This handles situations when the user exits the
    case table entirely, for instance, which would be tricky to handle otherwise.
   */
  clearProtoCaseTimer: function() {
    if (this._protoCaseTimer) {
      clearTimeout(this._protoCaseTimer);
      this._protoCaseTimer = null;
    }
  },

  resetProtoCaseTimer: function() {
    this.clearProtoCaseTimer();

    this._protoCaseTimer = setTimeout(function() {
      var rowCount = this._slickGrid.getDataLength(),
          lastRowItem = this._slickGrid.getDataItem(rowCount - 1),
          hasProtoCase = lastRowItem && lastRowItem._isProtoCase && DG.ObjectMap.length(lastRowItem._values);
      if (hasProtoCase) {
        SC.run(function() {
          this.commitProtoCase(lastRowItem);
        }.bind(this));
      }
    }.bind(this), 300);
  },

  /**
    Creates a new case with the specified proto-case values.
   */
  commitProtoCase: function(protoCase) {
    var context = this.get('dataContext'),
        collection = protoCase && protoCase.collection,
        attrIDs = collection && collection.getAttributeIDs(),
        values = [];
    if (!collection) return;

    attrIDs.forEach(function(attrID) {
                      var value = protoCase._values[attrID];
                      values.push(value != null ? value : "");
                    });
    context.applyChange({
              operation: 'createCases',
              attributeIDs: attrIDs,
              values: [ values ]
            });
    protoCase._values = {};
  },

    /**
     * Returns the visible limits of the grid in row,pixel coordinates.
     * See https://github.com/mleibman/SlickGrid/wiki/Slick.Grid#getViewport
     * @property {{
     *    top: {number},
     *    bottom: {number},
     *    leftPx: {number},
     *    rightPx: {number}
     * }}
     */
    gridViewport: function () {
      return this.get('_slickGrid').getViewport();
    }.property('_slickGrid'),

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

    gridWidthDidChange: function() {
      var parentView = this.get('parentView');
      // Apparently, we can get gridWidthDidChange before the parent view is
      // established. This occurs on Chrome, W8.1 or MacOS Mavericks, but not
      // MacOS Yosemite.
      if (parentView) {
        parentView.gridWidthDidChange(this);
      }
    }.observes('gridWidth'),

    /**
     * Returns a hashmap mapping attribute ids to widths in pixels
     * @return {{attr_id: number}}
     */
    columnWidths: function () {
      var columns = this._slickGrid.getColumns();
      var rtn = {};
      if (!SC.none(columns)) {
        columns.forEach(function (column) {
          rtn[column.id] = column.width;
        });
      }
      return rtn;
    }.property(),

    sizeDidChange: function() {
      var parentView = this.get('parentView');
      // Protect against the possibility we don't have a parent view
      if (parentView) {
        parentView.childTableLayoutDidChange(this);
      }
    }.observes('size'),

    rowCountDidChange: function () {
      // rowCount notification can happen while case tables are being rearranged
      // this is a transient situation and we will recreate the full table after,
      // so we can ignore, now.
      if (!SC.none(this.get('parentView'))) {
        this.get('parentView').rowCountDidChange(this);
      }
    }.observes('rowCount'),

    tableDidScroll: function () {
      // scroll notification can happen while case tables are being rearranged
      // this is a transient situation and we will recreate the full table after,
      // so we can ignore, now.
      if (!SC.none(this.get('parentView'))) {
        this.get('parentView').tableDidScroll(this);
      }
    }.observes('scrollPos'),

    tableDidExpandCollapse: function () {
      var parentView =this.get('parentView');
      if (parentView) {
        parentView.tableDidExpandCollapse(this);
      }
    }.observes('expandCollapseCount'),
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

  scrollAnimator: null,
  
  displayProperties: ['gridAdapter','gridDataView','_slickGrid'],
  
  init: function () {
    sc_super();
    this.scrollAnimator = DG.ScrollAnimationUtility.create({});
  },

  /**
    Called when the view is resized, in which case the SlickGrid should resize as well.
   */
  viewDidResize: function() {
    sc_super();
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
   * Slick grid header menu plugin.
   * @type {Slick.Plugins.HeaderMenu}
   */
  headerMenu: null,

  hideHeaderMenu: function() {
    if (this.headerMenu) {
      this.headerMenu.hideMenu();
    }
  },
    /**
     Initializes the SlickGrid from the contents of the adapter (DG.CaseTableAdapter).
     */
  initGridView: function() {
    var gridLayer = this.tableView.get('layer'),
        gridAdapter = this.get('gridAdapter'),
        dataView = gridAdapter && gridAdapter.gridDataView,
        hierTableView = this.get('parentView');
    this._slickGrid = new Slick.Grid( gridLayer, gridAdapter.gridDataView,
                                      gridAdapter.gridColumns, gridAdapter.gridOptions);

    this._slickGrid.setSelectionModel(new DG.CaseTableRowSelectionModel({
      selectActiveRow: true,
      caseTableAdapter: this.gridAdapter
    }));
    
    /*
     * Add a column header menu to each column.
     */
    if( DG.supports('caseTableHeaderMenus')) {
      this.headerMenu = new Slick.Plugins.HeaderMenu({
                                                buttonIsCell: true,
                                                buttonImage: static_url("images/down.gif")
                                              });
      this._slickGrid.registerPlugin(this.headerMenu);

      this.headerMenu.onBeforeMenuShow.subscribe(function(e, args) {
        hierTableView.hideHeaderMenus();
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

      this.headerMenu.onCommand.subscribe(function(e, args) {
        SC.run(function () {
          var controller = getController(this);
          // Dispatch the command to the controller
          if( controller)
            controller.doCommand( args);
        }.bind(this));
      }.bind(this));
    } // DG.supports('caseTableHeaderMenus')

    this._gridEventHandler = new Slick.EventHandler();
    
    // Subscribe to SlickGrid events which call our event handlers directly.
    this.subscribe('onClick', this.handleClick);
    this.subscribe('onKeyDown', this.handleKeyDown);
    this.subscribe('onScroll', this.handleScroll);
    this.subscribe('onHeaderClick', this.handleHeaderClick);
    this.subscribe('onHeaderDragInit', function( iEvent, iDragData) {
                      // dragging should complete any current edit
                      DG.globalEditorLock.commitCurrentEdit();
                      // prevent the grid from cancelling drag'n'drop by default
                      iEvent.stopImmediatePropagation();
                    });
    this.subscribe('onHeaderDragStart', this.handleHeaderDragStart);
    this.subscribe('onBeforeAutoEditCell', this.handleBeforeAutoEditCell);
    this.subscribe('onBeforeEditCell', this.handleBeforeEditCell);
    this.subscribe('onCanvasWidthChanged', function(e, args) {
                      SC.run( function() {
                        this.setIfChanged('gridWidth', this._slickGrid.getContentSize().width);
                      }.bind( this));
                    }.bind( this));
    this.subscribe('onColumnsResized', this.handleColumnsResized);
    this.subscribe('onColumnResizing', this.handleColumnResizing);

    var sgEditController = this._slickGrid.getEditController(),
        commitFunction = sgEditController.commitCurrentEdit,
        cancelFunction = sgEditController.cancelCurrentEdit;
    sgEditController.commitCurrentEdit = function() {
      var activeCell = this._slickGrid.getActiveCell(),
          dataItem = activeCell && this._slickGrid.getDataItem(activeCell.row);
      if (dataItem && dataItem._isProtoCase) {
        this.resetProtoCaseTimer();
      }
      return commitFunction();
    }.bind(this);
    sgEditController.cancelCurrentEdit = function() {
      var activeCell = this._slickGrid.getActiveCell(),
          dataItem = activeCell && this._slickGrid.getDataItem(activeCell.row);
      if (dataItem && dataItem._isProtoCase) {
        this.resetProtoCaseTimer();
      }
      return cancelFunction();
    }.bind(this);


    // wire up model events to drive the grid
    dataView.onRowCountChanged.subscribe(function (e, args) {
      SC.run( function() {
        if( this._slickGrid) {
          this._slickGrid.invalidate();
          this.set('rowCount', args.current);
        }
      }.bind( this));
    }.bind( this));
    
    dataView.onRowsChanged.subscribe(function (e, args) {
      if( this._slickGrid) {
        this._slickGrid.invalidateRows(args.rows);
        this._slickGrid.render();
      }
    }.bind( this));
    
    $(gridLayer).show();

    $(gridLayer).bind('wheel', function (ev) {
      ev.stopPropagation();
    });
    $(gridLayer).bind('DOMMouseScroll', function (ev) {
      ev.stopPropagation();
    });
    $(gridLayer).bind('MozMousePixelScroll', function (ev) {
      ev.stopPropagation();
    });

      this.adjustHeaderForOverflow();
    // Let clients know when there's a new _slickGrid
    this.notifyPropertyChange('gridView');
  },

    _refreshDataView: function (recurse) {
      var childTable = this.get('childTable');
      var gridAdapter = this.get('gridAdapter');
      if (gridAdapter) {
        gridAdapter.gridDataView.refresh();
      } else {
        DG.warn('CaseTableView._resetDataView: no data view' );
      }
      if (childTable && recurse) {
        childTable._refreshDataView(recurse);
      }
    },

    /**
     * Gets the row position of a case in relative to the top of the viewport.
     * If the row position is not visible in the viewport returns undefined.
     * @param iCaseID {number}
     * @returns {number|undefined}
     */
    getViewportPosition: function (iCaseID) {
      var gridDataView = this.getPath('gridAdapter.gridDataView');
      var row = gridDataView.getRowById(iCaseID);
      var viewport = this.get('gridViewport');
      var viewHeight = viewport.bottom - viewport.top;
      var offset = row - viewport.top;
      if (offset >= 0 && offset <= viewHeight) {
        return row - viewport.top;
      } else {
        return undefined;
      }
    },

    /**
     * Aligns the row containing the matching case ids in child tables of this table.
     *
     * This method is intended to align collapsed rows.
     * Collapsed rows are assumed to be mapped in child tables to the collapsed
     * row, perhaps in a higher level collection.
     *
     * @param iViewportPosition {number}
     * @param iCaseID {number}
     */
    alignChildTables: function (iViewportPosition, iCaseID) {
      var childView = this.get('childTable');
      if (!childView) {
        return;
      }
      var row = childView.getPath('gridAdapter.gridDataView').getRowById(iCaseID);
      childView.animateScrollToTop(row - iViewportPosition);
      childView.alignChildTables(iViewportPosition, iCaseID);
    },

    /**
     * Collapses a node in the case tree and resets all case tables below.
     * @param iCaseID {number}
     */
    collapseCase: function (iCaseID) {
      var childTable = this.get('childTable');
      var viewportRow;
      this.getPath('gridAdapter.gridDataView').collapseGroup(iCaseID);
      if (childTable) {
        childTable._refreshDataView(true);
        viewportRow = this.getViewportPosition(iCaseID);
        this.alignChildTables(viewportRow, iCaseID);
      }
    },

    /**
     * Collapses a node in the case tree and resets all case tables below.
     *
     * @param iCaseID {number}
     */
    expandCase: function (iCaseID) {
      var childTable = this.get('childTable');
      this.getPath('gridAdapter.gridDataView').expandGroup(iCaseID);
      if (childTable) {
        childTable._refreshDataView(true);
      }
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
            var result;
            if (!_inHandler) {
              _inHandler = true;
              result = iHandler.apply( this, arguments);
              _inHandler = false;
              return result;
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
   * @param {SC.RenderContext} iContext
   * @param {boolean} iFirstTime
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
    if( this._slickGrid) {
      var gridAdapter = this.get('gridAdapter');
      if( this._rowDataDidChange) {
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
    //if( this._slickGrid)
    //  iContext.setClass( this.$().attr("class"), YES);
  },

  didAppendToDocument: function() {
    var gridAdapter = this.get('gridAdapter');
    if (!this._slickGrid && SC.none(gridAdapter)) {
      console.log("DG.CaseTableView.didAppendToDocument: Can't initialize _slickGrid!");
      return;
    }

    if( !this._slickGrid) {
      this.initGridView();
      this.set('gridWidth', this._slickGrid.getContentSize().width);
    }
  },

  /**
    Returns the touch position in view coordinates.
    @param    {Object}    iTouch The touch event
    @returns  {Object}    The { x:, y: } location of the touch in view coordinates
   */
  touchPosInView: function( iTouch) {
    return this.convertFrameFromView({ x: iTouch.pageX, y: iTouch.pageY }, null, true);
  },
  
  /**
    Returns the touch position in table body content coordinates.
    @param    {Object}    iTouch The touch event
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
    @param    {Object}    iTouch The touch event
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
    Called when the table is scrolled.
    @param  {Slick.Event}   iEvent -- the event which triggered the scroll
    @param  {*} iArgs {{scrollTop: number, scrollLeft: number}}
   */
  handleScroll: function( iEvent, iArgs) {
    //DG.log('%@:handleScroll(%@,%@)'.loc(this.get('collectionName'), iArgs.scrollTop, iArgs.scrollLeft));
    var scrollPos = this.get('scrollPos');
    // set scroll only if _values_ changed
    if (SC.none(scrollPos)
        || scrollPos.scrollTop !== iArgs.scrollTop
        || scrollPos.scrollLeft !== iArgs.scrollLeft) {
      this.set('scrollPos', {
        scrollTop: iArgs.scrollTop,
        scrollLeft: iArgs.scrollLeft
      });
    }
  },

  handleBeforeAutoEditCell: function(iEvent, iArgs) {
    // enable autoEdit for the proto-case row
    var activeRowItem = this._slickGrid.getDataItem(iArgs.row);
    return activeRowItem && activeRowItem._isProtoCase;
  },

  handleBeforeEditCell: function(iEvent, iArgs) {
    var activeRowItem = this._slickGrid.getDataItem(iArgs.row),
        rowCount = this._slickGrid.getDataLength(),
        lastRowItem = this._slickGrid.getDataItem(rowCount - 1),
        hasProtoCase = lastRowItem && lastRowItem._isProtoCase && DG.ObjectMap.length(lastRowItem._values);

    this.clearProtoCaseTimer();

    if (!activeRowItem._isProtoCase && hasProtoCase) {
      this.commitProtoCase(lastRowItem);
    }

    // if attribute not editable and not the proto-case row, then can't edit
    if (!this.get('gridAdapter').isCellEditable(iArgs.row, iArgs.cell))
      return false;

    return true;
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

    // We make this funky call to mainPane because (we think) SlickGrid has swallowed the mousedown
    // that would normally allow mainPane to hide the inspector picker.
    DG.mainPage.mainPane.hideInspectorPicker();
    var tDragView = this._hiddenDragView,
        tAttributeName = column.attribute.get('name');
    SC.run( function () {
      tDragView.set('value', tAttributeName);
      this.removeChild( tDragView);
      this.appendChild( tDragView);
    }.bind(this));
    // setting attribute and starting drag need to be in separate run loops.
    SC.run( function() {
      // Make sure dragView is in front. Won't actually happen without this runloop.
      // We could dynamically adjust the width here, but since the font used for the
      // drag image is currently different than the one used in the table, it's not
      // clear what the appropriate size should be, so we skip it for now.
      //if( column.width)
      //  tDragView.adjust('width', column.width);
      // Initiate a drag
      DG.Drag.start({
        event: iEvent,
        source: this,
        dragView: tDragView,
        ghost: YES,
        ghostActsLikeCursor: YES,
        slideBack: YES, // The origin is supposed to be the point that the drag view will slide back to,
        // but this is not working.
        origin: {x: iEvent.clientX, y: iEvent.clientY},
        data: {
          context: column.context,
          collection: column.collection,
          attribute: column.attribute,
          text: tAttributeName
        }  // For use by clients like the text box
      });
    });
  },
  
  /**
    Called when a table header cell is clicked.
    @param  {Slick.Event}   iEvent -- the event corresponding to the mouse click
   */
  handleHeaderClick: function(iEvent, iArgs) {
    DG.globalEditorLock.commitCurrentEdit();

    // click in the new attribute column header brings up new attribute dialog
    var newAttrColumnID = this.getPath('gridAdapter.newAttrColumnID');
    if (iArgs.column.id === newAttrColumnID) {
      var responder = this.getPath('pane.rootResponder');
      if (responder) {
        SC.run(function() {
          responder.sendAction('newAttributeAction', getController(this), this, null,
                                { collection: iArgs.column.collection });
        }.bind(this));
      }
    }
  },

  /**
   * Clear menu, if present
   * @param iEvent
   */
  handleClick: function (iEvent) {
    var hierTableView = this.get('parentView');
    hierTableView.hideHeaderMenus();
  },

  /**
   * Handle SlickGrid KeyDown events
   * @param iEvent
   */
  handleKeyDown: function (iEvent) {
    if ((iEvent.keyCode === 9) || (iEvent.keyCode === 13)) {
      var editorLock = this._slickGrid.getEditorLock(),
          editorIsActive = editorLock && editorLock.isActive(),
          columns = this._slickGrid.getColumns(),
          columnCount = columns && columns.length,
          activeCell = this._slickGrid.getActiveCell(),
          dataItem = activeCell && this._slickGrid.getDataItem(activeCell.row);
      if (editorIsActive && dataItem && dataItem._isProtoCase) {
        this.clearProtoCaseTimer();
        if (iEvent.shiftKey) {
          if (activeCell.cell > 0)
            this._slickGrid.navigatePrev();
        }
        else {
          if (activeCell.cell < columnCount - 1) {
            this._slickGrid.navigateNext();
          }
          else if (editorLock.commitCurrentEdit() && DG.ObjectMap.length(dataItem._values)) {
            SC.run(function() {
              this.commitProtoCase(dataItem);

              // wait until everything has refreshed to navigate to the next row
              this.invokeNext(function() {
                this._slickGrid.navigateNext();
              }.bind(this));
            }.bind(this));
          }
        }

        iEvent.stopImmediatePropagation();
      }
    }
  },

  /**
   * Called when column widths changed
   * @param iEvent
   * @param {{grid: SlickGrid}}iArgs
   */
  handleColumnsResized: function(iEvent, iArgs) {
    var parentView = this.get('parentView');
    var model = parentView && parentView.get('model');
    var columnWidths = this.get('columnWidths');
    if (parentView) {
      DG.ObjectMap.forEach(columnWidths, function(key, value) {
        model.setPreferredAttributeWidth(key, value);
      });
    }
  },

    handleColumnResizing: function (iEvent, iArgs) {
      this.adjustHeaderForOverflow();
    },

    adjustHeaderForOverflow: function () {
      function makeLinePair($el) {
        var text = $el.text();
        var $line1 = $('<span>').addClass('two-line-header-line-1').text(text);
        var $line2 = $('<span>').addClass('two-line-header-line-2').text(text);
        $el.empty().append($line1).append($line2);
      }
      function computeMiddleEllipsis($el) {
        var width = $el.width();
        var v1 = $('.two-line-header-line-1', $el);
        var text = v1.text();
        var textWidth = DG.measureTextWidth(text, {font: v1.css('font')});
        //DG.log('text, el-w,text-w,truncating: ' + [text, width,textWidth, (textWidth > 2*width)].join());
        if (textWidth > 2 * width) {
          $el.addClass('two-line-header-truncating');
        } else {
          $el.removeClass('two-line-header-truncating');
        }
      }

      $(this.get('layer')).find('.slick-header-column').each(function (ix, cell) {
        var $nameElement = $(cell).find('.slick-column-name');
        var $line1 = $nameElement.find('.two-line-header-line-1');
        if (!$line1.length) {
          makeLinePair($nameElement);
        }
        computeMiddleEllipsis($nameElement);
      });
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
      this.adjustHeaderForOverflow();
    }
  },
  
  /**
    Expands/collapses all of the row groups at once.
    @param    {Boolean}   iExpand -- Expands all row groups if truthy;
                                      collapses all row groups otherwise
   */
  expandCollapseAll: function( iExpand) {
    var collection = this.getPath('gridAdapter.collection');
    var cases = collection.get('casesController');
    var dataView = this.getPath('gridAdapter.gridDataView');
    var model = this.parentView.get('model');

    DG.assert( collection);
    DG.assert( cases);
    var priorExpCoState = model.get('collapsedNodes');

    DG.UndoHistory.execute(DG.Command.create({
      name: 'caseTable.groupToggleExpandCollapseAll',
      undoString: 'DG.Undo.caseTable.groupToggleExpandCollapseAll',
      redoString: 'DG.Redo.caseTable.groupToggleExpandCollapseAll',
      log: 'Expand/Collapse all',
      execute: function () {
        //DG.log('expandCollapseAll: [expand/collection/cases]: '
        //    + [iExpand, this.get('collectionName'), cases.get('length')].join('/'));
        this.beginDataViewUpdate(true);
        cases.forEach(function (myCase) {
          try {
            if (iExpand) {
              dataView.expandGroup( myCase.id);
            } else {
              dataView.collapseGroup( myCase.id);
            }
          } catch (e) {
            DG.logError('expandCollapseAll: ' + e);
          }
        });
        this.endDataViewUpdate(true);
        this.childTable._refreshDataView(true);
      }.bind(this),
      undo: function () {
        this.beginDataViewUpdate(true);
        cases.forEach(function (myCase) {
          dataView.expandGroup( myCase.id);
        });
        priorExpCoState.forEach(function (caseID) {
          dataView.collapseGroup(caseID);
        });
        this.updateSelectedRows(true);
        this.incrementProperty('expandCollapseCount');
        this.endDataViewUpdate(true);
        this.childTable._refreshDataView(true);
      }.bind(this),
      redo: function () {
        this.execute();
      }
    }));

  },

    /**
     * This method should be called at the beginning of a multipart update
     * affecting the gridDataView so as to prevent potentially expensive
     * redundant calculations. GridDataView.refresh() will be bypassed until
     * endDataViewUpdate is called.
     * @param recurse {boolean}
     */
    beginDataViewUpdate: function (recurse) {
      var dataView = this.getPath('gridAdapter.gridDataView');
      var childTable = this.get('childTable');
      DG.assert( dataView);
      dataView.beginUpdate();
      if (recurse && childTable) {
        childTable.beginDataViewUpdate(recurse);
      }
    },

    /**
     * Should be called at the end of a multipart update affecting the gridDataView.
     *
     * @param recurse {boolean}
     */
    endDataViewUpdate: function (recurse) {
      var dataView = this.getPath('gridAdapter.gridDataView');
      var childTable = this.get('childTable');
      DG.assert( dataView);
      dataView.endUpdate();
      if (recurse && childTable) {
        childTable.endDataViewUpdate(recurse);
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

    @param  forceRedraw {Boolean} Whether to force a re-indexing of the rows
   */
  updateRowCount: function( forceRedraw) {
    if( !this._slickGrid) return;

    // For now, additions and deletions require complete rebuild.
    // When deletion is handled via DataContext API we can do better.
    this.updateRowData();
    this.updateSelectedRows(true);

    //this._slickGrid.render();
  },

  /**
   * Scrolls the grid to make at least a part of the range of rows in the
   * current view.
   * @param {[number]} rowIndices
   */
  scrollToView: function (rowIndices) {
    var rowDistance = this.getMinScrollDistance(rowIndices);
    var viewport = this.get('gridViewport');
    var top = Math.max(viewport.top - rowDistance, 0);
    if (Math.abs(rowDistance) * 2 > (viewport.bottom - viewport.top)) {
      this.scrollAnimator.animate(this, viewport.top, top);
    } //else {
      // this is a BIG HACK. We generate a small animation when the nearest
      // selected point is already visible. We do this to avoid an issue
      // that occurs when a user selects from the case table after a selection
      // has occurred that does not involve the case table. This later issue
      // is not well understood. Hence the hack.
     // this.scrollAnimator.animate(this, viewport.top-0.1, viewport.top);

    //}
    //DG.log(JSON.stringify({rowIndices:rowIndices,min:rowDistance,
    //  viewportTop:viewport.top,viewportBottom: viewport.bottom,top:top}));
  },

    animateScrollToTop: function (rowIndex) {
      var viewport = this._slickGrid.getViewport();
      this.scrollAnimator.animate(this, viewport.top, rowIndex);
    },

    /**
     * It is possible that the DOM and SlickGrid get out of sync. This method
     * makes the DOM match Slickgrid's idea of the current scroll state.
     */
    refreshScroll: function() {
      var rowIx = this._slickGrid.getViewport().top;
      this.scrollToRow(0);
      this.scrollToRow(rowIx);
    },

    /**
     * Scrolls the table so that the indicated row is at the top of the displayed
     * region, if possible.
     */
    scrollToRow: function (rowIx) {
      this._slickGrid.scrollRowToTop(rowIx);
    },

    /**
     * Returns the minimum distance of an array of rows to the viewport middle in row units.
     * @param  rowArray {[Number]}   Array of indices of rows
     * @return {Number} number of rows distant
     */
    getMinScrollDistance: function (rowArray) {
      var viewport = this._slickGrid.getViewport(); // viewport.top, .bottom: row units
      var viewMiddle = (viewport.top + viewport.bottom - 2) / 2;
      return rowArray.map(function (row) {
            return (viewMiddle - row);
          }).reduce(function(m, dist) {
            return (Math.abs(m) > Math.abs(dist)?dist: m);
          }, Number.MAX_VALUE);
    },

  /**
   * Sets the set of selected rows.
   * @param  iSelectedRows {[Number]}   Array of indices of selected rows
   */
  setSelectedRows: function( iSelectedRows) {
    if( this._slickGrid) {
      this._slickGrid.setSelectedRows( iSelectedRows);
    }
  },

  scrollSelectionToView: function () {
    var selectedRows = this._slickGrid.getSelectedRows();
    if (selectedRows.length > 0) {
      this.scrollToView(selectedRows);
    } else {
      this._slickGrid.render();
    }
  },

  scrollToCase: function (iCaseID) {
    if (SC.none(iCaseID)) {
      return;
    }
    var dataView = this.getPath('gridAdapter.gridDataView');

    var row = dataView.getRowById(iCaseID);
    if (row < 0) {
      return;
    }
    this.scrollToView([row]);
  },

  /**
   * Reset selection display. If recurse is set will reset child table
   *
   * @param recurse {boolean}
   */
  updateSelectedRows: function(recurse) {
    var adapter = this.get('gridAdapter'),
        selection = adapter && adapter.getSelectedRows(),
        childView = this.get('childTable');
    if( selection) {
      this.setSelectedRows( selection);
    }
    if (recurse && childView) {
      childView.updateSelectedRows(recurse);
    }
  },

  _scrollEventCount: 0,

    /**
     * Scrolls to maintain its relationship with the table on its left.
     *
     * The relationship is defined by the rule that any visible case's parent
     * should be visible.
     *
     * In this case we will scroll this table if first child of the left table's
     * top visible row is lower than the top of this table or the last child of
     * the left table's bottom visible row is higher than the last row.
     *
     * @returns {boolean} Whether a scroll was performed.
     */
  scrollToAlignWithLeft: function () {
    function getRightRowRange(iCase) {
      if (!iCase) {
        DG.log('No case: scrollToAlignWithLeft: %@', leftTable.get('collectionName'));
        return;
      }
      var children = iCase.get('children');
      var c0 = children && children[0];
      var cn = children && children[children.length-1];
      var rtn;
      if (model.isCollapsedNode(iCase)) {
        rtn = {
          first: dataView.getRowById(iCase)
        };
        rtn.last = rtn.first;
      }
      else {
        rtn = {
          first: dataView.getRowById(c0.id),
          last: dataView.getRowById(cn.id)
        };
      }
      return rtn;
    }
    var model =  this.getPath('parentView.model');
    var viewport = this.get('gridViewport');
    var viewportHeight = viewport.bottom - viewport.top - 1;
    var dataView = this.getPath('gridAdapter.gridDataView');
    var leftTable = this.get('parentTable');
    var leftViewport = leftTable.get('gridViewport');
    var leftDataView = leftTable.getPath('gridAdapter.gridDataView');
    var didScroll = false;
    if (dataView.getLength() === 0 || leftDataView.getLength() === 0) {
      // nothing to do
      return false;
    }

    // Find row in this table of first child of top item in left viewport
    var leftTopCase = leftDataView.getItem(leftViewport.top);
    var rightTopRange = getRightRowRange(leftTopCase);

    // Find row in this table of the last child of bottom item in left viewport
    var leftBottomCase = leftDataView.getItem(Math.min(leftDataView.getLength()-1,leftViewport.bottom));
    var rightBottomRange = getRightRowRange(leftBottomCase);

    // If viewport top is less than c0Row, then scroll c0Row to top.
    if (rightTopRange.first > viewport.top) {
      this._slickGrid.scrollRowToTop(rightTopRange.first);
      didScroll = true;
    } else if (rightBottomRange.last < Math.min(dataView.getLength() - 1, viewport.bottom)) {
      // if viewport bottom is greater than cnRow, then scroll cnRow to bottom.
      this._slickGrid.scrollRowToTop(rightBottomRange.last - viewportHeight);
      didScroll = true;
    }
    return didScroll;
  },

    /**
     * Scrolls to maintain its relationship with the table on its right.
     *
     * The relationship is defined by the rule that any visible case's parent
     * should be visible.
     *
     * In this case we will scroll this table if the parent of the right table's
     * top visible row is higher than the top of this table or the parent of the
     * table's bottom visible row is lower than the last row of this table.
     *
     * @returns {boolean} Whether a scroll was performed.
     */
  scrollToAlignWithRight: function () {
    //
    function getParentRow(iCase) {
      if (!iCase) {
        DG.log('No case: scrollToAlignWithRight: %@', rightTable.get('collectionName'));
        return;
      }
      var caseInLeftRow = iCase;
      if (!model.isCollapsedNode(iCase)) {
        caseInLeftRow = iCase.get('parent');
      }
      return dataView.getRowById(caseInLeftRow.id);
    }
    var model =  this.getPath('parentView.model');
    var viewport = this.get('gridViewport');
    var viewportHeight = viewport.bottom - viewport.top - 1;
    var dataView = this.getPath('gridAdapter.gridDataView');
    var rightTable = this.get('childTable');
    var rightViewport = rightTable.get('gridViewport');
    var rightDataView = rightTable.getPath('gridAdapter.gridDataView');
    var didScroll = false;
    if (dataView.getLength() === 0 || rightDataView.getLength() === 0) {
      // nothing to do
      return false;
    }


      // Find row in right table of first child, p0Row, of top item in this table
    var topRightCase = rightDataView.getItem(rightViewport.top);
    var p0Row = getParentRow(topRightCase);

    // Find row in right table of the last child, pnRow, of bottom item in left table
    var bottomRightCase = rightDataView.getItem(Math.min(rightDataView.getLength() - 1, rightViewport.bottom));
    // if right table DOM not ready yet, this case will not exist. We return.
    var pnRow = getParentRow(bottomRightCase);

    // If viewport top is less than p0Row, then scroll p0Row to top.
    if (p0Row < viewport.top) {
      this._slickGrid.scrollRowToTop(p0Row);
      didScroll = true;
    } else if (pnRow >= Math.min(dataView.getLength() - 1, viewport.bottom)) {
      // if viewport bottom is greater than pnRow, then scroll pnRow to bottom.
      this._slickGrid.scrollRowToTop(pnRow - viewportHeight);
      didScroll = true;
    }
    return didScroll;
  }
  }; // end return from closure
  
}())); // end closure
