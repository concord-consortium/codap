
import { useMemo } from "react"
import { kDefaultSliderWidth, kDefaultSliderPadding, SliderModel } from "./slider-model"

export const useCodapSlider = () => {
  return useMemo(() => {
    return SliderModel.create({name: "v1"})
  },[])
}

export const useCodapSliderLayout = () => {
  const determineSliderWidth = () => {
    return kDefaultSliderWidth + (kDefaultSliderPadding * 2)
  }
  return {
    sliderWidth: determineSliderWidth(),
  }
}
