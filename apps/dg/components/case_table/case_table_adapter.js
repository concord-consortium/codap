// ==========================================================================
//                        DG.CaseTableAdapter
//  
//  Adapts the DG data to the form required for the SlickGrid table.
//  Builds the necessary SlickGrid data structures from the DG data.
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

/** @class

  Adapter for displaying DG data for a single collection in a SlickGrid.

  @extends DG.ComponentController
*/
DG.CaseTableAdapter = SC.Object.extend( (function() // closure
/** @scope DG.CaseTableAdapter.prototype */ {

      // Cell layout constants
  var kDefaultColumnWidth = 60,
      kDefaultRowHeight = 18,
      
      // Returns the parent case ID for a given child case ID
      getParentIDForCase = function( iCase) {
                            var parent = iCase.get('parent');
                            return parent && parent.get('id').toString();
                          },
      // Returns the required row data for a given case
      getRowInfoForCase = function( iCase) {
                            var rowInfo = {
                                  theCase: iCase,
                                  id: iCase.get('id').toString(),
                                  parentID: getParentIDForCase( iCase)
                                };
                            return rowInfo;
                          },
      // The tooltip string for the column depends on whether it has a formula, description, etc.
      getToolTipString = function( iAttribute) {
        var name = iAttribute.get('name'),
            formula = iAttribute.get('formula'),
            description = iAttribute.get('description'),
            toolTip = "";
        if( formula)
          toolTip = "%@ = %@".fmt( name, formula);
        else if( !SC.empty( description))
          toolTip = description;
        else if( !SC.empty( name))
          toolTip = name;
        return toolTip;
      },

      getColumnHeaderString = function( iAttribute) {
        var tName = iAttribute.get('name' ),
            tUnit = iAttribute.get('unit');
        return tName + (!SC.empty( tUnit) ? ' (' + tUnit + ')' : '');
      },

    // Simple formatter currently rounds to precision rather than actually formatting.
    cellFormatter = function( rowIndex, colIndex, cellValue, colInfo, rowItem) {
      if( SC.none( cellValue))
        cellValue = "";
      else if( SC.typeOf( cellValue) === SC.T_NUMBER) {
        var attrPrecision = colInfo.attribute.get('precision'),
            roundDigits = !SC.none(attrPrecision) ? attrPrecision : 2,
            multiplier = !SC.none(roundDigits) ? Math.pow(10,roundDigits) : 1;
        cellValue = Math.round( multiplier * cellValue) / multiplier;
      }
      return cellValue.toString();
    };

  return {  // return from closure
  
  rowHeight: kDefaultRowHeight,
  
  /**
    The data context for the collections viewed in the table.
    @property   {DG.DataContext}
   */
  dataContext: null,
  
  /**
    The collection containing the cases viewed in the table.
    @property   {DG.CollectionClient}
   */
  collection: null,
  
  /**
    Returns true if there are formulas with aggregate functions in this adapter's collection.
    @property   {Boolean}
   */
  hasAggregates: function() {
    return this.getPath('collection.hasAggregates');
  }.property(),
  
  /**
    Should group header rows be shown for all groups (true) or only for collapsed groups (false)?
    @property   {Boolean}
   */
  showExpandedGroupRows: false,
  
  /**
    The SlickGrid DataView responsible for accessing/filtering the cases.
    @property   {Slick.Data.DataView}
   */
  gridDataView: null,
  
  /**
    Array of row/case info objects.
    @property   {Array of Object}
   */
  gridData: null,
  
  /**
    Array of column info objects.
    @property   {Array of Object}
   */
  gridColumns: null,
  
  /**
    Additional SlickGrid options.
    @property   {Object}
   */
  gridOptions: null,
  
    // Map from parent ID to ID of last child case of a given parent case.
  /**
    Maintains the range of child IDs for each parent ID.
    Map from parent ID to { firstChildID: ##, lastChildID: ## } objects.
    @property {Object of Object}  Property keys are parent case IDs
                                  Objects contain:
                                    Object.firstChildID -- ID of first child case for parent
                                    Object.lastChildID --  ID of last child case for parent
                                    Object.isCollapsed -- Boolean value for collapse/expand state
   */
  parentIDGroups: null,
  
  /**
    Initialization method.
   */
  init: function() {
    sc_super();

    this.parentIDGroups = {};
    this.gridDataView = new Slick.Data.DataView({
                              groupItemMetadataProvider: new Slick.Data.GroupItemMetadataProvider({
                                                                groupSelectable: true
                                                              }),
                              inlineFilters: true,
                              showExpandedGroupRows: this.showExpandedGroupRows
                            });

    if( this.get('dataContext'))
      this.dataContextDidChange();
  },
  
  /**
    Returns true if this adapter's collection has a parent collection,
    false if it is the most senior collection, i.e. has no parent.
    @returns  {Boolean}   True if this collection has a parent collection
   */
  hasParentCollection: function() {
    var context = this.get('dataContext'),
        collectionID = this.getPath('collection.id'),
        firstCollection = context && context.getCollectionAtIndex( 0),
        firstCollectionID = firstCollection && firstCollection.get('id');
    return collectionID !== firstCollectionID;
  },
  
  /**
    The number of visible rows in the table.
    @property {Number}
   */
  visibleRowCount: function() {
    return this.gridDataView.getLength();
  }.property(),
  
  /**
    The total number of rows in the table, including collapsed rows.
    @property {Number}
   */
  totalRowCount: function() {
    return this.gridDataView.getItems().length;
  }.property(),
  
  /**
    Map row ID to row index, where row ID is generally the same as case ID.
    The return row index is the index of visible rows, rather than total rows.
    Collapsed rows return an invalid index.
    @param    {String}    iRowID - The ID of the specified row/case
    @returns  {Number}    The index of the row with the specified ID
   */
  getIndexForID: function( iRowID) {
    var dataView = this.get('gridDataView');
    return dataView && dataView.getRowById( iRowID);
  },
  
  /**
    Builds the array of column definitions required by SlickGrid from the data context.
    
    @returns  {Array of Object} The properties of each object define the column
   */
  updateColumnInfo: function() {
    var context = this.get('dataContext'),
        collection = this.get('collection'),
        existColumnDefs = {},
        columnDefs = [];
    if( !collection) return columnDefs;
    
    if( this.gridColumns) {
      // Build a map of the existing column definitions so we can reuse them.
      // This preserves any user settings like column widths, etc.
      this.gridColumns.forEach( function( iColumn) {
                                  existColumnDefs[ iColumn.id] = iColumn;
                                });
    }
    
    function updateDynamicColumnProperties( iAttribute, ioColumnInfo) {
      // only allow 'editable' columns to have editable cells
      if( iAttribute.get('editable') && !iAttribute.get('hasFormula'))
        ioColumnInfo.editor = DG.CaseTableCellEditor;
      else
        delete ioColumnInfo.editor;
    }
    
    // Build the columnInfo for a single attribute
    function processAttribute( iAttribute) {
      // Reuse the existing column definition, if we have one
      var attrID = iAttribute.get('id').toString(),
          existColumn = existColumnDefs[ attrID];
      if( existColumn) {
        updateDynamicColumnProperties( iAttribute, existColumn);
        columnDefs.push( existColumn);
        return;
      }
      // Build a new column definition if we need to
      var collection = iAttribute.get('collection'),
          attrName = iAttribute.get('name'),
          columnInfo = {
            context: context,
            collection: collection,
            collectionID: collection.get('id').toString(),
            attribute: iAttribute,
            // Slick.Grid properties
            id: iAttribute.get('id').toString(),
            name: getColumnHeaderString( iAttribute),
            field: attrName,
            toolTip: getToolTipString( iAttribute),
            formatter: cellFormatter,
            width: kDefaultColumnWidth,
            header: {
              menu : {
                items: [
                  { title: 'DG.TableController.headerMenuItems.editAttribute'.loc(),
                    command: 'cmdEditFormula',
                    updater: function( iColumn, iMenu, ioMenuItem) {
                      ioMenuItem.disabled = !iColumn.attribute.get('editable');
                    }
                  },
                  { title: 'DG.TableController.headerMenuItems.renameAttribute'.loc(),
                    command: 'cmdRenameAttribute',
                    updater: function( iColumn, iMenu, ioMenuItem) {
                      ioMenuItem.disabled = !iColumn.attribute.get('editable');
                    }
                  },
                  { title: 'DG.TableController.headerMenuItems.deleteAttribute'.loc(),
                    command: 'cmdDeleteAttribute',
                    updater: function( iColumn, iMenu, ioMenuItem) {
                      ioMenuItem.disabled = !iColumn.attribute.get('editable');
                    }
                  }
                ]
              }
            }
          };
      updateDynamicColumnProperties( iAttribute, columnInfo);
      columnDefs.push( columnInfo);
    }
    
    // Process the attributes in the collection
    collection.forEachAttribute( processAttribute);
    
    this.gridColumns = columnDefs;
    
    return columnDefs;
  },
  
  /**
    Updates the column information for the specified attribute.
    @param    {DG.Attribute}    iAttribute -- The attribute whose column should be updated
    @returns  {Boolean}         True if the attribute exists and was updated, false otherwise
                                Clients can call this method for multiple adapters and use
                                the return value to determine which table was affected.
   */
  updateColumnForAttribute: function( iAttribute) {
    var column = DG.ArrayUtils.firstMatch( this.gridColumns,
                                          function( iColumn) {
                                            return iAttribute.get('id').toString() === iColumn.id;
                                          });
    if( column) {
      column.name = getColumnHeaderString( iAttribute);
      column.field = iAttribute.get('name');
      column.toolTip = getToolTipString( iAttribute);
      this.gridDataView.refresh();
      return true;
    }
    return false;
  },
  
  /**
    Builds the row information objects for each row of the table in a form suitable for SlickGrid.
    @returns  {Array of Object} Each object contains the information describing an individual row.
   */
  buildRowData: function() {
    var dataContext = this.get('dataContext'),
        collection = this.get('collection'),
        collapseChildren = (collection &&
                            collection.getPath('collection.collectionRecord.collapseChildren')) || false,
        parentRows = [],      // array of parent IDs in order
        rowDataByParent = {}, // map of parentID --> child case row info
        rowData = [],
        this_ = this;
    
    if( !collection) return rowData;
    
    // Build the row information object for a single case
    function processCase( iCase) {
      var rowInfo = getRowInfoForCase( iCase),
          parentID = rowInfo.parentID;

      // Build the row objects into parent groups
      if( !rowDataByParent[ parentID]) {
        parentRows.push( parentID);
        rowDataByParent[ parentID] = [ rowInfo];
      }
      else rowDataByParent[ parentID].push( rowInfo);
    }
    
    // Process the cases to build row information
    collection.forEachCase( processCase);
    
    // Process the parent groups to output the individual rows grouped appropriately.
    this.parentIDGroups = {};
    parentRows.forEach( function( iParentID) {
                          var children = rowDataByParent[ iParentID],
                              parentGroupInfo = {};
                          children.forEach( function( iRowInfo) {
                                              rowData.push( iRowInfo);
                                              if( SC.none( parentGroupInfo.firstChildID)) {
                                                parentGroupInfo.firstChildID = iRowInfo.id;
                                                parentGroupInfo.isCollapsed = collapseChildren;
                                              }
                                              parentGroupInfo.lastChildID = iRowInfo.id;
                                            });
                          this_.parentIDGroups[ iParentID] = parentGroupInfo;
                        });
    
    this.gridData = rowData;
    this.gridDataView.setItems( rowData);
    
    function getLabelForSetOfCases() {
      return dataContext && dataContext.getLabelForSetOfCases( collection);
    }
    
    function getCaseCountString( iCount) {
      return dataContext && dataContext.getCaseCountString( collection, iCount);
    }

    if( this.hasParentCollection()) {
      this.gridDataView.setGrouping({
            getter: "parentID",
            formatter: function( iGroup) {
                          return "%@ (%@)".loc( getLabelForSetOfCases(), 
                                                getCaseCountString( iGroup.count));
                        },
            comparer: function( iGroup1, iGroup2) {
                        return iGroup1.value - iGroup2.value;
                      }
          });
      DG.ObjectMap.forEach( this.parentIDGroups,
                            function( iParentID, iParentInfo) {
                              if( iParentInfo.isCollapsed)
                                this.gridDataView.collapseGroup( iParentID);
                            }.bind(this));
    }
    
    return rowData;
  },
  
  /**
    Returns the grid option in a form suitable for passing to the SlickGrid.
    The most important options (currently) are the default rowHeight and the
    dataItemColumnValueExtractor(), which extracts individual values from the model.
    @returns  {Object}  An object describing the SlickGrid options to be utilized.
   */
  buildGridOptions: function() {
    this.gridOptions = {
              rowHeight: kDefaultRowHeight,
              enableColumnReorder: false,
              syncColumnCellResize: true,
              leaveSpaceForNewRows: false,
              editable: true, // user-editable cells for columns with an 'editable' property only
              enableAddRow: false, // don't add an extra blank row at the end
              asyncEditorLoading: false,
              autoEdit: true, // single click to edit an 'editable' attribute's cell
              editCommandHandler: function( iItem, iColumn, iEditCommand) {
                                    // Called after the cell edit has been deactivated
                                    iEditCommand.execute();
                                  },
              dataItemColumnValueExtractor: function( iRowItem, iColumnInfo) {
                                              var tCase = iRowItem.theCase;
                                              return tCase && tCase.getValue( iColumnInfo.id);
                                            }
           };
    return this.gridOptions;
  },
  
  /**
    Rebuilds the adapter by rebuilding the column header info, the row data, and the options.
   */
  rebuild: function() {
    this.updateColumnInfo();
    this.buildRowData();
    this.buildGridOptions();
  },
  
  /**
    Returns an object containing expand/collapse counts for the row groups.
    @returns    {Object}    { collapsed: #CollapsedRows, expanded: #ExpandedRows }
   */
  expandCollapseCounts: function() {
    var collapseCount = 0,
        expandCount = 0;
    DG.ObjectMap.forEach( this.parentIDGroups,
                          function( iParentID, iChildInfo) {
                            if( iChildInfo) {
                              if( iChildInfo.isCollapsed)
                                ++ collapseCount;
                              else
                                ++ expandCount;
                            }
                          });
    return { collapsed: collapseCount, expanded: expandCount };
  }.property(),
  
  /**
    Expands/collapses all of the row groups at once.
    @param    {Boolean}   iExpand -- Expands all row groups if truthy;
                                      collapses all row groups otherwise
   */
  expandCollapseAll: function( iExpand) {
    var dataView = this.get('gridDataView');
    DG.assert( dataView);
    DG.ObjectMap.forEach( this.parentIDGroups,
                          function( iParentID, iChildInfo) {
                            iChildInfo.isCollapsed = !iExpand;
                            if( iExpand)
                              dataView.expandGroup( iParentID);
                            else
                              dataView.collapseGroup( iParentID);
                          });
  },
  
  /**
    Rebuilds the table when the data context changes.
   */
  dataContextDidChange: function() {
    this.rebuild();
  }.observes('dataContext'),
  
  /**
    Rebuilds the column descriptions when attribute formulas change.
   */
  attributeFormulaDidChange: function( iNotifier, iKey) {
    if( iKey === 'attrFormulaChanges')
      this.updateColumnInfo();
    this.markCasesChanged();
    this.gridDataView.refresh();
  }.observes('.collection.attrFormulaChanges','.collection.attrFormulaDependentChanges'),
  
  /**
    Refreshes the contents of the table.
   */
  refresh: function() {
    var gridDataView = this.get('gridDataView');
    if( gridDataView) gridDataView.refresh();
  },
  
  /**
    Appends a single case as the last row of the appropriate parent group.
    @param  {DG.Case}   iCase -- The case to append to the table
   */
  appendRow: function( iCase) {
    var rowInfo = getRowInfoForCase( iCase),
        parentID = rowInfo.parentID,
        parentGroupInfo = this.parentIDGroups[ parentID],
        lastChildID = parentGroupInfo && parentGroupInfo.lastChildID,
        dataView = this.gridDataView;
    
    // Create the map entry if it doesn't already exist
    if( !parentGroupInfo) {
      parentGroupInfo = this.parentIDGroups[ parentID] = {};
      parentGroupInfo.isCollapsed = this.getPath('collection.collection.collectionRecord.collapseChildren')
                                          || false;
    }
    
    // Update the parent map entry before we update the SlickGrid DataView, so that
    // any event handlers triggered will operate with up-to-date model information.
    if( SC.none( parentGroupInfo.firstChildID))
      parentGroupInfo.firstChildID = rowInfo.id;
    parentGroupInfo.lastChildID = rowInfo.id;

    if( lastChildID) {
      // Add the new row after the previous child of the same parent.
      var lastChildIndex = dataView.getIdxById( lastChildID);
      // Increment past the last child of the parent
      dataView.setRefreshHints({ isFilterExpanding: true });
      dataView.insertItem( lastChildIndex + 1, rowInfo);
    }
    else {
      // Simply append the new row
      dataView.setRefreshHints({ isFilterExpanding: true });
      dataView.addItem( rowInfo);
      if( parentID && parentGroupInfo.isCollapsed)
        dataView.collapseGroup( parentID);
    }
    parentGroupInfo.lastChildID = rowInfo.id;
    this.parentIDGroups[ parentID] = parentGroupInfo;
  },
  
  /**
    Adjusts the row count of the table to the case count of the collection.
    Currently assumes that new cases can be appended to the end of the appropriate
    parent group, while deleted cases require additional work.
    Returns true if handled with simple appending of cases, false otherwise.
    This can be used by clients to determine what needs to be redrawn.
   */
  updateRowCount: function() {
    var result = false, // Not handled with simple appending
        collection = this.get('collection'),
        caseCount = (collection && collection.getCaseCount()) || 0,
        rowCount = this.get('totalRowCount');
    if( caseCount >= rowCount) {
      for( var i = rowCount; i < caseCount; ++i) {
        var tCase = collection.casesController.objectAt( i);
        if( DG.assert( tCase)) this.appendRow( tCase);
      }
      result = true;  // handled with simple appending
    }
    return result;
  },
  
  /**
    Returns the set of selected row indices for the table.
    Note: We could potentially speed this up by only considering rows
    that are currently visible on screen, although this would require
    additional synchronization of selection when scrolling, for instance.
    @returns  {Array of Number}   The indices of the selected cases
   */
  getSelectedRows: function() {
    var dataContext = this.get('dataContext'),
        collection = this.get('collection'),
        dataView = this.get('gridDataView'),
        selection = this.getPath('collection.casesController.selection'),
        selectedRows = [];
    // add selected cases from our main collection
    if( selection) {
      selection.forEach( function( iCase) {
                          // Use visible row indices
                          var index = dataView.getRowById( iCase.get('id').toString());
                          if( index >= 0)
                            selectedRows.push( index);
                        });
    }
    // add selected cases from our parent collection shown in group header rows
    var i, rowCount = this.get('visibleRowCount'),
        parentCollection = dataContext && dataContext.getParentCollection( collection);
    if( parentCollection && dataView && (rowCount > 0)) {
      for( i = 0; i < rowCount; ++i) {
        var rowInfo = dataView.getItem( i);
        if( rowInfo && rowInfo.__group) {
          var tCase = DG.store.find( DG.Case, rowInfo.value);
          if( parentCollection.isCaseSelected( tCase))
            selectedRows.push( i);
        }
      }
    }
    return selectedRows;
  },
  
  /**
    Handles a mouse click in the table. Currently just adjusts the selection appropriately,
    depending on what modifier keys were pressed, etc.
    @param  {Boolean}   Whether to extend the current selection (true) or replace it (false)
    @param  {Object}    Object indicating which cell was clicked
                            Object.row -- The clicked row
                            Object.cell -- The clicked column
   */
  handleCellClick: function( iExtend, iCell) {
    var tDataView = this.get('gridDataView'),
        tRowInfo = iCell && (iCell.row >= 0) && tDataView && tDataView.getItem( iCell.row),
        tCase = tRowInfo && tRowInfo.theCase,
        tGroupParentID = tRowInfo && tRowInfo.__group && tRowInfo.value,
        tContext = this.get('dataContext'),
        tCollection = this.get('collection'),
        tIsSelected = tCollection && tCase && tCollection.isCaseSelected( tCase);
    
    if( !SC.none( tGroupParentID)) {
      tCase = DG.store.find( DG.Case, tGroupParentID);
      tCollection = tContext.getCollectionForCase( tCase);
    }
    
    var tChange = {
          operation: 'selectCases',
          collection: tCollection,
          cases: [ tCase ],
          select: iExtend ? !tIsSelected : true,
          extend: iExtend
        };
    if( tCase) {
      tContext.applyChange( tChange);
    }
    else if( !iExtend) {
      // Clicking outside the table should complete any active edit
      DG.globalEditorLock.commitCurrentEdit();
      // deselect all
      tChange.cases = null;
      tChange.select = false;
      tContext.applyChange( tChange);
    }
  },

  /**
    Selects the cases in the range of rows specified.
    @param    {Number}    iMinRow -- The starting row index
    @param    {Number}    iMaxRow -- The ending row index
   */
  selectRowsInRange: function( iMinRow, iMaxRow) {
    var tDataView = this.get('gridDataView'),
        tContext = this.get('dataContext'),
        tCollection = this.get('collection'),
        tCases = [];
    for( var i = iMinRow; i <= iMaxRow; ++i) {
      var tRowInfo = tDataView.getItem( i),
          tCase = tRowInfo && tRowInfo.theCase,
          tGroupCaseID = tRowInfo && tRowInfo.__group && tRowInfo.value;
      if( !SC.empty( tGroupCaseID))
        tCase = DG.store.find( DG.Case, tGroupCaseID);
      if( tCase) tCases.push( tCase);
    }
    if( tCases.length) {
      var tChange = {
            operation: 'selectCases',
            collection: tCollection,
            cases: tCases,
            select: true,
            extend: false
          };
      tContext.applyChange( tChange);
    }
  },
  
  /**
    Invalidates the rows corresponding to the specified cases.
    @param  {Array of DG.Case}  The set of cases to mark as changed.
                                If null/undefined, mark all cases changed.
   */
  markCasesChanged: function( iCases) {
    var dataView = this.gridDataView,
        // if no cases are specified, mark all cases changed
        cases = iCases || this.getPath('collection.casesController');
    dataView.beginUpdate();
    cases.forEach( function( iCase) {
                      var caseID = iCase.get('id').toString(),
                          item = dataView.getItemById( caseID);
                      if( item)
                        dataView.updateItem( caseID, item);
                    });
    dataView.endUpdate();
  }
  
  }; // end return from closure
  
}())); // end closure



