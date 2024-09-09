import { clsx } from "clsx"
import React, { CSSProperties, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { moveAttribute } from "../../models/data/data-set-utils"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { getDragAttributeInfo, useTileDroppable } from "../../hooks/use-drag-drop"
import { preventAttributeMove, preventCollectionReorg } from "../../utilities/plugin-utils"
import { IDividerProps } from "./case-tile-types"
import { kAttributeDividerDropZoneBaseId } from "../case-table/case-table-drag-drop"
import { kIndexColumnKey } from "../case-table/case-table-types"

export const AttributeHeaderDivider = ({ before=false, columnKey, cellElt, isCardDivider }: IDividerProps) => {
  const collectionId = useCollectionContext()
  const droppableId = `${kAttributeDividerDropZoneBaseId}:${collectionId}:${columnKey}`
  const dataset = useDataSetContext()
  const [containerElt, setContainerElt] = useState<HTMLElement | null>(null)
  const containerBounds = containerElt?.getBoundingClientRect()
  const [cellWidth, setCellWidth] = useState(0)
  const cellBounds = cellElt?.getBoundingClientRect()
  const preventCollectionDrop = preventCollectionReorg(dataset, collectionId)

  const { active, isOver, setNodeRef: setDropRef } = useTileDroppable(droppableId, _active => {
    if (!preventCollectionDrop) {
      const { dataSet, attributeId: dragAttrId } = getDragAttributeInfo(_active) || {}
      if (preventAttributeMove(dataset, dragAttrId)) return
      const targetCollection = dataset?.getCollection(collectionId)
      if (!targetCollection || !dataSet || (dataSet !== dataset) || !dragAttrId) return

      const sourceCollection = dataSet.getCollectionForAttribute(dragAttrId)
      moveAttribute({
        afterAttrId: before ? kIndexColumnKey : columnKey,
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
  const preventAttributeDrop = preventAttributeMove(dataset, dragAttributeId)
  const preventDrop = preventAttributeDrop || preventCollectionDrop

  // find the `case-table-content` DOM element; divider must be drawn relative
  // to the `case-table-content` (via React portal) so it isn't clipped by the cell,
  // but must be a child of the `case-table-content` for auto-scroll to work.
  useEffect(() => {
    if (cellElt && !containerElt) {
      const containerClass = isCardDivider ? "case-card-content" : "case-table-content"
      let parent: HTMLElement | null
      for (parent = cellElt; parent; parent = parent.parentElement) {
        if (parent.classList.contains(containerClass)) {
          setContainerElt(parent)
          break
        }
      }
    }
  }, [cellElt, containerElt, isCardDivider])

  useEffect(() => {
    if (containerElt && isCardDivider) {
      const observer = new ResizeObserver(() => {
        const newContainerBounds = containerElt.getBoundingClientRect()
        setCellWidth(newContainerBounds.width)
      })
      observer.observe(containerElt)
      return () => observer.disconnect()
    }
  }, [containerElt, isCardDivider])

  // compute the divider position relative to the container element
  if (!containerBounds || !cellBounds) return null
  const kTableDividerWidth = 7
  const kTableDividerOffset = Math.floor(kTableDividerWidth / 2)
  const kCardCellWidthOffset = 5
  const kCardCellHeight = 25
  const cellTopOffset = isCardDivider ? kCardCellHeight : 0
  const top = isCardDivider
                ? cellBounds.bottom - containerBounds.top + cellTopOffset
                : cellBounds.top - containerBounds.top
  const left = isCardDivider
                 ? cellBounds.left - containerBounds.left
                 : cellBounds.right - containerBounds.left - kTableDividerOffset - 1
  const width = isCardDivider
                  ? cellWidth - cellBounds.left - containerBounds.left - kCardCellWidthOffset
                  : kTableDividerWidth
  const height = isCardDivider ? 6 : cellBounds.height
  const style: CSSProperties = { top, height, left, width }
  const isInContainer = isCardDivider
                          ? cellBounds.bottom < containerBounds.bottom
                          : cellBounds.right < containerBounds.right
  
  const className = clsx("codap-column-header-divider", { over: isOver && !preventDrop })
  
  return containerElt && isInContainer
    ? createPortal((
        <div ref={setDropRef} className={className} style={style} />
      ), containerElt)
    : null
}
