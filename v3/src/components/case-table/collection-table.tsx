import { VisuallyHidden } from "@chakra-ui/react"
import { clsx } from "clsx"
import { comparer } from "mobx"
import { observer } from "mobx-react-lite"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import DataGrid, { CellKeyboardEvent, DataGridHandle } from "react-data-grid"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { useTileDroppable } from "../../hooks/use-drag-drop"
import { useTileSelectionContext } from "../../hooks/use-tile-selection-context"
import { registerCanAutoScrollCallback } from "../../lib/dnd-kit/dnd-can-auto-scroll"
import { logStringifiedObjectMessage } from "../../lib/log-message"
import { IAttribute } from "../../models/data/attribute"
import { IDataSet } from "../../models/data/data-set"
import { createAttributesNotification } from "../../models/data/data-set-notifications"
import { getTileModel } from "../../models/tiles/tile-model"
import { resizeColumnNotification } from "./case-table-notifications"
import {
  collectionCaseIdFromIndex, collectionCaseIndexFromId, isAnyChildSelected, selectCases, setSelectedCases
} from "../../models/data/data-set-utils"
import { uiState } from "../../models/ui-state"
import { uniqueName } from "../../utilities/js-utils"
import { mstReaction } from "../../utilities/mst-reaction"
import { preventCollectionReorg } from "../../utilities/plugin-utils"
import { t } from "../../utilities/translation/translate"
import { If } from "../common/if"
import { kIndexColumnKey } from "../case-tile-common/case-tile-types"
import { CollectionTitle } from "../case-tile-common/collection-title"
import { kCollectionTableBodyDropZoneBaseId } from "./case-table-drag-drop"
import {
  kDefaultRowHeight, kIndexColumnWidth, kInputRowKey, OnScrollRowsIntoViewFn, OnTableScrollFn,
  TCellKeyDownArgs, TRenderers, TRow
} from "./case-table-types"
import { CollectionTableSpacer } from "./collection-table-spacer"
import { customRenderRow } from "./custom-row"
import { RowDragOverlay } from "./row-drag-overlay"
import { useCaseTableModel } from "./use-case-table-model"
import { useCollectionTableModel } from "./use-collection-table-model"
import { useColumns } from "./use-columns"
import { useIndexColumn } from "./use-index-column"
import { useMarqueeSelection } from "./use-marquee-selection"
import { useRows } from "./use-rows"
import { useSelectedCell } from "./use-selected-cell"
import { useSelectedRows } from "./use-selected-rows"

import "react-data-grid/lib/styles.css"
import styles from "./case-table-shared.scss"

type OnNewCollectionDropFn = (dataSet: IDataSet, attrId: string, beforeCollectionId: string) => void

// custom renderers for use with RDG
const renderers: TRenderers = { renderRow: customRenderRow }

const rowKey = (row: TRow) => row.__id__

