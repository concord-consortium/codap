import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Input as RAInput, TextField } from "react-aria-components"
import { useSlider } from "react-aria"
import { SliderState, useSliderState } from "@react-stately/slider"
import { useResizeDetector } from "react-resize-detector"
import PlayIcon from "../../assets/icons/icon-play.svg"
import PauseIcon from "../../assets/icons/icon-pause.svg"
import { InstanceIdContext, useNextInstanceId } from "../../hooks/use-instance-id-context"
import { registerTileCollisionDetection } from "../../lib/dnd-kit/dnd-detect-collision"
import { logMessageWithReplacement } from "../../lib/log-message"
import { isAliveSafe } from "../../utilities/mst-utils"
import { t } from "../../utilities/translation/translate"
import { getNumberOfLevelsForDateAxis } from "../axis/axis-utils"
import { Axis } from "../axis/components/axis"
import { AxisProviderContext } from "../axis/hooks/use-axis-provider-context"
import { AxisLayoutContext } from "../axis/models/axis-layout-context"
import { isDateAxisModel } from "../axis/models/numeric-axis-models"
import { ITileBaseProps } from "../tiles/tile-base-props"
import { EditableSliderValue } from "./editable-slider-value"
import { kSliderIdBase, sliderCollisionDetection } from "./slider-drag-drop"
import { SliderDropHighlight, useSliderAttributeDrop } from "./slider-drop-target"
import { SliderAxisLayout } from "./slider-layout"
import { isSliderModel } from "./slider-model"
import { changeSliderValueNotification } from "./slider-notifications"
import { rangeChangeOptions } from "./slider-range-change"
import { SliderRangeThumb } from "./slider-range-thumb"
import { SliderRangeValues } from "./slider-range-values"
import { CodapSliderThumb } from "./slider-thumb"
import { kSliderClass } from "./slider-types"
import { rangeFromHandles, sliderStep, valueChangeNotification } from "./slider-utils"

import "./slider.scss"

const kAxisMargin = 30

registerTileCollisionDetection(kSliderIdBase, sliderCollisionDetection)

