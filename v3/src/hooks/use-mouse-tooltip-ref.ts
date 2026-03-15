import React, { useRef } from "react"

// Positions a React Aria Tooltip at the mouse cursor (like a native title tooltip)
// instead of anchoring to the trigger element. Creates a real (detached) DOM element
// whose getBoundingClientRect is overridden to report the last known cursor position.
// A real Element is required because useOverlayPosition calls getComputedStyle on it.
// position:fixed ensures the simpler fixed-position code path is used for coordinates.
export function useMouseTooltipRef() {
  const mousePosRef = useRef({ x: 0, y: 0 })
  const triggerRef = useRef<Element | null>(null)

  if (!triggerRef.current) {
    const el = document.createElement("div")
    el.style.position = "fixed"
    el.getBoundingClientRect = () => ({
      width: 0, height: 0,
      x: mousePosRef.current.x, y: mousePosRef.current.y,
      top: mousePosRef.current.y, left: mousePosRef.current.x,
      right: mousePosRef.current.x, bottom: mousePosRef.current.y,
      toJSON() { return this }
    } as DOMRect)
    triggerRef.current = el
  }

  const onMouseMove = (e: React.MouseEvent) => {
    mousePosRef.current = { x: e.clientX, y: e.clientY }
  }

  return { triggerRef, onMouseMove }
}
