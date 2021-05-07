// ==========================================================================
//
//  Author:   jsandoe
//
//  Copyright (c) 2016 by The Concord Consortium, Inc. All rights reserved.
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
//
// This file borrows significantly from the Slickgrid plugin,
// slick.rowselectionmodel.js. It implements CODAP-specific adjustments to this
// plugin to integrate CODAP and Slickgrid selection models.
//
/* global Slick */
DG.CaseTableRowSelectionModel = function (options) {
  var _grid;
  var _caseTableAdapter;
  var _ranges = [];
  var _self = this;
  var _handler = new Slick.EventHandler();
  var _inHandler;
  var _options;
  var _inDrag = false;  // eslint-disable-line no-unused-vars
  var _dragStartRow;
  var _dragStartY = null;
  var _dragStartClientX = null;
  var _dragStartClientY = null;
  var _dragInputRow = null;
  var _gridViewport = null;
  var _dragInputRowClone = null;
  var _dragInputRowTargets = null;

  var _defaults = {
    selectActiveRow: true
  };

  function init(grid) {
    _options = $.extend(true, {}, _defaults, options);
    _caseTableAdapter = _options.caseTableAdapter;
    _grid = grid;
    // _handler.subscribe(_grid.onActiveCellChanged,
    //     wrapHandler(handleActiveCellChange));
    _handler.subscribe(_grid.onKeyDown, wrapHandler(handleKeyDown));
    _handler.subscribe(_grid.onClick, wrapHandler(handleClick));
    _handler.subscribe(_grid.onDragInit, wrapHandler(handleDragInit));
    _handler.subscribe(_grid.onDragStart, wrapHandler(handleDragStart));
    _handler.subscribe(_grid.onDrag, wrapHandler(handleDrag));
    _handler.subscribe(_grid.onDragEnd, wrapHandler(handleDragEnd));
  }

  function destroy() {
    _handler.unsubscribeAll();
  }

  function notifyContextOfSelectionChange(rows) {
    SC.run(function () {
      _caseTableAdapter.selectRowsInList(rows);
    });
  }

  function wrapHandler(handler) {
    return function () {
        var result;
        if (!_inHandler) {
          _inHandler = true;
          result = handler.apply(this, arguments);
          _inHandler = false;
          return result;
        }
    };
  }

  function rangesToRows(ranges) {
    var rows = [];
    for (var i = 0; i < ranges.length; i++) {
      for (var j = ranges[i].fromRow; j <= ranges[i].toRow; j++) {
        rows.push(j);
      }
    }
    return rows;
  }

  function rowsToRanges(rows) {
    var ranges = [];
    var lastCell = _grid.getColumns().length - 1;
    for (var i = 0; i < rows.length; i++) {
      ranges.push(new Slick.Range(rows[i], 0, rows[i], lastCell));
    }
    return ranges;
  }

  function getRowsRange(from, to) {
    var i, rows = [];
    for (i = from; i <= to; i++) {
      rows.push(i);
    }
    for (i = to; i < from; i++) {
      rows.push(i);
    }
    return rows;
  }

  function getSelectedRows() {
    return rangesToRows(_ranges);
  }

  function setSelectedRows(rows) {
    setSelectedRanges(rowsToRanges(rows));
  }

  function setSelectedRanges(ranges) {
    _ranges = ranges;
    _self.onSelectedRangesChanged.notify(_ranges);
  }

  function getSelectedRanges() {
    return _ranges;
  }

  // function handleActiveCellChange(e, data) {
  //   var selectedRows = getSelectedRows();
  //
  //   if (_options.selectActiveRow
  //       && data.row != null
  //       && (selectedRows.indexOf(data.row) < 0)) {
  //     // notifyContextOfSelectionChange([data.row]);
  //   }
  // }

  function handleKeyDown(e) {
    var activeRow = _grid.getActiveCell();

    var kUpArrowKeyCode = 38;
    var kDownArrowKeyCode = 40;

    // handle shift-upArrow and shift-downArrow
    if (activeRow && e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey &&
        (e.which === kUpArrowKeyCode || e.which === kDownArrowKeyCode)) {
      var selectedRows = getSelectedRows();
      selectedRows.sort(function (x, y) {
        return x - y;
      });

      if (!selectedRows.length) {
        selectedRows = [activeRow.row];
      }

      var top = selectedRows[0];
      var bottom = selectedRows[selectedRows.length - 1];
      var active;

      if (e.which === kDownArrowKeyCode) {
        active = activeRow.row < bottom || top === bottom ? ++bottom : ++top;
      } else {
        active = activeRow.row < bottom ? --bottom : --top;
      }

      if (active >= 0 && active < _grid.getDataLength()) {
        _grid.scrollRowIntoView(active);
        notifyContextOfSelectionChange(getRowsRange(top, bottom));
      }

      e.preventDefault();
      e.stopPropagation();
    }
  }

  function handleDragInit(e) {
    _inDrag = true;
    e.stopImmediatePropagation();
  }

  function handleDragStart(e) {
    _caseTableAdapter.set('isModelDragging', true);
    var activeCell = _grid.getCellFromEvent(e);
    var activeCellBox = _grid.getCellNodeBox(activeCell.row, activeCell.cell);
    // We prepare for computing future drag offsets by capturing the current
    // row, its reported vertical coordinate and the 'client' coordinate.
    // These are needed to compute the current vertical position in the grid's
    // coordinate system.
    _dragStartRow = activeCell && activeCell.row;
    _dragStartY = (activeCellBox.top + activeCellBox.bottom) / 2;
    _dragStartClientX = e.clientX;
    _dragStartClientY = e.clientY;
    for (var elt = e.target; elt; elt = elt.parentElement) {
      if (elt && $(elt).hasClass("dg-proto-row")) {
        _dragInputRow = elt;
      }
      if (elt && $(elt).hasClass("slick-viewport")) {
        _gridViewport = elt;
        break;
      }
    }
    if (_dragInputRow) {
      _dragInputRowClone = _dragInputRow.cloneNode(true);
      $(_dragInputRow).addClass('drag-source');
      $(_dragInputRowClone).addClass('drag-preview');
      $(_dragInputRowClone).find('.slick-row-resizer').remove();
      $(_gridViewport).append(_dragInputRowClone);
    }

    var selection = !_dragInputRow && activeCell && [activeCell.row];

    if (selection) {
      notifyContextOfSelectionChange(selection);
    }

    e.stopImmediatePropagation();
  }

  function nextSiblingRow(rowElt) {
    if (!rowElt) return rowElt;
    var $elt = $(rowElt);
    var $next = $elt.next();
    if ($next && $next.hasClass('drag-preview'))
      $next = $next.next();
    if ($next && $next.hasClass('dg-collapsed-row'))
      return null;
    return $next && $next[0] || null;
  }

  function prevSiblingRow(rowElt) {
    if (!rowElt) return rowElt;
    var $elt = $(rowElt);
    var $prev = $elt.prev();
    if ($prev && $prev.hasClass('drag-preview'))
      $prev = $prev.prev();
    if ($prev && $prev.hasClass('dg-collapsed-row'))
      return null;
    return $prev && $prev[0] || null;
  }

  function rowTargetsFromPoint(e) {
    var targets = [], prevSibling, nextSibling;
    var elts = document.elementsFromPoint(_dragStartClientX, e.clientY);
    for (var ix = 0; ix < elts.length; ++ix) {
      var elt = elts[ix];
      if ($(elt).hasClass('slick-row') && !$(elt).hasClass('drag-preview')) {
        var bounds = elt.getBoundingClientRect();
        if (!$(elt).hasClass('dg-collapsed-row')) {
          if (e.clientY > (bounds.top + bounds.bottom) / 2)
            nextSibling = nextSiblingRow(elt);
          else
            prevSibling = prevSiblingRow(elt);
        }
        if (prevSibling !== undefined)
          targets.push(prevSibling);
        targets.push(elt);
        if (nextSibling !== undefined)
          targets.push(nextSibling);
        if ((prevSibling === undefined) && (nextSibling === undefined))
          targets.push(elt);
        break;
      }
    }
    return targets;
}

  function handleDrag(e) {
    // Compute the active cell from the pixel offset from the starting position
    // Cannot use the target to compute the offset since, on mobile, the target
    // never varies from the original target of the drag start.
    var yOffset = _dragStartY + (e.clientY - _dragStartClientY);
    var activeCell = _grid.getCellFromPoint(0, yOffset);
    var selection;
    var ix, start, end;

    if (activeCell && (_dragStartRow != null) && !_dragInputRow) {
      selection = [];
      start = Math.min(_dragStartRow, activeCell.row);
      end = Math.max(_dragStartRow, activeCell.row);
      for (ix = start; ix <= end; ix += 1) {
        selection.push(ix);
      }
      notifyContextOfSelectionChange(selection);
    }

    else if (_dragInputRow) {
      var deltaY = e.clientY - _dragStartClientY;
      var rowY = parseInt(_dragInputRow.style.top, 10);
      $(_dragInputRowClone).css('top', Math.max(-1, rowY + deltaY) + "px");

      var targets = rowTargetsFromPoint(e);
      if (_dragInputRowTargets) {
        for (ix = 0; ix < _dragInputRowTargets.length; ++ix) {
          $(_dragInputRowTargets[ix]).removeClass('drag-hilite');
        }
      }
      for (ix = 0; ix < targets.length; ++ix) {
        $(targets[ix]).addClass('drag-hilite');
      }
      _dragInputRowTargets = targets;
    }

    e.stopImmediatePropagation();
  }

  function handleDragEnd(e) {
    e.stopImmediatePropagation();

    var dataContext = _caseTableAdapter.get('dataContext');
    var targets = _dragInputRow && rowTargetsFromPoint(e);
    var afterRow = targets && (targets.length >= 1) && targets[0];
    var afterRowIsCollapsed = afterRow && $(afterRow).hasClass('dg-collapsed-row');
    var afterCaseID = afterRow && $(afterRow).data('row-id');
    var afterCase = dataContext && afterCaseID && dataContext.getCaseByID(afterCaseID);
    var afterCaseIsProtoCase = afterRow && $(afterRow).hasClass('dg-proto-row');
    var afterParentCase = afterRowIsCollapsed
                            ? afterCase
                            : afterCase && afterCase.get('parent');
    var afterParentCaseID = afterParentCase && afterParentCase.get('id');
    var beforeRow = targets && (targets.length >= 2) && targets[1];
    var beforeRowIsCollapsed = beforeRow && $(beforeRow).hasClass('dg-collapsed-row');
    var beforeCaseID = beforeRow && $(beforeRow).data('row-id');
    var beforeCase = dataContext && beforeCaseID && dataContext.getCaseByID(beforeCaseID);
    var beforeCaseIsProtoCase = beforeRow && $(beforeRow).hasClass('dg-proto-row');
    var beforeParentCase = beforeRowIsCollapsed
                            ? beforeCase
                            : beforeCase && beforeCase.get('parent');
    var beforeParentCaseID = beforeParentCase && beforeParentCase.get('id');
    var parentCaseID = afterParentCaseID || beforeParentCaseID;
    var hasSameParentCase = afterCase && beforeCase && (afterParentCaseID === beforeParentCaseID);
    var hasNoParentCase = (afterCase == null) && (beforeCase == null);
    var protoCase = _grid.getData().getProtoCase();
    if (protoCase && !afterCaseIsProtoCase && !beforeCaseIsProtoCase) {
      protoCase.set('beforeCaseID',
                    !afterRow || hasNoParentCase || hasSameParentCase
                      ? beforeCaseID || null : null);
      protoCase.set('parentCaseID', parentCaseID || null);
      SC.run(function() {
        if (afterRowIsCollapsed)
          _grid.getData().expandGroup(afterCaseID);
        _caseTableAdapter.refresh();
      });
    }

    _inDrag = false;
    _dragStartRow = undefined;
    _dragStartY = null;
    _dragStartClientX = null;
    _dragStartClientY = null;
    if (_dragInputRow) {
      $(_dragInputRow).removeClass('drag-source');
      _dragInputRow = null;
    }
    if (_dragInputRowClone) {
      $(_dragInputRowClone).remove();
      _dragInputRowClone = null;
    }
    if (_dragInputRowTargets) {
      for (var ix = 0; ix < _dragInputRowTargets.length; ++ix) {
        $(_dragInputRowTargets[ix]).removeClass('drag-hilite');
      }
      _dragInputRowTargets = null;
    }
    _gridViewport = null;
    _caseTableAdapter.set('isModelDragging', false);
}

  function handleClick(e) {
    var cell = _grid.getCellFromEvent(e);
    if (!cell) return false;
    if (!_grid.canCellBeActive(cell.row, cell.cell) &&
          !_caseTableAdapter.isCellRowSelectable(cell.row, cell.cell)) {
      return false;
    }

    var selection = rangesToRows(_ranges);
    var idx = $.inArray(cell.row, selection);

    if (!e.ctrlKey && !e.shiftKey && !e.metaKey) {
      //   selection = [cell.row];
      //   notifyContextOfSelectionChange(selection);
      return false;
    }
    else if (_grid.getOptions().multiSelect) {
      if (idx === -1 && (e.ctrlKey || e.metaKey)) {
        selection.push(cell.row);
        _grid.setActiveCell(cell.row, cell.cell);
      } else if (idx !== -1 && (e.ctrlKey || e.metaKey)) {
        selection = $.grep(selection, function (o, i) {
          return (o !== cell.row);
        });
        _grid.setActiveCell(cell.row, cell.cell);
      } else if (selection.length && e.shiftKey) {
        selection.sort(function (a, b) {return a-b;});
        var first = selection[0];
        var last = selection[selection.length - 1];
        var from = Math.min(cell.row, first);
        var to = Math.max(cell.row, last);
        selection = [];
        for (var i = from; i <= to; i++) {
          selection.push(i);
        }
        _grid.setActiveCell(cell.row, cell.cell);
      }
    }

    notifyContextOfSelectionChange(selection);
    e.stopImmediatePropagation();

    return true;
  }

  $.extend(this, {
    "getSelectedRows": getSelectedRows,
    "setSelectedRows": setSelectedRows,

    "getSelectedRanges": getSelectedRanges,
    "setSelectedRanges": setSelectedRanges,

    "init": init,
    "destroy": destroy,

    "onSelectedRangesChanged": new Slick.Event()
  });
};
