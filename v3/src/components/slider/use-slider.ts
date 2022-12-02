
import { useMemo } from "react"
import { kSliderDefaultWidth, SliderModel } from "../../components/slider/slider-model"

export const useSlider = () => {
  return useMemo(() => {
    return SliderModel.create({name: "v1"})
  },[])
}


export const useSliderLayout = () => {
  // TODO: const calculatedWidth = function(lots of stuff)
  const calculatedWidth = kSliderDefaultWidth
  return {
    sliderWidth: calculatedWidth
  }
}