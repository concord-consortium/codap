import { DragOverlay, useDndContext } from "@dnd-kit/core"
import React from "react"
import { getDragAttributeInfo } from "../../hooks/use-drag-drop"

import "./attribute-drag-overlay.scss"

interface IProps {
  activeDragId?: string
}
export const AttributeDragOverlay = ({ activeDragId }: IProps) => {
  const { active } = useDndContext()
  const { dataSet, attributeId: dragAttrId } = getDragAttributeInfo(active) || {}
  const attr = activeDragId && dragAttrId ? dataSet?.attrFromID(dragAttrId) : undefined
  return (
    <DragOverlay dropAnimation={null}>
      {dragAttrId
        ? <div className="attribute-drag-overlay">
            {attr?.name}
          </div>
        : null}
    </DragOverlay>
  )
}
