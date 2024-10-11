import { comparer } from "mobx"
import { observer } from "mobx-react-lite"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import DataGrid, { CellKeyboardEvent, DataGridHandle } from "react-data-grid"
import { kCollectionTableBodyDropZoneBaseId } from "./case-table-drag-drop"
import {
  kInputRowKey, OnScrollClosestRowIntoViewFn, OnTableScrollFn, TCellKeyDownArgs, TRenderers, TRow
} from "./case-table-types"
import { CollectionTableSpacer } from "./collection-table-spacer"
import { CollectionTitle } from "../case-tile-common/collection-title"
import { customRenderRow } from "./custom-row"
import { useColumns } from "./use-columns"
import { useIndexColumn } from "./use-index-column"
import { useRows } from "./use-rows"
import { useSelectedCell } from "./use-selected-cell"
import { useSelectedRows } from "./use-selected-rows"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { useTileDroppable } from "../../hooks/use-drag-drop"
import { useForceUpdate } from "../../hooks/use-force-update"
import { useTileModelContext } from "../../hooks/use-tile-model-context"
import { useVisibleAttributes } from "../../hooks/use-visible-attributes"
import { registerCanAutoScrollCallback } from "../../lib/dnd-kit/dnd-can-auto-scroll"
import { logStringifiedObjectMessage } from "../../lib/log-message"
import { IAttribute } from "../../models/data/attribute"
import { IDataSet } from "../../models/data/data-set"
import { createAttributesNotification } from "../../models/data/data-set-notifications"
import { uiState } from "../../models/ui-state"
import { uniqueName } from "../../utilities/js-utils"
import { mstReaction } from "../../utilities/mst-reaction"
import { preventCollectionReorg } from "../../utilities/plugin-utils"
import { t } from "../../utilities/translation/translate"
import { useCaseTableModel } from "./use-case-table-model"
import { useCollectionTableModel } from "./use-collection-table-model"
import { useWhiteSpaceClick } from "./use-white-space-click"
import { collectionCaseIdFromIndex, collectionCaseIndexFromId, selectCases, setOrExtendSelection, setSelectedCases }
  from "../../models/data/data-set-utils"
  import { kDefaultRowHeight } from "./collection-table-model"

import "react-data-grid/lib/styles.css"
import styles from "./case-table-shared.scss"

type OnNewCollectionDropFn = (dataSet: IDataSet, attrId: string, beforeCollectionId: string) => void

// custom renderers for use with RDG
const renderers: TRenderers = { renderRow: customRenderRow }

