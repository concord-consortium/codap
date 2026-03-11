import React, { useRef } from "react"

/**
 * Creates a focus trap that keeps Tab/Shift+Tab cycling within a container.
 * Queries for visible, interactive elements and filters out hidden ones —
 * React Aria's <Select> renders a hidden native <select> inside an
 * aria-hidden wrapper that would otherwise be included and break the
 * first/last element detection.
 */
export function useFocusTrap() {
  const formRef = useRef<HTMLDivElement>(null)

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return
    const container = formRef.current
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

  return { formRef, handleFormKeyDown }
}
