import { clsx } from "clsx"
import React from "react"
import { createPortal } from "react-dom"
import { moveAttribute } from "../../models/data/data-set-utils"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { getDragAttributeInfo, useTileDroppable } from "../../hooks/use-drag-drop"
import { preventAttributeMove, preventCollectionReorg } from "../../utilities/plugin-utils"
import { kAttributeDividerDropZoneBaseId } from "../case-table/case-table-drag-drop"
import { IDividerProps, kIndexColumnKey } from "./case-tile-types"
import { useAttributeHeaderDividerContext } from "./use-attribute-header-divider-context"

function AttributeHeaderDivider_({ before = false, columnKey, cellElt, getDividerBounds }: IDividerProps) {
  const collectionId = useCollectionContext()
  const droppableId = `${kAttributeDividerDropZoneBaseId}:${collectionId}:${columnKey}`
  const dataset = useDataSetContext()
  const preventCollectionDrop = preventCollectionReorg(dataset, collectionId)

  const { active, isOver, setNodeRef: setDropRef } = useTileDroppable(droppableId, _active => {
    if (!preventCollectionDrop) {
      const { dataSet, attributeId: dragAttrId } = getDragAttributeInfo(_active) || {}
      if (preventAttributeMove(dataset, dragAttrId)) return
      const targetCollection = dataset?.getCollection(collectionId)
      if (!targetCollection || !dataSet || (dataSet !== dataset) || !dragAttrId) return

      const sourceCollection = dataSet.getCollectionForAttribute(dragAttrId)
      // If the columnKey is the special kIndexColumnKey then we use undefined for
      // afterAttrId. This means the attribute will be moved to the beginning
      const maybeColumnKey = columnKey === kIndexColumnKey ? undefined : columnKey
      moveAttribute({
        afterAttrId: before ? undefined : maybeColumnKey,
        attrId: dragAttrId,
        dataset,
        includeNotifications: true,
        sourceCollection,
        targetCollection,
        undoable: true
      })
    }
  })

  const { dataSet: dragDataSet, attributeId: dragAttributeId } = getDragAttributeInfo(active) || {}
  const preventAttributeDrop = preventAttributeMove(dataset, dragAttributeId)
  // Don't show move feedback for cross-dataset drags (those are handled by join target)
  const isCrossDatasetDrag = dragDataSet && dragDataSet !== dataset
  const preventDrop = preventAttributeDrop || preventCollectionDrop || isCrossDatasetDrag

  // compute the divider position relative to the container element
  const { containerElt, dividerBounds } = useAttributeHeaderDividerContext({ cellElt, getDividerBounds })

  const className = clsx("codap-attribute-header-divider", { over: isOver && !preventDrop })

  return containerElt && dividerBounds
    ? createPortal((
        <div ref={setDropRef} className={className} style={dividerBounds} />
      ), containerElt)
    : null
}

export const AttributeHeaderDivider = React.memo(AttributeHeaderDivider_)
