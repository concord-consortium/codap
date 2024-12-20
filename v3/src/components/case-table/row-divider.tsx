import { clsx } from "clsx"
import React, { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useCollectionTableModel } from "./use-collection-table-model"
import { kDefaultRowHeight } from "./case-table-types"
import { useCaseTableModel } from "./use-case-table-model"
import { observer } from "mobx-react-lite"
import { kDefaultRowHeaderHeight } from "./collection-table-model"

const kTableRowDividerHeight = 13
const kTableDividerOffset = Math.floor(kTableRowDividerHeight / 2)
const kSnapToLineHeight = 14
interface IRowDividerProps {
  rowId: string
}
export const RowDivider = observer(function RowDivider({ rowId }: IRowDividerProps) {
  const collectionTableModel = useCollectionTableModel()
  const collectionId = useCollectionContext()
  const caseTableModel = useCaseTableModel()
  const rows = collectionTableModel?.rows
  const rowHeightRef = useRef(kDefaultRowHeight)
  const isResizing = useRef(false)
  const startY = useRef(0)
  const initialHeight = useRef(rowHeightRef.current)
  const rowIdx = rows?.findIndex(row => row.__id__ === rowId)
  const [rowElement, setRowElement] = useState<HTMLDivElement | null>(null)
  const getRowBottom = () => {
    if (rowIdx === 0) return collectionTableModel?.rowHeight ?? kDefaultRowHeight
    else return (rowIdx && collectionTableModel?.getRowBottom(rowIdx)) ?? kDefaultRowHeight
  }

  useEffect(() => {
    (rowIdx != null) && setRowElement(document.querySelector(`[aria-rowindex="${rowIdx + 2}"]`) as HTMLDivElement)
  }, [rowIdx])

  useEffect(() => {
    if (!caseTableModel?.getRowHeightForCollection(collectionId)) {
      caseTableModel?.setRowHeightForCollection(collectionId, rowHeightRef.current)
      collectionTableModel?.setRowHeight(rowHeightRef.current)
    }
  }, [caseTableModel, collectionId, collectionTableModel])

  // allow the user to drag the divider
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    isResizing.current = true
    startY.current = e.clientY
    initialHeight.current = collectionTableModel?.rowHeight ??
                            caseTableModel?.getRowHeightForCollection(collectionId) ??
                            kDefaultRowHeight
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    e.stopPropagation()
    if (isResizing.current) {
      const deltaY = e.clientY - startY.current
      const tempNewHeight = Math.max(kDefaultRowHeight, initialHeight.current + deltaY)
      const newHeight = kSnapToLineHeight * Math.round((tempNewHeight - 4) / kSnapToLineHeight) + 4
      rowHeightRef.current = newHeight
      collectionTableModel?.setRowHeight(newHeight)
    }
  }

  const handleMouseUp = (e: MouseEvent) => {
    e.stopPropagation()
    isResizing.current = false
    initialHeight.current = rowHeightRef.current
    collectionTableModel?.setRowHeight(rowHeightRef.current)
    caseTableModel?.applyModelChange(() => {
        caseTableModel?.setRowHeightForCollection(collectionId, rowHeightRef.current)
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

  const className = clsx("codap-row-divider")
  return (
    rowElement
      ? createPortal((
            <div className={className} onMouseDown={handleMouseDown}
                  data-testid={`row-divider-${rowIdx}`}
                  style={{top: getRowBottom() + kDefaultRowHeaderHeight - kTableDividerOffset}}
            />
          ), rowElement)
      : null
  )
})
