import { useCallback, useEffect, useRef } from "react"
import { DataGridHandle } from "react-data-grid"
import { useTileModelContext } from "../../hooks/use-tile-model-context"
import { selectAllCases } from "../../models/data/data-set-utils"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { useCodapComponentContext } from "../../hooks/use-codap-component-context"

interface IProps {
  gridRef: React.RefObject<DataGridHandle>
}

export function useWhiteSpaceClick({ gridRef }: IProps) {
  const data = useDataSetContext()
  const componentRef = useCodapComponentContext()
  // Whitespace should only clear selection if the table is already focused.
  // If user clicks on the whitespace of the table and the table is not focused,
  // then the table should be focused and the selection should not be cleared.
  // So we track if the table is in focus and if it was in focus before.
  const { isTileSelected } = useTileModelContext()
  const isFocusedTileRef = useRef(isTileSelected())
  const wasFocusedTileRef = useRef(isTileSelected())
  const isFocusedTile = isTileSelected()

  // Store the previous focus state
  useEffect(() => {
    wasFocusedTileRef.current = isFocusedTileRef.current
    isFocusedTileRef.current = isFocusedTile
  }, [isFocusedTile])

  const clearCaseSelection = useCallback(() => {
    selectAllCases(data, false)
    // RDG doesn't currently provide API for clearing all cell selection,
    // so we clear the `aria-selected` state ourselves.
    componentRef.current?.querySelectorAll('[aria-selected="true"]').forEach(cell => {
      cell.setAttribute('aria-selected', 'false')
    })
  }, [componentRef, data])

  const handleWhiteSpaceClick = useCallback(() => {
    console.log(`handleWhiteSpaceClick: wasFocusedTileRef.current: ${wasFocusedTileRef.current}; 
    isFocusedTileRef.current: ${isFocusedTileRef.current}`)
    if (!wasFocusedTileRef.current && isFocusedTileRef.current) {
      // Focused the table, do nothing with the selection
      wasFocusedTileRef.current = true
      return
    }
    clearCaseSelection()
  }, [clearCaseSelection])

  return { handleWhiteSpaceClick }
}
