import { Active, useDroppable } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import React, { CSSProperties } from "react"
import { createPortal } from "react-dom"
import { AxisPlace } from "../axis-types"
import { useAxisBounds } from "../hooks/use-axis-bounds"
import { DropHint } from "../../graph/components/drop-hint"

interface IProps {
  place: AxisPlace
  portal: HTMLElement | null
  target: SVGGElement | null
  dropId: string
  hintString?: string
  onIsActive?: (active: Active) => boolean
}
export const DroppableAxis = observer(({ place, portal, target, dropId, hintString, onIsActive }: IProps) => {
  const axisBounds = useAxisBounds(place)

  const { active, isOver, setNodeRef } = useDroppable({ id: dropId })
  const isActive = active && onIsActive?.(active)

  // calculate the position of the overlay
  const style: CSSProperties = { ...axisBounds }
  const classes =
    `droppable-axis droppable-svg ${place} ${isActive ? "active" : ""} ${isActive && isOver ? "over" : ""}`

  return portal && target && createPortal(
    <>
      <div ref={setNodeRef} className={classes} style={style} />
      { isOver && hintString &&
        <DropHint hintText={hintString} />
      }
    </>,
    portal
  )
})
