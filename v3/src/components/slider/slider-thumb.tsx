import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, {CSSProperties, useEffect, useState, useRef} from "react"
import {ISliderModel} from "./slider-model"
import { useAxisLayoutContext } from "../axis/models/axis-layout-context"
import ThumbIcon from "../../assets/icons/icon-thumb.svg"

import './slider.scss'
import { ScaleNumericBaseType } from "../axis/axis-types"

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
  const scale = layout.getAxisMultiScale("bottom")
  const numericScale = layout.getAxisScale("bottom") as ScaleNumericBaseType
  const [thumbPos, setThumbPos] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  // offset from center of thumb to pointerDown
  const downOffset = useRef(0)
  const intervalRef = useRef<any>()
  const tickTime = sliderModel.animationRate
  const direction = sliderModel.animationDirection
  const prevDirectionRef = useRef("")
  const axisMax = sliderModel.axis.max
  const axisMin = sliderModel.axis.min
  const maxMinHitsRef = useRef(0)

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

  // slider settings low to high, high to low or back and forth, non-stop or once
  useEffect(() => {
    if (direction === "backAndForth") {
      if (prevDirectionRef.current === "") {
        prevDirectionRef.current = "lowToHigh"
      }
    }

    const id = setInterval(() => {
      if (running) {
        // reset the slider if thumb is already at the end
        if (direction === "lowToHigh" && sliderModel.value >= axisMax) sliderModel.setValue(axisMin)
        if (direction === "highToLow" && sliderModel.value <= axisMin) sliderModel.setValue(axisMax)
        const incrementModifier = direction === "highToLow" ||  prevDirectionRef.current === "highToLow"? -1 : 1
        sliderModel.setValue(sliderModel.value + sliderModel.increment * incrementModifier)
        setThumbPos(numericScale(sliderModel.value + sliderModel.increment * incrementModifier) - kThumbOffset)
        if (sliderModel.animationMode === "nonStop") {
          if (sliderModel.value >= axisMax) {
            if (direction === "lowToHigh") sliderModel.setValue(axisMin)
            if (direction === "backAndForth") {
              sliderModel.setValue(axisMax)
              prevDirectionRef.current = "highToLow"
            }
          }
          if (sliderModel.value <= axisMin) {
            if (direction === "highToLow") sliderModel.setValue(axisMax)
            if (direction === "backAndForth") {
              sliderModel.setValue(axisMin)
              prevDirectionRef.current = "lowToHigh"
            }
          }
        } else {
          if ((direction === "lowToHigh" && sliderModel.value >= axisMax) ||
              (direction === "highToLow" && sliderModel.value <= axisMin)) {
            setRunning(false)
          }
          if (direction === "backAndForth" && maxMinHitsRef.current > 1 &&
              ((sliderModel.value >= axisMax) || (sliderModel.value <=axisMin))) {
            setRunning(false)
            if (sliderModel.value >= axisMax) sliderModel.setValue(axisMax)
            if (sliderModel.value <=axisMin) sliderModel.setValue(axisMin)
          } else {
            if (sliderModel.value >= axisMax) {
              prevDirectionRef.current = "highToLow"
              sliderModel.setValue(axisMax)
              maxMinHitsRef.current += 1
            }
            if (sliderModel.value <=axisMin) {
              prevDirectionRef.current = "lowToHigh"
              sliderModel.setValue(axisMin)
              maxMinHitsRef.current += 1
            }
          }
        }
      }
    }, tickTime)
    intervalRef.current = id

    return () => {
      clearInterval(intervalRef.current)
      maxMinHitsRef.current = 0
    }
  }, [running])

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
