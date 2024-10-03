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
import { collectionCaseIdFromIndex, collectionCaseIndexFromId, selectCases, setSelectedCases }
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
  const { clearCurrentSelection } = useWhiteSpaceClick({ gridRef })
  const forceUpdate = useForceUpdate()
  const { isTileSelected } = useTileModelContext()
  const [isSelectDragging, setIsSelectDragging] = useState(false)
  const [isDragging, setIsDragging] = useState(false) //This prevents the grid click handler from firing on mouse up
  const [initialMousePosition, setInitialMousePosition] = useState({ x: 0, y: 0 })
  const [lastMousePosition, setLastMousePosition] = useState({ x: 0, y: 0 })
  const [initialDirection, setInitialDirection] = useState<'up' | 'down' | null>(null)
  const [initialCaseId, setInitialCaseId] = useState<string | null>(null)
  const [initialCaseIndex, setInitialCaseIndex] = useState<number | null>(null)
  const [lastSelectedCaseIndex, setLastSelectedCaseIndex] = useState<number | null>(null)
  const mouseMoveThreshold = Math.min(kDefaultRowHeight/3, 5)

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

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false)
      return
    }
    // the grid element is the target when clicking outside the cells (otherwise, the cell is the target)
    if (isTileSelected() && event.target === gridRef.current?.element) {
      clearCurrentSelection()
    }
  }

  const getTargetCaseId = (target: HTMLElement) => {
    const closestDataCell = target.closest('.codap-data-cell')
    return closestDataCell?.className.split(" ").find(c => c.startsWith("rowId-"))?.split("-")[1]
  }

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    const isExtending = event.shiftKey || event.altKey || event.metaKey
    setIsSelectDragging(true)
    setInitialMousePosition({ x: event.clientX, y: event.clientY })
    setLastMousePosition({ x: event.clientX, y: event.clientY }) // Initialize last mouse position
    setInitialDirection(null) // Reset the initial direction

    const target = event.target as HTMLDivElement
    const caseId = getTargetCaseId(target)
    if (caseId) {
      setInitialCaseId(caseId)
      const caseIndex = collectionCaseIndexFromId(caseId, data, collectionId)
      if (caseIndex) {
        setLastSelectedCaseIndex(caseIndex)
        setInitialCaseIndex(caseIndex)
        if (isExtending) {
          selectCases([caseId], data, true)
        } else {
          clearCurrentSelection()
          setSelectedCases([caseId], data)
        }
      }
    }
  }

  const calculateSelectRange = (start: number, end: number, isSelecting: boolean) => {
    if (end > start) {
      for (let i = start; i <= end; i++) {
        const idInRange = collectionCaseIdFromIndex(i, data, collectionId)
        if (idInRange && idInRange !== initialCaseId) {
          selectCases([idInRange], data, isSelecting)
        }
      }
    } else {
      for (let i = start; i >= end; i--) {
        const idInRange = collectionCaseIdFromIndex(i, data, collectionId)
        if (idInRange && idInRange !== initialCaseId) {
          selectCases([idInRange], data, isSelecting)
        }
      }
    }
  }

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = event
    const yDiffFromInitial = clientY - initialMousePosition.y
    const yDiffFromLast = clientY - lastMousePosition.y // Difference from the last mouse position
    if (Math.abs(yDiffFromInitial) < mouseMoveThreshold) {
      return
    }

    if (isSelectDragging && initialCaseIndex) {
      setIsDragging(true)
      const target = event.target as HTMLDivElement
      const currentCaseId = getTargetCaseId(target)
      const currentCaseIndex = currentCaseId && collectionCaseIndexFromId(currentCaseId, data, collectionId)
      const currentDirection = yDiffFromLast > mouseMoveThreshold
                                  ? 'down'
                                  : yDiffFromLast < -mouseMoveThreshold ? 'up'
                                                                        : null
      if (!initialDirection && Math.abs(yDiffFromInitial) > mouseMoveThreshold) {
        setInitialDirection(currentDirection)
      }
      if (currentDirection && currentCaseIndex) {
        // Reset the initial direction to allow for reverse selection in the case of a user first
        // moving the mouse up and then down or vice versa past the initially selected case
        if (
          (initialDirection === 'down' && currentDirection === 'up' && clientY < initialMousePosition.y) ||
          (initialDirection === 'up' && currentDirection === 'down' && clientY > initialMousePosition.y)
        ) {
          setInitialDirection(currentDirection)
        }

        if (currentDirection === initialDirection) {
          setLastSelectedCaseIndex(currentCaseIndex)
          const rangeStart = Math.min(initialCaseIndex, currentCaseIndex)
          const rangeEnd = Math.max(initialCaseIndex, currentCaseIndex)
          calculateSelectRange(rangeStart, rangeEnd, true)
        } else {
          if (lastSelectedCaseIndex) {
            if (initialDirection === 'down' && currentDirection === 'up') {
              if (lastSelectedCaseIndex > currentCaseIndex) {
                const rangeStart = Math.max(lastSelectedCaseIndex, currentCaseIndex)
                const rangeEnd = Math.min(lastSelectedCaseIndex, currentCaseIndex)
                calculateSelectRange(rangeStart, rangeEnd, false)
              }
            }
            if (initialDirection === 'up' && currentDirection === 'down') {
              if (lastSelectedCaseIndex < currentCaseIndex) {
                const rangeStart = Math.min(lastSelectedCaseIndex, currentCaseIndex)
                const rangeEnd = Math.max(lastSelectedCaseIndex, currentCaseIndex)
                calculateSelectRange(rangeStart, rangeEnd, false)
              }
            }
            setLastSelectedCaseIndex(currentCaseIndex)
          }
        }
        setLastMousePosition({ x: clientX, y: clientY })
      }
    }
  }

  const handleMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
    setIsSelectDragging(false)
    setLastSelectedCaseIndex(null)
    setInitialCaseIndex(null)
  }

  if (!data || !rows || !visibleAttributes.length) return null

  return (
    <div className={`collection-table collection-${collectionId}`}>
      <CollectionTableSpacer selectedFillColor={selectedFillColor}
        onWhiteSpaceClick={clearCurrentSelection} onDrop={handleNewCollectionDrop} />
      <div className="collection-table-and-title" ref={setNodeRef} onClick={handleClick} onMouseDown={handleMouseDown}
           onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
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
