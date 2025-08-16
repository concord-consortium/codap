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

export function useSelectedCell(gridRef: React.RefObject<DataGridHandle | null>, columns: TColumn[], rows?: TRow[]) {
  const dataset = useDataSetContext()
  const blockingDataset = blockAPIRequestsWhileEditing(dataset)
  const collectionTableModel = useCollectionTableModel()
  const selectedCell = useRef<Maybe<ISelectedCell>>()
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

  const navigateToNextRow = useCallback((back = false) => {
    if (selectedCell.current?.columnId) {
      const idx = columns.findIndex(column => column.key === selectedCell.current?.columnId)
      const rowIdx = Math.max(0, selectedCell.current.rowIdx + (back ? -1 : 1))
      const position = { idx, rowIdx }
      // setTimeout so it occurs after handling of current event completes
      setTimeout(() => {
        collectionTableModel?.scrollRowIntoView(rowIdx)
        gridRef.current?.selectCell(position, true)
      })
    }
  }, [collectionTableModel, columns, gridRef])

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

  return { selectedCell: selectedCell.current, handleSelectedCellChange, navigateToNextRow }
}
