import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { RefObject, useRef } from "react"
import { mergeProps, useFocusRing } from "react-aria"
import { useSliderThumb } from "@react-aria/slider"
import { SliderState } from "@react-stately/slider"
import { isAliveSafe } from "../../utilities/mst-utils"
import { t } from "../../utilities/translation/translate"
import { useAxisLayoutContext } from "../axis/models/axis-layout-context"
import { ISliderModel } from "./slider-model"
import { ThumbIcon } from "./thumb-icon"
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
const kThumbOffset = 10

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
      {...thumbProps}
      style={{ ...thumbProps.style, left: thumbPos, position: "relative", transform: "none" }}
    >
      <ThumbIcon title={t("DG.SliderView.thumbView.toolTip")} />
      <input {...mergeProps(inputProps, focusProps)} ref={inputRef} className="codap-visually-hidden" />
    </div>
  )
})
