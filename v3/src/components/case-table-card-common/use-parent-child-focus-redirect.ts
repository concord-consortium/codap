import { useEffect } from "react"

export function useParentChildFocusRedirect(parent: HTMLElement | null, child: HTMLElement | null) {
  useEffect(() => {
    // During cell navigation, RDG sets the focus to the .rdg-cell. For keyboard invocation
    // of the index column menu, however, the focus needs to be on the Chakra MenuButton.
    // Therefore, we intercept attempts to focus the .rdg-cell and focus our content instead.

    const handleFocus = (e: FocusEvent) => {
      // if the parent was focused, focus the child
      if (e.target === e.currentTarget) {
        child?.focus()
      }
    }

    parent?.addEventListener("focusin", handleFocus)
    return () => {
      parent?.removeEventListener("focusin", handleFocus)
    }
  }, [child, parent])
}
