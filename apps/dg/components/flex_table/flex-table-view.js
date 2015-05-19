// ==========================================================================
//                        DG.FlexTableView
// 
//  A provides flexible grouping tables.
//  
//  Author:   Jonathan Sandoe
//
//  Copyright (c) 2015 by The Concord Consortium, Inc. All rights reserved.
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

 A FlexTable view contains a grid view with flexible grouping.

 @extends SC.View
 */
/*globals: SC:true*/
DG.FlexTableView = SC.View.extend( (function() {
/** @scope DG.FlexTableView.prototype */
  return {
    /** @param {[string]} classNames Array of css classes. */
    classNames: ['dg-flex-table'],

    /** @param {{left: number, right: number, top: number, bottom: number}}
     *  layout Layout geometry. */
    layout: { left: 0, right: 0, top: 0, bottom: 0 },

    /** @param {{SC.View}} childViews None that sproutcore manages. */
    childViews: [],

    container: null,

    collectionName: function () {
      return this.controller.get('collectionName');
    }.property('collection').cacheable(),

    /** @param {[{w2grid}]} grids Array of grids */
    grids: null,

    nextID: 0,

    /** @param {DG.FlexTableController} controller */
    controllerBinding: '.parentView.parentView.controller',

    containerSelector: function () {
      return '#' + this.get('layerId');
    }.property().cacheable(),

    /**
     * init
     *
     * Implements SC.view method. Initializes this object.
     */
    init: function () {
      sc_super();

      this.grids = [];
    },

    render: function( iContext, iFirstTime) {
      sc_super();

      // W2ui.Grid requires that we pass it a reference to its container element,
      // which in this case is the <div> created by this view. But that <div>
      // element doesn't exist the first time through render() -- it's created
      // as a result of the first time through -- so the first time we get here
      // we simply call displayDidChange() to make sure we get a second call to
      // render(), by which time the <div> has been created and we can pass it
      // to w2ui.grid.
      //if( iFirstTime) {
      //  this.displayDidChange();
      //}
      //else if( !this.container) {
      //  this.invokeNext(this.initGridView);
      //}

      // SlickGrid adds to the set of CSS classes. We need to capture these
      // and add them to the context or else the context will overwrite
      // the CSS classes and eliminate the ones added by SlickGrid.
      // This is not a particularly elegant solution in that it clobbers
      // the complete set of classes every time we render. It's not
      // obvious how to do better, however, in that the view's 'classNames'
      // are copied to the context before render() is called, but the
      // SlickGrid isn't created until render(), so setting 'classNames'
      // wouldn't have the desired effect until the next time we render().
      //if( this._grid)
      //  iContext.classNames( this.$().attr("class"), YES);
    },

    initGridView: function () {
      this.container = this.createLayout(0);

      this.createGrid(
        { num: 0, layout: this.container, panel: 'main'},
        this.get('collectionName'),
        this.getPath('controller.columns'),
        this.getPath('controller.records')
      );
    },

    didCreateLayer: function() {
      this.invokeNext(this.initGridView);
    },

    /**
     * Creates a container for the grids.
     *
     * @param {number} iNum
     * @returns {w2layout}
     */
    createLayout: function(iNum) {
      var tLayoutContainer = $(this.get('containerSelector')),
        tID = 'layout_' + iNum,
        tDiv = '<div id="' + tID + '" style="height:100%"></div>',
        panelStyle = 'border: 1px solid #dfdfdf; padding: 0px;',
        tNewLayout;
      tLayoutContainer.append(tDiv);

      tNewLayout = $('#'+tID).w2layout({
        name: tID,
        number: iNum,
        panels: [
          { type: 'left', size: 20, style: panelStyle },
          { type: 'main', style: panelStyle }
        ]
      });

      var tGridID = 'grid_' + iNum,
        tGridDiv = '<div id="' + tGridID + '" style="height: 100%" class="dgGrid"></div>';
      tNewLayout.content('main', tGridDiv);
      return tNewLayout;
    },

    createGrid: function( iSpecs, iGroupName, iColumns, iRecords) {
      var tName = 'grid_' + iSpecs.num,
        tNewGrid =
          $('#'+tName+'.dgGrid').w2grid({
            name: tName,
            number: iSpecs.num,
            location: { layout: iSpecs.layout, panel: iSpecs.panel },
            reorderColumns: true,
            columnGroups: [
              { caption: iGroupName, span: iColumns.length }
            ],

            columns: iColumns,
            records: iRecords//,
            //onExpand: this.doNothing.bind(this)
          });
      this.grids.push( tNewGrid);
      tNewGrid.refresh();

      tNewGrid.on('columnDragOver', this.handleColumnDragOver.bind(this));
      tNewGrid.on('columnDragEnd', this.handleSplit.bind(this));

      return tNewGrid;
    },


    doNothing: function( iEventData) {
    },

    handleSplit: function( iEventData) {

      var isParentPanel = function( iLayout1, iPanel1, iLayout2, iPanel2) {
        return (iLayout1.number > iLayout2.number) ||
          ((iLayout1.number === iLayout2.number) && (iPanel1 === 'left') && (iPanel2 === 'main'));
      }.bind( this);

      var combineDuplicates = function( iGrid) {
        // There may now be duplication in this grid, in which case we can combine records
        // Careful, though, it may have been nulled out. What's more, there can be no combining
        // without the given grid having a child grid
        if( iGrid && iGrid.childGrid) {
          // Add records to a hash using concatenation of values as keys. When already present, combine
          var tChildGrid = iGrid.childGrid,
            tHash = {},
            tNewRecordsArray = [];
          iGrid.records.forEach( function( iRec) {
            var tKey = '',
              tExistingRec;
            DG.ObjectMap.forEach( iRec, function( iKey, iValue) {
              if( iGrid.columns.some( function( iCol) {
                  return iCol.field === iKey;
                })) {
                tKey += '_' + iValue;
              }
            });
            tExistingRec = tHash[tKey];
            if( tExistingRec) {
              // Combine iRec into the existing rec
              iRec.childIDs.forEach( function( iChildID) {
                tExistingRec.childIDs.push( iChildID);
                tChildGrid.get( iChildID).parentID = tExistingRec.recid;
              })
            }
            else {
              tHash[ tKey] = iRec;
              tNewRecordsArray.push( iRec);
            }
          });
          iGrid.records = tNewRecordsArray;
          iGrid.refresh();
        }
      }.bind( this);

      var moveFieldToParentGrid = function() {
        var splitRecords = function( iSourceRecs, iField) {
          // Return an array of records consisting of one field extracted from the original records.
          // The field in the original records will be deleted from each source record.
          // Each new record will correspond to those original records that have the same parent and the
          //  same value for the given field.
          // Each new record will have an array of 'childIDs' pointing back to the source records.
          var tSplitRecs = [],
            tSplitsHash = {};
          iSourceRecs.forEach( function( iSourceRec) {
            var tValue = iSourceRec[iField],
              tExistingParentID = iSourceRec.parentID,
              tKey = tValue + '_' + tExistingParentID,
              tNewSplit = tSplitsHash[ tKey];
            delete iSourceRec[iField];
            if(tNewSplit === undefined) {
              tNewSplit = { recid: this.nextID++, childIDs: []};
              tNewSplit[ iField] = tValue;
              tNewSplit.sibID = tExistingParentID;
              tSplitRecs.push( tNewSplit);
              tSplitsHash[tKey] = tNewSplit;
            }
            tNewSplit.childIDs.push( iSourceRec.recid);
            iSourceRec.parentID = tNewSplit.recid;
          }.bind(this));

          return tSplitRecs;
        }.bind( this);

        /**
         * Return a new array that is the result of merging iParentRecords and iNewRecords
         */
        var mergeRecords = function( iParentRecords, iNewRecords, iField) {

          var tResultArray = [];

          var copyRec = function ( iRec) {
            var tCopy = {};
            DG.ObjectMap.copySome( tCopy, iRec, function( iKey, iValue) {
              return (iKey !== 'childIDs');
            });
            tCopy.childIDs = [];
            return tCopy;
          }.bind( this);

          // iNewRecords are joining iParentRecords. Each new record has a sibID that points to the appropriate
          //  parent record.

          // Provide quick lookup of parents by recID
          var tParentHash = {};
          iParentRecords.forEach( function( iParent, iIndex) {
            tParentHash[ iParent.recid] = iParent;
          });

          // Copy field value and recid from each new record to its sibling. The recid because it is now the recid that
          //  the children are pointing to as parent.
          iNewRecords.forEach( function( iNewRec) {
            // iNewRec will, in general, have a subset of the children of tSib. So, we make a copy of tSib with
            // the children and field value from iNewRec. Then we remove the IDs for tSib's children that are
            // in iNewRec. We append (for now) tNewSib to iParentRecords.
            var tSib = tParentHash[iNewRec.sibID],
              tNewSib = copyRec( tSib);
            tNewSib[ iField] = iNewRec[ iField ];
            tNewSib.recid = iNewRec.recid;
            iNewRec.childIDs.forEach( function( iID) {
              tNewSib.childIDs.push( iID);
              tSib.childIDs.splice( tSib.childIDs.indexOf( iID), 1);
            });

            tResultArray.push( tNewSib);
          });
          // A sanity check here would be to make sure none of the records in iParentRecords have any children
          iParentRecords.forEach( function( iRec) {
            if( iRec.childIDs.length > 0)
              debugger;
          });

          return tResultArray;
        }.bind(this);

        tNewRecords = splitRecords( tSourceRecords, tDraggedField);
        if( tDestGrid) {
          tDestGrid.records = mergeRecords( tDestGrid.records, tNewRecords, tDraggedField);
          tDestGrid.columns.push( tDraggedCol);
          tDestGrid.columnGroups[0].span++;
          $(tDestGrid.box).width($(tDestGrid.box).width() + tColWidth);
          tDestLayout.sizeTo( tDestPanel, tDestWidth + tColWidth);
          tSourceLayout.sizeTo( tSourcePanel, tSourceWidth - tColWidth);
        }
        else {
          var tNum = this.grids.length,
            tNewID = 'grid_' + tNum,
            tNewDiv = '<div id="' + tNewID + '" style="height: 100%" class="dgGrid"></div>';

          // We create a new layout, stash the existing layout with its grid in the main panel, leaving the new
          // left panel for an additional level of hierarchy.
          var tNewLayout = this.createLayout( tNum);
          tNewLayout.content('main', tDestLayout.box);
          tDestLayout.containerLayout = tNewLayout; // for use in deletion

          tDestLayout.content(tDestPanel, tNewDiv);
          $('#' + tNewID).width( tColWidth);
            tDestGrid = this.createGrid( { num: tNum, layout: tDestLayout, panel: tDestPanel}, tDraggedCol.caption + 's',
              [tDraggedCol], tNewRecords);
            tDestGrid.childGrid = tSourceGrid;
            this.fixGroupHeader( tSourceGrid);
            tDestGrid.on({ type: 'select', grid: tDestGrid }, this.handleSelection.bind(this));
            tDestGrid.on({ type: 'unselect', grid: tDestGrid }, this.handleUnSelection.bind(this));

          this.container = tNewLayout;
        }
      }.bind( this);

      var moveFieldToChildGrid = function() {
        // Go through each of the sourceRecord's childIDs and add the field and value to the corresponding child record
        //  in the destination grid
        var tDestHash = {}; // For fast lookup
        if( tDestGrid) {
          tDestGrid.records.forEach( function( iRec) {
            tDestHash[iRec.recid] = iRec;
          });

          tSourceRecords.forEach( function( iSourceRec) {
            var tValue = iSourceRec[ tDraggedField];
            iSourceRec.childIDs.forEach( function( iChildID) {
              tDestHash[ iChildID][tDraggedField] = tValue;
            });
            delete iSourceRec[ tDraggedField];
          });

          tDestGrid.addColumn( 0, tDraggedCol);
          tDestGrid.columnGroups[0].span++;
          tDestLayout.sizeTo( tDestPanel, tDestWidth + tColWidth);
          tSourceLayout.sizeTo( tSourcePanel, tSourceWidth - tColWidth);
          // If that was the last column in source, get rid of source grid
          if( tSourceGrid.columns.length === 0) {
            this.grids.splice(this.grids.indexOf(tSourceGrid), 1);
            delete w2ui[tSourceGrid.name];
            delete w2ui[tSourceGrid.name + '_toolbar'];
            tSourceGrid = null;
          }
        }

        combineDuplicates( tSourceGrid);
      }.bind( this);

      this.turnOffHighlighting(); // left over from drag operation

      var tEventInSplit = this.eventInSplit( iEventData.originalEvent),
        tSourceGrid = iEventData.grid,
        tDraggedCol = iEventData.column,
        tDraggedField = tDraggedCol.field,
        tColWidth = parseInt( tDraggedCol.sizeCalculated),
        tSourceRecords = tSourceGrid.records,
        tDestGrid = this.gridContainingEvent( iEventData.originalEvent),
        tNewRecords;

      // Get out if conditions are not right
      if( (!tEventInSplit && !tDestGrid) || (tDestGrid === tSourceGrid))
        return;

      iEventData.isCancelled = true;  // The buck stops here
      this.mergeAllChanges(); // Make sure all edits have been applied
      tDraggedCol.style = 'padding-right: 10px';  // Because right-justified values get hidden by scroll bar

      // Identify source and destination portions of container
      var tSourcePanel = tSourceGrid.location.panel,
        tSourceLayout = tSourceGrid.location.layout,
        tDestPanel = tDestGrid ? tDestGrid.location.panel : 'left',
        tDestLayout = tDestGrid ? tDestGrid.location.layout : this.container,
        tSourceWidth = tSourceLayout.get(tSourcePanel).size,
        tDestWidth = tDestLayout.get(tDestPanel).size,
        tMovingToParent = isParentPanel( tDestLayout, tDestPanel, tSourceLayout, tSourcePanel);

      tSourceGrid.removeColumn( tDraggedField);
      tSourceLayout.get( tSourcePanel).size = tSourceWidth - tColWidth;
      if( tMovingToParent)
        moveFieldToParentGrid();
      else
        moveFieldToChildGrid();

      tDestLayout.get( tDestPanel).size = tDestWidth + tColWidth;
      if( tSourceGrid) {  // tSourceGrid will have been nulled out if it has no columns left
        $(tSourceGrid.box).width($(tSourceGrid.box).width() - tColWidth);
        tSourceGrid.columnGroups[0].span--;
        tSourceGrid.refresh();
      }
      else {  // The source grid is now empty. The source panel should be emptied. And the source layout should be
        // moved out of its containing panel and that containing layout should be removed from the DOM
        tSourceLayout.content(tSourcePanel, '');
        var tContainerLayout = tSourceLayout.containerLayout;
        if( tContainerLayout === this.container)
          this.container = tSourceLayout;
        if( tContainerLayout) {
          delete w2ui[tContainerLayout.name];
          $(tContainerLayout.box.parentElement).append(tSourceLayout.box);
          $(tContainerLayout.box).detach();
          tSourceLayout.containerLayout = null;
        }
      }

      tDestGrid.refresh();
    },

    handleColumnDragOver: function( iEventData) {
      this.turnOffHighlighting();

      var tGrid = this.gridContainingEvent( iEventData.originalEvent);
      if( tGrid && (tGrid !== iEventData.grid))
        $(tGrid.box).addClass('over');
      else if( !tGrid) {
        var tLeft = $(this.container.el('left'));
        if (this.eventInSplit(iEventData.originalEvent))
          tLeft.addClass('over');
      }
    },

    turnOffHighlighting: function() {
      this.grids.forEach( function( iGrid) {
        $(iGrid.box).removeClass('over');
      });
      $(this.container.el('left')).removeClass('over');
    },

    mergeAllChanges: function() {
      this.grids.forEach( function( iGrid) {
        iGrid.mergeChanges();
      });
    },

    gridContainingEvent: function( iEvent) {

      function rectContainsPoint( iRect, iPt) {

        function inrange( n, lower, upper) {
          return (n > lower) && (n <= upper);
        }
        return inrange( iPt.x, iRect.left, iRect.right) && inrange( iPt.y, iRect.top, iRect.bottom);
      }

      var tFoundGrid;
      this.grids.forEach( function( iGrid) {
        if( rectContainsPoint( iGrid.box.getBoundingClientRect(), { x: iEvent.pageX, y: iEvent.pageY }))
          tFoundGrid = iGrid;
      });
      return tFoundGrid;
    },

    eventInSplit: function( iEvent) {
      var tCursorX = iEvent.pageX,
        tCursorY = iEvent.pageY,
        tSplitRect = this.container.el('left').getBoundingClientRect();
      function inrange( n, lower, upper) {
        return (n > lower) && (n <= upper);
      }
      function inrect( x, y, left, top, right, bottom) {
        return inrange( x, left, right) && inrange( y, top, bottom);
      }
      return inrect( tCursorX, tCursorY, tSplitRect.left, tSplitRect.top, tSplitRect.right, tSplitRect.bottom);
    },

    /**
     * Make sure the group header reflects the caption of the first column.
     * But don't change the header of the original grid.
     * @param iGrid
     */
    fixGroupHeader: function( iGrid) {
      if( iGrid === this.grids[0])
        return;
      var tHeading = (iGrid.columns.length > 0) ?
        (iGrid.columns[0].caption) : '';
      if( tHeading.indexOf('s', tHeading.length - 1) === -1)
        tHeading += 's';
      iGrid.columnGroups[0].caption = tHeading;
    },

    handleSelection: function( iEventData) {

      var searchForRecsWithID = function( iGrid, iParentID, iNextIDs) {
        iGrid.search('parentID', iParentID);
        var tNextGrid = iGrid.childGrid;
        if( tNextGrid) {
          var tSearches = [];
          iNextIDs.forEach( function( iChildID) {
            tSearches.push( { field: 'parentID', value: iChildID, operator: 'is'});
//          searchForRecsWithID( tNextGrid, iChildID, iGrid.get( iChildID).childIDs);
          });
          tNextGrid.search( tSearches, 'OR')
        }
      };

      var tSelectID = iEventData.recid, // the recid of the selected record.
        tParentGrid = iEventData.grid,  // the grid in which the selection took place
        tSelectedRec = tParentGrid.get(tSelectID),
        tChildGrid = tParentGrid.childGrid; // the next grid in the chain (i.e. to the right)
      tChildGrid.searchReset(); // Get rid of whatever search is in effect
      searchForRecsWithID( tChildGrid, tSelectID, tSelectedRec.childIDs);
    },

    handleUnSelection: function( iEventData) {
      var tParentGrid = iEventData.grid,
        tChildGrid = tParentGrid.childGrid;
      while( tChildGrid) {
        tChildGrid.searchReset();
        tChildGrid = tChildGrid.childGrid;
      }
    },

    /**
     * Deletes all the resources that are managed by this view and recreates
     * them.
     */
    resetFromScratch: function() {
      $('#layoutContainer').empty();
      var tIndex = 0;
      while( w2ui['layout_' + tIndex] || w2ui['grid_' + tIndex]) {
        delete w2ui['layout_' + tIndex];
        delete w2ui['grid_' + tIndex];
        delete w2ui['grid_' + tIndex + '_toolbar' ];
        tIndex++;
      }
      this.init();
    },

    viewDidResize: function () {
      this.invokeLast(
        function() {
          this.container && this.container.resize();
        }.bind(this)
      );
    },

    /**
     Destroys the SlickGrid object, its DataView object, and the CaseTableAdapter.
     */
    _destroy: function() {
      this.container.destroy();
    },

    /**
     Called when the component is about to be destroyed.
     */
    willDestroy: function() {
      this._destroy();
    },

    reset: function () {
    }

  };
}()));
