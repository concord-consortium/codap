import { Active, useDroppable } from "@dnd-kit/core"
import React, { CSSProperties } from "react"
import { createPortal } from "react-dom"
import { useOverlayBounds } from "../../../hooks/use-overlay-bounds"
import { DropHint } from "./drop-hint"

import "./droppable-svg.scss"

interface IProps {
  className?: string
  portal: HTMLElement | null
  target: HTMLDivElement | SVGGElement | null
  dropId: string
  onIsActive?: (active: Active) => boolean
  hintString?: string
}

export const DroppableSvg = ({
    className, portal, target, dropId, onIsActive, hintString }: IProps) => {
  const { active, isOver, setNodeRef } = useDroppable({ id: dropId })
  const isActive = active && onIsActive?.(active)
  const style: CSSProperties = useOverlayBounds({ target, portal })
  const classes = `droppable-svg ${className} ${isActive ? "active" : ""} ${isActive && isOver ? "over" : ""}`

  return portal && target && createPortal(
    <>
      <div ref={setNodeRef} className={classes} style={style} />
      { isOver && hintString &&
        <DropHint hintText={hintString} />
      }
    </>,
    portal
  )
}
