
import { useMemo } from "react"
import { kDefaultSliderWidth, SliderModel } from "./slider-model"

export const useCodapSlider = () => {
  return useMemo(() => {
    return SliderModel.create({name: "v1"})
  },[])
}


export const useCodapSliderLayout = () => {
  // TODO: const calculatedWidth = function(lots of stuff)
  const calculatedWidth = kDefaultSliderWidth
  return {
    sliderWidth: calculatedWidth
  }
}
