// PROTOTYPE: playback for visibility/selection sliders -- slides the whole range along the axis,
// following the Playback palette's direction, repeat mode and rate.
import { isAlive } from "mobx-state-tree"
import { useEffect, useRef } from "react"
import { useAxisLayoutContext } from "../axis/models/axis-layout-context"
import { ISliderModel } from "./slider-model"
import { useAnimationFrame } from "./use-slider-animation"

interface IProps {
  sliderModel: ISliderModel
  running: boolean
  setRunning: (running: boolean) => void
}

export function useRangeAnimation({ sliderModel, running, setRunning }: IProps) {
  const multiScale = useAxisLayoutContext().getAxisMultiScale("bottom")
  // +1 moving up the axis, -1 moving down
  const directionRef = useRef(1)
  // back-and-forth only: how many ends the range has reached this run
  const endHitsRef = useRef(0)

  // on start, set the direction and restart from the beginning if the range is already at the end
  useEffect(() => {
    if (!running || !isAlive(sliderModel)) return
    const { animationDirection } = sliderModel
    const { min, max } = sliderModel.axis
    const [lo, hi] = sliderModel.range
    const width = hi - lo
    directionRef.current = animationDirection === "highToLow" ? -1 : 1
    endHitsRef.current = 0
    if (animationDirection === "lowToHigh" && hi >= max) sliderModel.setDynamicRange(min, min + width)
    if (animationDirection === "highToLow" && lo <= min) sliderModel.setDynamicRange(max - width, max)
  }, [running, sliderModel])

  // on stop, save where the range ended up as one undoable change
  const wasRunningRef = useRef(false)
  useEffect(() => {
    if (wasRunningRef.current && !running && isAlive(sliderModel) && sliderModel.dynamicRange) {
      const [lo, hi] = sliderModel.dynamicRange
      sliderModel.applyModelChange(() => sliderModel.setRange(lo, hi), {
        undoStringKey: "V3.Undo.slider.changeRange", redoStringKey: "V3.Redo.slider.changeRange"
      })
    }
    wasRunningRef.current = running
  }, [running, sliderModel])

  useAnimationFrame(() => {
    if (!running || !isAlive(sliderModel)) return
    const { animationDirection, animationMode } = sliderModel
    const step = sliderModel.increment ?? multiScale?.resolution ?? 1
    const { min, max } = sliderModel.axis
    const [lo, hi] = sliderModel.range
    const width = hi - lo
    let newLo = lo + directionRef.current * step

    const atTop = newLo + width >= max
    const atBottom = newLo <= min
    if (animationDirection === "backAndForth") {
      if (atTop || atBottom) {
        newLo = atTop ? max - width : min
        directionRef.current = -directionRef.current
        endHitsRef.current += 1
        // once: out to the far end and back again
        if (animationMode === "onceOnly" && endHitsRef.current >= 2) setRunning(false)
      }
    }
    else if (animationDirection === "lowToHigh" && atTop) {
      if (animationMode === "onceOnly") {
        newLo = max - width
        setRunning(false)
      }
      else {
        newLo = min
      }
    }
    else if (animationDirection === "highToLow" && atBottom) {
      if (animationMode === "onceOnly") {
        newLo = min
        setRunning(false)
      }
      else {
        newLo = max - width
      }
    }
    sliderModel.setDynamicRange(newLo, newLo + width)
  }, running ? 1000 / sliderModel.animationRate : null)
}
