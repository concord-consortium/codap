import { comparer, reaction } from "mobx"
import { useEffect, useRef } from "react"
import { isAliveSafe } from "../../utilities/mst-utils"
import { t } from "../../utilities/translation/translate"
import { ISliderModel } from "./slider-model"

// how long a range slider's range must be still before the number of cases it shows or selects is announced
export const kCountAnnouncementDelay = 750

// e.g. "12 of 84 cases visible" or "12 cases selected", or undefined if the slider isn't showing or selecting
export function sliderCountMessage(slider: ISliderModel) {
  const { dataSet } = slider
  if (!slider.isRangeSlider || !slider.attribute || !dataSet) return
  if (slider.sliderType === "visibility") {
    // e.g. a formula added to the attribute after binding stops the slider hiding cases
    if (!slider.isAttributeCompatible) return
    const total = dataSet.itemIdsIgnoringSliderFilters.length
    return t(total === 1 ? "V3.Slider.caseVisible" : "V3.Slider.casesVisible",
             { vars: [dataSet.itemIds.length, total] })
  }
  // a selection slider bound to an attribute it can't select by, or paused, isn't selecting
  if (!slider.isBoundSelectionSlider || slider.isSelectionPaused) return
  const count = slider.selectionTargetItemIds.size
  return t(count === 1 ? "V3.Slider.caseSelected" : "V3.Slider.casesSelected", { vars: [count] })
}

interface IProps {
  sliderModel?: ISliderModel
  running: boolean
  announce: (message: string) => void
}

// Announces how many cases a range slider shows or selects once its range has been still for a moment, so a drag,
// a held key, or a burst of changes announces only where it ended. Playback is quiet; its end is announced instead.
export function useSliderCountAnnouncement({ sliderModel, running, announce }: IProps) {
  const timeoutRef = useRef<number>()
  const runningRef = useRef(running)
  const announceRef = useRef(announce)
  announceRef.current = announce
  const sliderRef = useRef(sliderModel)
  sliderRef.current = sliderModel

  const scheduleRef = useRef(() => {
    window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(() => {
      const slider = sliderRef.current
      const message = slider && isAliveSafe(slider) && sliderCountMessage(slider)
      if (message) announceRef.current(message)
    }, kCountAnnouncementDelay)
  })

  useEffect(() => {
    const wasRunning = runningRef.current
    runningRef.current = running
    if (running) window.clearTimeout(timeoutRef.current)
    else if (wasRunning) scheduleRef.current()
  }, [running])

  useEffect(() => {
    if (!sliderModel) return
    const disposer = reaction(
      () => [sliderModel.rangeLow, sliderModel.rangeHigh],
      () => {
        if (sliderModel.isRangeSlider && !runningRef.current) scheduleRef.current()
      }, { equals: comparer.structural, name: "SliderComponent [announce case count]" }
    )
    return () => {
      disposer()
      window.clearTimeout(timeoutRef.current)
    }
  }, [sliderModel])
}
