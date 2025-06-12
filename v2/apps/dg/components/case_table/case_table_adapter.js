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
/* global tinycolor */
var kMultilineRowHeightThreshold = 24;

DG.CaseTableAdapter = SC.Object.extend( (function() // closure
/** @scope DG.CaseTableAdapter.prototype */ {

      // Cell layout constants
  var kIndexColumnID = '__INDEX__',
      kDefaultColumnWidth = 60,
      kDefaultQualWidth = 60,
      kIndexColumnWidth = 35,
      kMinIndexColumnWidth = 35,
      kMinDataColumnWidth = 45,
      kDefaultRowHeight = 18,
      kDefaultColorWidth = 20,
      kMaxStringLength = 256,

      getColumnHeaderString = function( iAttribute) {
        var tName = iAttribute.get('name' ),
            tUnit = iAttribute.get('unit');
        return tName + (!SC.empty( tUnit) ? ' (' + tUnit + ')' : '');
      },

      indexFormatter = function  (rowIndex, colIndex, cellValue, colInfo, rowItem) {
        return rowItem && rowItem._isProtoCase
                ? '<img src="' + static_url("images/drag-indicator.svg") +
                      '" title="' + "DG.CaseTable.indexProto.tooltip".loc() + '"/>'
                : '<span class="dg-index">' + cellValue + '</span>';
      },

      /**
       * Formats table cells.
       *
       * Implements slickgrid cellFormatter api.
       *
       * @param rowIndex {number}
       * @param colIndex {number}
       * @param cellValue {DG.Case}
       * @param colInfo {Object} Slickgrid colInfo object.
       * @param rowItem
       * @return {DOMElement|string} formatted cell contents
       */
      cellFormatter = function (rowIndex, colIndex, cellValue, colInfo, rowItem) {
        function isBoolean(v) {
          if (typeof v === 'string') { v = v.toLowerCase(); }
          return ['','false','true',false, true, null].includes(v) || v === undefined;
        }
        var result;
        try {
          var attr = colInfo.attribute;
          var type = attr && attr.get('type');
          var precision = attr && attr.get('precision');
          if( cellValue && cellValue.jsonBoundaryObject)
            type = DG.Attribute.TYPE_BOUNDARY;

          if (cellValue instanceof Error) {
            result = errorFormatter(cellValue);
          } else if (type === DG.Attribute.TYPE_QUALITATIVE) {
            result = qualBarFormatter(cellValue);
          } else if (cellValue instanceof DG.SimpleMap) {
            result = stringFormatter(cellValue.toString(), this, colInfo);
          } else if (type === DG.Attribute.TYPE_BOUNDARY) {
            result = boundaryFormatter(cellValue);
          } else if (type === DG.Attribute.TYPE_CHECKBOX
              && isBoolean(cellValue)
              && (rowItem instanceof DG.Case)) {
            result = checkboxFormatter(cellValue, this, colInfo);
          } else if (SC.none(cellValue)) {
            result = "";
          } else if (typeof cellValue === 'boolean') {
            result = String(cellValue);
          } else if (DG.isDate(cellValue) || type === DG.Attribute.TYPE_DATE) {
            result = dateFormatter(cellValue, precision, type);
          } else if (DG.isNumeric(cellValue) || type === DG.Attribute.TYPE_NUMERIC) {
            result = numberFormatter(cellValue, type, precision);
          } else if (DG.isColorSpecString(cellValue)) {
            result = colorFormatter(rowIndex, colIndex, cellValue, colInfo,
                rowItem);
          } else if (typeof cellValue === 'string') {
            result = stringFormatter(cellValue, this, colInfo);
          } else {
            DG.log('caseTableAdapter.cellFormatter: unhandled value type ' +
                'for %@: %@'.loc(colInfo.name, cellValue.toString()));
            result = '';
          }

        } catch (ex) {
          DG.logWarn('Error in cell formatter: ' + ex + '/row,col,value/' + [rowIndex,colIndex,cellValue].join() + '/');
          result = 'error';
        }
        return result;
      },

      dateFormatter = function (cellValue, precision, type) {
        var date = DG.isDate(cellValue)? cellValue: DG.parseDate(cellValue, type === DG.Attribute.TYPE_DATE);
        return  date?('<span class="dg-date">'+ DG.formatDate(date, precision) + '</span>'): '"' + cellValue + '"';
      },

      numberFormatter = function (cellValue, type, precision) {
        var value = DG.isNumeric(cellValue)
                ? DG.getNumeric(cellValue)
                : DG.MathUtilities.extractNumeric(cellValue),
            roundDigits = !SC.empty(precision)? precision : 2,
            formattedValue;

        if (value != null && value !== '') {
          // if numeric and doesn't look like its a year format with grouped separators
          if (type === DG.Attribute.TYPE_NUMERIC && DG.MathUtilities.notAYear(value)) {
            formattedValue = Intl.NumberFormat(DG.get('currentLanguage'),
                {maximumFractionDigits: roundDigits}).format(value);
          } else {
            var multiplier = !SC.empty(roundDigits) ? Math.pow(10,roundDigits) : 1;
            formattedValue = Math.round( multiplier * value) / multiplier;
          }
          return '<span class="dg-numeric">' + formattedValue + '</span>';
        } else {
          return stringFormatter(cellValue);
        }
      },

      /**
       * Formats an error
       * @param error {Error}
       * @return {*}
       */
      errorFormatter = function (error) {
        return stringFormatter(error.toString());
      },

      computeTruncateSize = function (rowHeight, colInfo) {
        var rows = Math.floor((rowHeight - 4) / (kDefaultRowHeight - 4));
        // assume 8 bytes per character
        var cols = Math.floor((colInfo? colInfo.width: kDefaultColumnWidth) / 5);
        return Math.max(rows * cols, kMaxStringLength);
      },

      /**
       * Formats a string for display
       * @param cellValue {string}
       * @param [caseTableAdapter] {DG.CaseTableAdapter}
       * @param [colInfo] {Object} Slickgrid column info object
       * @return {string}
       */
      stringFormatter = function (cellValue, caseTableAdapter, colInfo) {
        // if we have a long string, truncate string to a value that is larger
        // than displayable in the cell.
        if (!(cellValue.length && cellValue.length < kMaxStringLength) && caseTableAdapter) {
          cellValue = cellValue.substring(0, computeTruncateSize(caseTableAdapter.get('rowHeight'), colInfo));
        }
        // standard values are HTML-escaped
        return cellValue.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
      },

      qualBarFormatter = function (value) {
        if (value === null || value === undefined || value === "") {
          return "";
        }

        var color = DG.PlotUtilities.kDefaultPointColor;
        return "<span class='dg-qualitative-backing'>" +
        "<span class='dg-qualitative-bar' style='background:" + color + ";width:" + value + "%'></span></span>";
      },

      boundaryFormatter = function ( value) {
        var tResult = 'a boundary',
            tBoundaryObject = DG.GeojsonUtils.boundaryObjectFromBoundaryValue(value),
            tThumb = tBoundaryObject && tBoundaryObject.jsonBoundaryObject &&
                tBoundaryObject.jsonBoundaryObject.properties &&
                tBoundaryObject.jsonBoundaryObject.properties.THUMB;
        if (tThumb !== null && tThumb !== undefined) {
          tResult = "<span class='dg-boundary-thumb'>" +
              "<img src=\'" + tThumb + "\' alt='thumb' height='14'></span>";
        }
        else if( tBoundaryObject && (tBoundaryObject.jsonBoundaryObject instanceof  Error)) {
          tResult = errorFormatter(tBoundaryObject.jsonBoundaryObject);
        }
        else if( !SC.empty(value)) {
          tResult = value;
        }
        return tResult;
      },

      colorFormatter = function (row, cell, value, columnDef, dataContext) {
        var tColor = tinycolor( value.toLowerCase().replace(/\s/gi,''));
        return "<span class='dg-color-table-cell' style= 'background:" + tColor.toString(
            'rgb') + "'></span>";
      },

      checkboxFormatter = function (cellValue, caseTableAdapter, colInfo) {

        cellValue = (typeof cellValue === 'string')? cellValue.toLowerCase(): cellValue;
        var attr = colInfo.attribute;
        var readOnly = (attr && (attr.formula || !attr.editable));
        var valueString = (cellValue && cellValue !== 'false')? ' checked': '';
        var disabledString = readOnly ? ' disabled': '';

        return '<span class="dg-checkbox-cell dg-wants-mouse dg-wants-touch"><input type="checkbox" title="' +
            cellValue + '"' + valueString + disabledString + '/></span>';
      },

      /**
       * Called when attribute has type "checkbox". For the given cellNode determine whether the attribute's
       * value is neither true nor false. If so, set the node's indeterminate property to true.
       * @param cellNode
       * @param row
       * @param dataContext
       * @param colDef
       */
      formatIndeterminate = function(cellNode, row, iCase, colDef) {
        var tInput = cellNode && cellNode.querySelector('input');
        var value = iCase.getValue(colDef.attribute.get('id')) ,
                // iCase.item && String(iCase.item.values[Number(colDef.attribute.get('id'))]),
            isIndeterminate = ![true, 'true', false, 'false'].includes(value) ;
        if( isIndeterminate && tInput)
          tInput.indeterminate = true;
      },

      tooltipFormatter = function(row, cell, cellValue, formattedValue, columnDef, dataContext) {
        // don't show tooltips for DG-formatted HTML values
        var tooltipValue = /<span.*class=["']dg-.*["'].*<\/span>/.test(formattedValue) ? "" : formattedValue;
        // HTML-escape tooltips for other values
        return tooltipValue && formattedValue.replace
                ? formattedValue.replace(/&/g, '&amp;')
                                .replace(/</g, '&lt;')
                                .replace(/>/g, '&gt;')
                                .replace(/"/g, '&quot;')
                : "";
      };

  return {  // return from closure

    minRowHeight: kDefaultRowHeight,

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
        this.dataContext.applyChange({
          operation: 'updateCollection',
          collection: this.collection,
          properties: {name: value}
        });
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
     * The row height for the table
     * @property {number}
     */
    rowHeight: function(key, value) {
      var model = this.get('model'),
          collectionId = this.getPath('collection.id');
      if (model && collectionId) {
        if (value != null) {
          model.setTableRowHeight(collectionId, value);
        }
        return model.getTableRowHeight(collectionId) || kDefaultRowHeight;
      }
    }.property(),

    /**
     * True if the row height supports multiline text formatting, false otherwise
     * @property {boolean}
     */
    isMultilineRowHeight: function() {
      return this.get('rowHeight') >= kMultilineRowHeightThreshold;
    }.property(),

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
      @property   {[Object]}
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
        adapter: this,
        model: this.model
      });

      if( this.get('dataContext'))
        this.dataContextDidChange();
    },

    destroy: function() {
      if (this.gridDataView) {
        this.gridDataView.destroy();
        this.gridDataView = null;
      }
      sc_super();
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
    }.property(),

    isCollectionReorgAllowed: function () {
      var dataContext = this.get('dataContext'),
          isTopLevel = !this.get('hasParentCollection');
        return !isTopLevel || !DG.DataContextUtilities.isTopLevelReorgPrevented(dataContext);
    }.property(),

    /**
     * Refresh the table when the dataContext metadata changes, e.g. when the context gets
     * a new managingController, which can determine whether to show the input row.
     */
    dataContextMetadataDidChange: function () {
      this.refresh();
    }.observes('*dataContext.metadataChangeCount'),

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
      var this_ = this;

      function isNewContext() {
        return this_.getPath('collection.collection.attrs').length === 1 &&
            this_.getPath('collection.collection.cases').length === 0;
      }

      var model = this.model;
      var prefWidth = model && model.getPreferredAttributeWidth(attributeID);
      var columnWidth = prefWidth || kDefaultColumnWidth;
      // Special case for a new context's table we want a double-wide column
      if( !prefWidth && isNewContext()) {
        columnWidth *= 2;
        model.setPreferredAttributeWidth( attributeID, columnWidth);
      }
      return columnWidth;
    },

    /**
     *
     * @param iIndex {number}
     * @return {DG.Attribute}
     */
    getAttributeFromColumnIndex: function (iIndex) {
      return this.gridColumns[iIndex].attribute;
    },

    getColumnIndexFromAttribute: function (attr) {
      return this.gridColumns.findIndex(function (columnInfo) {
        return columnInfo.attribute && (attr.id === columnInfo.attribute.id);
      });
    },

    getColumnFromAttribute: function (attr) {
      return this.gridColumns.find(function (columnInfo) {
        return columnInfo.attribute && (attr.id === columnInfo.attribute.id);
      });
    },

    getColumnWidthStats: function (attr) {
      var columnInfo = this.getColumnFromAttribute(attr);

      var cellStyle = {
        display: 'block',
        'font-family': 'Montserrat-Regular, sans-serif',
        'font-size': '10.6667px',
        'font-style':'normal',
        'font-weight': 'normal',
        'text-align': 'left',
        padding: '1px 4px 2px'
      };
      var headerStyle = {
        display: 'block',
        'font-family': 'Montserrat-Regular, sans-serif',
        'font-size': '10.6667px',
        'font-style':'normal',
        'font-weight': 'normal',
        'text-align': 'left'
      };
      var minWidth = Number.MAX_VALUE;
      var maxWidth = 0;
      var sum = 0;
      var ct = 0;

    var dimensions = DG.measureText(getColumnHeaderString(attr), headerStyle);
    var headerWidth = dimensions && dimensions.width;

      this.collection.casesController.slice(0,500).forEach( function (myCase) {
        var attrValue = myCase.getValue(attr.id);
        var valueString;
      var dimensions;
        var width;
        if (DG.isColorSpecString(attrValue)) {
          width = kDefaultColorWidth;
        } else if (attr.type === DG.Attribute.TYPE_QUALITATIVE){
          width = kDefaultQualWidth;
        } else {
          valueString = cellFormatter(0, 0, attrValue, columnInfo, myCase);
        dimensions = DG.measureText(valueString, cellStyle);
        width = dimensions && dimensions.width + 1;
        }
        maxWidth = Math.max(maxWidth, width);
        minWidth = Math.min(minWidth, width);
        ct ++;
        sum += width;
      });

      return {
        headerWidth: headerWidth,
        minWidth: minWidth,
        maxWidth: maxWidth,
        meanWidth: sum/ct,
        count: ct
      };
    },

    autoResizeColumn: function (attr) {
      var stats = this.getColumnWidthStats(attr);
      var width = Math.max(Math.ceil(3 +stats.headerWidth/2), Math.min(stats.maxWidth, 200)) + 11;
      // DG.log('Resizing stats: ' + JSON.stringify(stats));
      // DG.log('Resizing column %@ from %@ to %@'.loc(attr.name, this.model.getPreferredAttributeWidth(attr.id), width));
      this.model.setPreferredAttributeWidth(attr.id, width);
    },

    autoResizeAllColumns: function () {
      this.collection.forEachAttribute(function (attr) {
        if( !attr.get('hidden'))
          this.autoResizeColumn(attr);
      }.bind(this));
    },

    getProtoCase: function() {
      var dataView = this.get('gridDataView');
      var collection = this.get('collection');
      return dataView && collection ? dataView.getProtoCase(collection) : undefined;
    },

    isCellEditable: function(row, column) {
      var dataView = this.get('gridDataView'),
          dataContext = this.get('dataContext'),
          aCase = dataView.getItem(row),
          colInfo = this.gridColumns[column],
          attr = colInfo && colInfo.attribute,
          attrIsEditable = attr && attr.get('editable') && !attr.get('hasFormula'),
          caseIsEditable = DG.DataContextUtilities.isCaseEditable(dataContext, aCase);
      return attrIsEditable && caseIsEditable;
    },

    isCellRowSelectable: function(row, column) {
      var tDataView = this.get('gridDataView'),
          tCase = tDataView.getItem(row);
      return tCase && !tCase._isProtoCase;
    },

    /**
      Builds the array of column definitions required by SlickGrid from the data context.

      @returns  {[Object]} The properties of each object define the column
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
                                    existColumnDefs[iColumn.id] = iColumn;
                                  });
      }

      function updateDynamicColumnProperties( iAttribute, ioColumnInfo) {
        // cell-specific editability handled by isCellEditable() method
        ioColumnInfo.editor = DG.CaseTableCellEditor;
      }

      function addIndexColumn() {
        var indexColumnName = 'DG.CaseTable.indexColumnName'.loc(),
            columnInfo = {
              context: context,
              id: kIndexColumnID,
              name: indexColumnName,
              field: indexColumnName,
              toolTip: 'DG.CaseTable.indexColumnTooltip'.loc(),
              focusable: false,
              cssClass: 'dg-index-column',
              formatter: indexFormatter,
              width: kIndexColumnWidth,
              minWidth: kMinIndexColumnWidth
            };
        columnDefs.push(columnInfo);
      }

      // Build the columnInfo for a single attribute
      function processAttribute( iAttribute) {
        var attrID = iAttribute.get('id').toString(),
            collection = iAttribute.get('collection'),
            attrName = iAttribute.get('name'),
            hasFormula = iAttribute.hasFormula(),
            hasDeletedFormula = iAttribute.hasDeletedFormula(),
            isCheckbox = iAttribute.get('type') === 'checkbox',
            columnInfo = {
              context: context,
              collection: collection,
              collectionID: collection.get('id').toString(),
              attribute: iAttribute,
              // Slick.Grid properties
              id: attrID,
              name: getColumnHeaderString( iAttribute),
              field: attrName,
              focusable: !hasFormula,
              cssClass: hasFormula? 'dg-formula-column': undefined,
              toolTip: DG.CaseDisplayUtils.getTooltipForAttribute( iAttribute),
              formatter: cellFormatter.bind(this),
              asyncPostRender: isCheckbox ? formatIndeterminate : null,
              tooltipFormatter: tooltipFormatter,
              width: this.getPreferredColumnWidth(iAttribute.get('id')),
              minWidth: kMinDataColumnWidth,
              hasDependentInteractive: function () {
                return this.context.get('hasGameInteractive');
              },
              header: {
                menu : {
                  items: [
                    {
                      title: 'DG.TableController.headerMenuItems.renameAttribute'.loc(),
                      command: 'cmdEditName',
                      updater: function( iColumn, iMenu, ioMenuItem) {
                        ioMenuItem.disabled = false;
                      }
                    },
                    {
                      title: 'DG.TableController.headerMenuItems.resizeColumn'.loc(),
                      command: 'cmdResizeAttribute',
                      updater: function( iColumn, iMenu, ioMenuItem) {
                        ioMenuItem.disabled = false;
                      }
                    },
                    {
                      title: 'DG.TableController.headerMenuItems.editAttribute'.loc(),
                      command: 'cmdEditAttribute',
                      updater: function( iColumn, iMenu, ioMenuItem) {
                        ioMenuItem.disabled = false;
                      }
                    },
                    {
                      title: 'DG.TableController.headerMenuItems.editFormula'.loc(),
                      command: 'cmdEditFormula',
                      updater: function( iColumn, iMenu, ioMenuItem) {
                        ioMenuItem.disabled = !iColumn.attribute.get('editable');
                      }
                    },
                    {
                      title: hasDeletedFormula ? 'DG.TableController.headerMenuItems.recoverFormula'.loc() : 'DG.TableController.headerMenuItems.deleteFormula'.loc(),
                      command: hasDeletedFormula ? 'cmdRecoverDeletedFormula' : 'cmdDeleteFormulaKeepValues',
                      updater: function ( iColumn, iMenu, ioMenuItem) {
                        ioMenuItem.disabled = !iColumn.attribute.get('editable') || (!hasFormula && !hasDeletedFormula);
                      }
                    },
                    {
                      title: 'DG.TableController.headerMenuItems.randomizeAttribute'.loc(),
                      command: 'cmdRandomizeAttribute',
                      updater: function( iColumn, iMenu, ioMenuItem) {
                        ioMenuItem.disabled = !DG.DataContextUtilities.attributeCanBeRandomized(context, attrID);
                      }
                    },
                    {
                      title: 'DG.TableController.headerMenuItems.sortAscending'.loc(),
                      command: 'cmdSortAscending',
                      updater: function( iColumn, iMenu, ioMenuItem) {
                        ioMenuItem.disabled = false;
                      }
                    },
                    {
                      title: 'DG.TableController.headerMenuItems.sortDescending'.loc(),
                      command: 'cmdSortDescending',
                      updater: function( iColumn, iMenu, ioMenuItem) {
                        ioMenuItem.disabled = false;
                      }
                    },
                    {
                      title: 'DG.TableController.headerMenuItems.hideAttribute'.loc(),
                      command: 'cmdHideAttribute',
                      updater: function( iColumn, iMenu, ioMenuItem) {
                        // we disable the menu item if the column corresponds to the last
                        // attribute in its collection
                        ioMenuItem.disabled = iColumn.collection.numberOfVisibleAttributes() === 1;
                      }
                    },
                    {
                      title: 'DG.TableController.headerMenuItems.deleteAttribute'.loc(),
                      command: 'cmdDeleteAttribute',
                      updater: function( iColumn, iMenu, ioMenuItem) {
                        // we disable the menu item if not deleteable or the
                        // context is owned by a data interactive that speaks the Game API
                        ioMenuItem.disabled = !iColumn.attribute.get('deleteable') ||
                                                iColumn.hasDependentInteractive() ||
                                                !DG.DataContextUtilities.isAttributeDeletable(context, iAttribute);
                      }
                    }
                  ]
                }
              }
            };
        updateDynamicColumnProperties( iAttribute, columnInfo);
        if(! iAttribute.get('hidden')) {
          columnDefs.push( columnInfo);
        }
      }

      if (this.model && !this.model.get('isIndexHidden')) {
        addIndexColumn();
      }

      // Process the attributes in the collection
      collection.forEachAttribute( processAttribute.bind(this));

      this.gridColumns = columnDefs;

      return columnDefs;
    },

    /**
      Returns the column info for the specified attribute.
      @param    {string}    iAttrName -- The name of the attribute whose column should be returned
      @returns  {object}    The column info for the specified attribute
     */
    getAttributeColumn: function(iAttrName) {
      var dataContext = this.get('dataContext'),
          attr = dataContext && dataContext.getAttributeByName(iAttrName),
          columnIndex = this.gridColumns.findIndex(
                                          function(iColumn) {
                                            return attr && (attr.get('id').toString() === iColumn.id);
                                          }),
          columnInfo = columnIndex >= 0 ? this.gridColumns[columnIndex] : null;
      return columnInfo ? { columnIndex: columnIndex, columnInfo: columnInfo } : null;
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
        column.toolTip = DG.CaseDisplayUtils.getTooltipForAttribute( iAttribute);
        column.formatter = cellFormatter;
        column.cssClass = iAttribute.get('hasFormula')? 'dg-formula-column': undefined;
        if( iAttribute.get('editable') && !iAttribute.get('hasFormula'))
          column.editor = DG.CaseTableCellEditor;
        else
          delete column.editor;

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

      var getCaseIndex = function(iRowItem) {
        var id = iRowItem && iRowItem.get('id'),
            idToIndexMap = this.getPath('collection.collection.caseIDToGroupedIndexMap'),
            index = idToIndexMap && id && idToIndexMap[id];
        return (index !== null && index !== undefined) ? (index + 1).toString() : "";
      }.bind(this);

      this.gridOptions = {
                rowHeight: this.get('rowHeight'),
                headerRowHeight: kDefaultRowHeight*2,
                enableColumnReorder: false,
                syncColumnCellResize: true,
                leaveSpaceForNewRows: false,
                editable: true, // user-editable cells for columns with an 'editable' property only
                enableAddRow: false, // don't add an extra blank row at the end
                asyncEditorLoading: false,
                enableAsyncPostRender: true,
                autoEdit: false, // double click to edit an 'editable' attribute's cell
                editCommandHandler: function( iItem, iColumn, iEditCommand) {
                                      // Called after the cell edit has been deactivated
                                      SC.run(function() {
                                        iEditCommand.execute();
                                      });
                                    },
                dataItemColumnValueExtractor: function (iRowItem, iColumnInfo) {
                  return iColumnInfo.id === kIndexColumnID ? getCaseIndex(
                      iRowItem) : iRowItem.getValue(iColumnInfo.id);
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
      this.beginPropertyChanges();
      this.setPath('gridDataView.context', this.get('dataContext'));
      this.setPath('gridDataView.collection', this.get('collection'));
      this.endPropertyChanges();
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
      this.set('lastRefresh', null);
      this.invokeOnce(function() {
        this.set('lastRefresh', null);
        var gridDataView = this.get('gridDataView');
        if( gridDataView) {
          gridDataView.refresh();
          this.notifyPropertyChange('tableDidRefresh');
        }
        this.set('lastRefresh', new Date());
      }.bind(this));
      this.set('lastRefresh', new Date());
    },

    /**
      Returns the set of selected row indices for the table.
      Note: We could potentially speed this up by only considering rows
      that are currently visible on screen, although this would require
      additional synchronization of selection when scrolling, for instance.
      @returns  {[number]}   The indices of the selected cases
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
     * @param iRowIndices {[number]} Array of row indices
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
            }).filter( function( iCase) {
              // We filter because, at least in FireFox, we can get to a row that is one beyond the end
              // which therefore has no case
              return iCase && !iCase._isProtoCase;
            }),
            select: true,
            extend: false
          };
      if (tChange.cases.length)
        tContext.applyChange( tChange);
    },

    deselectAllCases: function() {
      var selectedRows = this.getSelectedRows();
      if (selectedRows && selectedRows.length)
        this.get('dataContext').applyChange({ operation: 'selectCases', select: false });
    },

    /**
      Invalidates the rows corresponding to the specified cases.
      @param  iCases {[DG.Case]}  The set of cases to mark as changed.
                                  If null/undefined, mark all cases changed.
     */
    markCasesChanged: function( iCases) {
      var dataView = this.get('gridDataView'),
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
     * @param {number} position: position in the case table. This will correspond
     *          to the position in the collection when there are no hidden
     *          attributes. If there are hidden attributes we must adjust for this.
     */
    requestMoveAttribute: function (attr, position) {
      var tContext = this.get('dataContext'),
          tCollection = tContext && this.get('collection'),
          tAttrs = tCollection && tCollection.getPath('collection.attrs'),
          tAttrIndex = 0,
          tChange = {
            operation: 'moveAttribute',
            attr: attr,
            toCollection: tCollection,
            fromCollection: attr.get('collection'),
            position: null
          };
      if (!tAttrs) {
        return;
      }
      // subtract one for index column, which doesn't correspond to an attribute
      position -= 1;
      // have position in case table, find position in collection's attribute
      // list.
      while (position > 0 && tAttrs[tAttrIndex]) {
        if (!tAttrs[tAttrIndex].hidden) {
          position--;
        }
        tAttrIndex++;
      }
      tChange.position = tAttrIndex;
      tContext.applyChange(tChange);
    },

    /**
     * Returns whether the attribute can be dropped in the case table associated
     * with this adapter.
     *
     * Drop is disabled if any of the following are true
     *   (a) the dataContext prevents the drop
     *   (b) the dragged attribute is from another dataContext,
     *   (c) the plugin prevents the drop
     * see DG.DataContextUtilities.canAcceptAttributeDrop() for details
     *
     * @param attr
     * @returns {boolean}
     */
    canAcceptDrop: function (attr) {
      var dataContext = this.get('dataContext');
      var isTopLevelDrop = !this.get('hasParentCollection');
      return DG.DataContextUtilities
                .canAcceptAttributeDrop(dataContext, attr, isTopLevelDrop, true);
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
        kRightArrowKeyCode = 39,
        grid = args.grid,
        gridOptions = grid.getOptions(),
        // column = args.column,
        tag = gridOptions.rowHeight >= kMultilineRowHeightThreshold ? "textarea" : "input";
    $input = SC.$("<" + tag + " type=text class='dg-editor-text' />")
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
      .bind('mousedown', function(e) { e.stopImmediatePropagation(); })
      .bind('mouseup', function(e) { e.stopImmediatePropagation(); })
      .bind('click', function (e) {
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

  this.saveEditState = function () {
    return {
      item: args.item,
      column: args.column,
      value: $input.val(),
      selectionStart: $input[0].selectionStart,
      selectionEnd: $input[0].selectionEnd,
      selectionDirection: $input[0].selectionDirection
    };
  };

  this.restoreEditState = function (state) {
    $input.val(state.value);
    $input[0].setSelectionRange(state.selectionStart, state.selectionEnd, state.selectionDirection);
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
    var attrID = Number( args.column.id ),
        tCase = item,
        isRealCaseEdit = tCase instanceof DG.Case, // not proto-case
        originalValue = isRealCaseEdit
                          ? tCase.getStrValue(attrID)
                          : tCase.getValue(args.column.id),
        newValue = DG.DataUtilities.canonicalizeInputValue(state),
        context = args.column.context,
        contextName = context.get('name'),
        collection = tCase.get('collection'),
        collectionName = collection && collection.get('name') || "",
        attr = collection && collection.getAttributeByID(attrID),
        attrName = attr && attr.get('name'),
        caseIndex = args.grid.getData().getIdxById(tCase.id);

    function applyEditChange(attrID, iValue, isUndoRedo) {
      if (isRealCaseEdit) {
        context.applyChange({
                  operation: 'updateCases',
                  cases: [ tCase ],
                  attributeIDs: [ attrID ],
                  values: [ [iValue] ]
                });
      }
      else if (!isUndoRedo) {
        // update proto-case value
        tCase.setValue(args.column.id, newValue);
      }
    }

    var cmd = DG.Command.create({
                name: 'caseTable.editCellValue',
                undoString: 'DG.Undo.caseTable.editCellValue',
                redoString: 'DG.Redo.caseTable.editCellValue',
                log: "editValue: { collection: %@, case: %@, attribute: '%@', old: '%@', new: '%@' }"
                      .fmt(collectionName, caseIndex + 1, attrID, originalValue, newValue),
                causedChange: isRealCaseEdit,
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
                  var cases = collection && collection.get('casesController');
                  tCase = cases && cases.objectAt(caseIndex);
                  if (tCase)
                    applyEditChange(attrID, newValue, true);
                }
              });
    DG.UndoHistory.execute(cmd);
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
