import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { kDefaultRowHeaderHeight, kDefaultRowHeight, kIndexColumnWidth, kSnapToLineHeight } from "./case-table-types"
import { useCaseTableModel } from "./use-case-table-model"
import { useCollectionTableModel } from "./use-collection-table-model"
import { kRowDividerDropZoneBaseId } from "../case-table/case-table-drag-drop"
import { useTileDroppable } from "../../hooks/use-drag-drop"

const kTableRowDividerHeight = 13
const kTableDividerOffset = Math.floor(kTableRowDividerHeight / 2)
interface IRowDividerProps {
  rowId: string
}
export const RowDivider = observer(function RowDivider({ rowId }: IRowDividerProps) {
  const collectionTableModel = useCollectionTableModel()
  const collectionId = useCollectionContext()
  const rowIdx = collectionTableModel?.rows.findIndex(row => row.__id__ === rowId)
  const droppableId = `${kRowDividerDropZoneBaseId}:${collectionId}:${(rowIdx ?? 0) - 1}#${rowIdx}`
  const collectionTable = collectionTableModel?.element
  const caseTableModel = useCaseTableModel()
  const rows = collectionTableModel?.rows
  const isResizing = useRef(false)
  const startY = useRef(0)
  const getRowHeight = () => collectionTableModel?.rowHeight ?? kDefaultRowHeight
  const initialHeight = useRef(getRowHeight())
  const [rowElement, setRowElement] = useState<HTMLDivElement | null>(null)
  const getRowBottom = () => {
    if (rowIdx === 0) return getRowHeight()
    else return (rowIdx && collectionTableModel?.getRowBottom(rowIdx - 1)) ?? kDefaultRowHeight
  }
  const { active, over, isOver, setNodeRef: setRowDropRef } = useTileDroppable(droppableId, _active => {
    if (!rows) return
    const overIndices = String(over?.id).split(":")[2].split("-")[0]
    const overIndexBefore = Number(overIndices.split("#")[0])
    const overIndexAfter = Number(overIndices.split("#")[1])

    // Calculate new index
    const activeIndex = rows.length
    if (activeIndex !== overIndexAfter) {
      const updatedRows = [...rows]
      const [movedRow] = updatedRows.splice(activeIndex, 1)
      updatedRows.splice(overIndexBefore, 0, movedRow)

      // Update inputRowIndex in collectionTableModel
      collectionTableModel?.setInputRowIndex(overIndexAfter)
    }
  })

  useEffect(() => {
    (rowIdx != null && collectionTable) &&
      setRowElement(collectionTable.querySelector(`[aria-rowindex="${rowIdx + 2}"]`) as HTMLDivElement)
  }, [collectionTable, rowIdx])

  // allow the user to drag the divider
  const handleMouseDown = (e: React.MouseEvent) => {
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
        undoStringKey: "DG.Undo.caseTable.changeRowHeight",
        redoStringKey: "DG.Redo.caseTable.changeRowHeight"
      }
    )
    document.removeEventListener("mousemove", handleMouseMove)
    document.removeEventListener("mouseup", handleMouseUp)
  }

  const className = clsx("codap-row-divider", { "over": isOver, "dragging": !!active})
  const top = getRowBottom() + kDefaultRowHeaderHeight - kTableDividerOffset
  const width = kIndexColumnWidth
  return (
    rowElement
      ? createPortal((
            <div ref={setRowDropRef} className={className} onMouseDown={handleMouseDown}
                  data-testid={`row-divider-${rowIdx}`} style={{top, width}} />
          ), rowElement)
      : null
  )
})
