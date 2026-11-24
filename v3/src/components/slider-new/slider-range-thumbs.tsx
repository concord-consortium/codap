// PROTOTYPE: range thumb for visibility/selection sliders: the pointer thumb (thumb-shape.tsx) split into
// two halves, one per end, each with its straight edge and half-pointer at the value. A bar the height of
// the thumb's body joins them, so a range reads as one long thumb with a pointer at each end; when the
// ends meet it's the whole thumb again.
//   - each end is a React Aria slider thumb: focusable, arrow keys move it
//   - the band is its own focusable slider: drag it, or use the arrow keys, to move the whole range
//   - when the ends meet (Mike's design): the LEFT half moves the joined thumb as a whole; the RIGHT half
//     splits it, the first drag direction deciding which end comes out (left = lower)
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { KeyboardEvent, PointerEvent, RefObject, useRef, useState } from "react"
import { mergeProps, useFocusRing, useSliderThumb } from "react-aria"
import type { SliderState } from "@react-stately/slider"
import { useAxisLayoutContext } from "../axis/models/axis-layout-context"
import { ISliderModel } from "./slider-model"
import { kThumbHalfOverlap, kThumbWidth, ThumbShape } from "./thumb-shape"
import { formatRangeEnd } from "./range-format"
import { prototypeOptions } from "./prototype-options"
import { useRangeAnimation } from "./use-range-animation"

import "./slider.scss"

// the svg (and so the axis's 0) starts 2px into the track, after the .axis-end bar
const kAxisInset = 2
// half the thumb's width: the lower half sits this far left of its value
const kThumbHalfWidth = kThumbWidth / 2
// the upper half starts this far left of its value, so the two straight edges overlap into one line
const kHalfOverlap = kThumbHalfOverlap

// CODAP-1632: the ends are named for the attribute, e.g. "Lower bound of Height". While they're joined, the halves
// do different things (mirroring the pointer: left moves, right splits), so the names say so.
const endLabel = (index: 0 | 1, attrName: string) => `${index === 0 ? "Lower" : "Upper"} bound of ${attrName}`
const joinedLabel = (index: 0 | 1, attrName: string) =>
  `${attrName}, joined, ${index === 0 ? "arrow keys move it" : "arrow keys pull it apart"}`

interface IEndProps {
  index: 0 | 1
  x: number
  state: SliderState
  trackRef: RefObject<HTMLDivElement | null>
  isJoined: boolean
  attrName: string
  // the value as the slider shows it, with the attribute's units (CODAP-1632), for screen readers
  valueText: string
  // keys on a joined thumb are handled here instead of by React Aria; returns true if it handled the key
  onJoinedKey: (index: 0 | 1, key: string) => boolean
}

const RangeEndThumb = function RangeEndThumb({
  index, x, state, trackRef, isJoined, attrName, valueText, onJoinedKey
}: IEndProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { thumbProps, inputProps, isDragging } = useSliderThumb(
    { index, trackRef, inputRef, "aria-label": isJoined ? joinedLabel(index, attrName) : endLabel(index, attrName) },
    state
  )
  const { isFocusVisible, focusProps } = useFocusRing()
  const which = index === 0 ? "lower" : "upper"

  return (
    <div
      className={clsx("range-thumb", which, { dragging: isDragging, "focus-visible": isFocusVisible })}
      data-testid={`slider-range-thumb-${which}`}
      {...thumbProps}
      // lower: curves out to the left of the value; upper: to the right
      style={{ ...thumbProps.style, position: "absolute", transform: "none",
               left: index === 0 ? x - kThumbHalfWidth : x - kHalfOverlap }}
    >
      <ThumbShape part={which} />
      <input {...mergeProps(inputProps, focusProps)} ref={inputRef} className="codap-visually-hidden"
        data-testid={`slider-range-input-${which}`}
        // its own name only (ship-check #8): React Aria also labels each thumb with the whole slider's label,
        // which read "v2 v2" and "Lower bound of day Visibility slider, day, showing 40 to 80"
        aria-labelledby={undefined}
        aria-valuetext={valueText}
        // a joined thumb's keys are ours (React Aria would only move one end, or be blocked by the other)
        onKeyDownCapture={e => {
          if (isJoined && onJoinedKey(index, e.key)) {
            e.preventDefault()
            e.stopPropagation()
          }
        }} />
    </div>
  )
}

interface IProps {
  sliderModel: ISliderModel
  state: SliderState
  trackRef: RefObject<HTMLDivElement | null>
  onPanEnd: (lower: number, upper: number) => void
  running: boolean
  setRunning: (running: boolean) => void
}

