import React, { useRef } from "react"

/**
 * Creates a focus trap that keeps Tab/Shift+Tab cycling within a container.
 * Queries for visible, interactive elements and filters out hidden ones.
 *
 * @param externalRef optional ref to use as the trap container instead of the
 *   hook's own internal ref. Useful when the caller already has a container ref
 *   (e.g. InspectorPalette's paletteRef).
 */
export function useFocusTrap(externalRef?: React.RefObject<HTMLElement | null>) {
  const internalRef = useRef<HTMLDivElement>(null)

  const handleFocusTrapKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return
    const container = externalRef?.current ?? internalRef.current
    if (!container) return
    const focusable = Array.from(container.querySelectorAll<HTMLElement>(
      'a[href], area[href], input, button, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter(el => el.offsetParent !== null && !el.closest('[aria-hidden="true"]'))
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return { focusTrapRef: internalRef, handleFocusTrapKeyDown }
}
