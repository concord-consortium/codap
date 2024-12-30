import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { kDefaultRowHeaderHeight, kDefaultRowHeight, kIndexColumnWidth, kInputRowKey, kSnapToLineHeight }
    from "./case-table-types"
import { useCaseTableModel } from "./use-case-table-model"
import { useCollectionTableModel } from "./use-collection-table-model"
import { useTileDroppable } from "../../hooks/use-drag-drop"
import { kRowDividerDropZoneBaseId } from "./case-table-drag-drop"

const kTableRowDividerHeight = 13
const kTableDividerOffset = Math.floor(kTableRowDividerHeight / 2)
interface IRowDividerProps {
  rowId: string
}
export const RowDivider = observer(function RowDivider({ rowId }: IRowDividerProps) {
  const caseTableModel = useCaseTableModel()
  const collectionId = useCollectionContext()
  const collectionTableModel = useCollectionTableModel(collectionId)
  const collectionTable = collectionTableModel?.element
  const caseRows = collectionTableModel?.rows
  const inputRowIndex = collectionTableModel?.inputRowIndex !== -1
                            ? collectionTableModel?.inputRowIndex : caseRows?.length
  const isResizing = useRef(false)
  const startY = useRef(0)
  const getRowHeight = () => collectionTableModel?.rowHeight ?? kDefaultRowHeight
  const initialHeight = useRef(getRowHeight())
  // recalculate row indices with input row index
  const allRows = caseRows?.slice(0, inputRowIndex)
                            .concat([{ __id__: kInputRowKey }])
                            .concat(caseRows.slice(inputRowIndex))
  const rowIdx = allRows?.findIndex(row => row.__id__ === rowId)
  const [rowElement, setRowElement] = useState<HTMLDivElement | null>(null)
  const getRowBottom = () => {
    if (rowIdx === 0) return getRowHeight()
    else return (rowIdx && collectionTableModel?.getRowBottom(rowIdx)) ?? kDefaultRowHeight
  }

  const droppableId = `${kRowDividerDropZoneBaseId}:${collectionId}:${rowIdx}`
  const { active, over, setNodeRef: setRowDropRef } = useTileDroppable(droppableId, _active => {
    if (!allRows) return
    const overIndex = Number(String(over?.id).split(":")[2].split("-")[0])
    const activeIndex = collectionTableModel?.inputRowIndex !== -1
      ? collectionTableModel?.inputRowIndex
      : allRows?.length ?? 0

    // Calculate new index
    if (overIndex === allRows.length - 1) {
      collectionTableModel?.setInputRowIndex(allRows.length - 1)
    } else
    if (rowIdx && overIndex === rowIdx - 1) {
      console.log("rowIdx", rowIdx, "overIndex", overIndex)
      collectionTableModel?.setInputRowIndex(allRows.length - 2)
    } else
    if (activeIndex && activeIndex !== overIndex) {
      collectionTableModel?.setInputRowIndex(overIndex - 1)
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

  const indexToUse = over?.id && (Number(String(over?.id).split(":")[2].split("-")[0]))
  const isOverWithOffset = rowIdx && (indexToUse === rowIdx + 2)
  const className = clsx("codap-row-divider", { "over": isOverWithOffset, "dragging": !!active})
  const top =  getRowBottom() + kDefaultRowHeaderHeight - kTableDividerOffset
  const width = kIndexColumnWidth
  return (
    rowElement
      ? createPortal((
            <div ref={setRowDropRef} className={className} onMouseDown={handleMouseDown}
                  data-testid={`row-divider-${rowIdx}`} style={{top, width}}
            >{rowIdx}
            </div>
          ), rowElement)
      : null
  )
})