export const SliderRangeThumbs = observer(function SliderRangeThumbs({
  sliderModel, state, trackRef, onPanEnd, running, setRunning
}: IProps) {
  const layout = useAxisLayoutContext()
  const scale = layout.getAxisMultiScale("bottom")
  const boxRef = useRef<HTMLDivElement | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef<{ x: number, lower: number, upper: number } | undefined>()
  // collapsed thumb: where the press started, and which end the drag has picked (if any yet)
  const split = useRef<{ x: number, index?: 0 | 1 } | undefined>()
  // the overlay must stay mounted for the whole drag: it holds the pointer capture, and the range
  // stops being collapsed as soon as the drag starts
  const [isSplitting, setIsSplitting] = useState(false)
  const splitLeft = useRef<number | undefined>()
  const { isFocusVisible: isBandFocusVisible, focusProps: bandFocusProps } = useFocusRing()

  useRangeAnimation({ sliderModel, running, setRunning })

  // forces the thumbs to rerender when axis bounds change
  sliderModel.axis.domain // eslint-disable-line @typescript-eslint/no-unused-expressions

  const [lower, upper] = sliderModel.range
  const { min, max } = sliderModel.axis
  const toScreen = (value: number) => (scale?.getScreenCoordinate({ cell: 0, data: value }) ?? 0) + kAxisInset
  const toData = (x: number) => scale?.getDataCoordinate(x - kAxisInset).data ?? 0
  const lowerX = toScreen(lower)
  const upperX = toScreen(upper)
  // by screen distance, since the two ends can differ by a rounding hair
  const isCollapsed = upperX - lowerX < 1
  const width = upper - lower

  // at the attribute's own precision, if it has one (CODAP-1566)
  const format = (value: number) => formatRangeEnd(value, sliderModel, scale)
  // for screen readers: with the attribute's units, if it has any (CODAP-1632)
  const units = sliderModel.attribute?.units
  const spoken = (value: number) => units ? `${format(value)} ${units}` : format(value)
  const attrName = sliderModel.attribute?.name ?? "range"

  // pan the whole range, keeping its width, without leaving the axis
  const panTo = (lo: number, w: number): [number, number] => {
    const clamped = Math.min(Math.max(lo, min), max - w)
    return [clamped, clamped + w]
  }

  const pannedRange = (clientX: number): [number, number] => {
    const start = panStart.current!
    // the scale is linear, so a difference of two screen positions converts to a data distance
    // whatever they're measured from
    return panTo(start.lower + toData(clientX) - toData(start.x), start.upper - start.lower)
  }

  const handleBandPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // keep React Aria's track handler from jumping the nearest thumb to this point
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    panStart.current = { x: e.clientX, lower, upper }
    setIsPanning(true)
  }

  const handleBandPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!panStart.current) return
    const [lo, hi] = pannedRange(e.clientX)
    sliderModel.setDynamicRange(lo, hi)
  }

  const handleBandPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!panStart.current) return
    const [lo, hi] = pannedRange(e.clientX)
    panStart.current = undefined
    setIsPanning(false)
    onPanEnd(lo, hi)
  }

  // arrow keys on the band move the whole range by one step; Page keys by ten; Home/End to the ends.
  // A joined range snaps to values in the data, so for it the arrow keys step to the next/previous value
  // (a one-step move would just snap back).
  const handleBandKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = state.step || 1
    const values = sliderModel.sortedValues
    if (isCollapsed && values.length && ["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp"].includes(e.key)) {
      e.preventDefault()
      const up = e.key === "ArrowRight" || e.key === "ArrowUp"
      const next = up ? values.find(v => v > lower) : [...values].reverse().find(v => v < lower)
      if (next != null) onPanEnd(next, next)
      return
    }
    let lo: number | undefined
    switch (e.key) {
      case "ArrowLeft": case "ArrowDown": lo = lower - step; break
      case "ArrowRight": case "ArrowUp": lo = lower + step; break
      case "PageDown": lo = lower - 10 * step; break
      case "PageUp": lo = lower + 10 * step; break
      case "Home": lo = min; break
      case "End": lo = max - width; break
    }
    if (lo == null) return
    e.preventDefault()
    const [newLo, newHi] = panTo(lo, width)
    onPanEnd(newLo, newHi)
  }

  // collapsed: the ends are stacked, so the first horizontal movement picks one and drags it
  const valueAt = (clientX: number) => {
    const left = boxRef.current?.getBoundingClientRect().left ?? 0
    return toData(clientX - left)
  }

  const handleSplitPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    split.current = { x: e.clientX }
    splitLeft.current = lowerX - kHalfOverlap
    setIsSplitting(true)
  }

  const handleSplitPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = split.current
    if (!s) return
    if (s.index == null) {
      const dx = e.clientX - s.x
      // wait for a few pixels of movement so a slightly shaky press doesn't pick a side
      if (Math.abs(dx) < 3) return
      s.index = dx < 0 ? 0 : 1
      state.setThumbDragging(s.index, true)
    }
    state.setThumbValue(s.index, valueAt(e.clientX))
  }

  const handleSplitPointerUp = () => {
    const s = split.current
    split.current = undefined
    setIsSplitting(false)
    // ending the drag fires the slider's onChangeEnd, which saves the range
    if (s?.index != null) state.setThumbDragging(s.index, false)
  }

  // keyboard for a joined thumb, mirroring the pointer: the left half (lower end) moves the whole thumb
  // through the data's values; the right half (upper end) pulls it apart -- right moves the upper end to the
  // next value, left moves the lower end to the previous value and hands focus to it to keep extending.
  // "Next" is the nearest data value at least one slider step away: data values can be packed closer than a
  // pixel, and a smaller move wouldn't show (or, for a split, would still read as joined).
  const handleJoinedKey = (index: 0 | 1, key: string) => {
    const values = sliderModel.sortedValues
    if (!values.length) return false
    const v = lower
    const minStep = state.step || 0
    const nextUp = values.find(x => x >= v + minStep && x > v)
    const nextDown = [...values].reverse().find(x => x <= v - minStep && x < v)
    const at = values.indexOf(sliderModel.nearestValue(v))
    if (index === 0) {
      let target: number | undefined
      switch (key) {
        case "ArrowRight": case "ArrowUp": target = nextUp; break
        case "ArrowLeft": case "ArrowDown": target = nextDown; break
        case "PageUp": target = values[Math.min(values.length - 1, at + 10)]; break
        case "PageDown": target = values[Math.max(0, at - 10)]; break
        case "Home": target = values[0]; break
        case "End": target = values[values.length - 1]; break
        default: return false
      }
      if (target != null) onPanEnd(target, target)
      return true
    }
    switch (key) {
      case "ArrowRight": case "ArrowUp":
        if (nextUp != null) onPanEnd(v, nextUp)
        return true
      case "ArrowLeft": case "ArrowDown":
        if (nextDown != null) {
          onPanEnd(nextDown, v)
          boxRef.current?.querySelector<HTMLInputElement>('[data-testid="slider-range-input-lower"]')?.focus()
        }
        return true
      default: return false
    }
  }

  const stopTrackHandlers = {
    // React Aria's track responds to all three, so they must stop here
    onMouseDown: (e: { stopPropagation: () => void }) => e.stopPropagation(),
    onTouchStart: (e: { stopPropagation: () => void }) => e.stopPropagation()
  }

  const rangeText = `${spoken(lower)} to ${spoken(upper)}`

  return (
    <div className="slider-range" data-testid="slider-range" ref={boxRef}>
      {/* the light-blue band is drawn under the axis line; its hit area sits above everything */}
      {/* PROTOTYPE option: the band's decoration (prototype-options.ts) */}
      <div className="range-band" style={{ left: lowerX, width: Math.max(0, upperX - lowerX) }}>
        {prototypeOptions.splitDecoration !== "none" &&
          <div className={`range-band-decoration ${prototypeOptions.splitDecoration}`} />}
      </div>
      <div
        aria-label={`${sliderModel.sliderType === "visibility" ? "Visible" : "Selected"} range of ${attrName}`}
        aria-valuemax={max}
        aria-valuemin={min}
        aria-valuenow={lower}
        aria-valuetext={rangeText}
        className={clsx("range-band-hit", { dragging: isPanning, "focus-visible": isBandFocusVisible })}
        data-testid="slider-range-band"
        role="slider"
        // the whole stretch between the ends (the halves extend outward); the ends' targets sit above it
        style={{ left: lowerX + kHalfOverlap, width: Math.max(0, upperX - lowerX - 2 * kHalfOverlap) }}
        // not a Tab stop while the ends are joined (it has no width then); the left half moves it instead
        tabIndex={isCollapsed ? -1 : 0}
        {...bandFocusProps}
        onKeyDown={handleBandKeyDown}
        onPointerDown={handleBandPointerDown}
        onPointerMove={handleBandPointerMove}
        onPointerUp={handleBandPointerUp}
        onPointerCancel={handleBandPointerUp}
        {...stopTrackHandlers}
      />
      <RangeEndThumb index={0} x={lowerX} state={state} trackRef={trackRef} attrName={attrName}
                     valueText={spoken(lower)} isJoined={isCollapsed} onJoinedKey={handleJoinedKey} />
      <RangeEndThumb index={1} x={upperX} state={state} trackRef={trackRef} attrName={attrName}
                     valueText={spoken(upper)} isJoined={isCollapsed} onJoinedKey={handleJoinedKey} />
      {/* joined: the left half moves the whole thumb (the band's pan, with a zero-width range) */}
      {isCollapsed && !isSplitting &&
        <div
          className={clsx("range-move", { dragging: isPanning })}
          data-testid="slider-range-move"
          style={{ left: lowerX - kThumbHalfWidth }}
          onPointerDown={handleBandPointerDown}
          onPointerMove={handleBandPointerMove}
          onPointerUp={handleBandPointerUp}
          onPointerCancel={handleBandPointerUp}
          {...stopTrackHandlers}
        />
      }
      {/* joined: the right half splits it */}
      {((isCollapsed && !isPanning) || isSplitting) &&
        <div
          className={clsx("range-split", { dragging: isSplitting })}
          data-testid="slider-range-split"
          // stays where the press started, so the capture isn't disturbed while the ends move apart
          style={{ left: (isSplitting && splitLeft.current != null ? splitLeft.current : lowerX - kHalfOverlap) }}
          onPointerDown={handleSplitPointerDown}
          onPointerMove={handleSplitPointerMove}
          onPointerUp={handleSplitPointerUp}
          onPointerCancel={handleSplitPointerUp}
          {...stopTrackHandlers}
        />
      }
    </div>
  )
})
