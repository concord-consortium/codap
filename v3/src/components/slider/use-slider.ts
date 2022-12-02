
import { useMemo } from "react"
import { kSliderDefaultWidth, SliderModel } from "./slider-model"

export const useCodapSlider = () => {
  return useMemo(() => {
    return SliderModel.create({name: "v1"})
  },[])
}


export const useCodapSliderLayout = () => {
  // TODO: const calculatedWidth = function(lots of stuff)
  const calculatedWidth = kSliderDefaultWidth
  return {
    sliderWidth: calculatedWidth
  }
}
