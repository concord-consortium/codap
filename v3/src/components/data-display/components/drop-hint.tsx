import {useDndMonitor} from "@dnd-kit/core"
import {useRef, useState} from "react"

import "./drop-hint.scss"

interface IProps {
  hintText: string | undefined
  isVisible?: boolean
}

export const DropHint = ({ hintText, isVisible }: IProps) => {
  const hintDiv = useRef<HTMLDivElement>(null)
  const [hintPos, setHintPos] = useState<{ left: number, top: number }>({ left: 0, top: 0 })

  useDndMonitor({
    onDragMove() {
      const overlayEl = document.querySelector<HTMLElement>(".attribute-drag-overlay")
      if (!overlayEl || !hintDiv.current) return
      const rect = overlayEl.getBoundingClientRect()
      setHintPos({
        left: rect.left + rect.width / 2,
        top: rect.top - 2
      })
    }
  })

  if (!isVisible || !hintText) return null

  return (
    <div ref={hintDiv} className="drop-hint" style={{ top: hintPos.top, left: hintPos.left }}>
      {hintText}
    </div>
  )
}
