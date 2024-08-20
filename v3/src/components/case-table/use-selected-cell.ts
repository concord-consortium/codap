import { reaction } from "mobx"
import { useCallback, useEffect, useRef } from "react"
import { DataGridHandle } from "react-data-grid"
import { uiState } from "../../models/ui-state"
import { TCellSelectArgs, TColumn, TRow } from "./case-table-types"
import { useCollectionTableModel } from "./use-collection-table-model"

interface ISelectedCell {
  columnId: string
  rowId: string
  rowIdx: number
}

export function useSelectedCell(gridRef: React.RefObject<DataGridHandle | null>, columns: TColumn[], rows?: TRow[]) {
  const collectionTableModel = useCollectionTableModel()
  const selectedCell = useRef<Maybe<ISelectedCell>>()

  const handleSelectedCellChange = useCallback((args: TCellSelectArgs) => {
    const columnId = args.column?.key
    const rowId = args.row?.__id__
    selectedCell.current = columnId && rowId
                            ? { columnId, rowId, rowIdx: args.rowIdx }
                            : undefined
    console.log(`!!! selectedCell.current`, selectedCell.current)
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

  useEffect(() => {
    return reaction(
      () => uiState.requestBatchesProcessed,
      requestBatchesProcessed => {
        console.log(`... requestBatchesProcessed`, requestBatchesProcessed)
        setTimeout(() => {
          if (selectedCell.current) {
            console.log(`--- selectedCell.current`, selectedCell.current)
            const { columnId, rowId } = selectedCell.current
            const idx = columns.findIndex(column => column.key === columnId)
            const rowIdx = rows?.findIndex(row => row.__id__ === rowId)
            if (rowIdx != null) {
              const position = { idx, rowIdx }
              console.log(` -- position`, position)
              collectionTableModel?.scrollRowIntoView(rowIdx)
              gridRef.current?.selectCell(position, true)        
            }
          }
        })
      }
    )
  })

  return { selectedCell: selectedCell.current, handleSelectedCellChange, navigateToNextRow }
}
