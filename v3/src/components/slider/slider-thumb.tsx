import { observer } from "mobx-react-lite"
import React, {CSSProperties, useEffect, useState, useRef} from "react"
import {ISliderModel} from "./slider-model"
import { ScaleNumericBaseType } from "../axis/axis-types"
import { useAxisLayoutContext } from "../axis/models/axis-layout-context"
import ThumbIcon from "../../assets/icons/icon-thumb.svg"

import './slider.scss'

interface IProps {
  sliderModel: ISliderModel
}

export const CodapSliderThumb = observer(({sliderModel} : IProps) => {
  const layout = useAxisLayoutContext()
  const length = layout.getAxisLength("bottom")
  const scale = layout.getAxisScale("bottom") as ScaleNumericBaseType
  const wholeSlider = document.querySelector(".slider-wrapper")
  const componentX = wholeSlider?.getBoundingClientRect().x
  const [thumbPos, setThumbPos] = useState(0)
  const mouseDownX = useRef(0)

  useEffect(() => {
    const kThumbOffset = 8
    setThumbPos(scale(sliderModel.value) - kThumbOffset)
  }, [length, scale, sliderModel.domain, sliderModel.value])

  const thumbStyle: CSSProperties = {
    position: "absolute",
    left: thumbPos,
    top: 60
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    mouseDownX.current = e.clientX
    if (wholeSlider) {
      wholeSlider.addEventListener("pointermove", (ev) => handlePointerMove(ev as any))
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const targetElt = e.target as HTMLElement
    const dragOk = !targetElt.classList.contains("dragRect")
    if (componentX && dragOk) {
      const pixelTarget = e.clientX - componentX
      const scaledValue = scale.invert(pixelTarget)
      sliderModel.setValue(scaledValue)
    }
  }

  return (
     <ThumbIcon
      onPointerDown={handlePointerDown}
      style={thumbStyle}
      className="slider-thumb-svg"
    />
  )
})

