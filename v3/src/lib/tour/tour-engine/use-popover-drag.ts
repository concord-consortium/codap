import { useCallback, useEffect, useRef, useState } from "react"

export interface PopoverDragState {
  position: { x: number, y: number } | null
  isDragging: boolean
  onPointerDown: (e: React.PointerEvent) => void
}

export function usePopoverDrag(
  resetKey: unknown,
  popoverEl: HTMLElement | null
): PopoverDragState {
  const [position, setPosition] = useState<{ x: number, y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  // Cleanup for any in-flight drag. Lets us tear down document listeners if the
  // hook unmounts (e.g. target removed mid-drag → tour cancelled) before pointerup.
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    setPosition(null)
    setIsDragging(false)
  }, [resetKey])

  useEffect(() => () => { cleanupRef.current?.() }, [])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!popoverEl) return
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest("button, input, select, textarea, a")) return
    e.preventDefault()
    // Tear down any orphaned listeners from a prior gesture that never received pointerup
    // (browser quirks, devtools focus loss, swallowed events). Without this, leaked move
    // handlers from earlier gestures fight the new one and the popover jitters between
    // their stale closures.
    cleanupRef.current?.()

    const rect = popoverEl.getBoundingClientRect()
    const grabX = e.clientX - rect.left
    const grabY = e.clientY - rect.top
    const popW = rect.width
    const popH = rect.height
    const padding = 8

    setIsDragging(true)

    const onMove = (ev: PointerEvent) => {
      const newX = ev.clientX - grabX
      const newY = ev.clientY - grabY
      const maxX = window.innerWidth - popW - padding
      const maxY = window.innerHeight - popH - padding
      setPosition({
        x: Math.max(padding, Math.min(newX, maxX)),
        y: Math.max(padding, Math.min(newY, maxY))
      })
    }
    const detach = () => {
      document.removeEventListener("pointermove", onMove)
      document.removeEventListener("pointerup", onUp)
      document.removeEventListener("pointercancel", onUp)
      cleanupRef.current = null
    }
    const onUp = () => {
      setIsDragging(false)
      detach()
    }
    cleanupRef.current = detach
    document.addEventListener("pointermove", onMove)
    document.addEventListener("pointerup", onUp)
    document.addEventListener("pointercancel", onUp)
  }, [popoverEl])

  return { position, isDragging, onPointerDown }
}
