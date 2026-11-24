import { Active, useDndContext, useDroppable } from "@dnd-kit/core"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { CSSProperties, PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Input as RAInput, TextField } from "react-aria-components"
import { useSlider } from "react-aria"
import { useSliderState } from "@react-stately/slider"
import { useResizeDetector } from "react-resize-detector"
import { getDragAttributeInfo, useDropHandler, useTileDropOverlay } from "../../hooks/use-drag-drop"
import { DropHint } from "../data-display/components/drop-hint"
import { InstanceIdContext, useNextInstanceId } from "../../hooks/use-instance-id-context"
import { registerTileCollisionDetection } from "../../lib/dnd-kit/dnd-detect-collision"
import { IDataSet } from "../../models/data/data-set"
import { logMessageWithReplacement } from "../../lib/log-message"
import { unitsStringToMilliseconds } from "../../utilities/date-utils"
import { isAliveSafe } from "../../utilities/mst-utils"
import { t } from "../../utilities/translation/translate"
import { getNumberOfLevelsForDateAxis } from "../axis/axis-utils"
import { Axis } from "../axis/components/axis"
import { AxisProviderContext } from "../axis/hooks/use-axis-provider-context"
import { AxisLayoutContext } from "../axis/models/axis-layout-context"
import { isDateAxisModel } from "../axis/models/numeric-axis-models"
import { ITileBaseProps } from "../tiles/tile-base-props"
import { EditableSliderValue } from "./editable-slider-value"
import { SliderAxisLayout } from "./slider-layout"
import { isSliderModel } from "./slider-model"
import { changeSliderValueNotification } from "./slider-notifications"
import { PlayPauseButton } from "./play-pause-button"
import { isSliderAttribute, SliderAttributeMenu } from "./slider-attribute-menu"
import { EditableRangeEnd } from "./editable-range-end"
import { formatRangeEnd } from "./range-format"
import { SliderRangeThumbs } from "./slider-range-thumbs"
import { CodapSliderThumb } from "./slider-thumb"
import { kSliderClass, kSliderTypeLabels } from "./slider-types"

import "./slider.scss"

// PROTOTYPE: 20px each side (was 15), so a thumb at the min or max sits 10px from the tile's edge,
// like the play/pause button: 20 + the axis's 2px inset puts the value 22px in, less half the 24px thumb
const kAxisMargin = 40

// PROTOTYPE: lets attribute drags find the slider (drop ids are "slider-N-...drop", the overlay
// "slider-N-drop-overlay"), so a drag from a case table onto the slider lands here
const kSliderNewIdBase = "slider"
registerTileCollisionDetection(kSliderNewIdBase)

// a drag is droppable here if it's a numeric or date attribute
function isAllowedDrag(active: Active | null) {
  const { dataSet, attributeId } = getDragAttributeInfo(active) || {}
  return !!dataSet && !!attributeId && isSliderAttribute(dataSet.attrFromID(attributeId))
}

