import { reaction } from "mobx"
import { useCallback, useEffect, useRef } from "react"
import { DataGridHandle } from "react-data-grid"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { uiState } from "../../models/ui-state"
import { blockAPIRequests } from "../../utilities/plugin-utils"
import { TCellSelectArgs, TColumn, TRow } from "./case-table-types"
import { useCollectionTableModel } from "./use-collection-table-model"

interface ISelectedCell {
  columnId: string
  rowId: string
  rowIdx: number
}

export function useSelectedCell(gridRef: React.RefObject<DataGridHandle | null>, columns: TColumn[], rows?: TRow[]) {
  const dataset = useDataSetContext()
  const blockingDataset = blockAPIRequests(dataset)
  const collectionTableModel = useCollectionTableModel()
  const selectedCell = useRef<Maybe<ISelectedCell>>()
  const blockUpdateSelectedCell = useRef(false)

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

  const refreshSelectedCell = useCallback((allowEdit = true, scroll = true) => {
    if (selectedCell.current) {
      const { columnId, rowId } = selectedCell.current
      const idx = columns.findIndex(column => column.key === columnId)
      const rowIdx = rows?.findIndex(row => row.__id__ === rowId)
      if (rowIdx != null) {
        const position = { idx, rowIdx }
        blockUpdateSelectedCell.current = true
        gridRef.current?.selectCell(position, allowEdit && uiState.isNavigatingToNextEditCell)
        selectedCell.current = { ...selectedCell.current, rowIdx }
        blockUpdateSelectedCell.current = false

        // Give the table a chance to rerender before making sure the selected cell is visible.
        if (scroll) setTimeout(() => collectionTableModel?.scrollRowIntoView(rowIdx, { jump: true }), 1)
      }
    }
  }, [collectionTableModel, columns, gridRef, rows])

  useEffect(() => {
    if (blockingDataset) {
      return reaction(
        () => uiState.requestBatchesProcessed,
        () => {
          setTimeout(() => {
            // Reselect the selected cell without editing it, giving the API handler a chance to deal with any
            // requests that built up in the queue.
            refreshSelectedCell(false, false)

            // Refresh the cell again after a short wait to allow API requests to be processed.
            // The wait is long enough to allow plugins to react to responses from queued requests.
            setTimeout(() => refreshSelectedCell(), 40)
          })
        }
      )
    }
  }, [blockingDataset, refreshSelectedCell])

  return { selectedCell: selectedCell.current, handleSelectedCellChange, navigateToNextRow }
}
