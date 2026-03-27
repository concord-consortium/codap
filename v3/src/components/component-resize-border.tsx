import { autoUpdate, offset, size, useFloating } from "@floating-ui/react"
import { clsx } from "clsx"
import React, { useEffect } from "react"
import { useFreeTileLayoutContext } from "../hooks/use-free-tile-layout-context"
import { kResizeBorderOverlap } from "./constants"

interface IProps {
  componentRef: React.RefObject<HTMLElement | null>
  edge: "left" | "right" | "bottom"
  tileId?: string
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void
}

export function ComponentResizeBorder({ componentRef, edge, tileId, onPointerDown }: IProps) {

  const tileLayout = useFreeTileLayoutContext()
  const { zIndex } = tileLayout || { zIndex: 1 }  // So that borders are selectable when overlapping other components
  // Use floating-ui for positioning
  const { elements: { reference }, refs: { setFloating, setReference }, floatingStyles } = useFloating({
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
    // The animationFrame option polls for position changes via requestAnimationFrame,
    // which is necessary because autoUpdate's default observers don't detect moves from
    // CSS left/top changes (only resizes via ResizeObserver).
    whileElementsMounted: (ref, floating, updateFn) =>
      autoUpdate(ref, floating, updateFn, { animationFrame: true })
  })

  // Attach the reference ref to your component
  useEffect(() => {
    if (componentRef.current && reference !== componentRef.current) {
      setReference(componentRef.current)
    }
  }, [componentRef, reference, setReference])

  if (!onPointerDown) return null

  const classes = clsx("codap-component-border", edge)

  return (
    <div
      aria-hidden="true"
      ref={setFloating}
      className={classes}
      style={{ ...floatingStyles, zIndex }}
      onPointerDown={onPointerDown}
      data-testid={tileId ? `resize-border-${tileId}-${edge}` : `resize-border-${edge}`}
    />
  )
}
