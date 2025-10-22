import { autoUpdate, offset, size, useFloating } from "@floating-ui/react"
import { clsx } from "clsx"
import React, { useEffect } from "react"
import { kResizeBorderOverlap } from "./constants"

interface IProps {
  componentRef: React.RefObject<HTMLElement | null>
  edge: "left" | "right" | "bottom"
  tileId?: string
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void
}

export function ComponentResizeBorder({ componentRef, edge, tileId, onPointerDown }: IProps) {

  // Use floating-ui for positioning
  const { elements: { reference }, refs: { setFloating, setReference }, floatingStyles, update } = useFloating({
    placement: edge,
    open: true,
    middleware: [
      offset(-kResizeBorderOverlap),
      size({
        apply({ rects, elements }) {
          if (edge === "bottom") {
            Object.assign(elements.floating.style, {
              width: `${rects.reference.width}px`,
            })
          }
          else {
            Object.assign(elements.floating.style, {
              height: `${rects.reference.height}px`,
            })
          }
        },
      })
    ],
    whileElementsMounted: autoUpdate
  })

  // Attach the reference ref to your component
  useEffect(() => {
    if (componentRef.current && reference !== componentRef.current) {
      setReference(componentRef.current)
    }
    // Note: explicit update shouldn't be required, but without it the border would track
    // tile resizes correctly but not tile moves.
    update()
  })

  if (!onPointerDown) return null

  const classes = clsx("codap-component-border", edge)

  return (
    <div
      ref={setFloating}
      className={classes}
      style={floatingStyles}
      onPointerDown={onPointerDown}
      data-testid={tileId ? `resize-border-${tileId}-${edge}` : `resize-border-${edge}`}
    />
  )
}
