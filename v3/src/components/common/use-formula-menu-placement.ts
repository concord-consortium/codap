import React, { useLayoutEffect, useState } from "react"
import { getMenuPlacement, IMenuPlacement, isSamePlacement } from "./formula-insert-menu-position"

/**
 * Positions a formula editor dropdown against the button that opens it, and keeps it on screen.
 *
 * Returns a style to apply to the menu element, or undefined before the first measurement.
 */
export function useFormulaMenuPlacement(
  buttonRef: React.RefObject<HTMLElement | null>,
  menuRef: React.RefObject<HTMLElement | null>,
  maxHeight: number,
  // The element that scrolls, when it is not the menu itself. A menu that clips inside a child
  // never overflows, so its own scrollHeight collapses to whatever maxHeight was last applied —
  // which would then always look like a fit, and the menu could never flip.
  scrollRef?: React.RefObject<HTMLElement | null>
): IMenuPlacement | undefined {
  const [placement, setPlacement] = useState<IMenuPlacement>()

  useLayoutEffect(() => {
    const menuEl = menuRef.current
    const button = buttonRef.current
    if (!menuEl || !button) return

    const contentHeight = () => {
      const scrollEl = scrollRef?.current
      if (!scrollEl) return menuEl.scrollHeight
      // the scrolling child holds the true content height; add the chrome around it
      return scrollEl.scrollHeight + Math.max(menuEl.clientHeight - scrollEl.clientHeight, 0)
    }

    const place = () => {
      const next = getMenuPlacement(button.getBoundingClientRect(), contentHeight(),
                                    maxHeight, window.innerHeight)
      setPlacement(current => isSamePlacement(current, next) ? current : next)
    }
    place()
    // react-aria builds a menu's items in a later pass, so the first measurement can be of a list
    // whose contents have yet to appear — which would read as fitting anywhere. Measure again
    // once it has its real size.
    const observer = new ResizeObserver(place)
    observer.observe(menuEl)
    if (scrollRef?.current) observer.observe(scrollRef.current)
    return () => observer.disconnect()
  }, [buttonRef, menuRef, maxHeight, scrollRef])

  return placement
}
