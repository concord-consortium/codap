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
sc_require('views/image_view');
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

    classNames: 'dg-case-table-view',

    childViews: 'titleBarContainer tableView _hiddenDragView'.w(),

    dataContext: function () {
      return this.getPath('gridAdapter.dataContext');
    }.property(),
    dataContextDidChange: function() {
      this.respondToDataContextAndGridAdapterChanges();
    }.observes('gridAdapter.dataContext'),

    titleBarContainer: SC.View.extend({
      childViews: 'titleBar'.w(),
      classNames: ['dg-case-table-title-bar-container'],
      layout: {left: 0, right: 0, top: 0, height: 22},
      mouseDown: function (ev) {
        // if not in a current edit, background clicks should complete any edit
        if (ev.target.tagName !== 'INPUT') {
          DG.globalEditorLock.commitCurrentEdit();
        }
        return NO;
      },
      titleBar: SC.View.extend({
        childViews: 'titleView newAttrButtonView'.w(),
        classNames: 'dg-case-table-title-bar newAttrButtonView'.w(),
        refView: function () {
          var parentView = this.parentView;
          return parentView && parentView.parentView;
        }.property(),
        titleView: SC.LabelView.extend(DG.MouseAndTouchView, SC.AutoResize, {
          refView: function () {
            var parentView = this.parentView;
            return parentView && parentView.get('refView');
          }.property(),
          layout: {left: 0, top: 3, right: 22, height: 22},
          exampleNode: null,
          classNames: 'dg-case-table-title'.w(), // layout: { left: 0, right: 0, top: 0, height: 22 },
          isEditable: function () {
            var owningDataInteractive = this.getPath('refView.dataContext.owningDataInteractive');
            var owningInteractivePreventsReorg = owningDataInteractive && owningDataInteractive.get('preventDataContextReorg');
            return !owningDataInteractive || !owningInteractivePreventsReorg;
          }.property(),

          /**
           * Assembles the value from collection name and count.
           */
          value: function () {
            var collectionName = this.getPath('refView.collectionName');
            var caseCount = this.getPath('refView.caseCount');
            var hasChildTable = !!this.getPath('refView.childTable');
            var setAsideCount = hasChildTable ? 0 : this.getPath(
                'refView.dataContext.setAsideCount');
            if (hasChildTable || (setAsideCount === 0)) {
              return 'DG.TableController.collectionTitleText'.loc(collectionName,
                  caseCount);
            } else {
              return 'DG.TableController.collectionTitleTextWithSetAside'.loc(
                  collectionName, caseCount, setAsideCount);
            }
          }.property(),

          valueDidChange: function (l) {
            this.notifyPropertyChange('value');
            this.set('toolTip', this.get('value'));
          }.observes('*refView.collectionName', '*refView.caseCount'),

          toolTip: '',

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
            editor.set('value', this.getPath('refView.collectionName'));
            var exampleNode = this.get('exampleNode');
            var tParent = this.get('parentView');
            var tFrame = tParent.get('frame');
            var kXGap = 4, kYGap = 2;
            var tOrigin = DG.ViewUtilities.viewToWindowCoordinates({x: kXGap, y: kYGap}, tParent);
            if (!exampleNode) {
              exampleNode = this.get('layer').cloneNode(false);
              exampleNode.id = exampleNode.id + "-clone";
              exampleNode.style.visibility = 'hidden';
              exampleNode.style.textAlign = 'center';
              exampleNode.className = exampleNode.className.replace('dg-case-table-title', '');
              tParent.get('layer').appendChild(exampleNode);
              this.set('exampleNode', exampleNode);
            }
            exampleNode.style.left = 3 + 'px';
            exampleNode.style.top = 9 + 'px';

            editor.set({
              exampleElement: exampleNode,
              exampleFrame: {
                x: tOrigin.x, y: tOrigin.y,
                width: tFrame.width - 2 * kXGap, height: tFrame.height - 2 * kYGap
              }
            });

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
            var tController = getController(this),
                tDataContext = tController && tController.get('dataContext'),
                tCollectionName = this.getPath('refView.collectionName');
            if (tDataContext) {
              DG.CaseDisplayUtils
                  .setCollectionNameWithCommand(tDataContext, tCollectionName,
                      value);
            }
            return sc_super();
          },

          localize: true,
          doIt: function () {
            this.beginEditing();
          },
        }),
        newAttrButtonView: DG.ImageView.extend({
          refView: function () {
            return this.parentView && this.parentView.get('refView');
          }.property(),
          classNames: ['dg-floating-plus'],
          classNameBindings: ['disabled'],
          layout: {
            top: 0,
            right: 0,
            width: 22,
            height: 22
          }, // https://www.materialui.co/icon/add-circle
          value: static_url('images/add_circle_grey_72x72.png'),
          tooltip: 'DG.TableController.newAttributeTooltip'.loc(),
          disabled: function () {
            var context = this.getPath('refView.gridAdapter.dataContext');
            var isTopLevel = !this.getPath(
                'refView.gridAdapter.hasParentCollection');
            return context && isTopLevel && DG.DataContextUtilities.isTopLevelReorgPrevented(
                context);
          }.property('_dataContextDidChange'),
          dataContextDidChange: function () {
            this.notifyPropertyChange('_dataContextDidChange');
          }.observes('refView.gridAdapter.dataContext.metadataChangeCount'),
          didAppendToDocument: function () {
            sc_super();

            var tooltip = this.get('tooltip');
            if (tooltip) this.$().attr('title', tooltip);
          },
          mouseDown: function (evt) {
            var tableController = getController(this),
                collection = this.getPath('refView.gridAdapter.collection');
            // only respond to left-button clicks; see SC.Event for constant
            if (tableController && collection && (evt.which === 1)) {
              SC.RootResponder.responder
                  .sendAction('newAttributeAction', tableController, this,
                      this.get('pane'),
                      {collection: collection, autoEditName: true});
            }
            return YES;
          },
          touchStart: function (evt) {
            return YES;
          },
          touchEnd: function (evt) {
            evt.allowDefault();
            return YES;
          }
        }),

      }),
    }),

    tableView: SC.View.extend({
      classNames: ['dg-case-table'],
      layout: {left: 0, right: 0, top: 22, bottom: 0},
      backgroundColor: "white",

      isDropTarget: true,

      classNameBindings: ['isDragInProgress:dg-table-drop-target-show'],

      /**
       * @property {DG.CaseTableDragHelper}
       */
      dragHelper: null,

      computeDragOperations: function (iDrag) {
        if( this.isValidAttribute( iDrag))
          return SC.DRAG_LINK;
        else
          return SC.DRAG_NONE;
      },

      /**
       * We determine the drag helper appropriate to the attribute being dragged and pass responsibility
       * to it for all drag functions.
       * @param iDrag
       */
      dragStarted: function (iDrag) {
        var tHelper = DG.CaseTableDragHelper.createHelper(this, iDrag);
        if (tHelper) {
          this.set('dragHelper', tHelper);
          this.get('dragHelper').dragStarted(iDrag);
        }
      },

      dragEnded: function () {
        var tDragHelper = this.get('dragHelper');
        tDragHelper.dragEnded();
        tDragHelper.destroy();
        this.set('dragHelper', null);
      },

      dragEntered: function (iDragObject, iEvent) {
        this.get('dragHelper').dragEntered(iDragObject, iEvent);
      },

      dragUpdated: function (iDragObject, iEvent) {
        this.get('dragHelper').dragUpdated(iDragObject, iEvent);
      },

      dragExited: function (iDragObject, iEvent) {
        this.get('dragHelper').dragExited(iDragObject, iEvent);
      },

      acceptDragOperation: function (drag, op) {
        return this.get('dragHelper').acceptDragOperation(drag, op);
      },

      performDragOperation: function (iDragObject, iDragOp) {
        this.get('dragHelper').performDragOperation(iDragObject, iDragOp);
      },

      isValidAttribute: function (iDrag) {
        return this.get('dragHelper').isValidAttribute(iDrag);
      },

      /**
       * These methods -- dataDragEntered, dataDragHovered, dataDragDropped,
       * and dataDragExited -- support drags initiated outside the page,
       * specifically drags from plugins.
       */
      _externalDragObject: function () {
        var data = DG.mainPage.getPath('mainPane.dragAttributeData');
        if (data && data.context === this.parentView.get('dataContext')) {
          return {
            data: data
          };
        }
      }.property(),
      externalDragDidChange: function () {
        var tDrag = this.get('_externalDragObject');
        if (!tDrag) {
          return;
        }
        if (DG.mainPage.getPath('mainPane._isDraggingAttr')) {
          this.dragStarted(tDrag);
        } else {
          this.dragEnded();
        }
      }.observes('DG.mainPage.mainPane._isDraggingAttr'),

      dataDragEntered: function (iEvent) {
        var externalDragObject = this.get('_externalDragObject');
        if (externalDragObject && this.isValidAttribute(externalDragObject)) {
          this.dragEntered(null, externalDragObject);
          iEvent.preventDefault();
        }
      },
      dataDragHovered: function (iEvent) {
        var externalDragObject = this.get('_externalDragObject');
        if (externalDragObject && this.isValidAttribute(externalDragObject)) {
          iEvent.dataTransfer.dropEffect = 'copy';
          iEvent.preventDefault();
          iEvent.stopPropagation();
          this._computeInsertionPoint({x: iEvent.clientX, y: iEvent.clientY});
        } else {
          return false;
        }
      },
      dataDragDropped: function (iEvent) {
        var externalDragObject = this.get('_externalDragObject');
        if (externalDragObject && this.isValidAttribute(externalDragObject)) {
          iEvent.preventDefault();
          var data = DG.mainPage.getPath('mainPane.dragAttributeData');
          this._performDragOperation(data);
        } else {
          return false;
        }
      },
      dataDragExited: function (iEvent) {
        var externalDragObject = this.get('_externalDragObject');
        if (externalDragObject && this.isValidAttribute(externalDragObject)) {
          this.dragExited(null, externalDragObject);
          iEvent.preventDefault();
        }
      }

    }),

    parentTable: null,

    childTable: null,

    _hiddenDragView: SC.LabelView.design({
      classNames: 'dg-drag-label'.w(),
      layout: {width: 100, height: 20, top: -50, left: 0},
      value: ''
//    cursor: DG.Browser.customCursorStr(static_url('cursors/ClosedHandXY.cur'), 8, 8)
    }),

    ancestorViewDidResizeOrScroll: function () {
      this.invokeLater(function () {
        var visibleFrameBounds = this.get('visibleFrameBounds');
        var titleBar = this.getPath('titleBarContainer.titleBar');
        if (visibleFrameBounds) {
          titleBar.adjust({
            left: visibleFrameBounds.x,
            width: visibleFrameBounds.width,
            right: null
          });
        }
      }.bind(this));
    },

    frameBounds: function () {
      var pv = this.get('parentView'), frame = this.get('frame');
      return pv ? pv.convertFrameToView(frame, null) : frame;
    }.property(),

    visibleFrameBounds: function () {
      var view = this, pv = this.get('parentView'), frame = this.get('frame'),
          baseFrame = pv ? pv.convertFrameToView(frame, null) : frame,
          visibleBounds = {}, right, bottom;
      // find boundary of the hierarchical table view
      while (pv && !(view instanceof DG.HierTableView)) {
        view = pv;
        pv = view.get('parentView');
      }
      if (!pv) {
        return;
      }
      var boundingFrame = pv.convertFrameToView(view.get('frame'), null);
      visibleBounds.x = Math.max(boundingFrame.x, baseFrame.x);
      visibleBounds.y = Math.max(boundingFrame.y, baseFrame.y);
      right = Math.min(boundingFrame.x + boundingFrame.width,
          baseFrame.x + baseFrame.width);
      bottom = Math.min(boundingFrame.y + boundingFrame.height,
          baseFrame.y + baseFrame.height);
      visibleBounds.width = Math.max(right - visibleBounds.x, 0);
      visibleBounds.height = Math.max(bottom - visibleBounds.y, 0);

      return this.convertFrameFromView(visibleBounds, null);
    }.property(),

    layout: {left: 0, right: 0, top: 0, bottom: 0},

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

    collectionNameDidChange: function () {
      this.notifyPropertyChange('collectionName');
    }.observes('*gridAdapter.collectionName'),

    /**
     * Count for the current collection.
     * @return {number}
     */
    caseCount: function () {
      return this.getPath('gridAdapter.collection.casesController.length');
    }.property(),

    caseCountDidChange: function () {
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
     * Used so that we know when all cued invokeLast's inside viewDidResize has fired off so that
     * we can cause slickGrid to refresh one last time
     */
    _canvasResizeCounter: 0,

    /**
     To commit proto-case values as a new case when the user finishes entering values,
     we set a timer whenever a proto-case cell is exited, and then clear it whenever
     a proto-case cell is entered. When the user finishes entering values, the timer
     expires and the case is created. This handles situations when the user exits the
     case table entirely, for instance, which would be tricky to handle otherwise.
     */
    clearProtoCaseTimer: function () {
      if (this._protoCaseTimer) {
        clearTimeout(this._protoCaseTimer);
        this._protoCaseTimer = null;
      }
    },

    resetProtoCaseTimer: function () {
      this.clearProtoCaseTimer();

      this._protoCaseTimer = setTimeout(function () {
        // timer can outlive table
        if (!this._slickGrid) return;
        var rowCount = this._slickGrid.getDataLength(),
            lastRowItem = this._slickGrid.getDataItem(rowCount - 1),
            hasProtoCase = lastRowItem && lastRowItem._isProtoCase && DG.ObjectMap.length(
                lastRowItem._values);
        if (hasProtoCase) {
          SC.run(function () {
            this.commitProtoCase(lastRowItem);
          }.bind(this));
        }
      }.bind(this), 300);
    },

    /**
     Creates a new case with the specified proto-case values.
     */
    commitProtoCase: function (protoCase) {
      function getParentCase(context, collection) {
        var parentCollectionID = collection.getParentCollectionID(),
            parentCollection = parentCollectionID && context.getCollectionByID(parentCollectionID),
            parentCase = protoCase && protoCase.parentCaseID && parentCollection &&
                          parentCollection.getCaseByID(protoCase.parentCaseID);
        // if the proto-case is associated with a particular parent case, return it
        if (parentCase) return parentCase;
        // otherwise, associate it with the last parent case
        var parentCaseCount = parentCollection && parentCollection.getCaseCount();
        if (!SC.none(parentCaseCount)) {
          return parentCollection.getCaseAt(parentCaseCount - 1);
        }
      }

      var gridAdapter = this.get('gridAdapter'),
          gridDataView = gridAdapter.get('gridDataView'),
          collection = protoCase && protoCase.collection,
          attrIDs = collection && collection.getAttributeIDs(),
          beforeCaseID = protoCase && protoCase.get('beforeCaseID'),
          parentCase = getParentCase(this.get('dataContext'), collection),
          parentCaseID = parentCase && parentCase.get('id'),
          values;
      if (!collection || !attrIDs) return;

      values = attrIDs.map(function (attrID) {
        var value = protoCase._values[attrID];
        return value != null ? value : "";
      });
      protoCase._values = {};

      if (gridDataView && parentCaseID) {
        // cell navigation happens within invokeNext(); group expansion is next after that
        this.invokeNext(function() {
          this.invokeNext(function() {
            gridDataView.expandGroup(parentCaseID);
            gridAdapter.refresh();
          }.bind(this));
        }.bind(this));
      }

      DG.DataContextUtilities.createCaseUndoable(this.get('dataContext'), {
        collection: collection,
        attrIDs: attrIDs,
        values: values,
        beforeCaseID: beforeCaseID,
        parent: parentCase
      });
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
    gridWidth: function (iKey, iValue) {
      if (!SC.none(iValue)) {
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
    gridWidthChange: function () {
      return this._gridWidth - this._prevGridWidth;
    }.property(),

    gridWidthDidChange: function () {
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

    sizeDidChange: function () {
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
      var parentView = this.get('parentView');
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

    displayProperties: ['gridAdapter', 'gridDataView', '_slickGrid'],

    init: function () {
      this.beginPropertyChanges();
      sc_super();
      this.scrollAnimator = DG.ScrollAnimationUtility.create();
      this.endPropertyChanges();
      this.invokeLater(function () {
        this.ancestorViewDidResizeOrScroll();
      });
    },

    /**
     Called when the view is resized, in which case the SlickGrid should resize as well.
     */
    viewDidResize: function () {
      sc_super();
      /**
       * The layout has changed but the DOM has not yet changed, so we invokeLast.
       * Even worse, an animation can cause changes to happen to the layout _after_
       * the invokeLast, changes that aren't covered here. For that reason, we keep
       * a counter and when it's zero, we fire off an invokeLater with a timer equal
       * to a typical animation duration. Ugh!
       */
      this._canvasResizeCounter++;
      this.invokeLast(function () {
        this._canvasResizeCounter--;
        if (this._slickGrid) {
          this._slickGrid.resizeCanvas();
          this.setIfChanged('gridWidth',
              this._slickGrid.getContentSize().width);
          if( this._canvasResizeCounter === 0)
            this.invokeLater( function() {
              if (this._slickGrid) this._slickGrid.resizeCanvas();
            }.bind(this), 400);
        }
      }.bind(this));
    },

    /**
     * Slick grid header menu plugin.
     * @type {Slick.Plugins.HeaderMenu}
     */
    headerMenu: null,

    hideHeaderMenu: function () {
      if (this.headerMenu) {
        this.headerMenu.hideMenu();
      }
    },

    /**
     Initializes the SlickGrid from the contents of the adapter (DG.CaseTableAdapter).
     */
    initGridView: function () {
      var gridLayer = this.tableView.get('layer'),
          gridAdapter = this.get('gridAdapter'),
          dataView = gridAdapter && gridAdapter.gridDataView,
          hierTableView = this.get('parentView');
      this._slickGrid = new Slick.Grid(gridLayer, gridAdapter.gridDataView,
          gridAdapter.gridColumns, gridAdapter.gridOptions);

      this._slickGrid.setSelectionModel(new DG.CaseTableRowSelectionModel({
        selectActiveRow: true, caseTableAdapter: this.gridAdapter, caseTableView: this
      }));

      if (this.getPath('gridAdapter.isMultilineRowHeight'))
        this.$('.slick-viewport').addClass('slick-multiline-cells');

      /*
       * Add a column header menu to each column.
       */
      if (DG.supports('caseTableHeaderMenus')) {
        this.headerMenu = new Slick.Plugins.HeaderMenu({
          buttonIsCell: true, buttonImage: static_url("images/down.gif")
        });
        this._slickGrid.registerPlugin(this.headerMenu);
        this.$('.slick-viewport').addClass('dg-wants-touch').addClass('dg-wants-wheel');

        this.headerMenu.onBeforeMenuShow.subscribe(function (e, args) {
          hierTableView.hideHeaderMenus();
          var enabledItems = 0;
          // call any associated updater functions, e.g. to enable/disable
          if (args.menu && args.menu.items && args.menu.items.length) {
            args.menu.items.forEach(function (ioMenuItem) {
              if (ioMenuItem.updater) {
                ioMenuItem.updater(args.column, args.menu, ioMenuItem);
              }
              if (!ioMenuItem.disabled) ++enabledItems;
            });
            // add 'dg-wants-touch' class to menus
            setTimeout(function () {
              $('.slick-header-menu')
                  .addClass(function (index, classes) {
                    return (!classes || (classes.indexOf(
                        'dg-wants-touch') < 0)) ? 'dg-wants-touch' : '';
                  });
            }, 10);
          }
          // Only show the menu if there's at least one enabled item
          return (enabledItems > 0);
        });

        this.headerMenu.onCommand.subscribe(function (e, args) {
          SC.run(function () {
            var controller = getController(this);
            // Dispatch the command to the controller
            if (controller) controller.doCommand(args);
          }.bind(this));
        }.bind(this));
      } // DG.supports('caseTableHeaderMenus')

      this._gridEventHandler = new Slick.EventHandler();

      // Subscribe to SlickGrid events which call our event handlers directly.
      this.subscribe('onClick', this.handleClick);
      this.subscribe('onKeyDown', this.handleKeyDown);
      this.subscribe('onScroll', this.handleScroll);
      this.subscribe('onHeaderClick', this.handleHeaderClick);
      this.subscribe('onHeaderDragInit', function (iEvent, iDragData) {
        // dragging should complete any current edit
        DG.globalEditorLock.commitCurrentEdit();
        // prevent the grid from cancelling drag'n'drop by default
        iEvent.stopImmediatePropagation();
      });
      this.subscribe('onHeaderDragStart', this.handleHeaderDragStart);
      this.subscribe('onRowResizeDragInit', this.handleRowResizeDragInit);
      this.subscribe('onRowResizeDragStart', this.handleRowResizeDragStart);
      this.subscribe('onRowResizeDrag', this.handleRowResizeDrag);
      this.subscribe('onRowResizeDragEnd', this.handleRowResizeDragEnd);
      this.subscribe('onBeforeAutoEditCell', this.handleBeforeAutoEditCell);
      this.subscribe('onBeforeEditCell', this.handleBeforeEditCell);
      this.subscribe('onCanvasWidthChanged', function (e, args) {
        SC.run(function () {
          this.setIfChanged('gridWidth',
              this._slickGrid.getContentSize().width);
        }.bind(this));
      }.bind(this));
      this.subscribe('onColumnsResized', this.handleColumnsResized);
      this.subscribe('onColumnResizing', this.handleColumnResizing);
      this.subscribe('onSelectedRowsChanged', this.handleSelectedRowsChanged);

      var sgEditController = this._slickGrid.getEditController(),
          commitFunction = sgEditController.commitCurrentEdit,
          cancelFunction = sgEditController.cancelCurrentEdit;
      sgEditController.commitCurrentEdit = function () {
        var activeCell = this._slickGrid.getActiveCell(),
            dataItem = activeCell && this._slickGrid.getDataItem(
                activeCell.row);
        if (dataItem && dataItem._isProtoCase) {
          this.resetProtoCaseTimer();
        }
        return commitFunction();
      }.bind(this);
      sgEditController.cancelCurrentEdit = function () {
        var activeCell = this._slickGrid.getActiveCell(),
            dataItem = activeCell && this._slickGrid.getDataItem(
                activeCell.row);
        if (dataItem && dataItem._isProtoCase) {
          this.resetProtoCaseTimer();
        }
        return cancelFunction();
      }.bind(this);


      // wire up model events to drive the grid
      dataView.onRowCountChanged.subscribe(function (e, args) {
        SC.run(function () {
          if (this._slickGrid) {
            var editState = this.saveEditState();
            this._slickGrid.invalidate();
            this.set('rowCount', args.current);
            if (editState) {
              this.restoreEditStateWhenReady(editState);
            }
          }
        }.bind(this));
      }.bind(this));

      dataView.onRowsChanged.subscribe(function (e, args) {
        SC.run(function () {
          if (this._slickGrid) {
            var editState = this.saveEditState();
            this._slickGrid.invalidate();
            if (editState) {
              this.restoreEditStateWhenReady(editState);
            }
          }
        }.bind(this));
      }.bind(this));

      $(gridLayer).on('change', '.dg-checkbox-cell input:checkbox', {slickGrid: this._slickGrid}, this.handleCheckboxChange);
      $(gridLayer).show();

      this.adjustHeaderForOverflow();
      // Let clients know when there's a new _slickGrid
      this.notifyPropertyChange('gridView');
    },
    handleCheckboxChange: function (ev) {
      function updateCheckboxValue (iCase, iAttrID, iContext, iNewValue) {
        var attrID = iAttrID,
            tCase = iCase,
            originalValue = tCase.getValue(iAttrID),
            newValue = iNewValue,
            context = iContext,
            contextName = context.get('name'),
            collection = tCase.get('collection'),
            collectionName = collection && collection.get('name') || "",
            attr = collection && collection.getAttributeByID(Number(attrID)),
            attrName = attr && attr.get('name'),
            caseID = tCase.id;

        function applyEditChange(attrID, iValue, isUndoRedo) {
          context.applyChange({
            operation: 'updateCases',
            cases: [ tCase ],
            attributeIDs: [ attrID ],
            values: [ [iValue] ]
          });
        }

        var cmd = DG.Command.create({
          name: 'caseTable.editCellValue',
          undoString: 'DG.Undo.caseTable.editCellValue',
          redoString: 'DG.Redo.caseTable.editCellValue',
          log: "editValue: { collection: %@, case: %@, attribute: '%@', old: '%@', new: '%@' }"
              .fmt(collectionName, caseID, attrID, originalValue, newValue),
          execute: function() {
            applyEditChange(attrID, newValue);
          },
          undo: function() {
            applyEditChange(attrID, originalValue, true);
          },
          redo: function() {
            context = DG.currDocumentController().getContextByName(contextName);
            collection = context && context.getCollectionByName(collectionName);
            attr = collection && collection.getAttributeByName(attrName);
            attrID = attr.get('id');
            // var cases = collection && collection.get('casesController');
            // tCase = cases && cases.objectAt(caseIndex);
            if (tCase)
              applyEditChange(attrID, newValue, true);
          }
        });
        DG.UndoHistory.execute(cmd);
      }

      var slickGrid = ev.data.slickGrid;
      var gridCoord = slickGrid.getCellFromEvent(ev);
      // DG.log('checkbox: ' + gridCoord.row + ', ' + gridCoord.cell);
      var tCase = slickGrid.getDataItem(gridCoord.row);
      var tColumn = slickGrid.getColumns()[gridCoord.cell];
      var tAttrID = tColumn.id;
      var tContext = tColumn.context;
      var tValue = this.checked?'true':'false';
      updateCheckboxValue(tCase, tAttrID, tContext, tValue);

      ev.preventDefault();
      ev.stopPropagation();
    },

    _refreshDataView: function (recurse) {
      var childTable = this.get('childTable');
      var gridAdapter = this.get('gridAdapter');
      if (gridAdapter) {
        gridAdapter.gridDataView.refresh();
      } else {
        DG.logWarn('CaseTableView._resetDataView: no data view');
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
      var row = childView.getPath('gridAdapter.gridDataView').getRowById(
          iCaseID);
      childView.animateScrollToTop(row - iViewportPosition);
      childView.alignChildTables(iViewportPosition, iCaseID);
    },

    showCaseIndexPopup: function (iEvent, iCell) {
      var tDataContext = this.get('dataContext'),
          tIsEnabled = this.getPath('gridAdapter.isCollectionReorgAllowed'),
          tSelection = tDataContext && tDataContext.getSelectedCases(),
          tSelectionCount = tSelection && tSelection.get('length'),
          tDeleteIsEnabled = tSelectionCount > 0,
          tDeleteSingle = tSelectionCount === 1,
          tDataItem = this._slickGrid.getDataItem(iCell.row),
          isProtoCase = tDataItem && tDataItem._isProtoCase,
          tItems = [{
              title: 'DG.CaseTable.indexMenu.moveEntryRow',
              localize: true,
              target: this,
              action: 'moveDataEntryRow',
              isEnabled: !isProtoCase
            }, {
              title: 'DG.CaseTable.indexMenu.insertCase',
              localize: true,
              target: this,
              action: 'insertCase'
            }, {
              title: 'DG.CaseTable.indexMenu.insertCases',
              localize: true,
              target: this,
              action: 'insertCases'
            }, {
              title: tDeleteSingle ? 'DG.CaseTable.indexMenu.deleteCase' : 'DG.CaseTable.indexMenu.deleteCases',
              localize: true,
              target: getController(this),
              action: 'deleteSelectedCases',
              isEnabled: tDeleteIsEnabled
          }],
          tMenu = DG.MenuPane.create({
            classNames: 'dg-case-index-popup',
            layout: {width: 200, height: 150},
            items: tItems
          });
      if (tIsEnabled) {
        this._caseIndexMenuCell = SC.copy(iCell);
        tMenu.popup(iEvent.target);
      }
    },

    collapseGroup: function (iCaseID) {
      this.getPath('gridAdapter.gridDataView').collapseGroup(iCaseID);
      var childDataView = this.getPath('childTable.gridAdapter.gridDataView');
      if (childDataView) childDataView.resetProtoCases(iCaseID);
    },

    /**
     * Collapses a node in the case tree and resets all case tables below.
     * @param iCaseID {number}
     */
    collapseCase: function (iCaseID) {
      var childTable = this.get('childTable');
      var viewportRow;
      this.collapseGroup(iCaseID);
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

    moveDataEntryRow: function () {
      var adapter = this.get('gridAdapter'),
          dataView = adapter.get('gridDataView'),
          clickCaseIndex = this._caseIndexMenuCell.row,
          clickCase = dataView && dataView.getItem(clickCaseIndex),
          parentCase = clickCase && clickCase.get('parent'),
          collection = clickCase && clickCase.get('collection'),
          protoCase = dataView && dataView.getProtoCase(collection);
      if (protoCase && clickCase && !clickCase._isProtoCase) {
        protoCase.set('beforeCaseID', clickCase.get('id'));
        protoCase.set('parentCaseID', parentCase && parentCase.get('id'));
        adapter.deselectAllCases();
        adapter.refresh();
      }
    },

    insertCase: function () {
      this.doInsertCases(1);
    },

    doInsertCases: function (caseCount, insertAfter) {
      var dataContext = this.get('dataContext'),
          dataView = this.getPath('gridAdapter.gridDataView'),
          clickCaseIndex = this._caseIndexMenuCell.row,
          clickCase = dataView && dataView.getItem(clickCaseIndex),
          beforeCaseIndex = insertAfter ? clickCaseIndex + 1 : clickCaseIndex,
          beforeRow = dataView && dataView.getItem(beforeCaseIndex),
          beforeCase = beforeRow && beforeRow._isProtoCase
                        ? dataView.getItem(beforeCaseIndex + 1)
                        : beforeRow,
          collectionID = clickCase.getPath('collection.id'),
          beforeItemID = beforeCase && beforeCase.getPath('item.id'),
          newItem = {}, newItems = [newItem], parentCase, newCaseIDs;

      // new case is child of same parent case(s)
      while ((parentCase = clickCase.get('parent'))) {
        $.extend(newItem, parentCase.copyValues());
        clickCase = parentCase;
      }

      for (var i = 1; i < caseCount; ++i) {
        newItems.push(DG.clone(newItem));
      }

      // insert the new case
      DG.UndoHistory.execute(DG.Command.create({
        name: "caseTable.insertCases",
        undoString: 'DG.Undo.caseTable.insertCases',
        redoString: 'DG.Redo.caseTable.insertCases',
        log: "insert %@ cases in table".fmt(caseCount),
        execute: function () {
          newCaseIDs = dataContext.addItems(newItems, beforeItemID).caseIDs;
        },
        undo: function () {
          var cases = newCaseIDs.map(function (caseID) {
            return DG.store.find('DG.Case', caseID);
          });
          dataContext.deleteCasesAndChildren(
              {operation: 'deleteCases', cases: cases});
        },
        redo: function () {
          this.execute();
        }
      }));

      // synchronize selection after case insertion
      if (newCaseIDs) {
        var newSiblingCases = [];
        // auto-select the new case that is a sibling of the one clicked
        newCaseIDs.forEach(function (caseID) {
          var newCase = dataContext.getCaseByID(caseID),
              newCaseCollectionID = newCase && newCase.getPath('collection.id');
          if (newCaseCollectionID === collectionID) newSiblingCases.push(
              newCase);
        });
        if (newSiblingCases.length) {
          this.invokeLater(function () {
            dataContext.applyChange({
              operation: 'selectCases',
              cases: newSiblingCases,
              select: true
            });
          });
        }
      }
    },

    insertCases: function () {
      var dataContext = this.get('dataContext'),
          selectedCases = dataContext && dataContext.getSelectedCases(),
          selectedCount = selectedCases && selectedCases.get('length'),
          insertCasesPane = DG.InsertCasesDialog.create({
            caseTableView: this, initialCaseCount: selectedCount
          });
      insertCasesPane.append();
    },

    /**
     Destroys the SlickGrid object and its DataView.
     Used to respond to a change of game, where we recreate the SlickGrid from scratch.
     */
    destroySlickGrid: function () {
      if (this._slickGrid) this._slickGrid.destroy();
      this._slickGrid = null;
      this.gridDataView = null;
    },

    /**
     Destroys the SlickGrid object, its DataView object, and the CaseTableAdapter.
     */
    _destroy: function () {
      if (this.scrollAnimator) {
        if (this.scrollAnimator.destroy) this.scrollAnimator.destroy();
        this.scrollAnimator = null;
      }
      this.destroySlickGrid();

      if (this.gridAdapter) this.gridAdapter.destroy();
      this.gridAdapter = null;
    },

    /**
     Called when the component is about to be destroyed.
     */
    willDestroy: function () {
      this._destroy();
    },

    /**
     Destroys the DG.CaseTableView instance.
     */
    destroy: function () {
      this._destroy();
      sc_super();
    },

    /**
     Utility function to assist with subscribing to (expressing interest in)
     SlickGrid events.
     @param    {String}    iEventName
     @param    {Function}  iHandler -- The function to be called when the event occurs
     */
    subscribe: function (iEventName, iHandler) {
      var _inHandler, wrapHandler = function (iHandler) {
        return function () {
          var result;
          if (!_inHandler) {
            _inHandler = true;
            result = iHandler.apply(this, arguments);
            _inHandler = false;
            return result;
          }
        }.bind(this);
      }.bind(this);

      this._gridEventHandler.subscribe(this._slickGrid[iEventName],
          wrapHandler(iHandler));
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
    getRowBounds: function (iRowIndex) {
      // start with the bounds of the first (left-most) cell in the row
      var rowBounds = this._slickGrid && this._slickGrid.getCellNodeBox(iRowIndex, 0),
          columns = this._slickGrid && this._slickGrid.getColumns(),
          colCount = columns && columns.length;
      if (rowBounds && colCount) {
        // Expand the right edge to include the bounds of the last cell in the row
        var lastCellBounds = this._slickGrid.getCellNodeBox(iRowIndex, colCount - 1);
        rowBounds.right = lastCellBounds.right;
      }
      return rowBounds;
    },

    /**
     Respond to a change in DG.CaseTableAdapter by destroying the SlickGrid.
     A new one will be recreated on render() if there is a valid adapter.
     */
    gridAdapterDidChange: function () {
      this.respondToDataContextAndGridAdapterChanges();
    }.observes('gridAdapter'),

    respondToDataContextAndGridAdapterChanges: function() {
      if (this._slickGrid) {
        this.destroySlickGrid();
        this.displayDidChange();
        this.notifyPropertyChange('gridView');
      }
    },

    /**
     Refreshes the Slick.DataView and re-renders the Slick.Grid.
     */
    refresh: function () {
      this.setPath('gridAdapter.lastRefresh', null);

      var editState = this.saveEditState();
      var gridAdapter = this.get('gridAdapter');
      if (gridAdapter) gridAdapter.refresh();
      if (this._slickGrid) {
        this._slickGrid.invalidate();
        if (editState) {
          this.restoreEditStateWhenReady(editState);
        }
      }
      this.setPath('gridAdapter.lastRefresh', new Date());
    },

    /**
     SproutCore render method.
     * @param {SC.RenderContext} iContext
     * @param {boolean} iFirstTime
     */
    render: function (iContext, iFirstTime) {
      sc_super();

      if (this._slickGrid) {
        var gridAdapter = this.get('gridAdapter');
        if (this._rowDataDidChange) {
          gridAdapter.refresh();
        }
        // Render with our changes
        this._slickGrid.render();

        // Clear our invalidation flags
        this._rowDataDidChange = false;
        this._renderRequired = false;
      }
    },

    didAppendToDocument: function () {
      var gridAdapter = this.get('gridAdapter');
      if (!this._slickGrid && SC.none(gridAdapter)) {
        console.log(
            "DG.CaseTableView.didAppendToDocument: Can't initialize _slickGrid!");
        return;
      }

      if (!this._slickGrid) {
        this.initGridView();
        this.set('gridWidth', this._slickGrid.getContentSize().width);
      }

      // initial layout
      this.invokeLater(function () {
        this.ancestorViewDidResizeOrScroll();
      }.bind(this));
    },

    /**
     Returns the touch position in view coordinates.
     @param    {Object}    iTouch The touch event
     @returns  {Object}    The { x:, y: } location of the touch in view coordinates
     */
    touchPosInView: function (iTouch) {
      return this.convertFrameFromView({x: iTouch.pageX, y: iTouch.pageY}, null,
          true);
    },

    /**
     Returns the touch position in table body content coordinates.
     @param    {Object}    iTouch The touch event
     @returns  {Object}    The { x:, y: } location of the touch in table body content coordinates
     */
    touchPosInBodyContent: function (iTouch) {
      var touchPos = this.touchPosInView(iTouch),
          scrollPos = this.get('scrollPos');
      touchPos.y -= kHeaderHeight;
      if (scrollPos) {
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
    cellFromTouch: function (iTouch) {
      var cell = {}, touchPos = this.touchPosInView(iTouch);
      if (touchPos.y < kHeaderHeight) {
        // we only care about the column here
        cell = this._slickGrid.getCellFromPoint(touchPos.x, 0);
        cell.row = -1;  // signals header row
      } else {
        cell = this.bodyCellFromTouch(iTouch);
      }
      return cell;
    },

    bodyCellFromTouch: function (iTouch) {
      var touchPos = this.touchPosInBodyContent(iTouch);
      return this._slickGrid.getCellFromPoint(touchPos.x, touchPos.y);
    },

    _touchStartTouch: null,
    _touchStartCell: null,
    _touchDragCell: null,

    captureTouch: function (touch) {
      return YES;
    },

    /**
     Called when the table is scrolled.
     @param  {Slick.Event}   iEvent -- the event which triggered the scroll
     @param  {*} iArgs {{scrollTop: number, scrollLeft: number}}
     */
    handleScroll: function (iEvent, iArgs) {
      this.set('scrollPos', iArgs);
    },

    handleBeforeAutoEditCell: function (iEvent, iArgs) {
      // enable autoEdit for keyboard navigation and for the proto-case row
      var activeRowItem = this._slickGrid.getDataItem(iArgs.row);
      return (iArgs.source === 'navigate') || (activeRowItem && activeRowItem._isProtoCase);
    },

    handleBeforeEditCell: function (iEvent, iArgs) {
      var activeRowItem = this._slickGrid.getDataItem(iArgs.row),
          rowCount = this._slickGrid.getDataLength(),
          lastRowItem = this._slickGrid.getDataItem(rowCount - 1),
          hasProtoCase = lastRowItem && lastRowItem._isProtoCase && DG.ObjectMap.length(
              lastRowItem._values), retval = true;

      this.clearProtoCaseTimer();

      SC.run(function () {
        // editing another case commits the proto-case
        if (!activeRowItem._isProtoCase && hasProtoCase) this.commitProtoCase(
            lastRowItem);

        // editing the proto-case deselects other rows
        if (activeRowItem._isProtoCase) {
          this.get('gridAdapter').deselectAllCases();
        }
        // if attribute not editable and not the proto-case row, then can't edit
        else if (!this.get('gridAdapter').isCellEditable(iArgs.row,
            iArgs.cell)) {
          retval = false;
        } else {
          this.get('gridAdapter').deselectAllCases();
        }
      }.bind(this));
      return retval;
    },

    /**
     Called when a drag is started in a column header cell.
     @param  {Slick.Event}   iEvent -- the event corresponding to the mouse click
     @param  {Object}        iDragData -- additional information about the drag
     */
    handleHeaderDragStart: function (iEvent, iDragData) {
      DG.TouchTooltips.hideAllTouchTooltips();
      // don't show a touch-tooltip after starting a drag
      this.cancelAttrTapHold();

      var column = iDragData.column;
      var hierTableView = this.get('parentView');

      // If we actually don't have an attribute associated with the column
      // (e.g. the '+' column), bail
      if (!column.attribute) {
        return;
      }

      // stopImmediatePropagation() doesn't exist (and apparently isn't necessary)
      // when handling touch events.
      if (iEvent.stopImmediatePropagation) iEvent.stopImmediatePropagation();

      hierTableView.hideHeaderMenus();
      // We make this funky call to mainPane because (we think) SlickGrid has swallowed the mousedown
      // that would normally allow mainPane to hide the inspector picker.
      DG.mainPage.mainPane.hideInspectorPicker();
      var tDragView = this._hiddenDragView,
          tAttributeName = column.attribute.get('name');
      SC.run(function () {
        tDragView.set('value', tAttributeName);
        this.removeChild(tDragView);
        this.appendChild(tDragView);
      }.bind(this));
      // setting attribute and starting drag need to be in separate run loops.
      SC.run(function () {
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
     Called when a drag is started in a row resize splitter.
     @param  {Slick.Event}   iEvent -- the event corresponding to the mouse click
     @param  {Object}        iDragData -- additional information about the drag
     */
    handleRowResizeDragInit: function (iEvent, iDragData) {
      DG.TouchTooltips.hideAllTouchTooltips();
      iEvent.stopImmediatePropagation();
    },

    /**
     Called when a drag is started in a row resize splitter.
     @param  {Slick.Event}   iEvent -- the event corresponding to the mouse click
     @param  {Object}        iDragData -- additional information about the drag
     */
    handleRowResizeDragStart: function (iEvent, iDragData) {
      this.$('.slick-viewport').addClass('slick-resizing-row');
      iEvent.stopImmediatePropagation();
    },

    setRowHeight: function (rowHeight) {
      SC.run(function() {
        this.setPath('gridAdapter.rowHeight', rowHeight);
        if (this.getPath('gridAdapter.isMultilineRowHeight'))
          this.$('.slick-viewport').addClass('slick-multiline-cells');
        else
          this.$('.slick-viewport').removeClass('slick-multiline-cells');
        this._slickGrid.setOptions({ rowHeight: rowHeight });
        // force a full re-render
        this.setColumns(this._slickGrid.getColumns());
      }.bind(this));
    },

    /**
     Called when a drag is continued in a row resize splitter.
     @param  {Slick.Event}   iEvent -- the event corresponding to the mouse click
     @param  {Object}        iDragData -- additional information about the drag
     */
    handleRowResizeDrag: function (iEvent, iDragData) {
      this.setRowHeight(iDragData.rowHeight);
    },

    /**
     Called when a drag is ended in a row resize splitter.
     @param  {Slick.Event}   iEvent -- the event corresponding to the mouse click
     @param  {Object}        iDragData -- additional information about the drag
     */
    handleRowResizeDragEnd: function (iEvent, iDragData) {
      this.$('.slick-viewport').removeClass('slick-resizing-row');
    },

    inProgressAttributeEditElementName: null,
    completeEditAttributeName: function () {
      var attrName = this.inProgressAttributeEditElementName;
      var elt = this.$('#attribute-name-editor');
      if (attrName) {
        SC.run(function () {
          var $input = elt, dataContext = this.get('dataContext'),
              newName = dataContext.getUniqueAttributeName($input.val(),
                  [attrName]);
          if (newName !== attrName) {
            var controller = getController(this),
                attrRef = dataContext && dataContext.getAttrRefByName(attrName);
            var changes = {};
            if (newName) {
              changes.name = newName;
            }
            controller.updateAttribute(attrRef, changes);
          }
          else {
            this.updateColumnInfo();
          }
          this.inProgressAttributeEditElementName = null;
        }.bind(this));
      }
    },
    cancelEditAttributeElement: function () {
      SC.run(function () {
        this.updateColumnInfo();
        this.inProgressAttributeEditElementName = null;
      }.bind(this));
    },
    commitCurrentEdit: function () {
      this.completeEditAttributeName();
      DG.globalEditorLock.deactivate(this);
    },
    resetActiveCell: function () {
      this._slickGrid.resetActiveCell();
    },
    cancelCurrentEdit: function () {
      this.cancelEditAttributeElement();
      DG.globalEditorLock.deactivate(this);
    },
    /**
     Makes the attribute name editable in the appropriate column header.
     Since SlickGrid doesn't support editable column headers natively, we use
     jQuery to install an <input> element and manage it completely outside SlickGrid.
     @param  {string}  attrName -- the name of the attribute to be edited
     */
    beginEditAttributeName: function (attrName) {
      var _this = this, gridAdapter = this.get('gridAdapter'),
          column = gridAdapter && gridAdapter.getAttributeColumn(attrName),
          columnIndex = column && column.columnIndex,
          headerColumns = this.$('.slick-header-column'),
          $el = column && $(headerColumns[columnIndex]),
          $nameEl = $el && $el.find('.slick-column-name');

      DG.globalEditorLock.commitCurrentEdit();
      DG.globalEditorLock.activate(this);
      this.inProgressAttributeEditElementName = attrName;
      if ($nameEl) {
        $nameEl.empty().append(
            $('<input>').addClass('dg-attr-name-edit-input').val(attrName));
        this.getPath(
            'parentView.parentView.parentView').scrollDOMElementHorizontallyToView(
            $nameEl[0]);
        var $input = $nameEl.find('input');
        $input.attr({
          type: 'text',
          autocapitalize: 'none',
          autocomplete: 'off',
          autocorrect: 'off',
          inputmode: 'latin-name',
          spellcheck: false,
          id: 'attribute-name-editor'
        })
            .on('mousedown', function (evt) {
              evt.stopImmediatePropagation();
            })
            .on('mouseup', function (evt) {
              evt.stopImmediatePropagation();
            })
            .on('touchstart', function (evt) {
              evt.stopImmediatePropagation();
            })
            .on('touchend', function (evt) {
              evt.stopImmediatePropagation();
            })
            .on('dragstart', function () {
              return false;
            })
            .on('click', function (evt) {
              evt.preventDefault();
              evt.stopImmediatePropagation();
            })
            .on('change', function () {
              _this.completeEditAttributeName(this);
            })
            .on('blur', function () {
              _this.completeEditAttributeName(this);
            })
            .on('keydown', function (evt) {
              switch (evt.keyCode) {
                case 13:
                  _this.completeEditAttributeName(this);
                  break;
                case 27:
                  _this.cancelEditAttributeName(this);
                  break;
              }
            })
            .focus()
            .select();
        // $plusEl.addClass('disabled');
      }
    },

    /**
     Called when a table header cell is clicked.
     @param  {Slick.Event}   iEvent -- the event corresponding to the mouse click
     */
    handleHeaderClick: function (iEvent, iArgs) {
      DG.globalEditorLock.commitCurrentEdit();
    },

    /**
     * Clear menu, if present
     * @param iEvent
     */
    handleClick: function (iEvent, iCell) {
      SC.run(function () {
        function findHierTableViewParent(iView) {
          while (iView && !(iView instanceof DG.HierTableView))
            iView = iView.get('parentView');

          return iView;
        }
        var hierTableView = findHierTableViewParent(this);
        hierTableView.selectComponent();
        hierTableView.contentView.hideHeaderMenus();

        var dataContext = this.get('dataContext'),
            dataItem = this._slickGrid.getDataItem(iCell.row),
            collection = this.getPath(
                'gridAdapter.collection'), // when a group is closed, its slickgrid dataItem is the parent case,
            // so its collection will not match the collection for the current view
            isClosedGroup = dataItem && collection && (dataItem.get(
                'collection').get('id') !== collection.get('id'));
        if (iCell.cell === 0 && !hierTableView.getPath('model.isIndexHidden')) {
          if (DG.DataContextUtilities.isCaseEditable(dataContext, dataItem) && !isClosedGroup)
            this.showCaseIndexPopup(iEvent, iCell);
        }
      }.bind(this));
    },

    /**
     * Handle SlickGrid KeyDown events
     * @param iEvent
     */
    handleKeyDown: function (iEvent) {
      function findLastFocusableColumn(columns) {
        var columnIndex = 0;
        var lastFocusableCell = null;
        while (columnIndex < columns.length) {
          if (columns[columnIndex] && columns[columnIndex].focusable) {
            lastFocusableCell = columnIndex;
          }
          columnIndex += 1;
        }
        return lastFocusableCell;
      }

      function findFirstFocusableColumn(columns) {
        var columnIndex = 0;
        while (columnIndex < columns.length) {
          if (columns[columnIndex] && columns[columnIndex].focusable) {
            return columnIndex;
          }
          columnIndex += 1;
        }
        return null;
      }

      var editorLock = this._slickGrid.getEditorLock(),
          editorIsActive = editorLock && editorLock.isActive(),
          columns = this._slickGrid.getColumns(),
          activeCell = this._slickGrid.getActiveCell(),
          dataItem = activeCell && this._slickGrid.getDataItem(activeCell.row),

          handlePrev = function () {
            this.clearProtoCaseTimer();

            if (!dataItem._isProtoCase || (activeCell.cell > findFirstFocusableColumn(
                columns))) {
              this._slickGrid.navigatePrev();
            }
            // navigating off the proto-case commits it
            else if (editorLock.commitCurrentEdit() && dataItem._isProtoCase && DG.ObjectMap.length(
                dataItem._values)) {
              SC.run(function () {
                this.commitProtoCase(dataItem);
                // wait until everything has refreshed to navigate to the next row
                this.invokeNext(function () {
                  this._slickGrid.navigatePrev();
                }.bind(this));
              }.bind(this));
            } else {
              this._slickGrid.navigatePrev();
            }

            iEvent.stopImmediatePropagation();
          }.bind(this),

          handleNext = function () {
            this.clearProtoCaseTimer();

            if (!dataItem._isProtoCase || (activeCell.cell < findLastFocusableColumn(
                columns))) {
              this._slickGrid.navigateNext();
            }
            // navigating off the proto-case commits it
            else if (editorLock.commitCurrentEdit() && dataItem._isProtoCase && DG.ObjectMap.length(
                dataItem._values)) {
              SC.run(function () {
                this.commitProtoCase(dataItem);
                // wait until everything has refreshed to navigate to the next row
                this.invokeNext(function () {
                  this._slickGrid.navigateNext();
                }.bind(this));
              }.bind(this));
            } else {
              this._slickGrid.editActiveCell();
            }

            iEvent.stopImmediatePropagation();
          }.bind(this),

          handleUp = function () {
            if (!dataItem._isProtoCase) {
              this._slickGrid.navigateUp();
            }
            // navigating off the proto-case commits it
            else if (dataItem._isProtoCase && editorLock.commitCurrentEdit() && DG.ObjectMap.length(
                dataItem._values)) {
              SC.run(function () {
                this.clearProtoCaseTimer();
                this.commitProtoCase(dataItem);
                // wait until everything has refreshed to navigate to the next row
                this.invokeNext(function () {
                  this._slickGrid.navigateUp();
                }.bind(this));
              }.bind(this));
            } else {
              this.clearProtoCaseTimer();
              this._slickGrid.navigateUp();
            }

            iEvent.stopImmediatePropagation();
          }.bind(this),

          handleDown = function () {
            if (!dataItem._isProtoCase) {
              this._slickGrid.navigateDown();
            }
            // navigating off the proto-case commits it
            else if (editorLock.commitCurrentEdit() && dataItem._isProtoCase && DG.ObjectMap.length(
                dataItem._values)) {
              SC.run(function () {
                this.clearProtoCaseTimer();
                this.commitProtoCase(dataItem);
                // wait until everything has refreshed to navigate to the next row
                this.invokeNext(function () {
                  this._slickGrid.navigateDown();
                }.bind(this));
              }.bind(this));
            } else {
              this._slickGrid.editActiveCell();
            }

            iEvent.stopImmediatePropagation();
          }.bind(this);

      if (editorIsActive && dataItem) {
        switch (iEvent.keyCode) {
          case 9:
            if (iEvent.shiftKey) handlePrev(); else handleNext();
            break;
          case 13:
            if (iEvent.shiftKey) handleUp(); else handleDown();
            break;
          case 38:
            handleUp();
            break;
          case 40:
            handleDown();
            break;
        }
      }
    },

    /**
     * Called when column widths changed
     * @param iEvent
     * @param {{grid: SlickGrid}}iArgs
     */
    handleColumnsResized: function (iEvent, iArgs) {
      var parentView = this.get('parentView');
      var model = parentView && parentView.get('model');
      var columnWidths = this.get('columnWidths');
      var oldColumnWidths = {};
      if (model) {
        Object.keys(columnWidths).forEach(function (key) {
          oldColumnWidths[key] = model.getPreferredAttributeWidth(key);
        });
        DG.UndoHistory.execute(DG.Command.create({
          name: 'caseTable.columnResize',
          undoString: 'DG.Undo.caseTable.resizeOneColumn',
          redoString: 'DG.Redo.caseTable.resizeOneColumn',
          log: 'Resize one case table column',
          executeNotification: {
            action: 'notify',
            resource: 'component',
            values: {
              operation: 'resize column',
              type: 'DG.CaseTable'
            }
          },
          execute: function () {
            DG.ObjectMap.forEach(columnWidths, function (key, value) {
              model.setPreferredAttributeWidth(key, value);
            });
            this.updateColumnInfo();
          }.bind(this),
          undo: function () {
            DG.ObjectMap.forEach(oldColumnWidths, function (key, value) {
              model.setPreferredAttributeWidth(key, value);
            });
            this.updateColumnInfo();
          }.bind(this)
        }));
      }
    },

    handleColumnResizing: function (iEvent, iArgs) {
      this.adjustHeaderForOverflow();
    },

    adjustHeaderForOverflow: function () {
      if (this.isComponentDetached()) {
        return;
      }

      /**
       * reverse a string: while doing so, reverse the direction of bracket-like
       * characters.
       */
      function reverse(str) {
        // str.split("").reverse().join("");
        var rMap = {
          '[': ']', ']': '[', '{': '}', '}': '{', '(': ')', ')': '('
        };
        if (!str) return str;
        var s = str.split('');
        var c;
        var ix;
        var n = [];
        for (ix = s.length - 1; ix >= 0; ix -= 1) {
          c = s[ix];
          if (rMap[c]) c = rMap[c];
          n.push(c);
        }
        return n.join('');
      }

      function makeLinePair($el) {
        var text = $el.text().replace(/_/g, ' ');
        var $line1 = $('<span>').addClass('two-line-header-line-1').text(text);
        var $line2 = $('<span>').addClass('two-line-header-line-2').text(
            reverse(text));
        $el.empty().append($line1).append($line2);
      }

      function computeMiddleEllipsis($el) {
        var width = $el.width();
        var height = $el.height();
        var v1 = $('.two-line-header-line-1', $el);
        var style = [
          'font-style:' + v1.css('font-style'),
          'font-variant:' + v1.css('font-variant'),
          'font-weight:' + v1.css('font-weight'),
          'font-stretch:' + v1.css('font-stretch'),
          'line-height:' + v1.css('line-height'),
          'font-size:' + v1.css('font-size'),
          'font-family:' + v1.css('font-family'),
          'width:' + width + 'px',
          'height:' + height + 'px',
          'overflow: auto',
          'white-space: normal',
          '-webkit-hyphens: auto',
          '-ms-hyphens: auto',
          'hyphens: auto',
          'overflow-wrap: break-word'
          ].join(
            ';');

        var text = v1.text();
        var textMeasure = DG.measureText(text, style);
        // DG.log('text, height, width, textMeasure.height, textMeasure.width, ' +
        //     'textMeasure.isOverflowed: ' +
        //     [text, height, width, textMeasure.height, textMeasure.width,
        //       textMeasure.hasOverflowed].join());
        if (textMeasure.hasOverflowed) {
          $el.addClass('two-line-header-truncating');
        } else {
          $el.removeClass('two-line-header-truncating');
        }
      }

      $(this.get('layer')).find('.slick-header-column').each(
          function (ix, cell) {
            // if we are mid-edit of a header field, ignore this attr.
            if ($(cell).find('input').length) {
              return;
            }
            var $nameElement = $(cell).find('.slick-column-name');
            var $line1 = $nameElement.find('.two-line-header-line-1');
            if (!$line1.length) {
              makeLinePair($nameElement);
            }
            computeMiddleEllipsis($nameElement);
          });
    },

    /**
     * Called when column widths changed
     * @param iEvent
     * @param {{grid: SlickGrid}}iArgs
     */
    handleSelectedRowsChanged: function (iEvent, iArgs) {
      var selectedRows = iArgs.rows,
          selectedRowCount = selectedRows && selectedRows.length,
          editorLock = this._slickGrid.getEditorLock(),
          rowCount = this._slickGrid.getDataLength(),
          lastRowItem = this._slickGrid.getDataItem(rowCount - 1),
          hasProtoCase = lastRowItem && lastRowItem._isProtoCase,
          activeCell = this._slickGrid.getActiveCell(),
          isActiveProtoCase = hasProtoCase && activeCell && (activeCell.row === rowCount - 1);

      // if non-proto-case rows are selected, commit the proto-case
      if (selectedRowCount) {
        editorLock.commitCurrentEdit();
        if (isActiveProtoCase && DG.ObjectMap.length(lastRowItem._values)) {
          this.invokeLater(function () {
            SC.run(function () {
              this.commitProtoCase(lastRowItem);
            }.bind(this));
          });
        }
      }
    },

    /**
     Refreshes the column headers to accommodate new attributes.
     Call when the column header info is required for new attributes.
     */
    updateColumnInfo: function () {
      if (this._slickGrid) {
        this.setColumns(this.get('gridAdapter').updateColumnInfo());
        this._slickGrid.invalidate();
      }
    },

    /**
     Refreshes the column headers when attribute information has changed.
     @param  {[object]}  iColumnsInfo -- Array of column entries
     */
    setColumns: function (iColumnsInfo) {
      if (this._slickGrid) {
        this._slickGrid.setColumns(iColumnsInfo);
        this._slickGrid.render();
        // give slickgrid a chance to complete the render.
        this.invokeNext(function () {
          this.adjustHeaderForOverflow();
        });
      }
    },

    /**
     Returns the currently active edit state (if any).
     */
    saveEditState: function () {
      var editor = this._slickGrid && this._slickGrid.getCellEditor(),
          editState = editor && editor.saveEditState(),
          editController = editState && this._slickGrid.getEditController();
      // cancel current edit so it doesn't get committed before restoration
      if (editController) editController.cancelCurrentEdit();
      return editState;
    },

    /**
     Restores a previously active edit state.
     */
    restoreEditState: function (state) {
      var editCase = state && state.item,
          caseId = editCase && editCase.id, editColumn = state && state.column,
          editAttr = editColumn && editColumn.attribute,

          gridAdapter = this.get('gridAdapter'),
          gridDataView = gridAdapter && gridAdapter.get('gridDataView'),
          editRow = gridDataView.getRowById(caseId),
          editCell = editAttr && gridAdapter.getColumnIndexFromAttribute(editAttr);
      if ((editRow != null) && (editRow >= 0) && (editCell != null) && (editCell >= 0)) {
        this._slickGrid.setActiveCell(editRow, editCell);
        this._slickGrid.editActiveCell();
        var activeEditor = this._slickGrid.getCellEditor();
        activeEditor && activeEditor.restoreEditState(state);
      }
    },

    /**
     Waits to update a previously active edit state until sufficient time
     has elapsed since the last table refresh. This allows us to wait until
     the dust settles so that we don't try to restore a previous edit state
     in the middle of a sequence of operations that will just wipe out the
     active edit again.
     */
    restoreEditStateWhenReady: function (state) {
      var restoreWhenReady = function () {
        if (state) {
          var lastRefresh = this.getPath('gridAdapter.lastRefresh'),
              elapsed = lastRefresh ? new Date() - lastRefresh : 0,
              kThreshold = 50;
          if (elapsed >= kThreshold) {
            this.restoreEditState(state);
          } else {
            setTimeout(restoreWhenReady, kThreshold - elapsed);
          }
        }
      }.bind(this);

      if (state) {
        restoreWhenReady();
      }
    },

    /**
     Expands/collapses all of the row groups at once.
     @param    {Boolean}   iExpand -- Expands all row groups if truthy;
     collapses all row groups otherwise
     */
    expandCollapseAll: function (iExpand) {
      var collection = this.getPath('gridAdapter.collection');
      var cases = collection.get('casesController');
      var dataView = this.getPath('gridAdapter.gridDataView');
      var model = this.parentView.get('model');

      DG.assert(collection);
      DG.assert(cases);
      var priorExpCoState = model.get('collapsedNodes');

      DG.UndoHistory.execute(DG.Command.create({
        name: 'caseTable.groupToggleExpandCollapseAll',
        undoString: 'DG.Undo.caseTable.groupToggleExpandCollapseAll',
        redoString: 'DG.Redo.caseTable.groupToggleExpandCollapseAll',
        log: 'Expand/Collapse all',
        executeNotification: {
          action: 'notify',
          resource: 'component',
          values: {
            operation: 'expand/collapse all',
            type: 'DG.CaseTable'
          }
        },
        execute: function () {
          //DG.log('expandCollapseAll: [expand/collection/cases]: '
          //    + [iExpand, this.get('collectionName'), cases.get('length')].join('/'));
          this.beginDataViewUpdate(true);
          cases.forEach(function (myCase) {
            try {
              if (iExpand) {
                dataView.expandGroup(myCase.id);
              } else {
                this.collapseGroup(myCase.id);
              }
            } catch (e) {
              DG.logError('expandCollapseAll: ' + e);
            }
          }.bind(this));
          this.endDataViewUpdate(true);
          this.childTable._refreshDataView(true);
        }.bind(this),
        undo: function () {
          this.beginDataViewUpdate(true);
          cases.forEach(function (myCase) {
            dataView.expandGroup(myCase.id);
          });
          priorExpCoState.forEach(function (caseID) {
            this.collapseGroup(caseID);
          }.bind(this));
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
      DG.assert(dataView);
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
      DG.assert(dataView);
      dataView.endUpdate();
      if (recurse && childTable) {
        childTable.endDataViewUpdate(recurse);
      }
    },

    /**
     Refreshes the row data. Call when the table body needs to be refreshed.
     */
    updateRowData: function () {
      this._rowDataDidChange = true;
      this._renderRequired = true;
      this.displayDidChange();
    },

    /**
     Synchronizes the number of table rows with the number of cases.
     Tries to do so efficiently, but has to rebuild the table in some cases.

     @param  forceRedraw {Boolean} Whether to force a re-indexing of the rows
     */
    updateRowCount: function (forceRedraw) {
      if (!this._slickGrid) return;

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
      var viewport = this.get('gridViewport');
      // if at least one of the specified rows is visible, no need to scroll
      for (var i = 0; i < rowIndices.length; ++i) {
        if ((rowIndices[i] >= viewport.top) && (rowIndices[i] <= viewport.bottom)) return;
      }
      // The bailout above was added because the code below was seen to
      // scroll undesirably in situations in which no scroll was necessary
      // while developing the rowHeight-changing code.
      var minDeltaFromMidViewPort = this.getMinScrollDelta(rowIndices); // in rows
      var viewportHeight = viewport.bottom - viewport.top; // in rows
      var viewportCenterHeight = Math.max(viewportHeight - 4, 0);
      var viewportCenterDelta = (viewportHeight - viewportCenterHeight - 1) / 2;
      var isARowVisible = (Math.abs(
          minDeltaFromMidViewPort) <= (viewportCenterHeight / 2));
      var newTop = Math.max(
          viewport.top + viewportCenterDelta - minDeltaFromMidViewPort, 0);
      // DG.log('collection,minDeltaFromMidViewPort,viewportHeight,viewportCenterHeight,viewportCenterDelta,isARowVisible,newTop=['+[this.get('collectionName'),minDeltaFromMidViewPort,viewportHeight,viewportCenterHeight,viewportCenterDelta,isARowVisible,newTop].join() + ']');
      // The slickgrid viewport is measured in rows and includes the
      // header and partial rows. To guarantee the value is within the visible
      // viewport we add subtract from the viewport height two, for the header
      // rows and one for the partial row.
      if (!isARowVisible && viewport.top !== newTop) {
        this.scrollAnimator.animate(this, viewport.top, newTop);
      }
    },

    animateScrollToTop: function (rowIndex) {
      var viewport = this._slickGrid.getViewport();
      this.scrollAnimator.animate(this, viewport.top, rowIndex);
    },

    /**
     * It is possible that the DOM and SlickGrid get out of sync. This method
     * makes the DOM match Slickgrid's idea of the current scroll state.
     */
    refreshScroll: function () {
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
    getMinScrollDelta: function (rowArray) {
      var viewport = this._slickGrid.getViewport(); // viewport.top, .bottom: row units
      var viewMiddle = (viewport.top/* + 3*/ + viewport.bottom) / 2;
      var distances = rowArray.map(function (row) {
        return viewMiddle - row;
      });
      return distances.reduce(function (minimumDist, dist) {
        return (Math.abs(minimumDist) > Math.abs(dist)) ? dist : minimumDist;
      }, Number.MAX_VALUE);
    },

    /**
     * Sets the set of selected rows.
     * @param  iSelectedRows {[Number]}   Array of indices of selected rows
     */
    setSelectedRows: function (iSelectedRows) {
      if (this._slickGrid) {
        this._slickGrid.setSelectedRows(iSelectedRows);
      }
    },

    isComponentDetached: function () {
      var controller = getController(this);
      return controller && !controller.getPath('view.isVisible');
    },

    scrollSelectionToView: function (primaryCase) {
      if (this.isComponentDetached()) {
        return;
      }
      var selectedRows = this._slickGrid.getSelectedRows();
      var collection = this.getPath('gridAdapter.collection');
      if (primaryCase && (primaryCase.getPath(
          'collection.id') === collection.get('id'))) {
        this.scrollToCase(primaryCase.get('id'));
      } else {
        if (selectedRows.length > 0) {
          this.scrollToView(selectedRows);
        } else {
          this._slickGrid.render();
        }
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
    updateSelectedRows: function (recurse) {
      var adapter = this.get('gridAdapter'),
          selection = adapter && adapter.getSelectedRows(),
          childView = this.get('childTable');
      if (selection) {
        this.setSelectedRows(selection);
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
          DG.log('No case: scrollToAlignWithLeft: %@',
              leftTable.get('collectionName'));
          return;
        }

        if (iCase._isProtoCase) {
          return dataView.getLength() - 1;
        }

        var children = iCase.get('children');
        var c0 = children && children[0];
        var cn = children && children[children.length - 1];
        var rtn;
        if (model.isCollapsedNode(iCase)) {
          rtn = {
            first: dataView.getRowById(iCase)
          };
          rtn.last = rtn.first;
        } else if (c0 && cn) {
          rtn = {
            first: dataView.getRowById(c0.id), last: dataView.getRowById(cn.id)
          };
        }
        return rtn;
      }

      var model = this.getPath('parentView.model');
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

      function lastItemIndex(dataView, viewport) {
        return Math.max(0, Math.min(dataView.getLength() - 1, viewport.bottom));
      }

      // Find row in this table of first child of top item in left viewport
      var leftTopCase = leftDataView.getItem(leftViewport.top);
      var rightTopRange = getRightRowRange(leftTopCase);

      // Find row in this table of the last child of bottom item in left viewport
      var leftBottomCase = leftDataView.getItem(
          lastItemIndex(leftDataView, leftViewport));
      var rightBottomRange = getRightRowRange(leftBottomCase);

      // If viewport top is less than c0Row, then scroll c0Row to top.
      if (rightTopRange && (rightTopRange.first > viewport.top)) {
        this._slickGrid.scrollRowToTop(rightTopRange.first);
        didScroll = true;
      } else if (rightBottomRange && (rightBottomRange.last < lastItemIndex(
          dataView, viewport))) {
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
          DG.log('No case: scrollToAlignWithRight: %@',
              rightTable.get('collectionName'));
          return;
        }
        if (iCase._isProtoCase) {
          return dataView.getLength() - 1;
        }
        var caseInLeftRow = iCase;
        if (!model.isCollapsedNode(iCase)) {
          caseInLeftRow = iCase.get('parent');
        }
        return dataView.getRowById(caseInLeftRow.id);
      }

      var model = this.getPath('parentView.model');
      var viewport = this.get('gridViewport');
      var viewportHeight = viewport.bottom - viewport.top - 1;
      var dataView = this.getPath('gridAdapter.gridDataView');
      var rightTable = this.get('childTable');
      var rightViewport = rightTable && rightTable.get('gridViewport');
      var rightDataView = rightTable && rightTable.getPath(
          'gridAdapter.gridDataView');
      var didScroll = false;
      if (!dataView || (dataView.getLength() === 0) || !rightDataView || (rightDataView.getLength() === 0)) {
        // nothing to do
        return false;
      }


      // Find row in right table of first child, p0Row, of top item in this table
      var topRightCase = rightDataView.getItem(rightViewport.top);
      var p0Row = getParentRow(topRightCase);

      // Find row in right table of the last child, pnRow, of bottom item in left table
      var bottomRightCase = rightDataView.getItem(
          Math.min(rightDataView.getLength() - 1, rightViewport.bottom));
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
    },

    /**
     * Handles click
     *
     * Note that there are two places this click event may be handled: here and
     * in the case_table_row_selection_model. This handler responds to clicks that
     * are not in any case table or menu. The case_table_row_selection_model cannot
     * make decisions, however, depending on whether the component is selected,
     * since the component is always selected by the time the event is fired.
     *
     * @param iEvent {Event}
     * @return {boolean}
     */
    click: function (iEvent) {
      function isInHeader(e) {
        return !!($(e.target).closest(".slick-header-column",
            ".slick-header-columns").length);
      }

      if (this.getPath('gridAdapter.isModelDragging')) return NO;

      var clickedCell = this._slickGrid.getCellFromEvent(iEvent);

      // if we are in the header, bail. This will be handled later.
      if (isInHeader(iEvent)) {
        return NO;
      }

      var tComponentView = DG.ComponentView.findComponentViewParent(this);
      var tIsComponentSelected = tComponentView && tComponentView.get('isSelected');
      var dataContext = this.get('dataContext');
      var selectedCases = dataContext.getSelectedCases();
      var tChange = {
        operation: 'selectCases', cases: [], select: true, extend: false
      };

      // if we clicked in the table body and the component is unselected then we
      // want to select cases iff they were not selected. If the component is
      // selected, we let that pass through.
      if (clickedCell) {
        var clickedCase = this._slickGrid.getDataItem(clickedCell.row);
        if (clickedCase && clickedCase._isProtoCase) {
          dataContext.applyChange({ operation: 'selectCases', select: false });
          return YES;
        }
        if (selectedCases
            && clickedCase
            && (tIsComponentSelected || !(selectedCases.indexOf(clickedCase) >=0))) {
          tChange.cases = [clickedCase];
          dataContext.applyChange(tChange);
          return YES;
        }
      } else if (tIsComponentSelected) {
        dataContext.applyChange(tChange);
      }
      return NO;
    },

    mouseDown: function () {
      DG.TouchTooltips.hideAllTouchTooltips();
      return YES;
    },

    cancelAttrTapHold: function (evt) {
      if (this._attrTapHoldTimer) {
        clearTimeout(this._attrTapHoldTimer);
        this._attrTapHoldTimer = null;
      }
    },

    touchStart: function (evt) {
      DG.TouchTooltips.hideAllTouchTooltips();
      var elt = document.elementFromPoint(evt.clientX, evt.clientY);
      while (elt && !elt.classList.contains('slick-header-column')) {
        elt = elt.parentElement;
      }
      if (elt) {
        this._attrTapHoldTimer = setTimeout(function () {
          DG.TouchTooltips.showTouchTooltip(evt, elt, elt.title);
          this._attrTapHold = null;
        }.bind(this), 500);
      }
      // claim the event so we get the touchEnd
      return YES;
    },

    touchEnd: function (evt) {
      this.cancelAttrTapHold();
      // allows the browser to generate mouse events
      // cf. DG.mainPage.scrollView.touchStart() for details
      evt.allowDefault();
      return YES;
    },

    widenColumnsProportionally: function (factor) {
      var model = this.getPath('parentView.model');
      var columns = this._slickGrid.getColumns();
      columns.forEach(function (column) {
        if (column.attribute) {
          column.width = column.width * factor;
          if (model) {
            model.setPreferredAttributeWidth(column.id, column.width);
          }
        }
      });
      this.setColumns(columns);
    },

    /**
     * Resizes the last column of this case table by delta.
     * @param delta {number} Pixels
     */
    resizeLastColumn: function(delta) {
      var model = this.getPath('parentView.model');
      var columns = this._slickGrid.getColumns();
      var lastColumn = columns[columns.length - 1];
      var lastColumnId = lastColumn.id;
      lastColumn.width = Math.max(lastColumn.width + delta, lastColumn.minWidth);
      if (model) {
        model.setPreferredAttributeWidth(lastColumnId, lastColumn.width);
      }
      this.setColumns(columns);
    }
  };
}())); // end closure
