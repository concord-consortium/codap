import { clsx } from "clsx"
import React from "react"
import { kTitleBarHeight } from "./constants"

interface IProps {
  componentRef: React.RefObject<HTMLDivElement | null>
  containerRef: React.RefObject<HTMLElement | null>
  edge: "left" | "right" | "bottom"
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void
}

export function ComponentResizeBorder({ componentRef, containerRef, edge, onPointerDown }: IProps) {
  const kOverlap = 2
  const kResizeBorderSize = 8
  const kResizeHandleSize = 22

  let top = 0
  let left = 0
  let width: Maybe<number>
  let height: Maybe<number>

  const componentBounds = componentRef.current?.getBoundingClientRect()
  const containerBounds = containerRef.current?.getBoundingClientRect()
  if (componentBounds && containerBounds) {
    switch (edge) {
      case "left":
        top = componentBounds.top - containerBounds.top + kTitleBarHeight
        left = componentBounds.left - containerBounds.left - kResizeBorderSize + kOverlap
        height = componentBounds.height - kTitleBarHeight
        break
      case "right":
        top = componentBounds.top - containerBounds.top + kTitleBarHeight
        left = componentBounds.right - containerBounds.left - kOverlap
        height = componentBounds.height - kTitleBarHeight - kResizeHandleSize
        break
      case "bottom":
        top = componentBounds.bottom - containerBounds.top - kOverlap
        left = componentBounds.left - containerBounds.left
        width = componentBounds.width - kResizeHandleSize
    }
  }

  if (!onPointerDown) return null

  const classes = clsx("codap-component-border", edge)
  const style: React.CSSProperties = { left, top, width, height }

  return (
    <div className={classes} style={style} onPointerDown={onPointerDown}/>
  )
}
