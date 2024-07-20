import { clsx } from "clsx"
import React, { CSSProperties, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { moveAttribute } from "../../models/data/data-set-utils"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { getDragAttributeInfo, useTileDroppable } from "../../hooks/use-drag-drop"
import { getPreventAttributeReorg, getPreventCollectionReorg } from "../../utilities/plugin-utils"
import { kAttributeDividerDropZoneBaseId } from "./case-table-drag-drop"

interface IProps {
  columnKey: string
  cellElt: HTMLElement | null
}
export const ColumnHeaderDivider = ({ columnKey, cellElt }: IProps) => {
  const collectionId = useCollectionContext()
  const droppableId = `${kAttributeDividerDropZoneBaseId}:${collectionId}:${columnKey}`
  const dataset = useDataSetContext()
  const [tableElt, setTableElt] = useState<HTMLElement | null>(null)
  const tableBounds = tableElt?.getBoundingClientRect()
  const cellBounds = cellElt?.getBoundingClientRect()
  const preventCollectionDrop = getPreventCollectionReorg(dataset, collectionId)

  const { active, isOver, setNodeRef: setDropRef } = useTileDroppable(droppableId, _active => {
    if (!preventCollectionDrop) {
      const { dataSet, attributeId: dragAttrId } = getDragAttributeInfo(_active) || {}
      if (getPreventAttributeReorg(dataset, dragAttrId)) return
      const targetCollection = dataset?.getCollection(collectionId)
      if (!targetCollection || !dataSet || (dataSet !== dataset) || !dragAttrId) return

      const sourceCollection = dataSet.getCollectionForAttribute(dragAttrId)
      moveAttribute({
        afterAttrId: columnKey,
        attrId: dragAttrId,
        dataset,
        includeNotifications: true,
        sourceCollection,
        targetCollection,
        undoable: true
      })
    }
  })

  const { attributeId: dragAttributeId } = getDragAttributeInfo(active) || {}
  const preventAttributeDrop = getPreventAttributeReorg(dataset, dragAttributeId)
  const preventDrop = preventAttributeDrop || preventCollectionDrop

  // find the `case-table-content` DOM element; divider must be drawn relative
  // to the `case-table-content` (via React portal) so it isn't clipped by the cell,
  // but must be a child of the `case-table-content` for auto-scroll to work.
  useEffect(() => {
    if (cellElt && !tableElt) {
      let parent: HTMLElement | null
      for (parent = cellElt; parent; parent = parent.parentElement) {
        if (parent.classList.contains("case-table-content")) {
          setTableElt(parent)
          break
        }
      }
    }
  }, [cellElt, tableElt])

  // compute the divider position relative to the `case-table` element
  const kDividerWidth = 7
  const kDividerOffset = Math.floor(kDividerWidth / 2)
  const style: CSSProperties = tableBounds && cellBounds
                  ? {
                      top: cellBounds.top - tableBounds.top,
                      height: cellBounds.height,
                      left: cellBounds.right - tableBounds.left - kDividerOffset - 1,
                      width: kDividerWidth
                    }
                  : {}

  const className = clsx("codap-column-header-divider", { over: isOver && !preventDrop })
  return tableElt && tableBounds && cellBounds && (cellBounds?.right < tableBounds?.right)
          ? createPortal((
              <div ref={setDropRef} className={className} style={style}/>
            ), tableElt)
          : null
}
