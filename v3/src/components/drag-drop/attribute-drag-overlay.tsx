import { Active, DragOverlay, Modifier, Modifiers, useDndContext } from "@dnd-kit/core"
import React, { CSSProperties } from "react"
import { getDragAttributeInfo } from "../../hooks/use-drag-drop"

import "./attribute-drag-overlay.scss"

function getOverlayDragId(active: Active | null, instanceId: string, excludeRegEx?: RegExp) {
  const activeId = `${active?.id}`
  return active && activeId.startsWith(instanceId) && !excludeRegEx?.test(activeId)
    ? activeId : undefined
}

interface IProps {
  dragIdPrefix: string
  dragIdExcludeRegEx?: RegExp
  overlayHeight?: number
  overlayWidth?: number
  xOffset?: number
  yOffset?: number
}

export function AttributeDragOverlay ({
  dragIdPrefix, dragIdExcludeRegEx, overlayHeight, overlayWidth, xOffset, yOffset
}: IProps) {
  const { active } = useDndContext()
  const { dataSet, attributeId: dragAttrId } = getDragAttributeInfo(active) || {}

  const activeDragId = getOverlayDragId(active, dragIdPrefix, dragIdExcludeRegEx)
  const attr = activeDragId && dragAttrId ? dataSet?.attrFromID(dragAttrId) : undefined
  const handleDropAnimation = (/*params: any*/) => {
    /**
     * If there has been no drop we would like to animate the overlay back to its original position.
     * Otherwise, we don't want to animate it at all.
     */
  }

  // Drags initiated by plugins can specify the size of the overlay
  const style: CSSProperties | undefined = overlayHeight && overlayWidth
    ? { height: `${overlayHeight}px`, width: `${overlayWidth}px` } : undefined

  // Drags initiated by plugins have to be offset based on the location of the plugin
  const modifier: Modifier | undefined = (xOffset || yOffset) ? (args => {
    const { x, y, scaleX, scaleY } = args.transform
    return {
      x: x + (xOffset ?? 0),
      y: y + (yOffset ?? 0),
      scaleX, scaleY
    }
  }) : undefined
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
