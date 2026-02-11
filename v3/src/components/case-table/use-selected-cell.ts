import { reaction } from "mobx"
import { useCallback, useEffect, useRef } from "react"
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
}

export function useSelectedCell(gridRef: React.RefObject<DataGridHandle | null>, columns: TColumn[], rows?: TRow[]) {
  const dataset = useDataSetContext()
  const blockingDataset = blockAPIRequestsWhileEditing(dataset)
  const collectionTableModel = useCollectionTableModel()
  const selectedCell = useRef<Maybe<ISelectedCell>>()
  const pendingNavigation = useRef<IPendingNavigation | null>(null)
  const blockUpdateSelectedCell = useRef(false)
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
  const attemptNavigation = useCallback((nav: IPendingNavigation, currentRows?: TRow[]) => {
    const rowCount = currentRows?.length ?? 0
    if (nav.rowIdx < rowCount) {
      pendingNavigation.current = null
      collectionTableModel?.scrollRowIntoView(nav.rowIdx)
      gridRef.current?.selectCell({ idx: nav.idx, rowIdx: nav.rowIdx }, true)
      return true
    }
    return false
  }, [collectionTableModel, gridRef])

  const navigateToNextRow = useCallback((back = false) => {
    if (selectedCell.current?.columnId) {
      const idx = columns.findIndex(column => column.key === selectedCell.current?.columnId)
      const rowIdx = Math.max(0, selectedCell.current.rowIdx + (back ? -1 : 1))
      const nav = { idx, rowIdx }
      pendingNavigation.current = nav
      // setTimeout so it occurs after handling of current event completes.
      // If the target row doesn't exist yet (e.g. input row just created a new case
      // and the grid hasn't re-rendered), the useEffect fallback will handle it.
      setTimeout(() => {
        attemptNavigation(nav, rows)
      })
    }
  }, [attemptNavigation, columns, rows])

  const navigateToNextCell = useCallback((back = false) => {
    if (selectedCell.current?.columnId) {
      // column index
      const currentRowIdx = selectedCell.current.rowIdx
      const currentIdx = columns.findIndex(column => column.key === selectedCell.current?.columnId)
      const rightmost = currentIdx === columns.length - 1
      const first = currentIdx === 1
      if (first && currentRowIdx === 0 && back) {
        // don't navigate left from the first cell
        return
      }
      const idx = back
        ? first ? Math.max(1, columns.length - 1) : currentIdx - 1
        : rightmost ? 1 : currentIdx + 1
      // row index
      const rowIdx = back
        ? first ? Math.max(0, currentRowIdx - 1) : currentRowIdx
        : rightmost ? currentRowIdx + 1 : currentRowIdx
      const nav = { idx, rowIdx }
      pendingNavigation.current = nav
      // setTimeout so it occurs after handling of current event completes.
      // If the target row doesn't exist yet, the useEffect fallback will handle it.
      setTimeout(() => {
        attemptNavigation(nav, rows)
      })
    }
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

  // In Safari, the setTimeout in navigateToNextRow/navigateToNextCell may fire before
  // the grid has re-rendered with new rows (e.g. after input row creates a new case).
  // This effect retries pending navigation when rows change.
  useEffect(() => {
    if (pendingNavigation.current && rows) {
      attemptNavigation(pendingNavigation.current, rows)
    }
  }, [attemptNavigation, rows])

  return { selectedCell: selectedCell.current, handleSelectedCellChange, navigateToNextCell, navigateToNextRow }
}
