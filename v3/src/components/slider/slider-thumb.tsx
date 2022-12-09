import React, {CSSProperties, useEffect, useState} from "react"
import {SliderAxisLayout} from "./slider-layout"
import {ISliderModel} from "./slider-model"
import ThumbIcon from "../../assets/icons/icon-thumb.svg"

import './slider.scss'

interface IProps {
  sliderModel: ISliderModel
  layout: SliderAxisLayout
  sliderVal: number
  scaleDomain: any // TODO both Array<number> and number[] raise a compilation issue:
                   // "The type 'readonly [number, number]' cannot be assigned to the mutable type 'number[]'.
}

export const V3SliderThumb = ({sliderModel, layout, sliderVal, scaleDomain} : IProps) => {
  const [thumbPos, setThumbPos] = useState(0)

  useEffect(() => {
    const kThumbOffset = 8
    const thumbValue = layout.axisScale(sliderModel.globalValue.value) - kThumbOffset
    setThumbPos(thumbValue)
    // TODO, still this claims the "long name/original" sliderModel.globalValue.value as a dependency, see other side
  }, [layout, sliderModel.globalValue.value, layout.sliderWidth, scaleDomain, sliderVal])

  const thumbStyle: CSSProperties = {
    position: "absolute",
    left: thumbPos,
    top: 60
  }

  return <ThumbIcon style={thumbStyle}/>
}
