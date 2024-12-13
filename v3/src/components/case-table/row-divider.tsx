import { clsx } from "clsx"
import React, { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { kAttributeDividerDropZoneBaseId, useCollectionDroppable } from "../case-table/case-table-drag-drop"
import { useCollectionTableModel } from "./use-collection-table-model"
import { kInputRowKey } from "./case-table-types"

import styles from "./case-table-shared.scss"

const kTableDividerWidth = 5
const kTableDividerOffset = Math.floor(kTableDividerWidth / 2)
interface IRowDividerProps {
  before?: boolean
  rowId: string
}
export const RowDivider = ({ before = false, rowId }: IRowDividerProps) => {
  const collectionId = useCollectionContext()
  const droppableId = `${kAttributeDividerDropZoneBaseId}:${collectionId}:${rowId}`
  const dataset = useDataSetContext()
  const collectionTableModel = useCollectionTableModel()
  const rows = collectionTableModel?.rows
  const [rowTop, setRowTop] = useState(0)
  const [rowElt, setRowElt] = useState<HTMLElement | null>(null)
  const gridElt = document.querySelector(`[data-testid="collection-table-grid"]`)
  const gridWidth = gridElt?.getBoundingClientRect().width

  const { active, over, isOver, setNodeRef: setDropRef } = useCollectionDroppable(droppableId, _active => {
    if (!rows) return
    // Calculate new index
    const activeIndex = rows.findIndex(row => row.__id__ === kInputRowKey)
    const overIndex = rows.findIndex(row => row.__id__ === kInputRowKey)

    // const overIndex = rows.findIndex(row => row.__id__ === over.id)

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
    const rowElement = document.querySelector(`[aria-rowindex="${rowIdx + 1}"]`) as HTMLElement
    setRowElt(rowElement)
    setRowTop(collectionTableModel?.getRowTop(rowIdx))
  }, [rowId, rows])

  const className = clsx("codap-row-divider", { over: isOver })
  return (
  rowElt
    ? createPortal((
          <div ref={setDropRef} className={className}
            style={{width: gridWidth, top: rowTop + (+styles.headerRowHeight) - kTableDividerOffset}}
          />
        ), rowElt)
    : null
)}
