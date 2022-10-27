import {useDndMonitor} from "@dnd-kit/core"
import React, {useRef, useState} from "react"

import "./drop-hint.scss"

interface IProps {
  hintText: string | undefined
}

export const DropHint = ({ hintText }: IProps) => {
  const hintDiv = useRef<HTMLDivElement>(null)
  const [hintLeft, setHintLeft] = useState<number>(0)
  const [hintTop, setHintTop] = useState<number>(0)

  useDndMonitor({
    onDragMove(event) {
      const ae = event.activatorEvent as PointerEvent
      const { delta } = event as any
      const newXPos = delta.x + ae.clientX
      const newYPos = delta.y + ae.clientY
      if (hintDiv.current){
        setHintLeft(newXPos - (hintDiv.current?.clientWidth * .5) - 5)
        setHintTop(newYPos - 40)
      }
    }
  })

  return (
    <div ref={hintDiv} className="drop-hint" style={{top: `${hintTop}px`, left: `${hintLeft}px`}}>
      {hintText}
    </div>
  )
}