interface IProps {
  collectionIndex: number
  onMount: (collectionId: string) => void
  onNewCollectionDrop: OnNewCollectionDropFn
  onTableScroll: OnTableScrollFn
  onScrollClosestRowIntoView: OnScrollRowsIntoViewFn
  onScrollRowRangeIntoView: OnScrollRowsIntoViewFn
  onWhiteSpaceClick: () => void
}
export const CollectionTable = observer(function CollectionTable(props: IProps) {
  const {
    collectionIndex, onMount, onNewCollectionDrop, onScrollClosestRowIntoView, onScrollRowRangeIntoView,
    onTableScroll, onWhiteSpaceClick
  } = props
  const data = useDataSetContext()
  const collectionId = useCollectionContext()
  const collection = data?.getCollection(collectionId)
  const caseTableModel = useCaseTableModel()
  const collectionTableModel = useCollectionTableModel()
  const gridRef = useRef<DataGridHandle>(null)
  const { selectedRows, setSelectedRows, handleCellClick } =
    useSelectedRows({ gridRef, onScrollClosestRowIntoView, onScrollRowRangeIntoView })
  const { isTileSelected } = useTileSelectionContext()
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

  // Mark non-editable cells with aria-readonly (RDG doesn't support this natively)
  useEffect(() => {
    gridRef.current?.element?.querySelectorAll('[role="gridcell"]').forEach(cell => {
      if (cell.classList.contains("readonly-cell")) {
        cell.setAttribute("aria-readonly", "true")
      } else {
        cell.removeAttribute("aria-readonly")
      }
    })
  })

  // columns
  const indexColumn = useIndexColumn()
  const columns = useColumns({ data, indexColumn: caseTableModel?.isIndexHidden ? undefined : indexColumn })

  // RDG assigns tabindex="0" to the first header cell for Tab entry into the grid.
  // Since that cell is the inert index column header, the grid has no focusable entry point.
  // Make the grid element a Tab entry point that uses RDG's selectCell API to focus the first
  // attribute header (rowIdx -1). This doesn't interfere with RDG's getCellToScroll (which
  // queries cells within rows, not the grid element itself).
  //
  // The first attribute column is at idx 1 when the index column is shown, or idx 0 when it
  // is hidden (see use-columns.tsx — the index column is conditionally prepended).
  //
  // The grid's own tab stop is only active while focus is outside the grid. Once focus is
  // inside, we disable it so Shift+Tab from within the grid skips over the grid element —
  // otherwise the grid becomes a phantom tab stop between the first attribute header and
  // the add-attribute "+" button.
  const isIndexHidden = caseTableModel?.isIndexHidden ?? false
  useEffect(function makeGridTabbable() {
    const grid = gridRef.current?.element
    if (!grid) return

    grid.tabIndex = 0
    // Two-phase cascade: Tab on grid fires focusin (target=grid) → selectCell → RDG focuses
    // the attribute header cell → second focusin (target=descendant) sets grid.tabIndex = -1.
    const handleFocusIn = (e: FocusEvent) => {
      if (e.target === grid) {
        // Tab entered on the grid element itself → forward to the first attribute header, but
        // only when one exists (an index-only grid with all attributes hidden has no attribute
        // column, so firstAttrIdx would be out of range).
        const firstAttrIdx = isIndexHidden ? 0 : 1
        if (firstAttrIdx < columns.length) {
          gridRef.current?.selectCell({ idx: firstAttrIdx, rowIdx: -1 })
        }
      } else {
        // A descendant of the grid received focus → disable the grid's tab stop so
        // Shift+Tab from within skips the grid element.
        grid.tabIndex = -1
      }
    }
    const handleFocusOut = (e: FocusEvent) => {
      // Focus has left the grid entirely → restore the grid's tab stop for the next entry.
      const to = e.relatedTarget
      if (!(to instanceof Node) || !grid.contains(to)) {
        grid.tabIndex = 0
      }
    }
    grid.addEventListener("focusin", handleFocusIn)
    grid.addEventListener("focusout", handleFocusOut)

    return () => {
      grid.removeEventListener("focusin", handleFocusIn)
      grid.removeEventListener("focusout", handleFocusOut)
    }
  }, [gridRef.current?.element, isIndexHidden, columns.length])

  // rows
  const { handleRowsChange } = useRows(gridRef.current?.element ?? null)

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
          notify: () => resizeColumnNotification(caseTableModel ? getTileModel(caseTableModel) : undefined),
          log: {message: "Resize one case table column", args:{}, category: "table"},
          undoStringKey: "DG.Undo.caseTable.resizeOneColumn",
          redoStringKey: "DG.Redo.caseTable.resizeOneColumn"
        })
      }
    }, [columns, columnWidths, caseTableModel])

  const handleAddNewAttribute = useCallback(() => {
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
      log: logStringifiedObjectMessage("attributeCreate: %@",
              {name: "newAttr", collection: data?.getCollection(collectionId)?.name, formula: ""}, "data")
    })
  }, [collectionId, data])

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

  const {
    handleSelectedCellChange, navigateToNextCell, navigateToNextRow,
    navigateToFirstEditableInRow, navigateToLastEditableInRow,
    navigateToFirstEditableCell, navigateToLastEditableCell
  } = useSelectedCell(gridRef, columns, rows)

  const handleCellKeyDown = useCallback((args: TCellKeyDownArgs, event: CellKeyboardEvent) => {
    // During an active DnDKit drag, suppress RDG's arrow-key cell navigation so DnDKit's
    // document-level sensors handle the keystrokes instead.
    if (active && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventGridDefault()
      return
    }
    // Escape in SELECT mode blurs the focused cell (RDG's default only clears the copied-cell
    // marker). Handle it BEFORE the `rowIdx < 0` guard below: under heavy load (e.g. code-coverage
    // instrumentation on CI) RDG can momentarily report the selected position's rowIdx as negative
    // right after a click while the cell is already focused. The guard would then skip the blur
    // entirely, leaving focus trapped on the cell.
    if (args.mode === "SELECT" && event.key === "Escape") {
      // Only blur when focus is actually inside the grid: keys from portaled UI (e.g. the
      // index-column menu) can bubble into this handler, and we must not steal their focus
      // (mirrors the EDIT-mode portal guard below).
      const activeElement = document.activeElement
      if (activeElement instanceof HTMLElement && event.currentTarget.contains(activeElement)) {
        event.preventGridDefault()
        activeElement.blur()
      }
      return
    }
    if (args.rowIdx < 0) return

    if (args.mode === "EDIT") {
      if (["Enter", "Tab", "ArrowUp", "ArrowDown"].includes(event.key)) {
        // Color-picker popover renders in a portal outside the grid but React still
        // bubbles its keys through this handler. Let the popover handle them.
        const activeElement = document.activeElement
        if (activeElement && !event.currentTarget.contains(activeElement)) return
        // preventDefault must run BEFORE args.onClose — that call's flushSync unmounts
        // the editor input, and Chrome then applies the Tab default (focus to the next
        // tabbable, e.g. the tile's resize widget) before our deferred nav can run.
        event.preventGridDefault()
        if (event.key === "Tab") event.preventDefault()
        // shouldFocusCell=false: prevent RDG's post-commit cell-wrapper focus from
        // racing with the editor input's autofocus on the navigation target.
        args.onClose(true, false)
        // defer:true: the rows update from the commit propagates asynchronously
        // (debounced syncRowsToRdg in use-rows.ts), so wait for it.
        if (["Enter", "ArrowUp", "ArrowDown"].includes(event.key)) {
          const reverse = event.shiftKey || event.key === "ArrowUp"
          navigateToNextRow(reverse, { defer: true })
        } else if (event.key === "Tab") {
          navigateToNextCell(event.shiftKey, { defer: true })
        }
      }
      // Fall through to the ArrowUp/Down case-selection block below (intentional).
    } else if (args.mode === "SELECT") {
      // Open the index column menu programmatically — RDG keeps focus on the cell div,
      // not the MenuButton inside it.
      if (args.column.key === kIndexColumnKey && ["Enter", " "].includes(event.key)) {
        const grid = event.currentTarget as HTMLElement
        const cell = grid.querySelector<HTMLElement>(`.rowId-${args.row.__id__}`)
        const menuButton = cell?.querySelector<HTMLElement>('button[data-testid="codap-index-content-button"]')
        if (menuButton) {
          event.preventGridDefault()
          menuButton.click()
          return
        }
      } else if (event.key === "Tab") {
        // RDG's default lets focus escape the grid; route through our nav.
        event.preventGridDefault()
        event.preventDefault()
        navigateToNextCell(event.shiftKey, { enterEdit: false })
        return
      } else if (event.key === "PageUp" || event.key === "PageDown") {
        // Per spec, scroll only — don't change the selected cell. RDG's default moves
        // selection. Uses CollectionTableModel methods (work with RDG's virtualization).
        event.preventGridDefault()
        event.preventDefault()
        if (collectionTableModel && rows) {
          const firstVisible = collectionTableModel.firstVisibleRowIndex
          const lastVisible = collectionTableModel.lastVisibleRowIndex
          if (event.key === "PageDown") {
            collectionTableModel.scrollRowToTop(Math.min(rows.length - 1, lastVisible))
          } else {
            collectionTableModel.scrollRowToBottom(Math.max(0, firstVisible))
          }
        }
        return
      } else if (event.key === "Home" || event.key === "End") {
        // RDG's defaults land on the (non-editable) index column for Home and the
        // absolute last column for End. With Cmd/Ctrl, extend to the first/last cell
        // of the collection and follow the cell focus with the case selection.
        event.preventGridDefault()
        event.preventDefault()
        const extendToCollection = event.metaKey || event.ctrlKey
        const modelRows = collectionTableModel?.rows
        if (event.key === "Home") {
          if (extendToCollection) {
            navigateToFirstEditableCell()
            const firstRowId = modelRows?.[0]?.__id__
            if (firstRowId && data) setSelectedCases([firstRowId], data)
          } else {
            navigateToFirstEditableInRow(args.rowIdx)
          }
        } else {
          if (extendToCollection) {
            navigateToLastEditableCell()
            const lastRowId = modelRows?.[modelRows.length - 1]?.__id__
            if (lastRowId && data) setSelectedCases([lastRowId], data)
          } else {
            navigateToLastEditableInRow(args.rowIdx)
          }
        }
        return
      }
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
            // The onAnyAction selection reaction (useSelectedRows) cascades the scroll to
            // descendant collections for this single setSelectedCases selection, so we don't
            // repeat that here. See CODAP-1234.
            setSelectedCases([nextCaseId], data)
          }
        }
      }
    }
  }, [active, collectionId, collectionTableModel, data,
      navigateToNextCell, navigateToNextRow,
      navigateToFirstEditableInRow, navigateToLastEditableInRow,
      navigateToFirstEditableCell, navigateToLastEditableCell,
      rows])

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
      onWhiteSpaceClick()
      initialPointerDownPosition.current = { x: 0, y: 0 }
    }
  }

  const {
    handlePointerDown: handleMarqueePointerDown, handlePointerMove, handlePointerUp
  } = useMarqueeSelection({ gridRef, collectionTableModel, data, collectionId, rows })

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    initialPointerDownPosition.current = { x: event.clientX, y: event.clientY }
    handleMarqueePointerDown(event)
  }

  const rowClass = useCallback((row: TRow) => {
    const caseIndex = collectionCaseIndexFromId(row.__id__, data, collectionId)
    const prevCaseIndex = caseIndex != null ? caseIndex - 1 : undefined
    const prevCaseId = prevCaseIndex != null ? collection?.caseIds[prevCaseIndex] : undefined
    const nextCaseIndex = caseIndex != null ? caseIndex + 1 : undefined
    const nextCaseId = nextCaseIndex != null ? collection?.caseIds[nextCaseIndex] : undefined
    const prevCaseHasSelectedChild = !!data && !!prevCaseId && isAnyChildSelected(data, prevCaseId)
    const hasSelectedChild = !!data && isAnyChildSelected(data, row.__id__)
    const nextCaseHasSelectedChild = !!data && !!nextCaseId && isAnyChildSelected(data, nextCaseId)
    const parentCaseChildren = data?.getParentCaseInfo(row.__id__)?.childCaseIds ?? []
    const isLastChild = parentCaseChildren[parentCaseChildren.length - 1] === row.__id__

    return clsx({
      "highlight-border-top": hasSelectedChild && !prevCaseHasSelectedChild,
      "highlight-border-bottom": hasSelectedChild && !nextCaseHasSelectedChild,
      "last-child-case": isLastChild
    })
  }, [collection?.caseIds, collectionId, data])

  if (!data || !rows) return null

  const dragId = String(active?.id)
  const showDragOverlay = dragId.includes(kInputRowKey) && dragId.includes(collectionId)
  const gridAriaLabel = t("V3.CaseTable.gridAriaLabel", { vars: [collection?.name ?? ""] })
  const gridInstructionsId = `sr-grid-instructions-${collectionId}`
  return (
    <div className={clsx("collection-table", `collection-${collectionId}`, { "no-attributes": columns.length === 0 })}>
      <CollectionTableSpacer gridElt={gridRef.current?.element}
        onWhiteSpaceClick={onWhiteSpaceClick} onDrop={handleNewCollectionDrop} />
      <div className="collection-table-and-title" ref={setNodeRef} onClick={handleClick}
            onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
        <CollectionTitle onAddNewAttribute={handleAddNewAttribute} showCount={true} collectionIndex={collectionIndex}/>
        {/* A collection with all attributes hidden still renders its grid showing just the index
            column (matching V2), so the parent/child relationship lines have cells to connect to.
            Guard against the rare case of no columns at all (e.g. index column also hidden). */}
        <If condition={columns.length > 0}>
          <VisuallyHidden id={gridInstructionsId}>
            {t("V3.CaseTable.gridEditInstructions")}
          </VisuallyHidden>
          <VisuallyHidden id={`sr-index-menu-instructions-${collectionId}`}>
            {t("V3.CaseTable.indexMenuInstructions")}
          </VisuallyHidden>
          <DataGrid ref={gridRef} className="rdg-light" data-testid="collection-table-grid" renderers={renderers}
            columns={columns} rows={rows} headerRowHeight={+styles.headerRowHeight} rowKeyGetter={rowKey}
            rowHeight={rowHeight} selectedRows={selectedRows} onSelectedRowsChange={setSelectedRows}
            columnWidths={columnWidths} onColumnResize={handleColumnResize} onCellClick={handleCellClick}
            onCellKeyDown={handleCellKeyDown} onRowsChange={handleRowsChange} onScroll={handleGridScroll}
            onSelectedCellChange={handleSelectedCellChange} rowClass={rowClass}
            aria-label={gridAriaLabel} aria-describedby={gridInstructionsId}/>
        </If>
        {showDragOverlay && <RowDragOverlay rows={rows} width={kIndexColumnWidth}/>}
      </div>
    </div>
  )
})
