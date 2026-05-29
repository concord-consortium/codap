import { reaction } from "mobx"
import { useCallback, useEffect, useRef, useState } from "react"
import { DataGridHandle } from "react-data-grid"
import { useDebouncedCallback } from "use-debounce"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { useTileModelContext } from "../../hooks/use-tile-model-context"
import { uiState } from "../../models/ui-state"
import { blockAPIRequestsWhileEditing } from "../../utilities/plugin-utils"
import { TCellSelectArgs, TColumn, TRow } from "./case-table-types"
import { useCollectionTableModel } from "./use-collection-table-model"

interface ISelectedCell {
  columnId: string
  rowId: string
  rowIdx: number
}

interface IPendingNavigation {
  idx: number
  rowIdx: number
  // When true, the target cell is opened in edit mode (e.g. Tab from EDIT mode).
  // When false, the target cell is only selected (e.g. Tab from SELECT mode, Home/End).
  enterEdit: boolean
}

export interface INavigationOptions {
  // Default true to preserve existing call sites (Enter/Tab from EDIT mode).
  enterEdit?: boolean
  // Defer navigation until after the post-commit rows update has propagated.
  // Used by the EDIT-mode commit-and-navigate path. See CODAP-1365.
  defer?: boolean
}

// Fallback delay for the no-op commit case (e.g. Tab from an unchanged cell):
// no MST mutation, no rows change, no mstReaction firing — so we trigger via a
// timer. 50ms is well past the use-rows.ts debounce (0ms) without being percep-
// tible. For row-change cases, the mstReaction fires earlier and clears the
// pending nav; the timer then runs as a no-op.
const NO_OP_COMMIT_NAV_DELAY_MS = 50

// Editable column predicate: the index column and formula/readonly attribute columns
// have no renderEditCell, while editable attribute columns set it to a cell editor
// component. See use-columns.tsx and use-index-column.tsx.
function isEditableColumn(column: TColumn): boolean {
  return column.renderEditCell != null
}

function findNextEditableIdx(columns: TColumn[], fromIdx: number, direction: 1 | -1): number | null {
  for (let i = fromIdx + direction; i >= 0 && i < columns.length; i += direction) {
    if (isEditableColumn(columns[i])) return i
  }
  return null
}

function findFirstEditableIdx(columns: TColumn[]): number | null {
  for (let i = 0; i < columns.length; i++) {
    if (isEditableColumn(columns[i])) return i
  }
  return null
}

function findLastEditableIdx(columns: TColumn[]): number | null {
  for (let i = columns.length - 1; i >= 0; i--) {
    if (isEditableColumn(columns[i])) return i
  }
  return null
}

