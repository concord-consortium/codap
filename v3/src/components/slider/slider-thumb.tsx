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
    top: 60,
   // backgroundColor: isDragging ? "red" : "transparent"
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    // setIsDragging(true)
    mouseDownX.current = e.clientX
    console.log("downX is: ", mouseDownX.current)

    // console.log({downX, sliderX})
    // if (downX !== foundMouse.current) {
    //   foundMouse.current = downX//set foundMouse.
    // }
    // console.log("mouse went down at foundMouse.current: ", foundMouse.current)

    //console.log("axisBounds is: ", axisBounds)
    // foundMouse.current = getClientX(e.currentTarget)
    // console.log("mouse went down at foundMouse.current: ", foundMouse.current) //set foundMouse.current
    //
    // const axisEdge = getClientX(theAxis)
    // console.log("axisEdge is: ", axisEdge)
    // setIsDragging(true)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    //setIsDragging(false)
    console.log('mouse went up')
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (componentX) {
      const pixelTarget = e.clientX - componentX
      const scaledValue = scale.invert(pixelTarget)
      console.log("scaledValue is: ", scaledValue)
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

