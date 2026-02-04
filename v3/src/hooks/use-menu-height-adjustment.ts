import { RefObject, useEffect, useState } from "react"

interface UseMenuHeightAdjustmentOptions {
  menuRef: RefObject<HTMLDivElement | null>
  containerRef?: RefObject<HTMLDivElement | null>  // container element (e.g., .codap-container)
  isOpen: boolean
  marginBottom?: number  // minimum margin from bottom of container (default: 8)
  marginTop?: number     // minimum margin from top of container (default: 8)
}

/**
 * Hook that dynamically adjusts a menu's max-height when it would otherwise
 * render partially offscreen. Measures the menu position after render and
 * calculates the available space, returning an adjusted maxHeight value.
 */
export function useMenuHeightAdjustment({
  menuRef,
  containerRef,
  isOpen,
  marginBottom = 8,
  marginTop = 8
}: UseMenuHeightAdjustmentOptions): string | undefined {
  const [maxHeight, setMaxHeight] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!isOpen) {
      setMaxHeight(undefined)
      return
    }

    // Use requestAnimationFrame to wait for the menu to be rendered and positioned
    const rafId = requestAnimationFrame(() => {
      const menuElement = menuRef.current
      const containerElement = containerRef?.current

      if (!menuElement) return

      const menuRect = menuElement.getBoundingClientRect()

      // Use container bounds if available, otherwise fall back to viewport
      let containerTop: number
      let containerBottom: number
      if (containerElement) {
        const containerRect = containerElement.getBoundingClientRect()
        containerTop = containerRect.top
        containerBottom = containerRect.bottom
      } else {
        containerTop = 0
        containerBottom = window.innerHeight
      }

      // Calculate available space above and below the menu's current position
      // relative to the container bounds
      const spaceBelow = containerBottom - menuRect.top - marginBottom
      const spaceAbove = menuRect.bottom - containerTop - marginTop

      // Check if menu extends below container
      if (menuRect.bottom > containerBottom - marginBottom) {
        // Calculate the height that would fit
        const adjustedHeight = Math.max(100, spaceBelow) // minimum 100px
        setMaxHeight(`${adjustedHeight}px`)
      }
      // Check if menu extends above container (can happen with placement="auto")
      else if (menuRect.top < containerTop + marginTop) {
        // If menu was placed above and extends off top, limit its height
        const adjustedHeight = Math.max(100, spaceAbove)
        setMaxHeight(`${adjustedHeight}px`)
      }
      else {
        // Menu fits fine, no adjustment needed
        setMaxHeight(undefined)
      }
    })

    return () => cancelAnimationFrame(rafId)
  }, [isOpen, menuRef, containerRef, marginBottom, marginTop])

  return maxHeight
}
