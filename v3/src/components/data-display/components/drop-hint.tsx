import {useDndMonitor} from "@dnd-kit/core"
import {useRef, useState} from "react"
import { useContainerDragScrollOffset } from "../../../hooks/use-controller-drag-scroll-offset"

import "./drop-hint.scss"

interface IProps {
  hintText: string | undefined
  isVisible?: boolean
}

export const DropHint = ({ hintText, isVisible }: IProps) => {
  const hintDiv = useRef<HTMLDivElement>(null)
  const [hintPos, setHintPos] = useState<{ left: number, top: number }>({ left: 0, top: 0 })
  const { left, top } = useContainerDragScrollOffset()

  useDndMonitor({
    onDragMove(event) {
      const ae = event.activatorEvent as PointerEvent
      const { delta } = event
      const newXPos = delta.x + ae.clientX
      const newYPos = delta.y + ae.clientY
      if (hintDiv.current) {
        setHintPos({
          left: newXPos - (hintDiv.current?.clientWidth * .5) - 5 - left,
          top: newYPos - 40 - top
        })
      }
    }
  })

  if (!isVisible || !hintText) return null

  return (
    <div ref={hintDiv} className="drop-hint" style={{ top: hintPos.top, left: hintPos.left }}>
      {hintText}
    </div>
  )
}
