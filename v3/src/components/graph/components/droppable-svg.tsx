import { Active, useDroppable } from "@dnd-kit/core"
import React, { CSSProperties, useEffect, useState } from "react"
import { createPortal } from "react-dom"

import "./droppable-svg.scss"

interface IProps {
  className?: string
  portal: HTMLElement | null
  target: SVGGElement | null
  dropId: string
  dropData: any
  onIsActive?: (active: Active) => boolean
}
export const DroppableSvg = ({ className, portal, target, dropId, dropData, onIsActive }: IProps) => {
  const [portalBounds, setPortalBounds] = useState<DOMRect | null>(null)
  const [targetBounds, setTargetBounds] = useState<DOMRect | null>(null)

  const { active, isOver, setNodeRef } = useDroppable({ id: dropId, data: dropData })
  const isActive = active && onIsActive?.(active)

  useEffect(() => {
    // track the bounds of the graph and axis elements
    const observer = target && new ResizeObserver(() => {
      const _portalBounds = portal?.getBoundingClientRect()
      const _targetBounds = target?.getBoundingClientRect()
      _portalBounds && setPortalBounds(_portalBounds)
      _targetBounds && setTargetBounds(_targetBounds)
    })
    target && observer?.observe(target)

    return () => observer?.disconnect()
  }, [portal, target])

  // calculate the position of the overlay
  const left = (targetBounds?.left ?? 0) - (portalBounds?.left ?? 0)
  const top = (targetBounds?.top ?? 0) - (portalBounds?.top ?? 0)
  const style: CSSProperties = targetBounds
                                ? { left, top, width: targetBounds.width, height: targetBounds.height }
                                : {}
  const classes = `droppable-svg ${className} ${isActive ? "active" : ""} ${isOver ? "over" : ""}`
  return portal && createPortal(
    <div ref={setNodeRef} className={classes} style={style} />,
    portal
  )
}
