import { useMemo } from "react"
import { SliderModel } from "./slider-model"

export const useCodapSlider = () => {
  return useMemo(() => {
    return SliderModel.create({ globalValue: { name: "v1", value: 0.5 }})
  }, [])
}
