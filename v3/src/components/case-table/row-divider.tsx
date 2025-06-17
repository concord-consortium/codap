import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, { useRef } from "react"
import { createPortal } from "react-dom"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useTileDroppable } from "../../hooks/use-drag-drop"
import { kRowDividerDropZoneBaseId } from "./case-table-drag-drop"
import {
  kDefaultRowHeaderHeight, kDefaultRowHeight, kInputRowKey, kSnapToLineHeight
} from "./case-table-types"
import { useCaseTableModel } from "./use-case-table-model"
import { useCollectionTableModel } from "./use-collection-table-model"

const kTableRowDividerHeight = 9
const kTableDividerOffset = Math.ceil(kTableRowDividerHeight / 2)
interface IRowDividerProps {
  rowId: string
  before?: boolean
}
export const RowDivider = observer(function RowDivider({ rowId, before }: IRowDividerProps) {
  const caseTableModel = useCaseTableModel()
  const collectionId = useCollectionContext()
  const collectionTableModel = useCollectionTableModel(collectionId)
  const collectionTableElt = collectionTableModel?.element
  const caseRows = collectionTableModel?.rows
  const _inputRowIndex = collectionTableModel?.inputRowIndex ?? -1
  const inputRowIndex = _inputRowIndex >= 0 ? _inputRowIndex : caseRows?.length ?? -1
  const isResizing = useRef(false)
  const startY = useRef(0)
  const getRowHeight = () => collectionTableModel?.rowHeight ?? kDefaultRowHeight
  const initialHeight = useRef(getRowHeight())
  // recalculate row indices with input row index
  const allRows = caseRows && inputRowIndex >= 0
                    ? [...caseRows.slice(0, inputRowIndex), { __id__: kInputRowKey }, ...caseRows.slice(inputRowIndex)]
                    : caseRows
  const rowIdx = allRows?.findIndex(row => row.__id__ === rowId)
  const getDividerTopOffset = () => {
    if (before) return collectionTableModel?.getRowTop(rowIdx ?? 0) ?? 0
    return collectionTableModel?.getRowBottom(rowIdx ?? 0) ?? getRowHeight()
  }

  const droppableId = `${kRowDividerDropZoneBaseId}:${collectionId}:${rowId}:${before ? "before" : "after"}`
  const { active, isOver, setNodeRef: setRowDropRef } = useTileDroppable(droppableId, _active => {
    if (rowIdx != null && inputRowIndex >= 0) {
      const offset = before ? 0 : 1
      collectionTableModel?.setInputRowIndex(rowIdx < inputRowIndex ? rowIdx + offset : rowIdx)
    }
    // disable drop target if there is no input row or we don't have a valid index
  }, { disabled: rowIdx == null || inputRowIndex < 0 })

  // allow the user to drag the divider to resize the row
  const handleMouseDown = (e: React.MouseEvent) => {
    if (before) return
    e.stopPropagation()
    isResizing.current = true
    startY.current = e.clientY
    initialHeight.current = getRowHeight()
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    e.stopPropagation()
    if (isResizing.current) {
      const deltaY = e.clientY - startY.current
      const tempNewHeight = Math.max(kDefaultRowHeight, initialHeight.current + deltaY)
      const newHeight = kSnapToLineHeight * Math.round((tempNewHeight - 4) / kSnapToLineHeight) + 4
      collectionTableModel?.setRowHeight(newHeight)
    }
  }

  const handleMouseUp = (e: MouseEvent) => {
    e.stopPropagation()
    isResizing.current = false
    caseTableModel?.applyModelChange(() => {
      caseTableModel?.setRowHeightForCollection(collectionId, getRowHeight())
    },
    {
      log: "Change row height",
      undoStringKey: "V3.Undo.caseTable.changeRowHeight",
      redoStringKey: "V3.Redo.caseTable.changeRowHeight"
    })
    document.removeEventListener("mousemove", handleMouseMove)
    document.removeEventListener("mouseup", handleMouseUp)
  }

  const className = clsx("codap-row-divider", { "over": isOver, "dragging": !!active, "no-row-resize": before })
  const top = getDividerTopOffset() + kDefaultRowHeaderHeight - kTableDividerOffset

  return (
    collectionTableElt
      ? createPortal((
            <div ref={setRowDropRef} className={className} onMouseDown={handleMouseDown}
                  data-testid={`row-divider-${rowIdx}`} style={{top}}>
            </div>
          ), collectionTableElt)
      : null
  )
})