/**
 * Slickgrid cell editor based on Slick.Editors.Text
 * @param args
 * @constructor
 */
DG.CaseTableCellEditor = function CaseTableCellEditor(args) {

  var $input;
  var defaultValue;

  this.init = function () {
    var kLeftArrowKeyCode = 37,
        kRightArrowKeyCode = 39;
    $input = SC.$("<INPUT type=text class='editor-text' />")
        .appendTo(args.container)
        .bind("keydown.nav", function (e) {
          if (e.keyCode === kLeftArrowKeyCode || e.keyCode === kRightArrowKeyCode) {
            e.stopImmediatePropagation();
          }
        })
        .bind("blur", function(e) {
          // Attempt to complete the edit whenever we lose focus
          DG.globalEditorLock.commitCurrentEdit();
        })
        .focus()
        .select();
  };

  this.destroy = function () {
    $input.remove();
  };

  this.focus = function () {
    $input.focus();
  };

  this.getValue = function () {
    return $input.val();
  };

  this.setValue = function (val) {
    $input.val(val);
  };

  /**
   * Load the initial value to edit in the cell.
   * Here we override the standard TextEditor.loadValue() method
   * which expect the value to be a parameter of 'item'.
   * Instead we get it from our case data.
   * @param item {} the row data with {id, parentID, theCase }
   */
  this.loadValue = function (item) {
    var attributeID = Number( args.column.id),
        caseAttributeValue = item.theCase && item.theCase.getValue(attributeID);
    // SlickGrid wants a string in 'defaultValue'
    defaultValue = SC.none( caseAttributeValue ) ? "" : caseAttributeValue.toString();
    // Unchanged from TextEditor.loadValue() :
    $input.val(defaultValue);
    $input[0].defaultValue = defaultValue;
    $input.select();
  };

  this.serializeValue = function () {
    return $input.val();
  };

  /**
   * Apply the edited value, by storing it in the DG data context.
   * Here we override the standard TextEditor.applyValue() method
   * Because the default editor modifies our row data, instead
   * of allowing the adapter to do it.  With this override we
   * don't need to handle the "onCellChanged" event.
   * @param item {} -- the row data with {id, parentID, theCase }
   * @param state {String} -- the edited string value
   */
  this.applyValue = function (item, state) {
    var columnId = Number( args.column.id ),
        value = state,
        context = args.column.context,
        tChange = {
          operation: 'updateCases',
          cases: [ item.theCase ],
          attributeIDs: [ columnId ],
          values: [ [value] ]
        };
    context.applyChange( tChange );
    var collectionName = item.theCase.getPath('collection.name') || "",
        caseIndex = args.grid.getData().getIdxById( item.id) + 1;
    DG.logUser("editValue: { collection: %@, case: %@, attribute: '%@', value: '%@' }",
                collectionName, caseIndex, args.column.name, value);
  };

  this.isValueChanged = function () {
    return (!($input.val() === "" && SC.none(defaultValue))) && ($input.val() !== defaultValue);
  };

  this.validate = function () {
    if (args.column.validator) {
      var validationResults = args.column.validator($input.val());
      if (!validationResults.valid) {
        return validationResults;
      }
    }

    return {
      valid: true,
      msg: null
    };
  };

  this.init();

};
