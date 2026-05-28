import { reaction } from "mobx"
import { useCallback, useEffect, useRef, useState } from "react"
import { DataGridHandle } from "react-data-grid"
import { useDebouncedCallback } from "use-debounce"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { useTileModelContext } from "../../hooks/use-tile-model-context"
import { uiState } from "../../models/ui-state"
import { blockAPIRequestsWhileEditing } from "../../utilities/plugin-utils"
import { kInputRowKey, TCellSelectArgs, TColumn, TRow } from "./case-table-types"
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
  // When true, only stash pendingNavigation; don't call attemptNavigation synchronously.
  // Instead, navFlushCounter is bumped via setTimeout(0) so that by the time the useEffect
  // fires, the debounced post-commit rows update (use-rows.ts resetRowCacheAndSyncRows)
  // has settled and RDG's `rows` prop is current. Used by the EDIT-mode commit-and-navigate
  // path where calling selectCell synchronously would set RDG's originalRow to a stale row
  // identity and the subsequent rows-prop change would trip RDG's guard at bundle.js:2643
  // and unmount the editor. See CODAP-1365.
  defer?: boolean
}

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
  // Bumped by navigateToNext{Cell,Row} when called with { defer: true } so that the
  // retry useEffect below re-runs even when `rows` didn't change. This covers the
  // case where args.onClose commits a no-op edit and applyCaseValueChanges short-
  // circuits — without a rows reassignment the useEffect would never fire and
  // pendingNavigation would be orphaned. See CODAP-1365.
  const [navFlushCounter, setNavFlushCounter] = useState(0)
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

  // Attempts to navigate to the pending position if the target row exists.
  // Returns true if navigation succeeded, false if the target row doesn't exist yet.
  // Skips navigation entirely if a newer navigation has been requested.
  const attemptNavigation = useCallback((nav: IPendingNavigation, currentRows?: TRow[]) => {
    if (pendingNavigation.current !== nav) return false
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
        // setTimeout(0) defers the trigger until after any debounced post-commit rows
        // update has run (use-rows.ts uses useDebouncedCallback which queues setTimeout(0)).
        setTimeout(() => setNavFlushCounter(c => c + 1), 0)
        return
      }
      // Navigate synchronously so a keystroke between the Enter handler and selection
      // move cannot enter edit mode on the old cell. If the target row doesn't exist yet
      // (e.g. input row just created a new case and the grid hasn't re-rendered),
      // attemptNavigation returns false and the useEffect fallback will handle it.
      attemptNavigation(nav, rows)
    }
  }, [attemptNavigation, columns, rows])

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
      // See navigateToNextRow for rationale on setTimeout(0) here.
      setTimeout(() => setNavFlushCounter(c => c + 1), 0)
      return
    }
    // Navigate synchronously; see navigateToNextRow for rationale.
    attemptNavigation(nav, rows)
  }, [attemptNavigation, columns, rows])

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
    const nav = { idx, rowIdx: 0, enterEdit: options.enterEdit ?? false }
    pendingNavigation.current = nav
    attemptNavigation(nav, rows)
  }, [attemptNavigation, columns, rows])

  const navigateToLastEditableCell = useCallback((options: INavigationOptions = {}) => {
    const idx = findLastEditableIdx(columns)
    if (idx == null) return
    // Last data row, not the input row.
    const dataRowCount = rows?.filter(r => r.__id__ !== kInputRowKey).length ?? 0
    const rowIdx = Math.max(0, dataRowCount - 1)
    const nav = { idx, rowIdx, enterEdit: options.enterEdit ?? false }
    pendingNavigation.current = nav
    attemptNavigation(nav, rows)
  }, [attemptNavigation, columns, rows])

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

  // Retries pending navigation when rows change (e.g. after a commit that adds a case
  // shifts the target row index) or when navFlushCounter bumps from a defer:true call
  // (a setTimeout(0) deferred trigger that ensures the rows-update debounce in
  // use-rows.ts has settled before we attempt to navigate). See CODAP-1365.
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
