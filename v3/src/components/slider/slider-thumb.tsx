import { observer } from "mobx-react-lite"
import React, {CSSProperties, useEffect, useState} from "react"
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
  const [thumbPos, setThumbPos] = useState(0)

  useEffect(() => {
    const kThumbOffset = 8
    setThumbPos(scale(sliderModel.value) - kThumbOffset)
  }, [length, scale, sliderModel.domain, sliderModel.value])

  const thumbStyle: CSSProperties = {
    position: "absolute",
    left: thumbPos,
    top: 60
  }

  return <ThumbIcon style={thumbStyle}/>
})
