import { useEffect } from "react"

/**
 * Watches for the target element being removed from the document.
 * Fires `onRemoved` once when the element is no longer connected.
 */
export function useTargetWatcher(target: HTMLElement, onRemoved: () => void) {
  useEffect(() => {
    if (!target.isConnected) {
      onRemoved()
      return
    }
    const observer = new MutationObserver(() => {
      if (!target.isConnected) {
        onRemoved()
        observer.disconnect()
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [target, onRemoved])
}
