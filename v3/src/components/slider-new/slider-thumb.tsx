import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { RefObject, useRef } from "react"
import { mergeProps, useFocusRing, useSliderThumb } from "react-aria"
import type { SliderState } from "@react-stately/slider"
import { isAliveSafe } from "../../utilities/mst-utils"
import { t } from "../../utilities/translation/translate"
import { useAxisLayoutContext } from "../axis/models/axis-layout-context"
import { ISliderModel } from "./slider-model"
import { kThumbWidth, ThumbShape } from "./thumb-shape"
import { useSliderAnimation } from "./use-slider-animation"

import "./slider.scss"

interface IProps {
  sliderModel: ISliderModel
  running: boolean
  setRunning: (running: boolean) => void
  state: SliderState
  trackRef: RefObject<HTMLDivElement | null>
}

// offset from left edge of thumb to center of thumb
// PROTOTYPE: half the thumb's width, less the 2px the axis starts in from the track
const kThumbOffset = kThumbWidth / 2 - 2

export const CodapSliderThumb = observer(function CodapSliderThumb({
  sliderModel: _sliderModel, running, setRunning, state, trackRef
} : IProps) {
  const sliderModel = isAliveSafe(_sliderModel) ? _sliderModel : undefined
  const layout = useAxisLayoutContext()
  const scale = layout.getAxisMultiScale("bottom")
  const thumbPos = (scale?.getScreenCoordinate({cell: 0, data: sliderModel?.value ?? 0}) ?? 0) - kThumbOffset
  const inputRef = useRef<HTMLInputElement | null>(null)

  // forces thumbnail to rerender when axis bounds change
  sliderModel?.axis.domain // eslint-disable-line @typescript-eslint/no-unused-expressions

  const { thumbProps, inputProps, isDragging } = useSliderThumb(
    { index: 0, trackRef, inputRef, "aria-label": sliderModel?.name ?? "" },
    state
  )

  const { isFocusVisible, focusProps } = useFocusRing()

  useSliderAnimation({ sliderModel, running, setRunning })

  return (
    <div
      className={clsx("slider-thumb-icon", { dragging: isDragging, "focus-visible": isFocusVisible })}
      data-testid="slider-thumb-icon"
      title={t("V3.SliderView.thumbView.toolTip")}
      {...thumbProps}
      style={{ ...thumbProps.style, left: thumbPos, position: "relative", transform: "none" }}
    >
      {/* PROTOTYPE: the pointer thumb (see thumb-shape.tsx) */}
      <ThumbShape />
      <input {...mergeProps(inputProps, focusProps)} ref={inputRef} className="codap-visually-hidden"
        data-testid="slider-thumb-input"
        // its own name only (ship-check #8): React Aria also labels each thumb with the whole slider's label,
        // which read "v2 v2" and "Lower bound of day Visibility slider, day, showing 40 to 80"
        aria-labelledby={undefined}
      />
    </div>
  )
})
