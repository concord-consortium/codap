import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { kDefaultRowHeaderHeight, kDefaultRowHeight, kIndexColumnWidth, kSnapToLineHeight } from "./case-table-types"
import { useCaseTableModel } from "./use-case-table-model"
import { useCollectionTableModel } from "./use-collection-table-model"

const kTableRowDividerHeight = 13
const kTableDividerOffset = Math.floor(kTableRowDividerHeight / 2)
interface IRowDividerProps {
  rowId: string
}
export const RowDivider = observer(function RowDivider({ rowId }: IRowDividerProps) {
  const collectionTableModel = useCollectionTableModel()
  const collectionId = useCollectionContext()
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

  const className = clsx("codap-row-divider")
  const top = getRowBottom() + kDefaultRowHeaderHeight - kTableDividerOffset
  const width = kIndexColumnWidth
  return (
    rowElement
      ? createPortal((
            <div className={className} onMouseDown={handleMouseDown}
                  data-testid={`row-divider-${rowIdx}`} style={{top, width}}
            />
          ), rowElement)
      : null
  )
})
