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
  const tempValue = sliderModel.value

  const resetSlider = useCallback(() => {
    const dir = sliderModel.animationDirection
    if (dir === "lowToHigh" && sliderModel.value >= sliderModel.axis.max) sliderModel.setValue(sliderModel.axis.min)
    if (dir === "highToLow" && sliderModel.value <= sliderModel.axis.min) sliderModel.setValue(sliderModel.axis.max)
    return sliderModel.value
  }, [sliderModel])

  useEffect(()=> {
    running && resetSlider()
  }, [running, resetSlider])

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
      }
    }
  }, tickTime)

  const moveSlider = () => {
    const incrementModifier = direction === 'highToLow' || prevDirectionRef.current === 'highToLow' ? -1 : 1
    return tempValue + sliderModel.increment * incrementModifier
  }

  const handleLowToHighAnimation = (newValue: number) => {
    const aboveMax = (val: number) => {
      if (mode === "onceOnly") {
        setRunning(false)
        return sliderModel.axis.max
      } else {
        return resetSlider()
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
          return resetSlider()
        }
      }
      sliderModel.setValue(sliderModel.validateValue(newValue, belowMin, aboveMax))
  }

  const handleBackAndForthAnimation = (newValue: number) => {
    const reachedLimit = (prevDirectionRef.current === 'lowToHigh' && sliderModel.value >= sliderModel.axis.max) ||
                         (prevDirectionRef.current === 'highToLow' && sliderModel.value <= sliderModel.axis.min)

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

    if (mode === "onceOnly") {
      if (maxMinHitsRef.current > 1 && reachedLimit) {
        setRunning(false)
        maxMinHitsRef.current = 0
      }
      sliderModel.setValue(sliderModel.validateValue(newValue, belowMin, aboveMax))
    } else {
      sliderModel.setValue(sliderModel.validateValue(newValue, belowMin, aboveMax))
    }
  }
}
