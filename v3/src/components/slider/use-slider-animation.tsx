import { useCallback, useEffect, useRef } from "react"
import { ISliderModel } from "./slider-model"
import { useInterval } from "@chakra-ui/react"

interface IUseSliderAnimationProps {
  sliderModel: ISliderModel
  running: boolean
  setRunning: (running: boolean) => void
}

export const useSliderAnimation = ({sliderModel, running, setRunning}: IUseSliderAnimationProps) => {
  const tickTime = 1000/sliderModel.animationRate
  const direction = sliderModel.animationDirection
  const mode = sliderModel.animationMode
  const prevDirectionRef = useRef("")
  const maxMinHitsRef = useRef(0)

  const resetSlider = useCallback((val?: number) => {
    const dir = sliderModel.animationDirection
    const testValue = val || sliderModel.value
    if (dir === "lowToHigh" && testValue >= sliderModel.axis.max) sliderModel.setValue(sliderModel.axis.min)
    if (dir === "highToLow" && testValue <= sliderModel.axis.min) sliderModel.setValue(sliderModel.axis.max)
    return sliderModel.value
  }, [sliderModel])

  useEffect(()=> {
    running && resetSlider()
  }, [running, resetSlider])

  // Reset the prevDirectionRef to blank when user changes animation direction.
  // Otherwise the increment modifier in moveSlider() stays to -1 because the logic check will always return true
  useEffect(()=> {
    if (sliderModel.animationDirection === "lowToHigh" || sliderModel.animationDirection === "highToLow") {
      prevDirectionRef.current = ""
    }
  }, [sliderModel.animationDirection])

  useInterval(() => {
    if (running) {
      const newValue = moveSlider()

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

  const moveSlider = () => {
    const incrementModifier = direction === 'highToLow' || prevDirectionRef.current === 'highToLow' ? -1 : 1
    return sliderModel.value + sliderModel.increment * incrementModifier
  }

  const handleLowToHighAnimation = (newValue: number) => {
    const aboveMax = (val: number) => {
      if (mode === "onceOnly") {
        setRunning(false)
        return sliderModel.axis.max
      } else {
        return resetSlider(newValue)
      }
    }
    const belowMin = (val: number) => {
      return sliderModel.axis.min
    }
    sliderModel.setValue(sliderModel.validateValue(newValue, belowMin, aboveMax))
  }

  const handleHighToLowAnimation = (newValue: number) => {
      const aboveMax = (val: number) => {
        return sliderModel.axis.max
      }
      const belowMin = (val: number) => {
        if (mode === "onceOnly") {
          setRunning(false)
          return sliderModel.axis.min
        }
        else {
          return resetSlider(newValue)
        }
      }
      sliderModel.setValue(sliderModel.validateValue(newValue, belowMin, aboveMax))
  }

  const handleBackAndForthAnimation = (newValue: number) => {
    const reachedLimit = (prevDirectionRef.current === 'lowToHigh' && newValue >= sliderModel.axis.max) ||
                         (prevDirectionRef.current === 'highToLow' && newValue <= sliderModel.axis.min)

    const aboveMax = (val: number) => {
      prevDirectionRef.current = 'highToLow'
      maxMinHitsRef.current += 1
      return sliderModel.axis.max
    }
    const belowMin = (val: number) => {
      prevDirectionRef.current = 'lowToHigh'
      maxMinHitsRef.current += 1
      return sliderModel.axis.min
    }

    if (prevDirectionRef.current === "") {
      prevDirectionRef.current = "lowToHigh"
      maxMinHitsRef.current = 1 //prevents first time run from doing 3 laps
    }

    if (mode === "onceOnly" && maxMinHitsRef.current > 1 && reachedLimit) {
      setRunning(false)
      maxMinHitsRef.current = 0
    }
    sliderModel.setValue(sliderModel.validateValue(newValue, belowMin, aboveMax))
  }
}
