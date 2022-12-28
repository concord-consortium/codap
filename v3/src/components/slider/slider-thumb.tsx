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

const getComponentX = () => {
  const wholeSlider = document.querySelector(".slider-wrapper")
  const sliderBounds = wholeSlider?.getBoundingClientRect()
  return sliderBounds?.x
}

export const CodapSliderThumb = observer(({sliderModel} : IProps) => {
  const layout = useAxisLayoutContext()
  const length = layout.getAxisLength("bottom")
  const scale = layout.getAxisScale("bottom") as ScaleNumericBaseType
  const [thumbPos, setThumbPos] = useState(0)
  //const [isDragging, setIsDragging] = useState(false)
  const mouseDownX = useRef(0)
  const componentX = getComponentX()

  // when sliderModel.value changes, the thumb position changes
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
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    console.log('mouse went up')
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (componentX) {
      const pixelTarget = e.clientX - componentX
      const scaledValue = scale.invert(pixelTarget)
      sliderModel.setValue(scaledValue)
    }
  }

  return (
     <ThumbIcon
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      style={thumbStyle}
      className="slider-thumb-svg"
    />
  )
})

