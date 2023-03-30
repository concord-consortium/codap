import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, {CSSProperties, useEffect, useState, useRef} from "react"
import {ISliderModel} from "./slider-model"
import { ScaleNumericBaseType } from "../axis/axis-types"
import { useAxisLayoutContext } from "../axis/models/axis-layout-context"
import ThumbIcon from "../../assets/icons/icon-thumb.svg"

import './slider.scss'

interface IProps {
  sliderContainer: HTMLDivElement
  sliderModel: ISliderModel
  running: boolean
  setRunning: (running: boolean)=>void
}

// offset from left edge of thumb to center of thumb
const kThumbOffset = 8

export const CodapSliderThumb = observer(function CodapSliderThumb({sliderContainer, sliderModel,
    running, setRunning} : IProps) {
  const layout = useAxisLayoutContext()
  const length = layout.getAxisLength("bottom")
  const scale = layout.getAxisScale("bottom") as ScaleNumericBaseType
  const [thumbPos, setThumbPos] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  // offset from center of thumb to pointerDown
  const downOffset = useRef(0)
  const intervalRef = useRef<any>()
  const tickTime = sliderModel.animationRate
  const runCount = useRef(0)
  const direction = sliderModel.animationDirection

  useEffect(() => {
    setThumbPos(scale(sliderModel.value) - kThumbOffset)
  }, [length, scale, sliderModel.domain, sliderModel.value])

  const thumbStyle: CSSProperties = {
    left: thumbPos
  }

  useEffect(() => {
    const containerX = sliderContainer?.getBoundingClientRect().x

    const handlePointerMove = (e: PointerEvent) => {
      if ((containerX != null) && isDragging) {
        const pixelTarget = e.clientX + downOffset.current
        const scaledValue = scale.invert(pixelTarget - containerX)
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

  useEffect(() => {
      if (running) {
    if (direction === "lowToHigh" && sliderModel.value >= sliderModel.axis.max)
    { sliderModel.setValue(sliderModel.axis.min) }
    if (direction === "highToLow" && sliderModel.value <= sliderModel.axis.min)
    { sliderModel.setValue(sliderModel.axis.max) }
  }
  }, [running])

  // control slider value with play/pause
  useEffect(() => {
    const incrementModifier = direction === "highToLow" ? -1 : 1

    if ((direction === "lowToHigh" && sliderModel.value < sliderModel.axis.max) ||
        (direction === "highToLow" && sliderModel.value > sliderModel.axis.min)) {
      console.log("sliderModel.value:", sliderModel.value)

      if (direction === "lowToHigh" && sliderModel.value >= sliderModel.axis.max)
        { sliderModel.setValue(sliderModel.axis.min) }
      if (direction === "highToLow" && sliderModel.value <= sliderModel.axis.min)
        { sliderModel.setValue(sliderModel.axis.max) }

      const id = setInterval(() => {
        running &&
          sliderModel.setValue(sliderModel.value + sliderModel.increment * incrementModifier)
        if (sliderModel.animationMode === "nonStop") {
          if (direction === "lowToHigh" && sliderModel.value >= sliderModel.axis.max) {
            sliderModel.setValue(sliderModel.axis.min)
          }
          if (direction === "highToLow" && sliderModel.value <= sliderModel.axis.min) {
            sliderModel.setValue(sliderModel.axis.max)
          }
        }
      }, tickTime)
      intervalRef.current = id
      runCount.current = 1
    } else {
      setRunning(false)
    }
    
    return () => clearInterval(intervalRef.current)
  })

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
