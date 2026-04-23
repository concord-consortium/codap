import {useDndMonitor} from "@dnd-kit/core"
import {useState} from "react"

import "./drop-hint.scss"

interface IProps {
  hintText: string | undefined
  isVisible?: boolean
}

interface HintPos { left: number; top: number }

// Reads the current attribute drag overlay's bounds and returns the hint's
// target position (horizontally centered on the overlay, 2px above its top).
// Returns null when no overlay is present (e.g., between drags).
function computeHintPos(): HintPos | null {
  const overlayEl = document.querySelector<HTMLElement>(".attribute-drag-overlay")
  if (!overlayEl) return null
  const rect = overlayEl.getBoundingClientRect()
  return { left: rect.left + rect.width / 2, top: rect.top - 2 }
}

export const DropHint = ({ hintText, isVisible }: IProps) => {
  if (!isVisible || !hintText) return null
  return <ActiveDropHint hintText={hintText} />
}

const ActiveDropHint = ({ hintText }: { hintText: string }) => {
  const [hintPos, setHintPos] = useState<HintPos>(() => computeHintPos() ?? { left: 0, top: 0 })

  useDndMonitor({
    onDragMove() {
      const pos = computeHintPos()
      if (pos) setHintPos(pos)
    }
  })

  return (
    <div className="drop-hint" style={{ top: hintPos.top, left: hintPos.left }}>
      {hintText}
    </div>
  )
}
