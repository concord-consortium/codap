import { useEffect, type RefObject } from "react"

export function useParentChildFocusRedirect(
  parentRef: RefObject<HTMLElement | null>,
  childRef: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    // During cell navigation, RDG sets the focus to the .rdg-cell. For keyboard invocation
    // of the index column menu, however, the focus needs to be on the Chakra MenuButton.
    // Therefore, we intercept attempts to focus the .rdg-cell and focus our content instead.
    // We accept ref objects (not .current values) so the handler always reads the latest
    // element, even after transitions like Input → MenuButton where the ref is set during commit.
    const parent = parentRef.current

    const handleFocus = (e: FocusEvent) => {
      // if the parent was focused, focus the child
      if (e.target === e.currentTarget) {
        childRef.current?.focus()
      }
    }

    parent?.addEventListener("focusin", handleFocus)
    return () => {
      parent?.removeEventListener("focusin", handleFocus)
    }
  }, [parentRef, childRef])
}
