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

/** @class

  Adapter for displaying DG data for a single collection in a SlickGrid.

  @extends SC.Object
 */
DG.CaseTableAdapter = SC.Object.extend( (function() // closure
/** @scope DG.CaseTableAdapter.prototype */ {

      // Cell layout constants
  var kDefaultColumnWidth = 60,
      kDefaultRowHeight = 18,
      kMaxStringLength = 256,
      
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
      },

      qualBarFormatter = function (row, cell, value, columnDef, dataContext) {
        if (value == null || value === "") {
          return "";
        }

        var color = DG.PlotUtilities.kDefaultPointColor,
            kColumnDefaultWidth = 60,
            kPadding = 10,
            tWidth = (kColumnDefaultWidth - kPadding) * value / 100;

        return "<span class='dg-qualitative-bar' style='background:" + color + ";width:" + tWidth + "px'></span>";
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
   * A helper property to manage the collection name.
   * @type {String}
   */
  collectionName: function (key, value) {
    if (value !== undefined) {
      this.setPath('collection.name', value);
    }
    return this.getPath('collection.name');
  }.property().cacheable(),

  collectionNameDidChange: function () {
    this.notifyPropertyChange('collectionName');
  }.observes('*collection.name'),

  /**
   * The Case Table Model
   * @type {DG.CaseTableModel}
   */
  model: null,

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
    @property   {[Object]}
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
  
  /**
    Initialization method.
   */
  init: function() {
    sc_super();

    this.gridDataView = DG.CaseTableDataManager.create({
      context: this.dataContext,
      collection: this.collection,
      model: this.model
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
    The number of visible rows in the table, that is the number of rows adjusted
    for the effect of collapsed rows. This is _not_ the number of rows that can be
    seen in the current viewport.
    @property {Number}
   */
  visibleRowCount: function() {
    return this.gridDataView.getLength();
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
   * Returns the user selected column width for this attribute or the default,
   * if not defined.
   *
   * @param attributeID {number}
   */
  getPreferredColumnWidth: function (attributeID) {
    var model = this.model;
    var prefWidth = model && model.getPreferredAttributeWidth(attributeID);
    var columnWidth = prefWidth || kDefaultColumnWidth;
    return columnWidth;
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
          isQual = iAttribute.get('type') === 'qualitative',
          columnInfo = {
            context: context,
            collection: collection,
            collectionID: collection.get('id').toString(),
            attribute: iAttribute,
            // Slick.Grid properties
            id: attrID,
            name: getColumnHeaderString( iAttribute),
            field: attrName,
            toolTip: getToolTipString( iAttribute),
            formatter: isQual ? qualBarFormatter : cellFormatter,
            width: this.getPreferredColumnWidth(iAttribute.get('id')),
            hasDependentInteractive: function () {
              return this.context.get('hasGameInteractive');
            },
            header: {
              menu : {
                items: [
                  { title: 'DG.TableController.headerMenuItems.editAttribute'.loc(),
                    command: 'cmdEditFormula',
                    updater: function( iColumn, iMenu, ioMenuItem) {
                      ioMenuItem.disabled = !iColumn.attribute.get('editable');
                    }
                  },
                  { title: 'DG.TableController.headerMenuItems.randomizeAttribute'.loc(),
                    command: 'cmdRandomizeAttribute',
                    updater: function( iColumn, iMenu, ioMenuItem) {
                      var depMgr = context && context.get('dependencyMgr'),
                          dependency = depMgr &&
                                        depMgr.findDependency({ type: DG.DEP_TYPE_ATTRIBUTE,
                                                                id: attrID },
                                                              { type: DG.DEP_TYPE_SPECIAL,
                                                                id: 'random' });
                      ioMenuItem.disabled = !dependency;
                    }
                  },
                  { title: 'DG.TableController.headerMenuItems.renameAttribute'.loc(),
                    command: 'cmdRenameAttribute',
                    updater: function( iColumn, iMenu, ioMenuItem) {
                      // we disable the menu item if not renameable or the
                      // context is owned by a data interactive that speaks the Game API
                      ioMenuItem.disabled = !iColumn.attribute.get('renameable') || iColumn.hasDependentInteractive();
                    }
                  },
                  { title: 'DG.TableController.headerMenuItems.deleteAttribute'.loc(),
                    command: 'cmdDeleteAttribute',
                    updater: function( iColumn, iMenu, ioMenuItem) {
                      // we disable the menu item if not deleteable or the
                      // context is owned by a data interactive that speaks the Game API
                      ioMenuItem.disabled = !iColumn.attribute.get('deleteable') || iColumn.hasDependentInteractive();
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
    collection.forEachAttribute( processAttribute.bind(this));
    
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
              autoEdit: false, // double click to edit an 'editable' attribute's cell
              editCommandHandler: function( iItem, iColumn, iEditCommand) {
                                    // Called after the cell edit has been deactivated
                                    SC.run(function() {
                                      iEditCommand.execute();
                                    });
                                  },
              dataItemColumnValueExtractor: function (iRowItem, iColumnInfo) {
                var value = iRowItem.getStrValue(iColumnInfo.id);
                return value &&
                    ((value.length < kMaxStringLength)?
                        value:
                        value.substring(0, kMaxStringLength));
              }
           };
    return this.gridOptions;
  },
  
  /**
    Rebuilds the adapter by rebuilding the column header info, the row data, and the options.
   */
  rebuild: function() {
    this.updateColumnInfo();
    this.buildGridOptions();
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
  }.observes('.collection.attrFormulaChanges'),
  
  /**
    Refreshes the contents of the table.
   */
  refresh: function() {
    this.invokeOnce(function() {
      var gridDataView = this.get('gridDataView');
      if( gridDataView) {
        gridDataView.refresh();
      }
    });
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
        selectedRows = [],
        collectionClient;
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
        var myCase = dataView.getItem( i);
        if (myCase.collection.get('id') !== collection.get('id')) {
          collectionClient = dataContext.getCollectionByID(myCase.collection.get('id'));
          if (collectionClient) {
            if(collectionClient.isCaseSelected(myCase)) {
              selectedRows.push(i);
            }
          } else {
            DG.log('CaseTableAdapter.getSelectedRows: collectionClient for case ' +
                myCase.id + ' not found: ' + myCase.collection.get('id'));
          }
        }
      }
    }
    return selectedRows;
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
      var tCase = tDataView.getItem( i),
          tGroupCaseID = tCase && tCase.__group && tCase.id;
      if( !SC.empty( tGroupCaseID)) {
        tCase = tContext.getCaseByID(tGroupCaseID);
      }
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
     * Selects a range of cases based on an array of row indices.
     * @param rows {[number]} Array of row indices
     */
    selectRowsInList: function (iRowIndices) {
      var tDataView = this.get('gridDataView'),
          tContext = this.get('dataContext'),
          tCollection = this.get('collection'),
          tChange = {
            operation: 'selectCases',
            collection: tCollection,
            cases: iRowIndices.map(function (iRowIndex) {
              return tDataView.getItem( iRowIndex);
            }),
            select: true,
            extend: false
          };
      tContext.applyChange( tChange);
    },
  
  /**
    Invalidates the rows corresponding to the specified cases.
    @param  iCases {Array of DG.Case}  The set of cases to mark as changed.
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
    this.refresh();
  },

    /**
     * We want to move attribute, attr, from its collection to
     * the indicated position (an index) in the current collection.
     *
     * @param {DG.Attribute} attr
     * @param {number} position
     */
    requestMoveAttribute: function (attr, position) {

      DG.UndoHistory.execute(DG.Command.create({
        name: 'caseTable.moveAttribute',
        undoString: 'DG.Undo.caseTable.moveAttribute',
        redoString: 'DG.Redo.caseTable.moveAttribute',
        log: 'move attribute {attribute: "%@", position: %@}'.loc(attr.name, position),
        _beforeStorage: {
          context: this.get('dataContext'),
          toCollection: this.get('collection'),
          fromCollectionID: attr.collection.id,
          fromCollectionName: attr.collection.name,
          fromCollectionParent: attr.collection.parent,
          fromCollectionChild: attr.collection.children[0],
          fromPosition: attr.collection.attrs.indexOf(attr),
          changeFlag: this.getPath('dataContext.flexibleGroupingChangeFlag')
        },
        execute: function () {
          var tContext = this._beforeStorage.context,
              tCollection = this._beforeStorage.toCollection,
              tChange = {
                operation: 'moveAttribute',
                attr: attr,
                toCollection: tCollection,
                position: position
              };
          tContext.applyChange(tChange);
          tContext.set('flexibleGroupingChangeFlag', true);
        },
        undo: function () {
          var tContext = this._beforeStorage.context,
              tCollection = tContext.getCollectionByID(this._beforeStorage.fromCollectionID),
              tChange;
          if (tCollection) {
            tChange = {
              operation: 'moveAttribute',
              attr: attr,
              toCollection: tCollection,
              position: this._beforeStorage.fromPosition
            };
          } else {
            tChange = {
              operation: 'createCollection',
              properties: {
                id: this._beforeStorage.fromCollectionID,
                name: this._beforeStorage.fromCollectionName,
                parent: this._beforeStorage.fromCollectionParent,
                children: [this._beforeStorage.fromCollectionChild]
              },
              attributes: [attr]
            };
          }
          tContext.applyChange(tChange);
          tContext.set('flexibleGroupingChangeFlag', this._beforeStorage.changeFlag);
        }
      }));
    },

    /**
     * Returns whether the attribute can be dropped in the case table associated
     * with this adapter.
     *
     * If the attribute is a part of this collection, then the it may be dropped
     * if the context is not owned by a game-based interactive
     *
     * If the attribute is a part of a collection in this context, but not this
     * collection it may be dropped if it is not owned by any data interactive.
     *
     * If the attribute is a part of another context, then it may not be dropped.
     *
     * @param attr
     * @returns {boolean}
     */
    canAcceptDrop: function (attr) {
      var canAcceptDrop = false;
      var tContext = this.get('dataContext');
      var attrCollection = attr.collection;
      if (!SC.none(tContext.getCollectionByID(attrCollection.id))) {
        if (attrCollection.getAttributeByID(attr.get('id'))) {
          canAcceptDrop = !tContext.get('hasGameInteractive');
        } else {
          canAcceptDrop = !tContext.get('hasDataInteractive');
        }
      }

      return canAcceptDrop;
    }

  }; // end return from closure
  
}())); // end closure



/**
 * Slickgrid cell editor based on Slick.Editors.Text
 * @param args {{container: {element}, column: {object}, grid: {object}}}
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
      .bind('click', function (e) {
        // for unknown reasons, click in the input box does not
        // position the input caret, so we do it ourselves...
        function positionCaret($el, text, xPosition) {
          var $div = $('<div>').text(text);
          var length = text.length;
          var pos;
          $div.css({
            position: 'absolute',
            left: '-100px',
            top: '-100px',
            fontWeight: $el.css('font-weight'),
            fontFamily: $el.css('font-family'),
            fontSize: $el.css('font-size')
          });
          $('body').append($div);
          pos = Math.round(xPosition*length/$div.width());
          $div.remove();
          $el[0].setSelectionRange(pos, pos);
        }
        positionCaret($(this), $(this).val(), e.offsetX);
        e.preventDefault();
        e.stopImmediatePropagation();
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
   * Instead we get it from our case data.
   * @param item {DG.Case} the row case
   */
  this.loadValue = function (item) {
    var attributeID = Number( args.column.id),
        caseAttributeValue = item && item.getValue(attributeID);

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
   * @param item {DG.Case}
   * @param state {String} -- the edited string value
   */
  this.applyValue = function (item, state) {
    var columnId = Number( args.column.id ),
        value = state,
        context = args.column.context,
        tChange = {
          operation: 'updateCases',
          cases: [ item ],
          attributeIDs: [ columnId ],
          values: [ [value] ]
        };
    if( DG.isDate(new Date( value))) {
      tChange.values = [[DG.createDate( value)]];
    }
    context.applyChange( tChange );
    var collectionName = item.getPath('collection.name') || "",
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