interface IProps {
  onMount: (collectionId: string) => void
  onNewCollectionDrop: OnNewCollectionDropFn
  onTableScroll: OnTableScrollFn
  onScrollClosestRowIntoView: OnScrollClosestRowIntoViewFn
}
export const CollectionTable = observer(function CollectionTable(props: IProps) {
  const { onMount, onNewCollectionDrop, onTableScroll, onScrollClosestRowIntoView } = props
  const data = useDataSetContext()
  const collectionId = useCollectionContext()
  const caseTableModel = useCaseTableModel()
  const collectionTableModel = useCollectionTableModel()
  const gridRef = useRef<DataGridHandle>(null)
  const selectedFillColor = gridRef.current?.element &&
                              getComputedStyle(gridRef.current.element)
                                .getPropertyValue("--rdg-row-selected-background-color") || undefined
  const visibleAttributes = useVisibleAttributes(collectionId)
  const { selectedRows, setSelectedRows, handleCellClick } = useSelectedRows({ gridRef, onScrollClosestRowIntoView })
  const { handleWhiteSpaceClick } = useWhiteSpaceClick({ gridRef })
  const forceUpdate = useForceUpdate()
  const { isTileSelected } = useTileModelContext()
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStartRowIdx, setSelectionStartRowIdx] = useState<number | null>(null)
  const initialPointerDownPosition = useRef({ x: 0, y: 0 })
  const kPointerMovementThreshold = 3

  useEffect(function setGridElement() {
    const element = gridRef.current?.element
    if (element && collectionTableModel) {
      collectionTableModel.setElement(element)
      onMount(collectionId)
    }
  }, [collectionId, collectionTableModel, gridRef.current?.element, onMount])

  useEffect(() => {
    return registerCanAutoScrollCallback((element) => {
      // prevent auto-scroll on grid since there's nothing droppable in the grid
      return element !== gridRef.current?.element
    })
  }, [])

  // columns
  const indexColumn = useIndexColumn()
  const columns = useColumns({ data, indexColumn })

  // rows
  const { handleRowsChange } = useRows()
  const rowKey = (row: TRow) => row.__id__

  const { setNodeRef } = useTileDroppable(`${kCollectionTableBodyDropZoneBaseId}-${collectionId}`)

  const handleNewCollectionDrop = useCallback((dataSet: IDataSet, attrId: string) => {
    const attr = dataSet.attrFromID(attrId)
    attr && onNewCollectionDrop(dataSet, attrId, collectionId)
  }, [collectionId, onNewCollectionDrop])

  const handleGridScroll = useCallback(function handleGridScroll(event: React.UIEvent<HTMLDivElement, UIEvent>) {
    const gridElt = gridRef.current?.element
    if (gridElt != null) {
      collectionTableModel?.syncScrollTopFromEvent(event)
      onTableScroll(event, collectionId, gridElt)
    }
  }, [collectionId, collectionTableModel, onTableScroll])

  // column widths passed to RDG
  const columnWidths = useRef<Map<string, number>>(new Map())

  // respond to column width changes in shared metadata (e.g. undo/redo)
  useEffect(() => {
    return caseTableModel && mstReaction(
      () => {
        const newColumnWidths = new Map<string, number>()
        columns.forEach(column => {
          const width = caseTableModel.columnWidths.get(column.key) ?? column.width
          if (width != null && typeof width === "number") {
            newColumnWidths.set(column.key, width)
          }
        })
        return newColumnWidths
      },
      newColumnWidths => {
        columnWidths.current = newColumnWidths
        forceUpdate()
      },
      { name: "CollectionTable.updateColumnWidths", fireImmediately: true, equals: comparer.structural },
      caseTableModel)
  }, [caseTableModel, columns, forceUpdate])

  // respond to column width changes from RDG
  const handleColumnResize = useCallback(
    function handleColumnResize(idx: number, width: number, isComplete?: boolean) {
      const attrId = columns[idx].key
      columnWidths.current.set(attrId, width)
      if (isComplete) {
        caseTableModel?.applyModelChange(() => {
          caseTableModel?.columnWidths.set(attrId, width)
        }, {
          log: {message: "Resize one case table column", args:{}, category: "table"},
          undoStringKey: "DG.Undo.caseTable.resizeOneColumn",
          redoStringKey: "DG.Redo.caseTable.resizeOneColumn"
        })
      }
    }, [columns, caseTableModel])

  const handleAddNewAttribute = () => {
    let attribute: IAttribute | undefined
    data?.applyModelChange(() => {
      const newAttrName = uniqueName(t("DG.CaseTable.defaultAttrName"),
        (aName: string) => !data.attributes.find(attr => aName === attr.name)
      )
      attribute = data.addAttribute({ name: newAttrName }, { collection: collectionId })
      if (attribute) {
        uiState.setAttrIdToEdit(attribute.id)
      }
    }, {
      notify: () => createAttributesNotification(attribute ? [attribute] : [], data),
      undoStringKey: "DG.Undo.caseTable.createAttribute",
      redoStringKey: "DG.Redo.caseTable.createAttribute",
      log: logStringifiedObjectMessage("Create attribute: %@",
              {name: "newAttr", collection: data?.getCollection(collectionId)?.name, formula: ""}, "data")
    })
  }

  const showInputRow = !preventCollectionReorg(data, collectionId)
  const rows = useMemo(() => {
    if (collectionTableModel?.rows) {
      const _rows = [...collectionTableModel.rows]
      if (showInputRow) {
        const inputRow = { __id__: kInputRowKey }
        if (collectionTableModel.inputRowIndex === -1) {
          _rows.push(inputRow)
        } else {
          _rows.splice(collectionTableModel.inputRowIndex, 0, inputRow)
        }
      }
      return _rows
    }
  }, [collectionTableModel?.rows, collectionTableModel?.inputRowIndex, showInputRow])

  const { handleSelectedCellChange, navigateToNextRow } = useSelectedCell(gridRef, columns, rows)

  function handleCellKeyDown(args: TCellKeyDownArgs, event: CellKeyboardEvent) {
    // By default in RDG, the enter/return key simply enters/exits edit mode without moving the
    // selected cell. In CODAP, the enter/return key should accept the edit _and_ advance to the
    // next row. To achieve this in RDG, we provide this callback, which is called before RDG
    // handles the event internally. If we get an enter/return key while in edit mode, we handle
    // it ourselves and call `preventGridDefault()` to prevent RDG from handling the event itself.
    if (args.mode === "EDIT" && event.key === "Enter") {
      // complete the cell edit
      args.onClose(true)
      // prevent RDG from handling the event
      event.preventGridDefault()
      navigateToNextRow(event.shiftKey)
    }
    if ((event.key === "ArrowDown" || event.key === "ArrowUp")) {
      const caseId = args.row.__id__
      const isCaseSelected = data?.isCaseSelected(caseId)
      const isExtending = event.shiftKey || event.altKey || event.metaKey
      const currentSelectionIdx = collectionCaseIndexFromId(caseId, data, collectionId)

      if (currentSelectionIdx != null) {
        const nextIndex = event.key === "ArrowDown" ? currentSelectionIdx + 1 : currentSelectionIdx - 1
        const nextCaseId = collectionCaseIdFromIndex(nextIndex, data, collectionId)
        if (nextCaseId) {
          const isNextCaseSelected = data?.isCaseSelected(nextCaseId)
          if (isExtending) {
            if (isNextCaseSelected) {
              selectCases([caseId], data, !isCaseSelected)
            } else {
              selectCases([nextCaseId], data)
            }
          } else {
            setSelectedCases([nextCaseId], data)
          }
        }
      }
    }
  }

  const handleClick = (event: React.PointerEvent<HTMLDivElement>) => {
    // See if mouse has moved beyond kMouseMovementThreshold since initial mousedown
    // If it has, then it is not a click
    const deltaX = event.clientX - initialPointerDownPosition.current.x
    const deltaY = event.clientY - initialPointerDownPosition.current.y
    const distanceMoved = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const pointerHasMoved = distanceMoved > kPointerMovementThreshold
    if (pointerHasMoved) {
      initialPointerDownPosition.current = { x: 0, y: 0 }
      return
    }

    // the grid element is the target when clicking outside the cells (otherwise, the cell is the target)
    if (isTileSelected() && event.target === gridRef.current?.element) {
      handleWhiteSpaceClick()
      initialPointerDownPosition.current = { x: 0, y: 0 }
    }
  }

const scrollInterval = useRef<NodeJS.Timeout | null>(null)
const mouseY = useRef<number>(0)

const startAutoScroll = useCallback((clientY: number) => {
  const grid = gridRef.current?.element
  if (!grid) return

  const scrollSpeed = 50

  scrollInterval.current = setInterval(() => {
    const { top, bottom } = grid.getBoundingClientRect()
    let scrolledToRowIdx = null

    if (mouseY.current < top + 35) {
      grid.scrollTop -= scrollSpeed
      const scrolledTop = grid.scrollTop
      scrolledToRowIdx = Math.floor(scrolledTop / kDefaultRowHeight)
    } else if (mouseY.current > bottom - 20) {
      grid.scrollTop += scrollSpeed
      const scrolledTop = grid.scrollTop + grid.clientHeight - 1
      scrolledToRowIdx = Math.floor(scrolledTop / kDefaultRowHeight)

    }
    if (scrolledToRowIdx != null && selectionStartRowIdx!= null && scrolledToRowIdx >= 0 &&
          (rows?.length && scrolledToRowIdx < rows?.length)) {
      const newSelectedRows = []
      const startIdx = Math.min(selectionStartRowIdx, scrolledToRowIdx)
      const endIdx = Math.max(selectionStartRowIdx, scrolledToRowIdx)
      for (let i = startIdx; i <= endIdx; i++) {
        const rowId = collectionCaseIdFromIndex(i, data, collectionId)
        if (rowId) {
          newSelectedRows.push(rowId)
        }
      }
      setOrExtendSelection(newSelectedRows, data)
    }
  }, 25)
}, [collectionId, data, rows?.length, selectionStartRowIdx])

const stopAutoScroll = useCallback(() => {
  if (scrollInterval.current) {
    clearInterval(scrollInterval.current)
    scrollInterval.current = null
  }
}, [])

  // Helper function to get the row index from a mouse event
  const getRowIndexFromEvent = useCallback((event: React.PointerEvent) => {
    const target = event.target as HTMLElement
    const closestDataCell = target.closest('.codap-data-cell')
    const caseId = closestDataCell?.className.split(" ").find(c => c.startsWith("rowId-"))?.split("-")[1]
    const rowIdx = caseId ? collectionCaseIndexFromId(caseId, data, collectionId) : null
    return rowIdx
  }, [collectionId, data])

   const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    initialPointerDownPosition.current = { x: event.clientX, y: event.clientY }
    const startRowIdx = getRowIndexFromEvent(event)
    if (startRowIdx != null) {
      setSelectionStartRowIdx(startRowIdx)
      setIsSelecting(true)
      startAutoScroll(event.clientY)
      mouseY.current = event.clientY
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isSelecting && selectionStartRowIdx !== null) {
      const currentRowIdx = getRowIndexFromEvent(event as React.PointerEvent)
      if (currentRowIdx != null) {
        const newSelectedRows = []
        const start = Math.min(selectionStartRowIdx, currentRowIdx)
        const end = Math.max(selectionStartRowIdx, currentRowIdx)
        for (let i = start; i <= end; i++) {
          newSelectedRows.push(i)
        }
        const selectedCaseIds = newSelectedRows
                                  .map(idx => collectionCaseIdFromIndex(idx, data, collectionId))
                                  .filter((id): id is string => id !== undefined)
        setOrExtendSelection(selectedCaseIds, data)
      }
      mouseY.current = event.clientY
      const grid = gridRef.current?.element
      if (grid) {
        const { top, bottom } = grid.getBoundingClientRect()
        if (mouseY.current < top + 50 || mouseY.current > bottom - 20) {
          if (!scrollInterval.current) {
            startAutoScroll(mouseY.current)
          }
        } else {
          stopAutoScroll()
        }
      }
    }
  }

  const handlePointerUp = useCallback((event: PointerEvent | React.PointerEvent<HTMLDivElement>) => {
    setIsSelecting(false)
    setSelectionStartRowIdx(null)
    stopAutoScroll()
  }, [stopAutoScroll])

  useEffect(() => {
    return () => {
      stopAutoScroll()
    }
  }, [stopAutoScroll])

  if (!data || !rows || !visibleAttributes.length) return null

  return (
    <div className={`collection-table collection-${collectionId}`}>
      <CollectionTableSpacer selectedFillColor={selectedFillColor}
        onWhiteSpaceClick={handleWhiteSpaceClick} onDrop={handleNewCollectionDrop} />
      <div className="collection-table-and-title" ref={setNodeRef} onClick={handleClick} onPointerDown={handlePointerDown}
           onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
        <CollectionTitle onAddNewAttribute={handleAddNewAttribute} showCount={true} />
        <DataGrid ref={gridRef} className="rdg-light" data-testid="collection-table-grid" renderers={renderers}
          columns={columns} rows={rows} headerRowHeight={+styles.headerRowHeight} rowKeyGetter={rowKey}
          rowHeight={+styles.bodyRowHeight} selectedRows={selectedRows} onSelectedRowsChange={setSelectedRows}
          columnWidths={columnWidths.current} onColumnResize={handleColumnResize} onCellClick={handleCellClick}
          onCellKeyDown={handleCellKeyDown} onRowsChange={handleRowsChange} onScroll={handleGridScroll}
          onSelectedCellChange={handleSelectedCellChange}/>
      </div>
    </div>
  )
})
