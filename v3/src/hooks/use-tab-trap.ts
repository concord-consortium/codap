import React, { useCallback } from "react"
import { kFocusableSelector } from "../accessibility-constants"

interface UseTabTrapOptions {
  containerRef: React.RefObject<HTMLElement | null>
  // Optional function to return additional elements that should be included in the tab order
  // (e.g. resize handles that live outside the tile container in the DOM)
  getAdditionalElements?: () => HTMLElement[]
}

/**
 * Returns an onKeyDown handler that traps Tab/Shift+Tab within a container element,
 * cycling through tabbable elements and wrapping at the boundaries.
 *
 * Only intercepts bare Tab and Shift+Tab — modifier-key shortcuts (Ctrl+., Ctrl+;, etc.)
 * are not affected.
 *
 * Respects roving tabindex: elements with tabindex="-1" are excluded from the Tab cycle,
 * so toolbar items managed by roving focus appear as a single Tab stop.
 */
export function useTabTrap({ containerRef, getAdditionalElements }: UseTabTrapOptions) {
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return
    // Don't interfere with modifier-key shortcuts
    if (e.ctrlKey || e.altKey || e.metaKey) return

    const container = containerRef.current
    if (!container) return

    const isTabbable = (el: HTMLElement) =>
      el.offsetParent !== null
        && !el.closest('[aria-hidden="true"]')
        && !el.closest("[inert]")
        && el.tabIndex !== -1

    const focusable = Array.from(container.querySelectorAll<HTMLElement>(kFocusableSelector))
      .filter(isTabbable)

    // Append any additional elements (e.g. resize handles outside the container)
    const extras = getAdditionalElements?.() ?? []
    const allTabbable = [...focusable, ...extras.filter(isTabbable)]

    if (allTabbable.length === 0) return

    e.preventDefault()

    const currentIndex = allTabbable.indexOf(document.activeElement as HTMLElement)
    let nextIndex: number
    if (e.shiftKey) {
      nextIndex = currentIndex <= 0 ? allTabbable.length - 1 : currentIndex - 1
    } else {
      nextIndex = currentIndex >= allTabbable.length - 1 ? 0 : currentIndex + 1
    }
    allTabbable[nextIndex].focus()
  }, [containerRef, getAdditionalElements])

  return { onKeyDown: handleKeyDown }
}
