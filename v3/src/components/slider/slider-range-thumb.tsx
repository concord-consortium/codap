import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { PointerEvent, RefObject, SyntheticEvent, useRef } from "react"
import { mergeProps, useFocusRing, useSliderThumb } from "react-aria"
import type { SliderState } from "@react-stately/slider"
import { isAliveSafe } from "../../utilities/mst-utils"
import { t } from "../../utilities/translation/translate"
import { useAxisLayoutContext } from "../axis/models/axis-layout-context"
import { ITileModel } from "../../models/tiles/tile-model"
import { ISliderModel } from "./slider-model"
import { rangeChangeOptions } from "./slider-range-change"
import { valueChangeNotification } from "./slider-utils"
import { useSliderAnimation } from "./use-slider-animation"

interface IHandleProps {
  index: 0 | 1
  label: string
  left: number
  state: SliderState
  trackRef: RefObject<HTMLDivElement | null>
}

// The handles are the two halves of the variable slider's thumb icon (see ThumbIcon), split at its point:
// the low handle is the left half, pointing at the low value from outside the range, and the high handle the
// right half. A collapsed range shows the whole thumb.
const kHalfThumbPaths = [
  "M8,8.58422852 L8,5 L5,5 Z M0,0 L8,0 L8,5 L0,5 Z",  // left half: point at the right edge
  "M0,8.58422852 L3,5 L0,5 Z M0,0 L8,0 L8,5 L0,5 Z"   // right half: point at the left edge
]
const RangeHandleIcon = ({ index }: { index: 0 | 1 }) => (
  <svg width="12px" height="12px" viewBox="0 0 8 9" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"
       aria-hidden="true">
    <path d={kHalfThumbPaths[index]} fill="#545252"/>
  </svg>
)

// one edge of the range; React Aria provides dragging, role="slider", and arrow/Home/End keys
const RangeHandle = function RangeHandle({ index, label, left, state, trackRef }: IHandleProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { thumbProps, inputProps, isDragging } = useSliderThumb({ index, trackRef, inputRef, "aria-label": label },
    state)
  const { isFocusVisible, focusProps } = useFocusRing()
  return (
    <div className={clsx("slider-range-handle", index === 0 ? "low" : "high",
                         { dragging: isDragging, "focus-visible": isFocusVisible })}
         data-testid={index === 0 ? "slider-range-low" : "slider-range-high"}
         {...thumbProps} style={{ ...thumbProps.style, left, transform: "none" }}>
      <RangeHandleIcon index={index} />
      <input {...mergeProps(inputProps, focusProps)} ref={inputRef} className="codap-visually-hidden" />
    </div>
  )
}

interface IProps {
  sliderModel: ISliderModel
  tile?: ITileModel
  running: boolean
  setRunning: (running: boolean) => void
  state: SliderState
  trackRef: RefObject<HTMLDivElement | null>
}

// width of a range handle; each handle's point is at its inner edge, so the low handle sits just left of
// its value and the high handle just right of its value
const kHandleWidth = 12

export const SliderRangeThumb = observer(function SliderRangeThumb({
  sliderModel: _sliderModel, tile, running, setRunning, state, trackRef
}: IProps) {
  const sliderModel = isAliveSafe(_sliderModel) ? _sliderModel : undefined
  const layout = useAxisLayoutContext()
  const scale = layout.getAxisMultiScale("bottom")
  const dragRef = useRef<{ startX: number, startLow: number, moved: boolean } | null>(null)

  useSliderAnimation({ sliderModel, running, setRunning })

  // forces a rerender when axis bounds change
  sliderModel?.axis.domain // eslint-disable-line @typescript-eslint/no-unused-expressions

  if (!sliderModel || !scale) return null
  const toScreen = (value: number) => scale.getScreenCoordinate({ cell: 0, data: value })
  const toData = (x: number) => scale.getDataCoordinate(x).data
  const lowX = toScreen(sliderModel.rangeLow)
  const highX = toScreen(sliderModel.rangeHigh)

  // React Aria's track moves the nearest handle to the pointer on pointerdown, mousedown, *and* touchstart,
  // so a press on the body must stop all three from reaching it
  const stopTrackPress = (e: SyntheticEvent) => e.stopPropagation()

  // dragging the body moves the whole range, preserving its width
  const handleBodyPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    stopTrackPress(e)
    // only the primary pointer's main button drags (not a right-click or a second finger)
    if (!e.isPrimary || e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startLow: sliderModel.rangeLow, moved: false }
  }
  const lowForPointer = (clientX: number) => {
    const drag = dragRef.current!
    return drag.startLow + toData(lowX + clientX - drag.startX) - toData(lowX)
  }
  const handleBodyPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    // the button was released without our seeing the pointerup (e.g. over a context menu): end the drag
    if (e.buttons === 0) {
      handleBodyPointerUp()
      return
    }
    const low = lowForPointer(e.clientX)
    dragRef.current.moved = true
    sliderModel.applyModelChange(() => sliderModel.moveDynamicRange(low), {
      noDirty: true, notify: () => valueChangeNotification(sliderModel.value, sliderModel.name)
    })
  }
  const handleBodyPointerUp = () => {
    const drag = dragRef.current
    dragRef.current = null
    // a press without movement changes nothing, so it shouldn't create an undo entry
    if (!drag?.moved) return
    // commit where the last move left the range
    const low = sliderModel.rangeLow
    sliderModel.applyModelChange(() => sliderModel.moveRange(low), rangeChangeOptions(sliderModel, tile))
  }

  return (
    <div className="slider-range-thumb" data-testid="slider-range-thumb">
      <div className="slider-range-body" data-testid="slider-range-body"
           style={{ left: lowX, width: Math.max(0, highX - lowX) }}
           onPointerDown={handleBodyPointerDown} onMouseDown={stopTrackPress} onTouchStart={stopTrackPress}
           onPointerMove={handleBodyPointerMove}
           onPointerUp={handleBodyPointerUp} onPointerCancel={handleBodyPointerUp}
           onLostPointerCapture={handleBodyPointerUp} />
      <RangeHandle index={0} label={t("V3.Slider.rangeLow")} left={lowX - kHandleWidth}
                   state={state} trackRef={trackRef} />
      <RangeHandle index={1} label={t("V3.Slider.rangeHigh")} left={highX}
                   state={state} trackRef={trackRef} />
    </div>
  )
})
