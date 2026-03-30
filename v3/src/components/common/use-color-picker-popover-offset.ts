import { useCallback, useRef, useState } from "react"

/**
 * Manages popover offset for color picker palettes that expand via a "More" button.
 * When the expanded content would overflow the viewport bottom, computes a negative
 * offset to shift the popover upward so it remains fully visible.
 *
 * Returns `popoverRef` (attach to Popover), `popoverOffset` (pass to `offset` or
 * `crossOffset` depending on placement), `handleExpandedChange` (pass to
 * ColorPickerPalette's `onExpandedChange`), and `resetPopoverOffset` (call when the
 * popover closes).
 */
export function useColorPickerPopoverOffset() {
  const [popoverOffset, setPopoverOffset] = useState(0)
  const popoverRef = useRef<HTMLElement>(null)

  const handleExpandedChange = useCallback((expanded: boolean) => {
    if (!expanded) {
      setPopoverOffset(0)
      return
    }

    const el = popoverRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    // Approximate additional height (px) when the color picker expands via "More":
    // react-colorful controls (~200px) + action buttons and spacing (~80px).
    // If the expanded layout changes, inspect the popover height before/after to recalibrate.
    const expandedAddition = 280
    const viewportHeight = window.innerHeight
    const padding = 8
    const overflow = (rect.bottom + expandedAddition) - viewportHeight + padding
    if (overflow > 0) {
      // Don't shift so far up that the top goes above the viewport
      const maxShift = Math.max(0, rect.top - padding)
      const shift = Math.min(overflow, maxShift)
      setPopoverOffset(-shift)
    }
  }, [])

  const resetPopoverOffset = useCallback(() => {
    setPopoverOffset(0)
  }, [])

  return { popoverRef, popoverOffset, handleExpandedChange, resetPopoverOffset } as const
}
