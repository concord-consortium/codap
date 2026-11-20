import { clsx } from "clsx"
import { reaction } from "mobx"
import { observer } from "mobx-react-lite"
import { KeyboardEvent, MouseEvent, PointerEvent, RefObject, SyntheticEvent, useEffect, useRef } from "react"
import { mergeProps, useFocusRing, useSliderThumb } from "react-aria"
import type { SliderState } from "@react-stately/slider"
import { isAliveSafe } from "../../utilities/mst-utils"
import { t } from "../../utilities/translation/translate"
import { useAxisLayoutContext } from "../axis/models/axis-layout-context"
import { ITileModel } from "../../models/tiles/tile-model"
import { ISliderModel } from "./slider-model"
import { rangeChangeOptions } from "./slider-range-change"
import { rangeForKey, rangesMatch } from "./slider-range-keyboard"
import { formatSliderValue } from "./slider-utils"
import { useSliderAnimation } from "./use-slider-animation"

// the pointer handlers that drag the whole range (see SliderRangeThumb)
interface IMoveHandlers {
  onPointerDown: (e: PointerEvent<HTMLDivElement>) => void
  onPointerMove: (e: PointerEvent<HTMLDivElement>) => void
  onPointerUp: () => void
  stopTrackPress: (e: SyntheticEvent) => void
}

