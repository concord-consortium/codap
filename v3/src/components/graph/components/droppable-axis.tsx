import { Active, useDroppable } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import React, { CSSProperties, useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { useAxisBounds } from "../hooks/use-axis-bounds"
import { AxisPlace } from "../models/axis-model"
import { DropHint } from "./drop-hint"

import "./droppable-svg.scss"

interface IProps {
  place: AxisPlace
  portal: HTMLElement | null
  target: SVGGElement | null
  dropId: string
  dropData: any
  hintString?: string
  onIsActive?: (active: Active) => boolean
}
export const DroppableAxis = observer(({ place, portal, target, dropId, dropData, hintString, onIsActive }: IProps) => {
  const axisBounds = useAxisBounds(place)
  const [portalBounds, setPortalBounds] = useState<DOMRect | null>(null)
  const [targetBounds, setTargetBounds] = useState<DOMRect | null>(null)

  const { active, isOver, setNodeRef } = useDroppable({ id: dropId, data: dropData })
  const isActive = active && onIsActive?.(active)

  useEffect(() => {
    const _portalBounds = portal?.getBoundingClientRect()
    const _targetBounds = target?.getBoundingClientRect()
    _portalBounds && setPortalBounds(_portalBounds)
    _targetBounds && setTargetBounds(_targetBounds)
  }, [portal, target])

  // calculate the position of the overlay
  const style: CSSProperties = { ...axisBounds }
  const classes = `droppable-axis droppable-svg ${place} ${isActive ? "active" : ""} ${isOver ? "over" : ""}`

  return portal && target && createPortal(
    <>
      <div ref={setNodeRef} className={classes} style={style} />
      { isOver && hintString && targetBounds &&
        <DropHint hintText={hintString} />
      }
    </>,
    portal
  )
})

