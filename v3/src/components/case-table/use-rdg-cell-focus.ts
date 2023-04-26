import { useEffect } from "react"

export function useRdgCellFocus(cell: HTMLDivElement | null, button: HTMLButtonElement | null) {
  useEffect(() => {
    // During cell navigation, RDG sets the focus to the .rdg-cell. For keyboard invocation
    // of the index column menu, however, the focus needs to be on the Chakra MenuButton.
    // Therefore, we intercept attempts to focus the .rdg-cell and focus our content instead.

    const handleFocus = (e: FocusEvent) => {
      // if the parent was focused, focus the child
      if (e.target === e.currentTarget) {
        button?.focus()
      }
    }

    cell?.addEventListener("focusin", handleFocus)
    return () => {
      cell?.removeEventListener("focusin", handleFocus)
    }
  }, [button, cell])
}
