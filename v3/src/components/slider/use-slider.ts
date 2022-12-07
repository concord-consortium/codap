import { useMemo } from "react"
import { SliderModel } from "./slider-model"

export const useCodapSlider = () => {
  return useMemo(() => {
    return SliderModel.create({name: "v1"})
  },[])
}
