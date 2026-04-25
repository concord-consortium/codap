import { useEffect } from "react"

const WIDGET_ROLES = new Set([
  "menu", "menuitem", "menuitemcheckbox", "menuitemradio",
  "listbox", "option",
  "tree", "treeitem",
  "grid", "gridcell",
  "tablist", "tab",
  "slider", "spinbutton",
  "dialog", "alertdialog",
  "combobox",
])

function isInInteractiveWidget(el: HTMLElement): boolean {
  const withRole = el.closest("[role]")
  if (!withRole) return false
  const role = withRole.getAttribute("role")
  return role != null && WIDGET_ROLES.has(role)
}

interface UseKeyboardControlArgs {
  enabled: boolean
  allowClose: boolean
  popoverEl: HTMLElement | null
  onNext: () => void
  onPrev: () => void
  onClose: () => void
}

export function useKeyboardControl({
  enabled, allowClose, popoverEl, onNext, onPrev, onClose
}: UseKeyboardControlArgs) {
  useEffect(() => {
    if (!enabled) return
    const handler = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      const t = e.target as HTMLElement | null
      const insidePopover = popoverEl && t && popoverEl.contains(t)
      if (!insidePopover) {
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT"
                  || t.isContentEditable || isInInteractiveWidget(t))) {
          return
        }
      }
      switch (e.key) {
        case "ArrowRight": onNext(); break
        case "ArrowLeft":  onPrev(); break
        case "Escape":
          if (!allowClose) return
          onClose()
          break
        default: return
      }
      e.preventDefault()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [enabled, allowClose, popoverEl, onNext, onPrev, onClose])
}
