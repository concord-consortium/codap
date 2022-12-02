
import { useMemo } from "react"
import { SliderModel } from "../../components/slider/slider-model"

export const useSlider = () => {
  return useMemo(() => {
    return SliderModel.create({name: "v1"})
  },[])
}
