import React, { useEffect, useRef } from "react"

const kFocusableSelectors =
  'a[href], area[href], input:not([disabled]), button:not([disabled]), select:not([disabled]),' +
  ' textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Creates a focus trap using invisible sentinel elements placed at the start
 * and end of a container. When focus reaches a sentinel (via Tab past the
 * last element or Shift+Tab before the first), it wraps to the appropriate end.
 *
 * @param externalRef optional ref to use as the trap container instead of the
 *   hook's own internal ref. Useful when the caller already has a container ref
 *   (e.g. InspectorPalette's paletteRef).
 */
export function useFocusTrap(externalRef?: React.RefObject<HTMLElement | null>) {
  const internalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = externalRef?.current ?? internalRef.current
    if (!container) return

    let tabDirection: "forward" | "backward" = "forward"

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        tabDirection = e.shiftKey ? "backward" : "forward"
      }
    }

    const getFocusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(kFocusableSelectors))
        .filter(el => el.offsetParent !== null && !el.closest('[aria-hidden="true"]'))

    const createSentinel = () => {
      const el = document.createElement("div")
      el.tabIndex = 0
      el.setAttribute("aria-hidden", "true")
      el.style.cssText = "height: 0; opacity: 0; overflow: hidden; position: absolute; width: 1px;"
      return el
    }

    const startSentinel = createSentinel()
    const endSentinel = createSentinel()
    container.insertBefore(startSentinel, container.firstChild)
    container.appendChild(endSentinel)

    const handleSentinelFocus = () => {
      const focusable = getFocusable()
      if (tabDirection === "forward") {
        focusable[0]?.focus()
      } else {
        focusable[focusable.length - 1]?.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown, true)
    startSentinel.addEventListener("focus", handleSentinelFocus)
    endSentinel.addEventListener("focus", handleSentinelFocus)

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true)
      startSentinel.removeEventListener("focus", handleSentinelFocus)
      endSentinel.removeEventListener("focus", handleSentinelFocus)
      startSentinel.remove()
      endSentinel.remove()
    }
  }, [externalRef])

  return { focusTrapRef: internalRef }
}