export const SliderComponent = observer(function SliderComponent({ tile } : ITileBaseProps) {
  const sliderModel = isAliveSafe(tile?.content) && isSliderModel(tile?.content) ? tile?.content : undefined
  const instanceId = useNextInstanceId("slider")
  const layout = useMemo(() => new SliderAxisLayout(), [])
  const {width, height, ref: sliderRef} = useResizeDetector()
  const { setOverlayRef, ...dropHighlight } = useSliderAttributeDrop(instanceId, tile)
  const setWrapperRef = useCallback((elt: HTMLDivElement | null) => {
    sliderRef(elt)
    setOverlayRef(elt)
  }, [setOverlayRef, sliderRef])
  const [running, setRunning] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const statusTimeoutRef = useRef<number>()
  const prevRunningRef = useRef(false)
  const multiScale = layout.getAxisMultiScale("bottom")
  const trackRef = useRef<HTMLDivElement | null>(null)

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
  const step = sliderModel ? sliderStep(sliderModel, multiScale?.resolution) : 1

  const [minValue, maxValue] = sliderModel?.axis?.domain ?? [0, 1]

  // The React Aria state, and the handle a range change is moving: recorded during onChange, since React Stately
  // clears its dragging flag before calling onChangeEnd. Keyboard changes mark their handle as dragging, too.
  const stateRef = useRef<SliderState | null>(null)
  const activeHandleRef = useRef<number | undefined>(undefined)
  const rangeForHandles = useCallback((values: number[]) => {
    if (!sliderModel) return values as [number, number]
    return rangeFromHandles(values, [sliderModel.rangeLow, sliderModel.rangeHigh], activeHandleRef.current, step)
  }, [sliderModel, step])

  const handleChange = useCallback((values: number[]) => {
    if (!sliderModel) return
    const ariaState = stateRef.current
    activeHandleRef.current = [0, 1].find(index => ariaState?.isThumbDragging(index)) ?? ariaState?.focusedThumb
    sliderModel.applyModelChange(
      () => sliderModel.isRangeSlider
        ? sliderModel.setDynamicRange(...rangeForHandles(values))
        : sliderModel.setDynamicValue(values[0]),
      { noDirty: true, notify: () => valueChangeNotification(sliderModel.value, sliderModel.name) }
    )
  }, [rangeForHandles, sliderModel])

  const handleChangeEnd = useCallback((values: number[]) => {
    if (!sliderModel) return
    if (sliderModel.isRangeSlider) {
      sliderModel.applyModelChange(() => sliderModel.setRange(...rangeForHandles(values)),
                                   rangeChangeOptions(sliderModel, tile))
      return
    }
    sliderModel.applyModelChange(
      () => sliderModel.setValue(values[0]),
      {
        // V2 emits `change slider value` on mouseUp after drag (slider_view.js:330).
        // Mirror that here. The during-drag handleChange above continues to fire the
        // `global[<name>]` notification per tick, which V2 also does via the model
        // observer; the component-resource notification fires only on drag completion.
        notify: () => changeSliderValueNotification(tile, values[0]),
        undoStringKey: "DG.Undo.slider.change",
        redoStringKey: "DG.Redo.slider.change",
        log: logMessageWithReplacement("sliderThumbDrag: { name: %@ = value: %@ }",
              { name: sliderModel.name, value: values[0] }, "slider")
      }
    )
  }, [rangeForHandles, sliderModel, tile])

  const numberFormatter = useMemo(() => new Intl.NumberFormat(), [])

  // React Aria slider state (controlled by sliderModel.value)
  const state = useSliderState({
    value: sliderModel?.isRangeSlider ? [sliderModel.rangeLow, sliderModel.rangeHigh] : [sliderModel?.value ?? 0],
    minValue,
    maxValue,
    step,
    onChange: handleChange,
    onChangeEnd: handleChangeEnd,
    numberFormatter
  })
  stateRef.current = state

  const { groupProps, trackProps } = useSlider(
    { "aria-label": sliderModel?.name ?? "", minValue, maxValue, step },
    state,
    trackRef
  )

  // Announce animation state changes to screen readers via the aria-live region
  useEffect(() => {
    if (prevRunningRef.current !== running) {
      const key = running ? "DG.SliderView.animationStarted" : "DG.SliderView.animationStopped"
      showStatusMessage(t(key))
      prevRunningRef.current = running
    }
  }, [running, showStatusMessage])

  const [nameInput, setNameInput] = useState(sliderModel?.name ?? "")
  const nameRevertingRef = useRef(false)

  // Sync local state when model changes externally (e.g. undo)
  useEffect(() => {
    setNameInput(sliderModel?.name ?? "")
  }, [sliderModel?.name])

  if (!sliderModel) return null

  // a range slider labels its axis with the bound attribute, e.g. "Height (meters)"
  const attribute = sliderModel.isRangeSlider ? sliderModel.attribute : undefined
  const attributeLabel = attribute ? `${attribute.name}${attribute.units ? ` (${attribute.units})` : ""}` : ""

  const axisStyle: CSSProperties = {
    width: width ? width - kAxisMargin : width,
  }

  const toggleRunning = () => {
    setRunning(!running)
  }

  const axisClasses = () => {
    const axisModel = sliderModel.axis,
      isDateAxis = axisModel && isDateAxisModel(axisModel),
      [min, max] = axisModel.domain,
      requires2Lines = isDateAxis && min && max && getNumberOfLevelsForDateAxis(min, max) > 1
    return clsx("slider-axis-wrapper", {"two-lines": requires2Lines})
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

  return (
    <InstanceIdContext.Provider value={instanceId}>
      <AxisProviderContext.Provider value={sliderModel}>
        <AxisLayoutContext.Provider value={layout}>
          <div {...groupProps} className={clsx(kSliderClass, {twoLevel: sliderModel.axisRequiresTwoLevels(),
                                                               hasAttributeLabel: !!attributeLabel})}
               ref={setWrapperRef} data-testid="slider-attribute-drop">
            <div className="slider-control">
              <button
                aria-label={running ? t("DG.SliderView.pauseButton") : t("DG.SliderView.playButton")}
                className={`play-pause ${running ? "running" : "paused"}`}
                data-testid="slider-play-pause"
                onClick={toggleRunning}
              >
                {running ? <PauseIcon/> : <PlayIcon/>}
              </button>
              <div className="slider-inputs">
                {sliderModel.isRangeSlider
                  ? <SliderRangeValues sliderModel={sliderModel} multiScale={multiScale}/>
                  : <>
                    <TextField value={nameInput} onChange={setNameInput}
                               aria-label={t("DG.SliderView.sliderName")} className="name-input"
                               data-testid="slider-variable-name">
                      <RAInput className="name-text-input text-input" data-testid="slider-variable-name-text-input"
                               size={Math.max(nameInput.length, 3)} onBlur={commitSliderName}
                               onKeyDown={handleSliderNameKeyDown} />
                    </TextField>
                    <span className="equals-sign">&nbsp;=&nbsp;</span>
                    <EditableSliderValue sliderModel={sliderModel} multiScale={multiScale}
                                         onStatusMessage={showStatusMessage}/>
                    </>}
              </div>
            </div>
            <div {...trackProps} style={{ ...trackProps.style, position: "absolute" }}
                 ref={trackRef} className="slider">
              {sliderModel.isRangeSlider
                ? <SliderRangeThumb sliderModel={sliderModel} tile={tile} running={running} setRunning={setRunning}
                                    state={state} trackRef={trackRef}
                  />
                : <CodapSliderThumb sliderModel={sliderModel} running={running} setRunning={setRunning}
                                    state={state} trackRef={trackRef}
                  />}
              {/* Stop pointer events from bubbling to React Aria's track handler so that
                  D3's axis drag behavior (pan/zoom) receives them instead (CODAP-1206). */}
              <div className={axisClasses()} style={axisStyle}
                   onPointerDown={e => e.stopPropagation()}>
                <div className="axis-end min"/>
                <svg className="slider-axis" data-testid="slider-axis">
                  <Axis
                    axisPlace={"bottom"}
                  />
                </svg>
                <div className="axis-end max"/>
              </div>
              {attributeLabel &&
                <div className="slider-attribute-label" style={axisStyle} data-testid="slider-attribute-label">
                  {attributeLabel}
                </div>}
            </div>
            <div aria-live="polite" className="codap-visually-hidden" role="status">
              {statusMessage}
            </div>
            <SliderDropHighlight {...dropHighlight}/>
          </div>
        </AxisLayoutContext.Provider>
      </AxisProviderContext.Provider>
    </InstanceIdContext.Provider>
  )
})
