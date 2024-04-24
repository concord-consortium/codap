import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, {CSSProperties, useEffect, useState, useRef} from "react"
import ThumbIcon from "../../assets/icons/icon-thumb.svg"
import { isAliveSafe } from "../../utilities/mst-utils"
import { useAxisLayoutContext } from "../axis/models/axis-layout-context"
import { ISliderModel } from "./slider-model"
import { valueChangeNotification } from "./slider-utils"
import { useSliderAnimation } from "./use-slider-animation"

import './slider.scss'

interface IProps {
  sliderContainer: HTMLDivElement
  sliderModel: ISliderModel
  running: boolean
  setRunning: (running: boolean)=>void
}

// offset from left edge of thumb to center of thumb
const kThumbOffset = 10

export const CodapSliderThumb = observer(function CodapSliderThumb({
  sliderContainer, sliderModel: _sliderModel, running, setRunning
} : IProps) {
  const sliderModel = isAliveSafe(_sliderModel) ? _sliderModel : undefined
  const layout = useAxisLayoutContext()
  const scale = layout.getAxisMultiScale("bottom")
  const [isDragging, setIsDragging] = useState(false)
  // offset from center of thumb to pointerDown
  const downOffset = useRef(0)
  const thumbPos = (scale?.getScreenCoordinate({cell: 0, data: sliderModel?.value ?? 0}) ?? 0) - kThumbOffset
  const thumbStyle: CSSProperties = {
    left: thumbPos
  }

  // forces thumbnail to rerender when axis bounds change
  sliderModel?.axis.domain // eslint-disable-line no-unused-expressions

  useEffect(() => {
    const containerX = sliderContainer?.getBoundingClientRect().x

    function getSliderValueFromEvent(e: PointerEvent) {
      if ((containerX != null) && isDragging) {
        const pixelTarget = e.clientX + downOffset.current
        return scale?.getDataCoordinate(pixelTarget - containerX).data ?? 0
      }
    }

    const handlePointerMove = (e: PointerEvent) => {
      const sliderValue = getSliderValueFromEvent(e)
      if (sliderValue != null && sliderModel) {
        sliderModel.applyModelChange(
          () => sliderModel.setDynamicValue(sliderValue),
          { notification: () => valueChangeNotification(sliderModel.value, sliderModel.name) }
        )
      }
      e.preventDefault()
      e.stopImmediatePropagation()
    }

    const handlePointerUp = (e: PointerEvent) => {
      const sliderValue = getSliderValueFromEvent(e)
      if (sliderValue != null) {
        sliderModel?.applyModelChange(
          () => sliderModel.setValue(sliderValue),
          {
            undoStringKey: "DG.Undo.slider.change",
            redoStringKey: "DG.Redo.slider.change"
          }
        )
      }
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
      data-testid="slider-thumb-icon"
    />
  )
})