export function useSelectedCell(gridRef: React.RefObject<DataGridHandle | null>, columns: TColumn[], rows?: TRow[]) {
  const dataset = useDataSetContext()
  const blockingDataset = blockAPIRequestsWhileEditing(dataset)
  const collectionTableModel = useCollectionTableModel()
  const selectedCell = useRef<Maybe<ISelectedCell>>()
  const pendingNavigation = useRef<IPendingNavigation | null>(null)
  const blockUpdateSelectedCell = useRef(false)
  // Bumped (by the rows mstReaction below and the no-op-commit fallback timer)
  // to force the retry useEffect to re-run when pendingNavigation needs to be flushed.
  // See CODAP-1365.
  const [navFlushCounter, setNavFlushCounter] = useState(0)
  const deferredNavTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { tileId } = useTileModelContext()
  const tileIsFocused = tileId === uiState.focusedTile

  const handleSelectedCellChange = useCallback((args: TCellSelectArgs) => {
    const columnId = args.column?.key
    const rowId = args.row?.__id__
    if (!blockUpdateSelectedCell.current) {
      selectedCell.current = columnId && rowId
                              ? { columnId, rowId, rowIdx: args.rowIdx }
                              : undefined
    }
  }, [])

  // Fallback for the no-op commit case (deferred nav from EDIT mode where the
  // commit didn't actually change rows — e.g. Tab from an unchanged cell).
  // mstReaction below covers the row-change path; this timer covers the case
  // when no rows update is coming. Cleared in the unmount effect below.
  const scheduleNoOpCommitFallback = useCallback(() => {
    if (deferredNavTimer.current != null) clearTimeout(deferredNavTimer.current)
    deferredNavTimer.current = setTimeout(() => {
      deferredNavTimer.current = null
      setNavFlushCounter(c => c + 1)
    }, NO_OP_COMMIT_NAV_DELAY_MS)
  }, [])

  // Clear any pending fallback timer on unmount to avoid a setState-on-unmounted warning.
  useEffect(() => () => {
    if (deferredNavTimer.current != null) clearTimeout(deferredNavTimer.current)
  }, [])

  // Attempts to navigate to the pending position if the target row exists.
  // Returns true if navigation succeeded, false if the target row doesn't exist yet.
  // Skips navigation entirely if a newer navigation has been requested.
  const attemptNavigation = useCallback((nav: IPendingNavigation, currentRows?: TRow[]) => {
    if (pendingNavigation.current !== nav) return false
    // Guard against a stale selectedCell.columnId whose column has been removed
    // (e.g. attribute deleted while a cell in that column was selected) — columns.findIndex
    // returns -1 and propagates here. RDG's behavior on a negative idx is undefined.
    if (nav.idx < 0) {
      pendingNavigation.current = null
      return false
    }
    const rowCount = currentRows?.length ?? 0
    if (nav.rowIdx < rowCount) {
      pendingNavigation.current = null
      collectionTableModel?.scrollRowIntoView(nav.rowIdx)
      gridRef.current?.selectCell({ idx: nav.idx, rowIdx: nav.rowIdx }, nav.enterEdit)
      return true
    }
    return false
  }, [collectionTableModel, gridRef])

  const navigateToNextRow = useCallback((back = false, options: INavigationOptions = {}) => {
    if (selectedCell.current?.columnId) {
      const idx = columns.findIndex(column => column.key === selectedCell.current?.columnId)
      const rowIdx = Math.max(0, selectedCell.current.rowIdx + (back ? -1 : 1))
      const nav = { idx, rowIdx, enterEdit: options.enterEdit ?? true }
      pendingNavigation.current = nav
      if (options.defer) {
        scheduleNoOpCommitFallback()
        return
      }
      // Sync nav so a keystroke between Enter and the selection move can't enter edit
      // mode on the old cell. If the target row doesn't exist yet (e.g. just-created
      // input row), attemptNavigation defers; the rows-dep useEffect retries on update.
      attemptNavigation(nav, rows)
    }
  }, [attemptNavigation, columns, rows, scheduleNoOpCommitFallback])

  const navigateToNextCell = useCallback((back = false, options: INavigationOptions = {}) => {
    if (!selectedCell.current?.columnId) return
    const currentRowIdx = selectedCell.current.rowIdx
    const currentIdx = columns.findIndex(column => column.key === selectedCell.current?.columnId)
    if (currentIdx < 0) return

    const direction: 1 | -1 = back ? -1 : 1
    // First, try to find the next editable cell in the same row.
    const nextIdxInRow = findNextEditableIdx(columns, currentIdx, direction)
    let targetIdx: number | null = nextIdxInRow
    let targetRowIdx = currentRowIdx
    if (nextIdxInRow == null) {
      // No editable cell remaining in this direction within the row — wrap to adjacent row.
      if (back) {
        // shift-tab at the start of the first row: do nothing
        if (currentRowIdx === 0) return
        targetRowIdx = currentRowIdx - 1
        targetIdx = findLastEditableIdx(columns)
      } else {
        // tab at the end of the row: wrap to the first editable cell of the next row.
        // If the next row doesn't exist yet (e.g. just committed input row and grid hasn't
        // re-rendered with the new case), attemptNavigation will queue the nav and the
        // useEffect retry will complete it once rows updates.
        targetRowIdx = currentRowIdx + 1
        targetIdx = findFirstEditableIdx(columns)
      }
    }
    if (targetIdx == null) return
    const nav = { idx: targetIdx, rowIdx: targetRowIdx, enterEdit: options.enterEdit ?? true }
    pendingNavigation.current = nav
    if (options.defer) {
      scheduleNoOpCommitFallback()
      return
    }
    attemptNavigation(nav, rows)
  }, [attemptNavigation, columns, rows, scheduleNoOpCommitFallback])

  const navigateToFirstEditableInRow = useCallback((rowIdx: number, options: INavigationOptions = {}) => {
    const idx = findFirstEditableIdx(columns)
    if (idx == null) return
    const nav = { idx, rowIdx, enterEdit: options.enterEdit ?? false }
    pendingNavigation.current = nav
    attemptNavigation(nav, rows)
  }, [attemptNavigation, columns, rows])

  const navigateToLastEditableInRow = useCallback((rowIdx: number, options: INavigationOptions = {}) => {
    const idx = findLastEditableIdx(columns)
    if (idx == null) return
    const nav = { idx, rowIdx, enterEdit: options.enterEdit ?? false }
    pendingNavigation.current = nav
    attemptNavigation(nav, rows)
  }, [attemptNavigation, columns, rows])

  const navigateToFirstEditableCell = useCallback((options: INavigationOptions = {}) => {
    const idx = findFirstEditableIdx(columns)
    if (idx == null) return
    // The React `rows` array splices the input row into the model's data-only rows
    // at collectionTableModel.inputRowIndex, so React rows[0] isn't necessarily the
    // first data row. Look up by the data row's __id__ instead.
    const firstDataRowId = collectionTableModel?.rows?.[0]?.__id__
    const rowIdx = firstDataRowId != null
      ? rows?.findIndex(r => r.__id__ === firstDataRowId) ?? -1
      : -1
    if (rowIdx < 0) return
    const nav = { idx, rowIdx, enterEdit: options.enterEdit ?? false }
    pendingNavigation.current = nav
    attemptNavigation(nav, rows)
  }, [attemptNavigation, collectionTableModel, columns, rows])

  const navigateToLastEditableCell = useCallback((options: INavigationOptions = {}) => {
    const idx = findLastEditableIdx(columns)
    if (idx == null) return
    // Same rationale as navigateToFirstEditableCell: derive React rowIdx from
    // the data row's __id__ so the input row's drag position can't shift us.
    const modelRows = collectionTableModel?.rows
    const lastDataRowId = modelRows && modelRows.length > 0
      ? modelRows[modelRows.length - 1].__id__
      : undefined
    const rowIdx = lastDataRowId != null
      ? rows?.findIndex(r => r.__id__ === lastDataRowId) ?? -1
      : -1
    if (rowIdx < 0) return
    const nav = { idx, rowIdx, enterEdit: options.enterEdit ?? false }
    pendingNavigation.current = nav
    attemptNavigation(nav, rows)
  }, [attemptNavigation, collectionTableModel, columns, rows])

  const refreshSelectedCell = useCallback(() => {
    if (selectedCell.current) {
      const { columnId, rowId } = selectedCell.current
      const idx = columns.findIndex(column => column.key === columnId)
      const rowIdx = rows?.findIndex(row => row.__id__ === rowId)
      if (rowIdx != null) {
        const position = { idx, rowIdx }
        blockUpdateSelectedCell.current = true
        // When transitioning from editing one cell to another, we get here
        if (tileIsFocused) gridRef.current?.selectCell(position, uiState.wasEditingCellBeforeInterruption)
        uiState.clearEditingStateAfterInterruption()
        selectedCell.current = { ...selectedCell.current, rowIdx }
        blockUpdateSelectedCell.current = false

        // Give the table a chance to rerender before making sure the selected cell is visible.
        setTimeout(() => collectionTableModel?.scrollRowIntoView(rowIdx, { scrollBehavior: "auto" }), 1)
      }
    }
  }, [collectionTableModel, columns, gridRef, rows, tileIsFocused])

  // debounce the callback so it occurs after the last batch if there's a set of batches
  const refreshSelectedCellDebounced = useDebouncedCallback(refreshSelectedCell, 50)

  useEffect(() => {
    if (blockingDataset) {
      return reaction(
        () => uiState.interruptionCount,
        () => refreshSelectedCellDebounced()
      )
    }
  }, [blockingDataset, refreshSelectedCellDebounced])

  // When collectionTableModel.rows changes (post-commit syncRowsToRdg → resetRows),
  // bump the flush counter to re-run the retry effect with the latest React rows.
  // Watching the MST observable directly is more deterministic than relying on
  // setTimeout ordering vs. the debounced rows update in use-rows.ts.
  useEffect(() => {
    if (!collectionTableModel) return
    return reaction(
      () => collectionTableModel.rows,
      () => { if (pendingNavigation.current) setNavFlushCounter(c => c + 1) },
      { name: "useSelectedCell.rowsChanged" }
    )
  }, [collectionTableModel])

  // Retries pending navigation when rows change (row-change commits) or when
  // navFlushCounter is bumped (rows-change reaction above, or no-op-commit
  // fallback timer). See CODAP-1365.
  useEffect(() => {
    if (pendingNavigation.current && rows) {
      attemptNavigation(pendingNavigation.current, rows)
    }
  }, [attemptNavigation, rows, navFlushCounter])

  return {
    selectedCell: selectedCell.current,
    handleSelectedCellChange,
    navigateToNextCell,
    navigateToNextRow,
    navigateToFirstEditableInRow,
    navigateToLastEditableInRow,
    navigateToFirstEditableCell,
    navigateToLastEditableCell
  }
}
