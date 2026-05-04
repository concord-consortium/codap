import React, { useRef } from "react"

// Positions a React Aria Tooltip at the mouse cursor when hovering (like a native title tooltip)
// or at the trigger button when focused via keyboard. Creates a real (detached) DOM element
// whose getBoundingClientRect is overridden to report either the cursor position or the button rect.
// A real Element is required because useOverlayPosition calls getComputedStyle on it.
// position:fixed ensures the simpler fixed-position code path is used for coordinates.
export function useMouseTooltipRef() {
  const mousePosRef = useRef({ x: 0, y: 0 })
  const isMouseRef = useRef(false)
  const buttonElRef = useRef<Element | null>(null)
  const triggerRef = useRef<Element | null>(null)

  if (!triggerRef.current) {
    const el = document.createElement("div")
    el.style.position = "fixed"
    el.getBoundingClientRect = () => {
      if (!isMouseRef.current && buttonElRef.current) {
        return buttonElRef.current.getBoundingClientRect()
      }
      return {
        width: 0, height: 0,
        x: mousePosRef.current.x, y: mousePosRef.current.y,
        top: mousePosRef.current.y, left: mousePosRef.current.x,
        right: mousePosRef.current.x, bottom: mousePosRef.current.y,
        toJSON() { return this }
      }
    }
    triggerRef.current = el
  }

  const onMouseMove = (e: React.MouseEvent) => {
    isMouseRef.current = true
    mousePosRef.current = { x: e.clientX, y: e.clientY }
  }

  const onFocus = (e: React.FocusEvent) => {
    // Only switch to button-anchored positioning for keyboard focus, not pointer-induced focus
    if (e.currentTarget.matches(":focus-visible")) {
      isMouseRef.current = false
      buttonElRef.current = e.currentTarget
    }
  }

  return { triggerRef, onMouseMove, onFocus }
}
