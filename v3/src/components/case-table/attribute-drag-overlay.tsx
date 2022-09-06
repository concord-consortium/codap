import { DragOverlay, useDndContext } from "@dnd-kit/core"
import React from "react"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { getDragAttributeId } from "../../hooks/use-drag-drop"

import "./attribute-drag-overlay.scss"

interface IProps {
  activeDragId?: string
}
export const AttributeDragOverlay = ({ activeDragId }: IProps) => {
  const data = useDataSetContext()
  const { active } = useDndContext()
  const dragAttrId = activeDragId ? getDragAttributeId(active) : undefined
  const attr = dragAttrId ? data?.attrFromID(dragAttrId) : undefined
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