interface IHandleProps {
  index: 0 | 1
  label: string
  left: number
  // while the range is collapsed, dragging either half moves the whole thumb; shift-dragging widens it
  moveHandlers?: IMoveHandlers
  state: SliderState
  trackRef: RefObject<HTMLDivElement | null>
  // the range's keyboard stop, which takes the focus React Aria gives a handle when it's pressed
  rangeRef: RefObject<HTMLDivElement | null>
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

// one edge of the range, which React Aria drags (the keyboard uses the range's own stop; see SliderRangeThumb)
const RangeHandle = function RangeHandle({
  index, label, left, moveHandlers, state, trackRef, rangeRef
}: IHandleProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { thumbProps, inputProps, isDragging } = useSliderThumb({ index, trackRef, inputRef, "aria-label": label },
    state)
  // A press that moves the thumb must not reach React Aria, whose own drag would move just this edge, nor its
  // track (see stopTrackPress). A touch can't be shift-pressed, so a collapsed thumb always moves by touch.
  const moveProps = moveHandlers && {
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
      if (e.shiftKey) thumbProps.onPointerDown?.(e)
      else moveHandlers.onPointerDown(e)
    },
    onMouseDown: (e: MouseEvent<HTMLDivElement>) => {
      if (e.shiftKey) thumbProps.onMouseDown?.(e)
      else moveHandlers.stopTrackPress(e)
    },
    onTouchStart: moveHandlers.stopTrackPress,
    onPointerMove: moveHandlers.onPointerMove,
    onPointerUp: moveHandlers.onPointerUp,
    onPointerCancel: moveHandlers.onPointerUp,
    onLostPointerCapture: moveHandlers.onPointerUp
  }
  return (
    <div className={clsx("slider-range-handle", index === 0 ? "low" : "high", { dragging: isDragging })}
         data-testid={index === 0 ? "slider-range-low" : "slider-range-high"}
         // a collapsed thumb's halves don't resize it as they appear to, so say what they do
         title={moveHandlers ? t("V3.Slider.collapsedThumbHint") : undefined}
         {...thumbProps} {...moveProps} style={{ ...thumbProps.style, left, transform: "none" }}>
      <RangeHandleIcon index={index} />
      {/* React Aria needs the input to drag, but it's out of the tab order and the accessibility tree, and passes
          the focus a press gives it to the range */}
      <input {...mergeProps(inputProps, { onFocus: () => rangeRef.current?.focus({ preventScroll: true }) })}
             ref={inputRef} className="codap-visually-hidden" tabIndex={-1} aria-hidden="true"
             data-testid={index === 0 ? "slider-range-low-input" : "slider-range-high-input"} />
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
  step: number
  // the id of an element describing the range, e.g. that a selection slider is paused
  describedBy?: string
}

// the range's keys that are down, and where the range was when the first was pressed; their changes are dynamic
// until the last is released
interface IKeyBurst {
  startLow: number
  startHigh: number
  heldKeys: Set<string>
}

// width of a range handle; each handle's point is at its inner edge, so the low handle sits just left of
// its value and the high handle just right of its value
const kHandleWidth = 12

export const SliderRangeThumb = observer(function SliderRangeThumb({
  sliderModel: _sliderModel, tile, running, setRunning, state, trackRef, step, describedBy
}: IProps) {
  const sliderModel = isAliveSafe(_sliderModel) ? _sliderModel : undefined
  const layout = useAxisLayoutContext()
  const scale = layout.getAxisMultiScale("bottom")
  const dragRef = useRef<{ startX: number, startLow: number, moved: boolean } | null>(null)
  const rangeRef = useRef<HTMLDivElement | null>(null)
  const keyBurstRef = useRef<IKeyBurst | null>(null)
  const { isFocusVisible, focusProps } = useFocusRing()

  // A held key's change is dropped if the range goes away (e.g. its attribute is deleted), which sends no blur, or
  // if the saved range changes underneath it (e.g. by undo or a plugin), which it would otherwise overwrite.
  useEffect(() => {
    const dropKeyBurst = () => {
      if (!keyBurstRef.current) return
      keyBurstRef.current = null
      if (isAliveSafe(_sliderModel)) {
        _sliderModel.applyModelChange(() => _sliderModel.cancelDynamicRange(), { noDirty: true })
      }
    }
    const disposer = reaction(
      () => isAliveSafe(_sliderModel) ? [_sliderModel.globalValue._value, _sliderModel.rangeWidth] : [],
      dropKeyBurst, { name: "SliderRangeThumb [drop a held key's change]" }
    )
    return () => {
      disposer()
      dropKeyBurst()
    }
  }, [_sliderModel])

  useSliderAnimation({ sliderModel, running, setRunning })

  // forces a rerender when axis bounds change
  sliderModel?.axis.domain // eslint-disable-line @typescript-eslint/no-unused-expressions

  if (!sliderModel || !scale) return null
  // the handles show only while an attribute is bound
  const handleLabel = (key: string) => t(key, { vars: [sliderModel.attribute?.name ?? ""] })
  const valueText = (index: 0 | 1) =>
    formatSliderValue(sliderModel, scale, index === 0 ? sliderModel.rangeLow : sliderModel.rangeHigh, true)
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
    // so the keys move the range once it's been dragged
    rangeRef.current?.focus({ preventScroll: true })
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
    // the global value's observer sends `global[<name>]`
    sliderModel.applyModelChange(() => sliderModel.moveDynamicRange(low), { noDirty: true })
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
  // Keys change the range dynamically, as a drag does, and the change is committed when the last of the range's keys
  // is released or focus leaves, so holding a key down makes one undoable change.
  const handleRangeKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const [min, max] = sliderModel.axis.domain
    const { rangeLow: low, rangeHigh: high } = sliderModel
    const change = rangeForKey({ low, high, min, max, step, pageSize: state.pageSize,
                                 getSnapValues: () => sliderModel.snapValues }, e.key, e)
    if (!change) return
    // e.g. Page Up would scroll the page, and Alt+Left is the browser's Back on Windows and Linux; and the track's
    // own key handling (React Aria's, for its handles) has nothing to do with the range's keys
    e.preventDefault()
    e.stopPropagation()
    // playback would move the range out from under the key
    if (running) setRunning(false)
    const burst = keyBurstRef.current ??= { startLow: low, startHigh: high, heldKeys: new Set() }
    burst.heldKeys.add(e.key)
    sliderModel.applyModelChange(
      () => change.kind === "move"
        ? sliderModel.moveDynamicRange(change.low)
        : sliderModel.setDynamicRange(change.low, change.high),
      // not undoable until committed; the global value's observer sends `global[<name>]`
      { noDirty: true })
  }
  const handleRangeKeyUp = (e: KeyboardEvent<HTMLDivElement>) => {
    // releasing another key, e.g. Shift to stop paging, doesn't end a range key that's still held
    const burst = keyBurstRef.current
    if (burst?.heldKeys.delete(e.key) && !burst.heldKeys.size) commitKeyBurst()
  }
  const commitKeyBurst = () => {
    const burst = keyBurstRef.current
    keyBurstRef.current = null
    if (!burst) return
    const { rangeLow: low, rangeHigh: high } = sliderModel
    // Keys that ended where they began change nothing, so plugins and the log shouldn't hear of a change. A point
    // moves between exact data values, which may be closer together than rangesMatch's tolerance.
    const isPoint = burst.startLow === burst.startHigh
    if (isPoint ? low === burst.startLow && high === burst.startHigh
                : rangesMatch([low, high], [burst.startLow, burst.startHigh], step)) {
      sliderModel.applyModelChange(() => sliderModel.cancelDynamicRange(), { noDirty: true })
      return
    }
    // commits the dynamic width, too
    sliderModel.applyModelChange(() => sliderModel.moveRange(low), rangeChangeOptions(sliderModel, tile))
  }
  // the range's value is its low end, which stops short of the axis's max by the width
  const [lowMin, lowMax] = sliderModel.valueDomain

  // a collapsed range has no body to grab, so its halves move it (and the move snaps to the data)
  const collapsedMoveHandlers: IMoveHandlers | undefined = sliderModel.width === 0
    ? { onPointerDown: handleBodyPointerDown, onPointerMove: handleBodyPointerMove,
        onPointerUp: handleBodyPointerUp, stopTrackPress }
    : undefined

  return (
    <div className={clsx("slider-range-thumb", { collapsed: !!collapsedMoveHandlers })}
         data-testid="slider-range-thumb">
      <div className="slider-range-body" data-testid="slider-range-body"
           style={{ left: lowX, width: Math.max(0, highX - lowX) }}
           onPointerDown={handleBodyPointerDown} onMouseDown={stopTrackPress} onTouchStart={stopTrackPress}
           onPointerMove={handleBodyPointerMove}
           onPointerUp={handleBodyPointerUp} onPointerCancel={handleBodyPointerUp}
           onLostPointerCapture={handleBodyPointerUp} />
      <RangeHandle index={0} label={handleLabel("V3.Slider.rangeLowOf")} left={lowX - kHandleWidth}
                   moveHandlers={collapsedMoveHandlers} state={state} trackRef={trackRef} rangeRef={rangeRef} />
      <RangeHandle index={1} label={handleLabel("V3.Slider.rangeHighOf")} left={highX}
                   moveHandlers={collapsedMoveHandlers} state={state} trackRef={trackRef} rangeRef={rangeRef} />
      {/* the range's one keyboard stop (see rangeForKey), framing both handles; pointers pass through it */}
      <div ref={rangeRef} role="slider" tabIndex={0} aria-orientation="horizontal"
           className={clsx("slider-range-focus", { "focus-visible": isFocusVisible })}
           style={{ left: lowX - kHandleWidth, width: Math.max(0, highX - lowX) + 2 * kHandleWidth }}
           aria-label={handleLabel("V3.Slider.rangeOf")}
           aria-valuemin={lowMin} aria-valuemax={lowMax} aria-valuenow={sliderModel.rangeLow}
           aria-valuetext={t("V3.Slider.rangeValueText", { vars: [valueText(0), valueText(1)] })}
           aria-describedby={describedBy} data-testid="slider-range"
           {...mergeProps(focusProps, { onKeyDown: handleRangeKeyDown, onKeyUp: handleRangeKeyUp,
                                        onBlur: commitKeyBurst })} />
    </div>
  )
})
