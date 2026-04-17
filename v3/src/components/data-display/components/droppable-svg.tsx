import { Active, useDroppable } from "@dnd-kit/core"
import { CSSProperties } from "react"
import { createPortal } from "react-dom"
import { useOverlayBounds } from "../../../hooks/use-overlay-bounds"
import { DropHint } from "./drop-hint"

import "./droppable-svg.scss"

export interface IDropInsets {
  top?: number
  right?: number
  bottom?: number
  left?: number
}

interface IProps {
  className?: string
  portal: HTMLElement | null
  target: HTMLDivElement | SVGGElement | null
  dropId: string
  insets?: IDropInsets
  onIsActive?: (active: Active) => boolean
  hintString?: string
}

export const DroppableSvg = ({
    className, portal, target, dropId, insets, onIsActive, hintString }: IProps) => {
  const { active, isOver, setNodeRef } = useDroppable({ id: dropId })
  const isActive = active && onIsActive?.(active)
  // zIndex is set to 2 to ensure that the droppable area is above the map content for maps
  const bounds = useOverlayBounds({target, portal})
  const style: CSSProperties = { zIndex: 2, ...bounds }
  if (insets && bounds.width != null && bounds.height != null) {
    style.left = (bounds.left ?? 0) + (insets.left ?? 0)
    style.top = (bounds.top ?? 0) + (insets.top ?? 0)
    style.width = Math.max(0, bounds.width - (insets.left ?? 0) - (insets.right ?? 0))
    style.height = Math.max(0, bounds.height - (insets.top ?? 0) - (insets.bottom ?? 0))
  }
  const classes = `droppable-svg ${className} ${isActive ? "active" : ""} ${isActive && isOver ? "over" : ""}`

  return portal && target && createPortal(
    <>
      <div ref={setNodeRef} className={classes} style={style} />
      <DropHint hintText={hintString} isVisible={isOver} />
    </>,
    portal
  )
}
