import { DragOverlay, Modifiers, useDndContext } from "@dnd-kit/core"
import React, { CSSProperties } from "react"
import { getDragAttributeInfo } from "../../hooks/use-drag-drop"

import "./attribute-drag-overlay.scss"

interface IProps {
  activeDragId?: string
  overlayHeight?: number
  overlayWidth?: number
  xOffset?: number
  yOffset?: number
}

export function AttributeDragOverlay ({ activeDragId, overlayHeight, overlayWidth, xOffset, yOffset }: IProps) {
  const { active } = useDndContext()
  const { dataSet, attributeId: dragAttrId } = getDragAttributeInfo(active) || {}
  const attr = activeDragId && dragAttrId ? dataSet?.attrFromID(dragAttrId) : undefined
  const handleDropAnimation = (/*params: any*/) => {
    /**
     * If there has been no drop we would like to animate the overlay back to its original position.
     * Otherwise, we don't want to animate it at all.
     */
  }

  // Drags initiated by plugins can specify the size of the overlay
  const style: CSSProperties | undefined = overlayHeight || overlayWidth
    ? { height: `${overlayHeight}px`, width: `${overlayWidth}px` } : undefined

  // Drags initiated by plugins have to be offset based on the location of the plugin
  const modifier = (xOffset || yOffset) && ((args: any) => {
    const { x, y, scaleX, scaleY } = args.transform
    return {
      x: x + (xOffset ?? 0),
      y: y + (yOffset ?? 0),
      scaleX, scaleY
    }
  })
  const modifiers: Modifiers | undefined = modifier ? [modifier] : undefined

  return (
    <DragOverlay
      className="dnd-kit-drag-overlay"
      dropAnimation={handleDropAnimation}
      modifiers={modifiers}
      style={style}
    >
      {attr
        ? <div className="attribute-drag-overlay">
            {attr?.name}
          </div>
        : null}
    </DragOverlay>
  )
}
