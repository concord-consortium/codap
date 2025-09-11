import {useDndMonitor} from "@dnd-kit/core"
import React, {useRef, useState} from "react"
import { kDragContainerClass } from "../../container/container-constants"

import "./drop-hint.scss"

interface IProps {
  hintText: string | undefined
}

export const DropHint = ({ hintText }: IProps) => {
  const hintDiv = useRef<HTMLDivElement>(null)
  const [hintPos, setHintPos] = useState<{ left: number, top: number }>({ left: 0, top: 0 })
  // const initialScroll = useRef<{ left: number, top: number }>({ left: 0, top: 0 })

  useDndMonitor({
    // onDragStart() {
    //   const containers = document.getElementsByClassName(kDragContainerClass)
    //   initialScroll.current = {
    //     left: containers.item(0)?.scrollLeft ?? 0,
    //     top: containers.item(0)?.scrollTop ?? 0
    //   }
    //   console.log(`--- initial scroll`, initialScroll.current)
    // },
    onDragMove(event) {
      const ae = event.activatorEvent as PointerEvent
      const { active, delta } = event
      const { initialScrollLeft = 0, initialScrollTop = 0 } = active.data.current || {}
      console.log(`--- initialScroll`, initialScrollLeft, initialScrollTop)
      const newXPos = delta.x + ae.clientX
      const newYPos = delta.y + ae.clientY
      if (hintDiv.current) {
        const containers = document.getElementsByClassName(kDragContainerClass)
        const scrollLeft = (containers.item(0)?.scrollLeft ?? 0) - initialScrollLeft
        const scrollTop = (containers.item(0)?.scrollTop ?? 0) - initialScrollTop
        // const scrollLeft = 0
        // const scrollTop = 0
        // console.log(`--- x, y`, scrollLeft, scrollY)
        setHintPos({
          left: newXPos - (hintDiv.current?.clientWidth * .5) - 5 - scrollLeft,
          top: newYPos - 40 - scrollTop
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
