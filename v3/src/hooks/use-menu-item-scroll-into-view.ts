import React, { useCallback } from "react"

/**
 * Returns a focus event handler for a Chakra MenuList that scrolls
 * the focused menuitem into view. This ensures that magnification/zoom
 * users and keyboard navigators can always see the focused item,
 * even in long scrollable menus.
 *
 * Usage: <MenuList onFocus={handleMenuItemFocus}>
 */
export function useMenuItemScrollIntoView() {
  return useCallback((e: React.FocusEvent) => {
    const el = e.target as HTMLElement
    if (el.getAttribute("role") === "menuitem") {
      el.scrollIntoView({ block: "nearest" })
    }
  }, [])
}
