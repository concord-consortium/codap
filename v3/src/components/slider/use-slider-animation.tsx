import { useInterval } from "@chakra-ui/react"
import { useCallback, useEffect, useRef } from "react"
import { ISliderModel } from "./slider-model"
import { FixValueFn, kAnimationDefaults } from "./slider-types"
import { valueChangeNotification } from "./slider-utils"
import { useAxisLayoutContext } from "../axis/models/axis-layout-context"

interface IUseSliderAnimationProps {
  sliderModel?: ISliderModel
  running: boolean
  setRunning: (running: boolean) => void
}

export const useSliderAnimation = ({sliderModel, running, setRunning}: IUseSliderAnimationProps) => {
  const { animationRate, animationDirection, animationMode } = sliderModel || kAnimationDefaults
  const tickTime = 1000 / animationRate
  const direction = animationDirection
  const mode = animationMode
  const prevDirectionRef = useRef("")
  const maxMinHitsRef = useRef(0)
  const axisLayout = useAxisLayoutContext()
  const multiScale = axisLayout.getAxisMultiScale("bottom")

  const getAxisDomain = useCallback(function getAxisDomain(): readonly [number, number] {
    const { axis: { domain } } = sliderModel || { axis: { domain: [0, 10] } }
    return domain
  }, [sliderModel])

  const resetSlider = useCallback((val?: number) => {
    if (!sliderModel) return 0
    const [axisMin, axisMax] = getAxisDomain()
    const sign = animationDirection === "lowToHigh" ? 1 : -1
    const testValue = val || sliderModel.value + sign * (sliderModel.increment ?? 0)
    if (animationDirection === "lowToHigh" && testValue >= axisMax) {
      sliderModel.applyModelChange(
        () => sliderModel.setValue(axisMin),
        { noDirty: true, notify: () => valueChangeNotification(sliderModel.value, sliderModel.name) }
      )
    }
    if (animationDirection === "highToLow" && testValue <= axisMin) {
      sliderModel.applyModelChange(
        () => sliderModel.setValue(axisMax),
        { noDirty: true, notify: () => valueChangeNotification(sliderModel.value, sliderModel.name) }
      )
    }
    return sliderModel.value
  }, [animationDirection, getAxisDomain, sliderModel])

  const updateSlider = useCallback((val: number, min: FixValueFn, max: FixValueFn) => {
    if (sliderModel) {
      sliderModel.applyModelChange(
        () => sliderModel.setValidatedValue(sliderModel.validateValue(val, min, max)),
        { noDirty: true, notify: () => valueChangeNotification(sliderModel.value, sliderModel.name) }
      )
    }
  }, [sliderModel])

  useEffect(()=> {
    running && resetSlider()
  }, [running, resetSlider])

  // Reset the prevDirectionRef to blank when user changes animation direction.
  // Otherwise the increment modifier in moveSlider() stays to -1 because the logic check will always return true
  useEffect(()=> {
    if (animationDirection === "lowToHigh" || animationDirection === "highToLow") {
      prevDirectionRef.current = ""
    }
  }, [animationDirection])

  useInterval(() => {
    if (running && sliderModel) {
      const increment = sliderModel.increment ? sliderModel.increment
        : multiScale?.resolution ? multiScale.resolution : 1
      const incrementModifier = direction === 'highToLow' || prevDirectionRef.current === 'highToLow' ? -1 : 1
      const newValue = sliderModel.value + increment * incrementModifier

      switch (direction) {
        case "lowToHigh":
          handleLowToHighAnimation(newValue)
          break
        case "highToLow":
          handleHighToLowAnimation(newValue)
          break
        case "backAndForth":
          handleBackAndForthAnimation(newValue)
          break
      }
    }
  }, tickTime)

  const handleLowToHighAnimation = (newValue: number) => {
    const [axisMin, axisMax] = getAxisDomain()
    const aboveMax = (val: number) => {
      if (mode === "onceOnly") {
        setRunning(false)
        return axisMax
      } else {
        return resetSlider(newValue)
      }
    }
    const belowMin = (val: number) => {
      return axisMin
    }
    updateSlider(newValue, belowMin, aboveMax)
  }

  const handleHighToLowAnimation = (newValue: number) => {
    const [axisMin, axisMax] = getAxisDomain()
    const aboveMax = (val: number) => {
      return axisMax
    }
    const belowMin = (val: number) => {
      if (mode === "onceOnly") {
        setRunning(false)
        return axisMin
      }
      else {
        return resetSlider(newValue)
      }
    }
    updateSlider(newValue, belowMin, aboveMax)
  }

  const handleBackAndForthAnimation = (newValue: number) => {
    const [axisMin, axisMax] = getAxisDomain()
    const reachedLimit = (prevDirectionRef.current === 'lowToHigh' && newValue >= axisMax) ||
                         (prevDirectionRef.current === 'highToLow' && newValue <= axisMin)

    const aboveMax = (val: number) => {
      prevDirectionRef.current = 'highToLow'
      maxMinHitsRef.current += 1
      return axisMax
    }
    const belowMin = (val: number) => {
      prevDirectionRef.current = 'lowToHigh'
      maxMinHitsRef.current += 1
      return axisMin
    }

    if (prevDirectionRef.current === "") {
      prevDirectionRef.current = "lowToHigh"
      maxMinHitsRef.current = 1 //prevents first time run from doing 3 laps
    }

    if (mode === "onceOnly" && maxMinHitsRef.current > 1 && reachedLimit) {
      setRunning(false)
      maxMinHitsRef.current = 0
    }
    updateSlider(newValue, belowMin, aboveMax)
  }
}
