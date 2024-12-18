import { clsx } from "clsx"
import React, { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { kRowDividerDropZoneBaseId, useCollectionDroppable } from "../case-table/case-table-drag-drop"
import { useCollectionTableModel } from "./use-collection-table-model"

import styles from "./case-table-shared.scss"

const kTableDividerWidth = 7
const kTableDividerOffset = Math.floor(kTableDividerWidth / 2)
interface IRowDividerProps {
  before?: boolean
  rowId: string
}
export const RowDivider = ({ before = false, rowId }: IRowDividerProps) => {
  const collectionId = useCollectionContext()
  const droppableId = `${kRowDividerDropZoneBaseId}:${collectionId}:${rowId}`
  const collectionTableModel = useCollectionTableModel()
  const rows = collectionTableModel?.rows
  const [rowTop, setRowTop] = useState(0)
  const [rowElt, setRowElt] = useState<HTMLElement | null>(null)
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
    if (!rows) return
    const rowIdx = rows?.findIndex(row => row.__id__ === rowId)
    const rowElement = document.querySelector(`[aria-rowindex="${rowIdx}"]`) as HTMLElement
    console.log("RowDivider rowElement", rowElement)
    setRowElt(rowElement)
    setRowTop(collectionTableModel?.getRowTop(rowIdx))
  }, [collectionTableModel, rowId, rows])
  // if (!rows) return null
  const className = clsx("codap-row-divider", { over: isOver })
  return (
    rowElt
      ? createPortal((
            <div ref={setRowDropRef} className={className}
              style={{width: gridWidth, top: rowTop + (+styles.headerRowHeight) - kTableDividerOffset}}
            />
          ), rowElt)
      : null
  )
}
