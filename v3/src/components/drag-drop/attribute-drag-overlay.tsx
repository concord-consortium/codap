import { DragOverlay, useDndContext } from "@dnd-kit/core"
import React from "react"
import { getDragAttributeInfo } from "../../hooks/use-drag-drop"

import "./attribute-drag-overlay.scss"

interface IProps {
  activeDragId?: string
}

export function AttributeDragOverlay ({ activeDragId }: IProps) {
  const { active } = useDndContext()
  const { dataSet, attributeId: dragAttrId } = getDragAttributeInfo(active) || {}
  const attr = activeDragId && dragAttrId ? dataSet?.attrFromID(dragAttrId) : undefined
  const handleDropAnimation = (/*params: any*/) => {
    /**
     * If there has been no drop we would like to animate the overlay back to its original position.
     * Otherwise, we don't want to animate it at all.
     */
  }
  return (
    <DragOverlay className="dnd-kit-drag-overlay" dropAnimation={handleDropAnimation}>
      {attr
        ? <div className="attribute-drag-overlay">
            {attr?.name}
          </div>
        : null}
    </DragOverlay>
  )
}
