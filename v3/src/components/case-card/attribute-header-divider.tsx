import { clsx } from "clsx"
import React, { CSSProperties, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { moveAttribute } from "../../models/data/data-set-utils"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { getDragAttributeInfo, useTileDroppable } from "../../hooks/use-drag-drop"
import { preventAttributeMove, preventCollectionReorg } from "../../utilities/plugin-utils"
import { IDividerProps } from "../case-table-card-common/case-tile-types"
import { kAttributeDividerDropZoneBaseId } from "../case-table/case-table-drag-drop"
import { kIndexColumnKey } from "../case-table/case-table-types"

export const AttributeHeaderDivider = ({ before=false, columnKey, cellElt }: IDividerProps) => {
  const collectionId = useCollectionContext()
  const droppableId = `${kAttributeDividerDropZoneBaseId}:${collectionId}:${columnKey}`
  const dataset = useDataSetContext()
  const [containerElt, setContainerElt] = useState<HTMLElement | null>(null)
  const containerBounds = containerElt?.getBoundingClientRect()
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

  // find the `case-card-view"` DOM element; divider must be drawn relative
  // to the `case-card-view"` (via React portal) so it isn't clipped by the cell,
  // but must be a child of the `case-card-view"` for auto-scroll to work.
  useEffect(() => {
    if (cellElt && !containerElt) {
      let parent: HTMLElement | null
      for (parent = cellElt; parent; parent = parent.parentElement) {
        if (parent.classList.contains("case-card-view")) {
          setContainerElt(parent)
          break
        }
      }
    }
  }, [cellElt, containerElt])

  const hasBounds = containerBounds && cellBounds
  const collectionIndex = dataset?.collectionIds.indexOf(collectionId) ?? 0
  const kLevelOffset = 5
  const collectionOffset = collectionIndex * kLevelOffset
  const cellOffset = !before && hasBounds ? cellBounds.height : 0
  const top = hasBounds
                ? cellBounds.bottom - containerBounds.top + collectionOffset + cellOffset
                : 0
  
  const style: CSSProperties = hasBounds
    ? {
        top,
        left: containerBounds.left,
        width: containerBounds.width - containerBounds.left,
      }
    : {}

  const className = clsx("codap-column-header-divider", { over: isOver && !preventDrop })
  if (containerElt && containerBounds && cellBounds && (cellBounds?.bottom < containerBounds?.bottom)) {
    return (
      createPortal((
        <div ref={setDropRef} className={className} style={style}/>
      ), containerElt)
    )
  } else {
    return null
  }

}