export const SliderComponent = observer(function SliderComponent({ tile } : ITileBaseProps) {
  const sliderModel = isAliveSafe(tile?.content) && isSliderModel(tile?.content) ? tile?.content : undefined
  const instanceId = useNextInstanceId(kSliderNewIdBase)
  const layout = useMemo(() => new SliderAxisLayout(), [])
  const {width, height, ref: sliderRef} = useResizeDetector()
  const [running, setRunning] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const statusTimeoutRef = useRef<number>()
  const prevRunningRef = useRef(false)
  const multiScale = layout.getAxisMultiScale("bottom")
  const trackRef = useRef<HTMLDivElement | null>(null)
  // PROTOTYPE: where a press on the axis began, to tell a click from a pan/zoom drag (see handleAxisClick)
  const axisPressRef = useRef<{ x: number, y: number } | null>(null)

  // Set a status message that auto-clears after 1 second.
  // Cancels any pending clear from a previous message to avoid races.
  const showStatusMessage = useCallback((message: string) => {
    window.clearTimeout(statusTimeoutRef.current)
    setStatusMessage(message)
    if (message) {
      statusTimeoutRef.current = window.setTimeout(() => setStatusMessage(""), 1000)
    }
  }, [])

  // width and positioning
  useEffect(() => {
    if ((width != null) && (height != null)) {
      layout.setTileExtent(width - kAxisMargin, height)
    }
  }, [width, height, layout])

  // Step size: use multipleOf when set; otherwise axis resolution for numeric, or unit offset for date
  const step = sliderModel?.scaleType === "date"
    ? (sliderModel.multipleOf ?? 1) * unitsStringToMilliseconds(sliderModel.dateMultipleOfUnit) / 1000
    : (sliderModel?.multipleOf ?? multiScale?.resolution ?? 1)

  const [minValue, maxValue] = sliderModel?.axis?.domain ?? [0, 1]

  // PROTOTYPE: a range slider's thumbs drag the range instead of the variable's value
  const isRange = !!sliderModel?.isRangeSlider
  // a visibility/selection slider with no attribute yet shows only "Drag an attribute or click here"
  const isEmptyRange = isRange && !sliderModel?.hasAttribute

  // React Aria keeps thumbs on a grid of steps, so dragging one end onto the other can stop a step
  // short; ends within a step are joined -- at the end that wasn't moved, so it stays put (the model then
  // snaps the joined range to a value in the data when it's committed)
  // React Aria re-rounds BOTH thumbs onto its step grid whenever one moves, which nudged the end that wasn't
  // being moved; so only the moved end takes React Aria's value and the other keeps its exact value
  const joinIfClose = useCallback((values: number[]): [number, number] => {
    if (!sliderModel) return [values[0], values[1]]
    const [curLower, curUpper] = sliderModel.range
    const movedLower = Math.abs(values[0] - curLower) > Math.abs(values[1] - curUpper)
    const [lower, upper] = movedLower ? [values[0], curUpper] : [curLower, values[1]]
    if (upper - lower > step * 1.0001) return [lower, upper]
    const stay = movedLower ? curUpper : curLower
    return [stay, stay]
  }, [sliderModel, step])

  const commitRange = useCallback((lower: number, upper: number) => {
    if (!sliderModel) return
    sliderModel.applyModelChange(
      () => sliderModel.setRange(lower, upper),
      { undoStringKey: "V3.Undo.slider.changeRange", redoStringKey: "V3.Redo.slider.changeRange" }
    )
  }, [sliderModel])

  const handleChange = useCallback((values: number[]) => {
    if (!sliderModel) return
    if (sliderModel.isRangeSlider) {
      sliderModel.setDynamicRange(...joinIfClose(values))
      return
    }
    sliderModel.applyModelChange(
      () => sliderModel.setDynamicValue(values[0]),
      // the global value's observer sends `global[<name>]`
      { noDirty: true }
    )
  }, [joinIfClose, sliderModel])

  const handleChangeEnd = useCallback((values: number[]) => {
    if (!sliderModel) return
    if (sliderModel.isRangeSlider) {
      // save the range as it stands: handleChange already kept the unmoved end exact and joined close ends.
      // (Recomputing from React Aria's values here would compare against that updated range and take
      // React Aria's rounded value for the end that didn't move.)
      commitRange(...sliderModel.range)
      return
    }
    sliderModel.applyModelChange(
      () => sliderModel.setValue(values[0]),
      {
        // V2 emits `change slider value` on mouseUp after drag (slider_view.js:330).
        // Mirror that here. The global value's observer (global-value-notifications.ts) sends
        // `global[<name>]` on each change during the drag, as V2's model observer does; the
        // component-resource notification fires only on drag completion.
        notify: () => changeSliderValueNotification(tile, values[0]),
        undoStringKey: "DG.Undo.slider.change",
        redoStringKey: "DG.Redo.slider.change",
        log: logMessageWithReplacement("sliderThumbDrag: { name: %@ = value: %@ }",
              { name: sliderModel.name, value: values[0] }, "slider")
      }
    )
  }, [commitRange, sliderModel, tile])

  const numberFormatter = useMemo(() => new Intl.NumberFormat(), [])

  // React Aria slider state (controlled by sliderModel.value)
  const state = useSliderState({
    value: isRange && sliderModel ? sliderModel.range : [sliderModel?.value ?? 0],
    minValue,
    maxValue,
    step,
    onChange: handleChange,
    onChangeEnd: handleChangeEnd,
    numberFormatter
  })

  // PROTOTYPE (CODAP-1632): a range slider is named for its type, attribute and range, e.g. "Visibility slider,
  // Height, showing 4.8 to 6.1"; values as the slider shows them, with the attribute's units
  const spokenValue = (value: number) => {
    const text = sliderModel ? formatRangeEnd(value, sliderModel, multiScale) : String(value)
    const units = sliderModel?.attribute?.units
    return units ? `${text} ${units}` : text
  }
  const typeName = sliderModel ? `${kSliderTypeLabels[sliderModel.sliderType]} slider` : ""
  const rangeLabel = sliderModel?.hasAttribute
    ? `${typeName}, ${sliderModel.attribute?.name}, showing ${spokenValue(sliderModel.range[0])} to ${
        spokenValue(sliderModel.range[1])}`
    : typeName
  const { groupProps, trackProps } = useSlider(
    { "aria-label": isRange ? rangeLabel : sliderModel?.name ?? "", minValue, maxValue, step },
    state,
    trackRef
  )

  // PROTOTYPE (CODAP-1632, CODAP-1522): announce a type change, an attribute assignment and a pause, when they happen
  // (including by undo or redo) but not on load -- the first values are only remembered
  const announcedRef = useRef<{ type?: string, attrId?: string, paused?: boolean } | null>(null)
  const sliderTypeNow = sliderModel?.sliderType
  const attrIdNow = sliderModel?.hasAttribute ? sliderModel.attributeId : undefined
  const pausedNow = !!sliderModel?.isPaused
  useEffect(() => {
    const prev = announcedRef.current
    announcedRef.current = { type: sliderTypeNow, attrId: attrIdNow, paused: pausedNow }
    if (!prev || !sliderModel) return
    if (prev.type !== sliderTypeNow) {
      showStatusMessage(`Slider changed to ${typeName}`)
    }
    else if (prev.attrId !== attrIdNow && attrIdNow) {
      showStatusMessage(`Attribute set to ${sliderModel.attribute?.name}`)
    }
    else if (!prev.paused && pausedNow) {
      // the only announcement of the pause: the Paused pill's layer isn't a live region (ship-check #9)
      showStatusMessage("Selection slider paused")
    }
  }, [sliderTypeNow, attrIdNow, pausedNow, sliderModel, showStatusMessage, typeName])

  // PROTOTYPE (CODAP-1522): after a range change, announce how many cases it covers -- "12 of 858 cases visible" /
  // "... selected" -- once the range has settled for 1.2s, so a drag or playback is announced once, at its end, and
  // never cuts off a type or attribute announcement (those show for 1s). Not on load, and not while a selection
  // slider is paused (it isn't selecting).
  const countTimerRef = useRef<number | undefined>()
  const countKeyRef = useRef<string | null>(null)
  const committedLo = sliderModel?.rangeLower
  const committedHi = sliderModel?.rangeUpper
  useEffect(() => {
    const keyNow = `${sliderTypeNow}|${attrIdNow}|${committedLo}|${committedHi}`
    const prevKey = countKeyRef.current
    countKeyRef.current = keyNow
    if (prevKey == null || prevKey === keyNow) return
    window.clearTimeout(countTimerRef.current)
    countTimerRef.current = window.setTimeout(() => {
      if (!sliderModel?.isRangeSlider || !sliderModel.hasAttribute || sliderModel.isPaused) return
      const data = sliderModel.dataSet
      if (!data) return
      const values = sliderModel.itemValues
      const inRange = ({ value }: { value: number }) => sliderModel.isValueInRange(value)
      const isVisibility = sliderModel.sliderType === "visibility"
      // visibility: of all the cases; selection: of the cases visible (the ones it can select)
      const pool = isVisibility ? values : values.filter(({ id }) => !data.isItemHidden(id))
      const count = pool.filter(inRange).length
      showStatusMessage(`${count} of ${pool.length} ${pool.length === 1 ? "case" : "cases"} ${
        isVisibility ? "visible" : "selected"}`)
    }, 1200)
  }, [sliderTypeNow, attrIdNow, committedLo, committedHi, sliderModel, showStatusMessage])
  useEffect(() => () => window.clearTimeout(countTimerRef.current), [])

  // Announce animation state changes to screen readers via the aria-live region
  useEffect(() => {
    if (prevRunningRef.current !== running) {
      // the new slider's own words, matching its Play button and Playback palette (ship-check #18; Mike);
      // CODAP's DG strings say "Slider animation started/stopped"
      const key = running ? "V3.SliderView.playbackStarted" : "V3.SliderView.playbackStopped"
      showStatusMessage(t(key))
      prevRunningRef.current = running
    }
  }, [running, showStatusMessage])

  // PROTOTYPE: a selection made elsewhere overrides the selection slider (spec figure 5), so a playing slider
  // stops as it pauses; clicking the slider resumes the selecting, and Play starts it again
  const isPaused = !!sliderModel?.isPaused
  useEffect(() => {
    if (isPaused) setRunning(false)
  }, [isPaused])

  // PROTOTYPE (ship-check #7): playback stops when the slider's type changes or its attribute is removed.
  // Otherwise it kept animating an empty slider behind the prompt, with the Play button hidden.
  const hasAttributeNow = !!sliderModel?.hasAttribute
  useEffect(() => {
    setRunning(false)
  }, [sliderTypeNow, hasAttributeNow])

  // PROTOTYPE: dropping a numeric/date attribute links it (a variable slider becomes a visibility slider);
  // the title becomes the attribute's childmost collection unless someone has typed a title
  const chooseAttribute = useCallback((dataSet: IDataSet, attributeId: string) => {
    if (!sliderModel) return
    sliderModel.applyModelChange(() => {
      sliderModel.setAttribute(dataSet.id, attributeId)
      if (tile && !tile.userSetTitle) tile.setTitle(dataSet.childCollection.name)
    }, {
      undoStringKey: "V3.Undo.slider.configureFromAttribute", redoStringKey: "V3.Redo.slider.configureFromAttribute"
    })
  }, [sliderModel, tile])

  const removeAttribute = useCallback(() => {
    if (!sliderModel) return
    sliderModel.applyModelChange(() => sliderModel.removeAttribute(),
      { undoStringKey: "V3.Undo.slider.removeAttribute", redoStringKey: "V3.Redo.slider.removeAttribute" })
  }, [sliderModel])

  const { setNodeRef: setOverlayRef } = useTileDropOverlay(instanceId)
  const dropId = `${instanceId}-slider-drop`
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: dropId })
  const { active: activeDrag } = useDndContext()
  const isDropActive = isAllowedDrag(activeDrag)
  // PROTOTYPE (ship-check #22): CODAP's drop hint over the slider says what the drop will do, with the real build's
  // strings (mapping-time-sliders). A variable slider becomes a visibility slider, so it gets that hint.
  const dragInfo = isDropActive ? getDragAttributeInfo(activeDrag) : undefined
  const dragAttrName = dragInfo?.attributeId ? dragInfo.dataSet?.getAttribute(dragInfo.attributeId)?.name : undefined
  const dropHintText = dragAttrName
    ? t(sliderModel?.sliderType === "selection" ? "V3.Slider.dropHint.selection" : "V3.Slider.dropHint.visibility",
        { vars: [dragAttrName] })
    : undefined
  useDropHandler(dropId, active => {
    const { dataSet, attributeId } = getDragAttributeInfo(active) || {}
    if (dataSet && attributeId && isAllowedDrag(active)) chooseAttribute(dataSet, attributeId)
  })

  const setWrapperRef = useCallback((elt: HTMLDivElement | null) => {
    sliderRef.current = elt
    setOverlayRef(elt)
  }, [sliderRef, setOverlayRef])

  // PROTOTYPE: in a narrow tile the range readout wraps like text; the tile grows by its extra lines (the track
  // and axis stay anchored at the bottom). --readout-extra is added to the wrapper's height in slider.scss.
  const [readoutExtra, setReadoutExtra] = useState(0)
  const readoutObserverRef = useRef<ResizeObserver | null>(null)
  const setReadoutRef = useCallback((elt: HTMLDivElement | null) => {
    readoutObserverRef.current?.disconnect()
    readoutObserverRef.current = null
    if (!elt) {
      setReadoutExtra(0)
      return
    }
    const kLineHeight = 24
    const resizeObserver = new ResizeObserver(() => setReadoutExtra(Math.max(0, elt.offsetHeight - kLineHeight)))
    resizeObserver.observe(elt)
    readoutObserverRef.current = resizeObserver
  }, [])

  const [nameInput, setNameInput] = useState(sliderModel?.name ?? "")
  const nameRevertingRef = useRef(false)

  // Sync local state when model changes externally (e.g. undo)
  useEffect(() => {
    setNameInput(sliderModel?.name ?? "")
  }, [sliderModel?.name])

  if (!sliderModel) return null

  const axisStyle: CSSProperties = {
    width: width ? width - kAxisMargin : width,
  }

  const showInvalidRangeValue = (shown: string) =>
    showStatusMessage(t("DG.SliderView.invalidValue", { vars: [shown] }))

  // the range's ends: at the attribute's precision, or the scale's (see range-format.ts)
  const formatRangeValue = (value: number) => formatRangeEnd(value, sliderModel, multiScale)

  const toggleRunning = () => {
    setRunning(!running)
  }

  const axisClasses = () => {
    const axisModel = sliderModel.axis,
      isDateAxis = axisModel && isDateAxisModel(axisModel),
      [min, max] = axisModel.domain,
      requires2Lines = isDateAxis && min && max && getNumberOfLevelsForDateAxis(min, max) > 1
    return clsx("slider-axis-wrapper", {"two-lines": requires2Lines, date: isDateAxis})
  }

  const commitSliderName = () => {
    if (nameRevertingRef.current) {
      nameRevertingRef.current = false
      return
    }
    if (nameInput !== sliderModel.name) {
      sliderModel.setName(nameInput)
      showStatusMessage(t("DG.SliderView.sliderRenamed", { vars: [nameInput] }))
    }
  }

  const handleSliderNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      nameRevertingRef.current = true
      setNameInput(sliderModel.name)
    }
    if (e.key === "Enter" || e.key === "Escape") {
      e.currentTarget.blur()
    }
  }

  // PROTOTYPE (CODAP-1729, WCAG 2.5.7): a click on the axis -- a press that doesn't move, so not one of the axis's
  // pan/zoom drags -- moves the range's nearer end to the value clicked, as an alternative to dragging
  const handleAxisClick = (e: PointerEvent<HTMLDivElement>) => {
    const press = axisPressRef.current
    axisPressRef.current = null
    if (!press || !isRange || !sliderModel.hasAttribute || running) return
    if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > 3) return
    const svg = e.currentTarget.querySelector("svg.slider-axis")
    const value = svg && multiScale?.numericScale?.invert(e.clientX - svg.getBoundingClientRect().left)
    if (value == null || !isFinite(value)) return
    const [lo, hi] = sliderModel.range
    sliderModel.applyModelChange(() => {
      if (Math.abs(value - lo) <= Math.abs(value - hi)) sliderModel.setRange(value, hi)
      else sliderModel.setRange(lo, value)
    }, { undoStringKey: "V3.Undo.slider.changeRange", redoStringKey: "V3.Redo.slider.changeRange" })
  }

  // PROTOTYPE: the Paused pill resumes the slider; it then disappears, so focus moves to the range's first handle
  const isPausedPill = (target: EventTarget) =>
    target instanceof Element && !!target.closest(".slider-paused-label")
  const resumeFromPill = () => {
    sliderModel.setPausedWithoutUndo(false)
    trackRef.current?.querySelector<HTMLInputElement>("input[type=range]")?.focus()
  }

  return (
    <InstanceIdContext.Provider value={instanceId}>
      <AxisProviderContext.Provider value={sliderModel}>
        <AxisLayoutContext.Provider value={layout}>
          <div {...groupProps}
               className={clsx(kSliderClass, {
                 twoLevel: sliderModel.axisRequiresTwoLevels(),
                 "is-empty": isEmptyRange, "has-attribute": isRange && sliderModel.hasAttribute
               })}
               ref={setWrapperRef} data-testid="slider"
               style={{ ...groupProps.style, "--readout-extra": `${readoutExtra}px` } as CSSProperties}
               // a paused selection slider resumes when it's touched: clicked, or from the keyboard
               // (Enter or Space, per CODAP-1522; other keys, e.g. arrows on a thumb, move it without resuming)
               // (the Paused pill is a button: it resumes on its own click, so its pressed state shows)
               onPointerDownCapture={e => {
                 if (!isPausedPill(e.target)) sliderModel.setPausedWithoutUndo(false)
               }}
               onKeyDownCapture={e => {
                 if ((e.key === "Enter" || e.key === " ") && !isPausedPill(e.target)) {
                   sliderModel.setPausedWithoutUndo(false)
                 }
               }}>
            {/* PROTOTYPE: the content keeps its full height while the wrapper closes (see slider.scss) */}
            <div className="slider-new-content">
              {/* the attribute drop zone; drawn on top only to show the drop highlight */}
              <div ref={setDropRef} data-testid="slider-drop-zone"
                   className={clsx("slider-drop-zone", { active: isDropActive, over: isDropActive && isOver })} />
              <DropHint hintText={dropHintText} isVisible={isDropActive && isOver} />
              {isEmptyRange &&
                <div className="slider-empty-state">
                  <SliderAttributeMenu sliderModel={sliderModel} onChooseAttribute={chooseAttribute}
                                       onRemoveAttribute={removeAttribute} />
                </div>
              }
              {/* first in the body, so while paused it's the first Tab stop in the tile (ship-check #15); it's drawn
                  over the track by its z-index (slider.scss), not by coming later */}
              {sliderModel.isPaused &&
                <div className="slider-paused" data-testid="slider-paused">
                  <button type="button" className="slider-paused-label" data-testid="slider-paused-button"
                          aria-label="Paused. Resume the selection slider" onClick={resumeFromPill}>
                    Paused
                  </button>
                </div>
              }
              <div className="slider-control">
                <PlayPauseButton running={running} onClick={toggleRunning} />
                {isRange
                ? <div className="slider-inputs range-readout" data-testid="slider-range-readout" ref={setReadoutRef}>
                    {/* PROTOTYPE: two parts, each kept on one line: the label with its "=", and the two values. They can
                        break onto two lines between the parts, and no more; a part wider than the tile is cut off at its
                        edge (but stays there, and in the tab order). */}
                    <span className="range-part">
                      <span className="range-label">
                        {sliderModel.sliderType === "visibility" ? "visible" : "selected"} value(s)
                      </span>
                      <span className="equals-sign">&nbsp;=</span>
                    </span>
                    {" "}
                    <span className="range-part">
                      {/* each end is an entry field, like a variable slider's value */}
                      <EditableRangeEnd sliderModel={sliderModel} index={0} format={formatRangeValue}
                                        onInvalid={showInvalidRangeValue} />
                      {/* spaced like the "=" so a highlighted field's border doesn't touch it */}
                      <span className="equals-sign range-dash">&nbsp;–&nbsp;</span>
                      <EditableRangeEnd sliderModel={sliderModel} index={1} format={formatRangeValue}
                                        onInvalid={showInvalidRangeValue} />
                    </span>
                  </div>
                : <div className="slider-inputs">
                  <TextField value={nameInput} onChange={setNameInput}
                             aria-label={t("DG.SliderView.sliderName")} className="name-input"
                             data-testid="slider-variable-name">
                    <RAInput className="name-text-input text-input" data-testid="slider-variable-name-text-input"
                             size={Math.max(nameInput.length, 3)} onBlur={commitSliderName}
                             // PROTOTYPE: selecting a field highlights its text, per the spec
                             onFocus={e => e.target.select()}
                             onKeyDown={handleSliderNameKeyDown} />
                  </TextField>
                  <span className="equals-sign">&nbsp;=&nbsp;</span>
                  <EditableSliderValue sliderModel={sliderModel} multiScale={multiScale}
                                       onStatusMessage={showStatusMessage}/>
                  </div>
                }
              </div>
              <div {...trackProps} style={{ ...trackProps.style, position: "absolute" }}
                   ref={trackRef} className="slider">
                {isRange
                  ? <SliderRangeThumbs sliderModel={sliderModel} state={state} trackRef={trackRef}
                                       onPanEnd={commitRange} running={running} setRunning={setRunning} />
                  : <CodapSliderThumb sliderModel={sliderModel} running={running} setRunning={setRunning}
                                      state={state} trackRef={trackRef}
                    />
                }
                {/* Stop pointer events from bubbling to React Aria's track handler so that
                    D3's axis drag behavior (pan/zoom) receives them instead (CODAP-1206). */}
                <div className={axisClasses()} style={axisStyle}
                     onPointerDown={e => {
                       e.stopPropagation()
                       axisPressRef.current = { x: e.clientX, y: e.clientY }
                     }}
                     onPointerUp={handleAxisClick}>
                  <div className="axis-end min"/>
                  <svg className="slider-axis" data-testid="slider-axis">
                    <Axis
                      axisPlace={"bottom"}
                    />
                  </svg>
                  <div className="axis-end max"/>
                </div>
                {isRange && sliderModel.hasAttribute &&
                  // it's inside the track, so presses on it must not reach React Aria's track handlers
                  // (which would move the nearest thumb)
                  <div className="slider-attribute-row" onPointerDown={e => e.stopPropagation()}
                       onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
                    <SliderAttributeMenu sliderModel={sliderModel} onChooseAttribute={chooseAttribute}
                                         onRemoveAttribute={removeAttribute} />
                  </div>
                }
              </div>
              <div aria-live="polite" className="codap-visually-hidden" role="status">
                {statusMessage}
              </div>
            </div>
          </div>
        </AxisLayoutContext.Provider>
      </AxisProviderContext.Provider>
    </InstanceIdContext.Provider>
  )
})
