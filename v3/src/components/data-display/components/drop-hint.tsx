import {useDndMonitor} from "@dnd-kit/core"
import React, {useRef, useState} from "react"
import { getScrollDifference } from "../../../hooks/use-scrollable-container"

import "./drop-hint.scss"

interface IProps {
  hintText: string | undefined
}

export const DropHint = ({ hintText }: IProps) => {
  const hintDiv = useRef<HTMLDivElement>(null)
  const [hintPos, setHintPos] = useState<{ left: number, top: number }>({ left: 0, top: 0 })

  useDndMonitor({
    onDragMove(event) {
      const ae = event.activatorEvent as PointerEvent
      const { delta } = event
      const newXPos = delta.x + ae.clientX
      const newYPos = delta.y + ae.clientY
      if (hintDiv.current) {
        const { left, top } = getScrollDifference()
        setHintPos({
          left: newXPos - (hintDiv.current?.clientWidth * .5) - 5 - left,
          top: newYPos - 40 - top
        })
      }
    }
  })

  return (
    <div ref={hintDiv} className="drop-hint" style={{ top: hintPos.top, left: hintPos.left }}>
      {hintText}
    </div>
  )
}
