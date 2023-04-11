import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, {CSSProperties, useEffect, useState, useRef} from "react"
import {ISliderModel} from "./slider-model"
import { useAxisLayoutContext } from "../axis/models/axis-layout-context"
import { useSliderAnimation } from "./use-slider-animation"
import ThumbIcon from "../../assets/icons/icon-thumb.svg"

import './slider.scss'

interface IProps {
  sliderContainer: HTMLDivElement
  sliderModel: ISliderModel
  running: boolean
  setRunning: (running: boolean)=>void
}

// offset from left edge of thumb to center of thumb
export const kThumbOffset = 8

export const CodapSliderThumb = observer(function CodapSliderThumb({sliderContainer, sliderModel,
    running, setRunning} : IProps) {
  const layout = useAxisLayoutContext()
  const scale = layout.getAxisMultiScale("bottom")
  const [isDragging, setIsDragging] = useState(false)
  // offset from center of thumb to pointerDown
  const downOffset = useRef(0)
  const thumbPos = (scale?.getScreenCoordinate({cell: 0, data: sliderModel.value}) ?? 0) - kThumbOffset
  const thumbStyle: CSSProperties = {
    left: thumbPos
  }

  useEffect(() => {
    const containerX = sliderContainer?.getBoundingClientRect().x

    const handlePointerMove = (e: PointerEvent) => {
      if ((containerX != null) && isDragging) {
        const pixelTarget = e.clientX + downOffset.current
        const scaledValue = scale?.getDataCoordinate(pixelTarget - containerX).data ?? 0
        sliderModel.setValue(scaledValue)
      }
      e.preventDefault()
      e.stopImmediatePropagation()
    }

    const handlePointerUp = (e: PointerEvent) => {
      downOffset.current = 0
      setIsDragging(false)
      e.preventDefault()
      e.stopImmediatePropagation()
    }

    if (isDragging) {
      document.addEventListener("pointermove", handlePointerMove, { capture: true })
      document.addEventListener("pointerup", handlePointerUp, { capture: true })
    }

    return () => {
      if (isDragging) {
        document.removeEventListener("pointermove", handlePointerMove, { capture: true })
        document.removeEventListener("pointerup", handlePointerUp, { capture: true })
      }
    }
  }, [isDragging, scale, sliderContainer, sliderModel])

  const handlePointerDown = (e: React.PointerEvent) => {
    const containerX = sliderContainer?.getBoundingClientRect().x
    downOffset.current = thumbPos + kThumbOffset - (e.clientX - containerX)
    setIsDragging(true)
  }

  useSliderAnimation({sliderModel, running, setRunning})

  return (
    <ThumbIcon
      className={clsx("slider-thumb-icon", { dragging: isDragging })}
      onPointerDown={handlePointerDown}
      style={thumbStyle}
    />
  )
})
