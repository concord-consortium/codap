import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { kDefaultRowHeaderHeight, kDefaultRowHeight, kIndexColumnWidth, kSnapToLineHeight } from "./case-table-types"
import { useCaseTableModel } from "./use-case-table-model"
import { useCollectionTableModel } from "./use-collection-table-model"
import { kRowDividerDropZoneBaseId, useCollectionDroppable } from "../case-table/case-table-drag-drop"

const kTableRowDividerHeight = 13
const kTableDividerOffset = Math.floor(kTableRowDividerHeight / 2)
interface IRowDividerProps {
  rowId: string
}
export const RowDivider = observer(function RowDivider({ rowId }: IRowDividerProps) {
  const collectionTableModel = useCollectionTableModel()
  const collectionId = useCollectionContext()
  const droppableId = `${kRowDividerDropZoneBaseId}:${collectionId}:${rowId}`
  const collectionTable = collectionTableModel?.element
  const caseTableModel = useCaseTableModel()
  const rows = collectionTableModel?.rows
  const isResizing = useRef(false)
  const startY = useRef(0)
  const getRowHeight = () => collectionTableModel?.rowHeight ?? kDefaultRowHeight
  const initialHeight = useRef(getRowHeight())
  const rowIdx = rows?.findIndex(row => row.__id__ === rowId)
  const [rowElement, setRowElement] = useState<HTMLDivElement | null>(null)
  const getRowBottom = () => {
    if (rowIdx === 0) return getRowHeight()
    else return (rowIdx && collectionTableModel?.getRowBottom(rowIdx)) ?? kDefaultRowHeight
  }
  const gridElt = document.querySelector(`[data-testid="collection-table-grid"]`)
  const gridWidth = gridElt?.getBoundingClientRect().width
  const { over, isOver, setNodeRef: setRowDropRef } = useCollectionDroppable(droppableId, _active => {
    if (!rows) return
    const overCaseId = String(over?.id).split(":")[2].split("-")[0]
    // console.log("RowDivider onDrop overCaseId", overCaseId)

    // Calculate new index
    const activeIndex = rows.length
    const overIndex = rows.findIndex(row => row.__id__ === overCaseId)
// console.log("RowDivider activeIndes", activeIndex, "overIndex", overIndex)
    if (activeIndex !== overIndex) {
      const updatedRows = [...rows]
      const [movedRow] = updatedRows.splice(activeIndex, 1)
      updatedRows.splice(overIndex, 0, movedRow)

      // Update inputRowIndex in collectionTableModel
      collectionTableModel?.setInputRowIndex(overIndex)
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

  const className = clsx("codap-row-divider", { over: isOver })
  const top = getRowBottom() + kDefaultRowHeaderHeight - kTableDividerOffset
  const width = kIndexColumnWidth
  return (
    rowElement
      ? createPortal((
            <div ref={setRowDropRef} className={className} onMouseDown={handleMouseDown}
                  data-testid={`row-divider-${rowIdx}`} style={{top, width}}
            />
          ), rowElement)
      : null
  )
})
