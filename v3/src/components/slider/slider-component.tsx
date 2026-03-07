import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Input as RAInput, TextField } from "react-aria-components"
import { useSlider } from "@react-aria/slider"
import { useSliderState } from "@react-stately/slider"
import { useResizeDetector } from "react-resize-detector"
import PlayIcon from "../../assets/icons/icon-play.svg"
import PauseIcon from "../../assets/icons/icon-pause.svg"
import { InstanceIdContext, useNextInstanceId } from "../../hooks/use-instance-id-context"
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
import { CodapSliderThumb } from "./slider-thumb"
import { kSliderClass } from "./slider-types"
import { valueChangeNotification } from "./slider-utils"

import "./slider.scss"

const kAxisMargin = 30

export const SliderComponent = observer(function SliderComponent({ tile } : ITileBaseProps) {
  const sliderModel = isAliveSafe(tile?.content) && isSliderModel(tile?.content) ? tile?.content : undefined
  const instanceId = useNextInstanceId("slider")
  const layout = useMemo(() => new SliderAxisLayout(), [])
  const {width, height, ref: sliderRef} = useResizeDetector()
  const [running, setRunning] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const prevRunningRef = useRef(false)
  const multiScale = layout.getAxisMultiScale("bottom")
  const trackRef = useRef<HTMLDivElement | null>(null)

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

  const handleChange = useCallback((values: number[]) => {
    if (!sliderModel) return
    sliderModel.applyModelChange(
      () => sliderModel.setDynamicValue(values[0]),
      { noDirty: true, notify: () => valueChangeNotification(sliderModel.value, sliderModel.name) }
    )
  }, [sliderModel])

  const handleChangeEnd = useCallback((values: number[]) => {
    if (!sliderModel) return
    sliderModel.applyModelChange(
      () => sliderModel.setValue(values[0]),
      {
        undoStringKey: "DG.Undo.slider.change",
        redoStringKey: "DG.Redo.slider.change",
        log: logMessageWithReplacement("sliderThumbDrag: { name: %@ = value: %@ }",
              { name: sliderModel.name, value: values[0] }, "slider")
      }
    )
  }, [sliderModel])

  const numberFormatter = useMemo(() => new Intl.NumberFormat(), [])

  // React Aria slider state (controlled by sliderModel.value)
  const state = useSliderState({
    value: [sliderModel?.value ?? 0],
    minValue,
    maxValue,
    step,
    onChange: handleChange,
    onChangeEnd: handleChangeEnd,
    numberFormatter
  })

  const { groupProps, trackProps } = useSlider(
    { "aria-label": sliderModel?.name ?? "", minValue, maxValue, step },
    state,
    trackRef
  )

  // Announce animation state changes to screen readers via the aria-live region
  useEffect(() => {
    if (prevRunningRef.current !== running) {
      const key = running ? "DG.SliderView.animationStarted" : "DG.SliderView.animationStopped"
      setStatusMessage(t(key))
      const id = window.setTimeout(() => setStatusMessage(""), 1000)
      prevRunningRef.current = running
      return () => window.clearTimeout(id)
    }
  }, [running])

  const [nameInput, setNameInput] = useState(sliderModel?.name ?? "")

  // Sync local state when model changes externally (e.g. undo)
  useEffect(() => {
    setNameInput(sliderModel?.name ?? "")
  }, [sliderModel?.name])

  if (!sliderModel) return null

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
    sliderModel.setName(nameInput)
  }

  const handleSliderNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      commitSliderName()
    }
  }

  return (
    <InstanceIdContext.Provider value={instanceId}>
      <AxisProviderContext.Provider value={sliderModel}>
        <AxisLayoutContext.Provider value={layout}>
          <div {...groupProps} className={clsx(kSliderClass, {twoLevel: sliderModel.axisRequiresTwoLevels()})}
               ref={sliderRef}>
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
                <TextField value={nameInput} onChange={setNameInput}
                           aria-label={t("DG.SliderView.sliderName")} className="name-input"
                           data-testid="slider-variable-name">
                  <RAInput className="name-text-input text-input" data-testid="slider-variable-name-text-input"
                           size={Math.max(nameInput.length, 3)} onBlur={commitSliderName}
                           onKeyDown={handleSliderNameKeyDown} />
                </TextField>
                <span className="equals-sign">&nbsp;=&nbsp;</span>
                <EditableSliderValue sliderModel={sliderModel} multiScale={multiScale}/>
              </div>
            </div>
            <div {...trackProps} style={{ ...trackProps.style, position: "absolute" }}
                 ref={trackRef} className="slider">
              <CodapSliderThumb sliderModel={sliderModel} running={running} setRunning={setRunning}
                                state={state} trackRef={trackRef}
              />
              <div className={axisClasses()} style={axisStyle}>
                <div className="axis-end min"/>
                <svg className="slider-axis" data-testid="slider-axis">
                  <Axis
                    axisPlace={"bottom"}
                  />
                </svg>
                <div className="axis-end max"/>
              </div>
            </div>
            <div aria-live="polite" className="codap-visually-hidden" role="status">
              {statusMessage}
            </div>
          </div>
        </AxisLayoutContext.Provider>
      </AxisProviderContext.Provider>
    </InstanceIdContext.Provider>
  )
})
