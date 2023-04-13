import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, {CSSProperties, useEffect, useState, useRef} from "react"
import {ISliderModel} from "./slider-model"
import { useAxisLayoutContext } from "../axis/models/axis-layout-context"
import ThumbIcon from "../../assets/icons/icon-thumb.svg"

import './slider.scss'

interface IProps {
  sliderContainer: HTMLDivElement
  sliderModel: ISliderModel
}

// offset from left edge of thumb to center of thumb
const kThumbOffset = 8

export const CodapSliderThumb = observer(function CodapSliderThumb({sliderContainer, sliderModel} : IProps) {
  const layout = useAxisLayoutContext()
  const length = layout.getAxisLength("bottom")
  const scale = layout.getAxisMultiScale("bottom")
  const [thumbPos, setThumbPos] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  // offset from center of thumb to pointerDown
  const downOffset = useRef(0)

  useEffect(() => {
    setThumbPos((scale?.getScreenCoordinate({cell: 0, data: sliderModel.value}) ?? 0) - kThumbOffset)
  }, [length, scale, scale?.length, sliderModel.domain, sliderModel.value])

  const thumbStyle: CSSProperties = {
    left: thumbPos
  }

  useEffect(() => {
    const containerX = sliderContainer?.getBoundingClientRect().x

    const handlePointerMove = (e: PointerEvent) => {
      if ((containerX != null) && isDragging) {
        const pixelTarget = e.clientX + downOffset.current
        const scaledValue = scale?.getDataCoordinate(pixelTarget - containerX).data ?? 0
        if (sliderModel.value < sliderModel.axis.min) { sliderModel.setValue(sliderModel.axis.min) }
          else if (sliderModel.value > sliderModel.axis.max) { sliderModel.setValue(sliderModel.axis.max) }
          else { sliderModel.setValue(scaledValue) }
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

  return (
    <ThumbIcon
      className={clsx("slider-thumb-icon", { dragging: isDragging })}
      onPointerDown={handlePointerDown}
      style={thumbStyle}
    />
  )
})
