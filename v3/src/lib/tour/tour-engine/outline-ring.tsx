import { autoUpdate, FloatingPortal } from "@floating-ui/react"
import { observer } from "mobx-react-lite"
import { useEffect, useState } from "react"
import { EngineLiveState } from "./tour-engine-state"

interface OutlineRingProps { target: HTMLElement, state: EngineLiveState }

interface RingRect { top: number, left: number, width: number, height: number }

export const OutlineRing = observer(function OutlineRing({ target, state }: OutlineRingProps) {
  const [rect, setRect] = useState<RingRect | null>(null)
  const refreshTick = state.refreshTick

  useEffect(() => {
    const measure = () => {
      const r = target.getBoundingClientRect()
      const next: RingRect = {
        top: r.top - 2, left: r.left - 2, width: r.width + 4, height: r.height + 4
      }
      setRect(prev =>
        prev?.top === next.top && prev?.left === next.left
            && prev?.width === next.width && prev?.height === next.height
          ? prev
          : next
      )
    }
    // We use autoUpdate purely for its scroll/resize/layout-change subscription;
    // its positioning output is ignored — `measure` reads target.getBoundingClientRect()
    // directly. document.body is passed as the (unused) floating element.
    // See CODAP-1231 spec § "OutlineRing positioning — not useFloating".
    const cleanup = autoUpdate(target, document.body, measure)
    return cleanup
  }, [target, refreshTick])

  if (!rect) return null

  return (
    <FloatingPortal>
      <div
        aria-hidden="true"
        data-testid="codap-tour-outline-ring"
        style={{
          position: "fixed",
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          pointerEvents: "none",
          border: "2px solid var(--codap-tour-ring-color)",
          borderRadius: "4px",
          zIndex: 10000,
          boxSizing: "border-box",
        }}
      />
    </FloatingPortal>
  )
})
