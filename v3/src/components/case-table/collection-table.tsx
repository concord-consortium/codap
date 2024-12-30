import { comparer } from "mobx"
import { observer } from "mobx-react-lite"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import DataGrid, { CellKeyboardEvent, DataGridHandle } from "react-data-grid"
import { kCollectionTableBodyDropZoneBaseId } from "./case-table-drag-drop"
import {
  kDefaultRowHeight, kIndexColumnWidth, kInputRowKey, OnScrollClosestRowIntoViewFn,
  OnScrollRowRangeIntoViewFn, OnTableScrollFn, TCellKeyDownArgs, TRenderers, TRow
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
import { useTileModelContext } from "../../hooks/use-tile-model-context"
import { useVisibleAttributes } from "../../hooks/use-visible-attributes"
import { registerCanAutoScrollCallback } from "../../lib/dnd-kit/dnd-can-auto-scroll"
import { logStringifiedObjectMessage } from "../../lib/log-message"
import { IAttribute } from "../../models/data/attribute"
import { IDataSet } from "../../models/data/data-set"
import { createAttributesNotification } from "../../models/data/data-set-notifications"
import {
  collectionCaseIdFromIndex, collectionCaseIndexFromId, selectCases, setSelectedCases
} from "../../models/data/data-set-utils"
import { uiState } from "../../models/ui-state"
import { uniqueName } from "../../utilities/js-utils"
import { mstReaction } from "../../utilities/mst-reaction"
import { preventCollectionReorg } from "../../utilities/plugin-utils"
import { t } from "../../utilities/translation/translate"
import { useCaseTableModel } from "./use-case-table-model"
import { useCollectionTableModel } from "./use-collection-table-model"
import { useWhiteSpaceClick } from "./use-white-space-click"
import { RowDragOverlay } from "./row-drag-overlay"

import "react-data-grid/lib/styles.css"
import styles from "./case-table-shared.scss"

type OnNewCollectionDropFn = (dataSet: IDataSet, attrId: string, beforeCollectionId: string) => void

const kScrollMargin = 35

// custom renderers for use with RDG
const renderers: TRenderers = { renderRow: customRenderRow }

interface IProps {
  onMount: (collectionId: string) => void
  onNewCollectionDrop: OnNewCollectionDropFn
  onTableScroll: OnTableScrollFn
  onScrollClosestRowIntoView: OnScrollClosestRowIntoViewFn
  onScrollRowRangeIntoView: OnScrollRowRangeIntoViewFn
}
export const CollectionTable = observer(function CollectionTable(props: IProps) {
  const {
    onMount, onNewCollectionDrop, onScrollClosestRowIntoView, onScrollRowRangeIntoView, onTableScroll
  } = props
  const data = useDataSetContext()
  const collectionId = useCollectionContext()
  const caseTableModel = useCaseTableModel()
  const collectionTableModel = useCollectionTableModel()
  const gridRef = useRef<DataGridHandle>(null)
  const selectedFillColor = gridRef.current?.element &&
                              getComputedStyle(gridRef.current.element)
                                .getPropertyValue("--rdg-row-selected-background-color") || undefined
  const visibleAttributes = useVisibleAttributes(collectionId)
  const { selectedRows, setSelectedRows, handleCellClick } =
    useSelectedRows({ gridRef, onScrollClosestRowIntoView, onScrollRowRangeIntoView })
  const { handleWhiteSpaceClick } = useWhiteSpaceClick({ gridRef })
  const { isTileSelected } = useTileModelContext()
  const collectionRef = useRef<HTMLDivElement | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStartRowIdx, setSelectionStartRowIdx] = useState<number | null>(null)
  const initialPointerDownPosition = useRef({ x: 0, y: 0 })
  const kPointerMovementThreshold = 3
  const rowHeight = collectionTableModel?.rowHeight ?? kDefaultRowHeight
  const {active} = useTileDroppable(`${kCollectionTableBodyDropZoneBaseId}-${collectionId}`)

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
  const { handleRowsChange } = useRows(gridRef.current?.element ?? null)
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
  const [columnWidths, setColumnWidths] = useState(new Map<string, number>())

  // respond to column width changes in shared metadata (e.g. undo/redo)
  useEffect(() => {
    let templateColumnWidths: string[] = []
    return caseTableModel && mstReaction(
      () => {
        let shouldReplaceTemplateColumnWidths = false
        templateColumnWidths = gridRef.current?.element?.style.gridTemplateColumns.split(/\s+/) ?? []
        const newColumnWidths = new Map<string, number>()
        columns.forEach((column, index) => {
          const width = caseTableModel.columnWidths.get(column.key) ?? column.width
          if (width != null && typeof width === "number") {
            newColumnWidths.set(column.key, width)
            // When double-clicking on a column divider, RDG puts `max-content` into the `gridTemplateColumns` property
            // via direct DOM manipulation and it doesn't get replaced when processing the undo, so we do it ourselves.
            if (templateColumnWidths[index] === "max-content") {
              templateColumnWidths[index] = `${width}px`
              shouldReplaceTemplateColumnWidths = true
            }
          }
        })
        return { newColumnWidths, shouldReplaceTemplateColumnWidths }
      },
      ({ newColumnWidths, shouldReplaceTemplateColumnWidths }) => {
        // Replace `gridTemplateColumns` if `max-content` was detected. See comment above.
        if (shouldReplaceTemplateColumnWidths && gridRef.current?.element) {
          gridRef.current.element.style.gridTemplateColumns = templateColumnWidths.join(" ")
        }
        setColumnWidths(newColumnWidths)
      },
      { name: "CollectionTable.updateColumnWidths", fireImmediately: true, equals: comparer.structural },
      caseTableModel)
  }, [caseTableModel, columns])

  // respond to column width changes from RDG
  const handleColumnResize = useCallback(
    function handleColumnResize(idx: number, width: number, isComplete?: boolean) {
      const attrId = columns[idx].key
      const newWidth = Math.ceil(width)
      columnWidths.set(attrId, newWidth)
      if (isComplete) {
        caseTableModel?.applyModelChange(() => {
          caseTableModel?.columnWidths.set(attrId, newWidth)
        }, {
          log: {message: "Resize one case table column", args:{}, category: "table"},
          undoStringKey: "DG.Undo.caseTable.resizeOneColumn",
          redoStringKey: "DG.Redo.caseTable.resizeOneColumn"
        })
      }
    }, [columns, columnWidths, caseTableModel])

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
            let caseIds = [nextCaseId]
            setSelectedCases([nextCaseId], data)
            // loop through collections and scroll newly selected child cases into view
            const collection = data?.getCollection(collectionId)
            for (let childCollection = collection?.child; childCollection; childCollection = childCollection?.child) {
              const childCaseIds: string[] = []
              const childIndices: number[] = []
              caseIds.forEach(id => {
                const caseInfo = data?.caseInfoMap.get(id)
                caseInfo?.childCaseIds?.forEach(childCaseId => {
                  childCaseIds.push(childCaseId)
                  const caseIndex = collectionCaseIndexFromId(childCaseId, data, childCollection.id)
                  if (caseIndex != null) {
                    childIndices.push(caseIndex)
                  }
                })
              })
              // scroll to newly selected child cases (if any)
              if (childIndices.length) {
                onScrollRowRangeIntoView(childCollection.id, childIndices, { disableScrollSync: true })
              }
              // advance to child cases in next collection
              caseIds = childCaseIds
            }
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

  const marqueeSelectCases = useCallback((startIdx: number, endIdx: number) => {
    const newSelectedRows = []
    const start = Math.min(startIdx, endIdx)
    const end = Math.max(startIdx, endIdx)
    for (let i = start; i <= end; i++) {
      newSelectedRows.push(i)
    }
    const selectedCaseIds = newSelectedRows
                              .map(idx => collectionCaseIdFromIndex(idx, data, collectionId))
                              .filter((id): id is string => id !== undefined)
    setSelectedCases(selectedCaseIds, data)
  }, [collectionId, data])

  const startAutoScroll = useCallback((clientY: number) => {
    const grid = gridRef.current?.element
    const rHeight = collectionTableModel?.rowHeight
    if (!grid || !rHeight) return

    const scrollSpeed = 50

    scrollInterval.current = setInterval(() => {
      const { top, bottom } = grid.getBoundingClientRect()
      let scrolledToRowIdx = null

      if (mouseY.current < top + kScrollMargin) {
        grid.scrollTop -= scrollSpeed
        const scrolledTop = grid.scrollTop
        scrolledToRowIdx = Math.floor(scrolledTop / rHeight)
      } else if (mouseY.current > bottom - kScrollMargin) {
        grid.scrollTop += scrollSpeed
        const scrolledBottom = grid.scrollTop + grid.clientHeight - 1
        scrolledToRowIdx = Math.floor(scrolledBottom / rHeight)

      }
      if (scrolledToRowIdx != null && selectionStartRowIdx != null && scrolledToRowIdx >= 0 &&
            (rows?.length && scrolledToRowIdx < rows?.length)) {
        marqueeSelectCases(selectionStartRowIdx, scrolledToRowIdx)
      }
    }, 25)
  }, [collectionTableModel, marqueeSelectCases, rows?.length, selectionStartRowIdx])

  const stopAutoScroll = useCallback(() => {
    if (scrollInterval.current) {
      clearInterval(scrollInterval.current)
      scrollInterval.current = null
    }
  }, [])

  const getCaseIdFromEvent = useCallback((event: React.PointerEvent) => {
    let closestDataCell
    const target = event.target as HTMLElement
    if (target.classList.contains("cell-span")) {
      closestDataCell = target.closest('.codap-data-cell')
    }
    if (target.classList.contains("codap-index-content")) {
      //we are in the index column. we need to go to the parent and find the sibling data cell
      const closestIndexCell = target.closest('.codap-index-cell')
      if (closestIndexCell) {
        closestDataCell = closestIndexCell.nextElementSibling
      }
    }
    const caseId = closestDataCell?.className.split(" ").find(c => c.startsWith("rowId-"))?.split("-")[1]
    return caseId
  }, [])

  // Helper function to get the row index from a mouse event
  const getRowIndexFromEvent = useCallback((event: React.PointerEvent) => {
    const caseId = getCaseIdFromEvent(event)
    const rowIdx = caseId ? collectionCaseIndexFromId(caseId, data, collectionId) : null
    return rowIdx
  }, [collectionId, data, getCaseIdFromEvent])

   const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    initialPointerDownPosition.current = { x: event.clientX, y: event.clientY }
    const startRowIdx = getRowIndexFromEvent(event)
    if (!startRowIdx) {
      console.log("rowIdx is null, rowId is", getCaseIdFromEvent(event))
    }
    else if (startRowIdx != null) {
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
        marqueeSelectCases(selectionStartRowIdx, currentRowIdx)
      }
      mouseY.current = event.clientY
      const grid = gridRef.current?.element
      if (grid) {
        const { top, bottom } = grid.getBoundingClientRect()
        if (mouseY.current < top + kScrollMargin || mouseY.current > bottom - kScrollMargin) {
          if (!scrollInterval.current) {
            startAutoScroll(mouseY.current)
          }
        } else {
          stopAutoScroll()
        }
      }
    }
  }

  const handlePointerLeaveOrUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    setIsSelecting(false)
    setSelectionStartRowIdx(null)
    stopAutoScroll()
  }, [stopAutoScroll])

  const handleSetCollectionAndTitleRef = (elt: HTMLDivElement | null) => {
    if (elt) {
      if (collectionRef.current !== elt) {
        collectionRef.current = elt
      }
      setNodeRef(elt)
    }
  }

  if (!data || !rows || !visibleAttributes.length) return null

  return (
    <div className={`collection-table collection-${collectionId}`} ref={collectionRef}>
      <CollectionTableSpacer selectedFillColor={selectedFillColor}
        onWhiteSpaceClick={handleWhiteSpaceClick} onDrop={handleNewCollectionDrop} />
      <div className="collection-table-and-title" ref={handleSetCollectionAndTitleRef} onClick={handleClick}
            onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerLeaveOrUp}
            onPointerLeave={handlePointerLeaveOrUp}>
        <CollectionTitle onAddNewAttribute={handleAddNewAttribute} showCount={true} />
        <DataGrid ref={gridRef} className="rdg-light" data-testid="collection-table-grid" renderers={renderers}
          columns={columns} rows={rows} headerRowHeight={+styles.headerRowHeight} rowKeyGetter={rowKey}
          rowHeight={rowHeight} selectedRows={selectedRows} onSelectedRowsChange={setSelectedRows}
          columnWidths={columnWidths} onColumnResize={handleColumnResize} onCellClick={handleCellClick}
          onCellKeyDown={handleCellKeyDown} onRowsChange={handleRowsChange} onScroll={handleGridScroll}
          onSelectedCellChange={handleSelectedCellChange}/>
        {(String(active?.id)).includes(kInputRowKey) && <RowDragOverlay rows={rows} width={kIndexColumnWidth}/>}
      </div>
    </div>
  )
})
