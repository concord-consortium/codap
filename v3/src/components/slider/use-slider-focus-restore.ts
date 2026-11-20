import { reaction } from "mobx"
import { RefObject, useEffect, useRef } from "react"
import { ISliderModel } from "./slider-model"

// the control a slider shows in place of its thumb: a variable slider's thumb, a range slider's range, or, with no
// attribute bound, the prompt to choose one
type SliderControlKind = "variable" | "range" | "prompt"

export function sliderControlKind(slider: ISliderModel): SliderControlKind {
  if (!slider.isRangeSlider) return "variable"
  return slider.attribute ? "range" : "prompt"
}

const kControlSelectors: Record<SliderControlKind, string> = {
  variable: '[data-testid="slider-thumb-input"]',
  range: '[data-testid="slider-range"]',
  prompt: '[data-testid="slider-attribute-prompt"] [data-testid="slider-attribute-menu-button"]'
}

// When a change to the slider's type or attribute (e.g. by undo or redo) removes the control that has focus, moves
// focus to the control that replaced it, so a keyboard or screen-reader user doesn't lose their place.
export function useSliderFocusRestore(sliderModel: ISliderModel | undefined,
                                      wrapperRef: RefObject<HTMLElement | null>) {
  const kind = sliderModel ? sliderControlKind(sliderModel) : undefined
  // whether focus was within the slider when its control last changed, recorded before React removes the old one
  const hadFocusRef = useRef(false)

  useEffect(() => {
    if (!sliderModel) return
    return reaction(
      () => sliderControlKind(sliderModel),
      () => {
        const wrapper = wrapperRef.current
        hadFocusRef.current = !!wrapper && wrapper.contains(document.activeElement)
      }, { name: "SliderComponent [record focus before the control changes]" }
    )
  }, [sliderModel, wrapperRef])

  useEffect(() => {
    if (!hadFocusRef.current || !kind) return
    hadFocusRef.current = false
    const wrapper = wrapperRef.current
    // focus only if it was lost, not if the focused control survived the change (e.g. the play button)
    if (!wrapper || wrapper.contains(document.activeElement)) return
    wrapper.querySelector<HTMLElement>(kControlSelectors[kind])?.focus()
  }, [kind, wrapperRef])
}
