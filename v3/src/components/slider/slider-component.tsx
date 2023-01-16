import React, {CSSProperties, useEffect, useMemo, useRef, useState} from "react"
import { useResizeDetector } from "react-resize-detector"
import { Flex, Center, Portal } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import PlayIcon from "../../assets/icons/icon-play.svg"
import PauseIcon from "../../assets/icons/icon-pause.svg"
import { SliderAxisLayout } from "./slider-layout"
import { isSliderModel } from "./slider-model"
import { kSliderClass, kSliderClassSelector } from "./slider-types"
import { measureText } from "../../hooks/use-measure-text"
import { Axis } from "../axis/components/axis"
import { AxisLayoutContext } from "../axis/models/axis-layout-context"
import { InstanceIdContext, useNextInstanceId } from "../../hooks/use-instance-id-context"
import { ITileBaseProps } from "../tiles/tile-base-props"
import { CodapSliderThumb } from "./slider-thumb"
import { EditableSliderValue } from "./editable-slider-value"

import './slider.scss'

export const SliderComponent = observer(({ tile } : ITileBaseProps) => {
  const sliderModel = tile?.content
  if (!isSliderModel(sliderModel)) return null

  const instanceId = useNextInstanceId("slider")
  const layout = useMemo(() => new SliderAxisLayout(), [])
  const {width, height, ref: sliderRef} = useResizeDetector()
  const [running, setRunning] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const intervalRef = useRef<any>()
  const tickTime = 60
  const animationRef = useRef(false)
  const sliderBounds = sliderRef.current?.getBoundingClientRect()
  const inspectorStyle: React.CSSProperties | undefined = sliderBounds
          ? { left: sliderBounds.right, top: sliderBounds.top }
          : undefined

  // width and positioning
  useEffect(() => {
    if ((width != null) && (height != null)) {
      layout.setParentExtent(width, height)
    }
  }, [width, height, layout])

  const axisStyle: CSSProperties = {
    position: "absolute",
    left: 0,
    top: 70,
    width,
    height: 30
  }

  // set increment size
  const handleMultiplesOfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const multipleOf = parseFloat(e.target.value)
    if (isFinite(multipleOf)) {
      sliderModel.setMultipleOf(multipleOf)
      sliderModel.setValue(sliderModel.value)
    }
  }

  // control slider value with play/pause
  useEffect(() => {
    const id = setInterval(() => { running && incrementSliderValue() }, tickTime)
    intervalRef.current = id
    return () => clearInterval(intervalRef.current)
  })

  const toggleRunning = () => {
    setRunning(!running)
  }

  const incrementSliderValue = () => {
    sliderModel.setValueRoundedToMultipleOf(sliderModel.value + sliderModel.multipleOf)
  }

  const titleM = measureText(sliderModel.name)

  const handleSliderNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    sliderModel.setName(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const { key } = e
    switch (key) {
      case "Escape":
        break
      case "Enter":
      case "Tab":
        e.currentTarget.blur()
        break
    }
  }

  const appRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    appRef.current = document.querySelector(".app")
  }, [])

  return (
    <InstanceIdContext.Provider value={instanceId}>
      <AxisLayoutContext.Provider value={layout}>
        <div className={kSliderClass} ref={sliderRef}>
          <div className="titlebar">
            <input type="text"
              value={sliderModel.name}
              onChange={handleSliderNameInput}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="slider">
            <Portal containerRef={appRef}>
              <div className="inspector-temporary" style={inspectorStyle}>
                <input
                  type="number"
                  value={sliderModel.multipleOf}
                  onChange={handleMultiplesOfChange}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </Portal>

            <Flex>
              <Center w="40px">
                <button className={`play-pause ${ running ? "running" : "paused"}`} onClick={toggleRunning}>
                  { running ? <PauseIcon /> : <PlayIcon /> }
                </button>
              </Center>
              <Center>
                <div className="slider-inputs">
                  { isEditingName
                    ? <input
                        type="text"
                        className="name-input"
                        value={sliderModel.name}
                        onChange={handleSliderNameInput}
                        onBlur={() => setIsEditingName(false)}
                        style={{width: `${titleM + 2 + (titleM * .25)}px`, paddingLeft: "3px"}}
                      />
                    : <div onClick={() => setIsEditingName(true)}>
                        {sliderModel.name}
                      </div>
                  }

                  <span className="equals-sign">&nbsp;=&nbsp;</span>

                  <EditableSliderValue sliderModel={sliderModel} />

                </div>
              </Center>
            </Flex>

            <svg style={axisStyle}>
              <Axis
                parentSelector={kSliderClassSelector}
                getAxisModel={() => sliderModel.axis}
                enableAnimation={animationRef}
              />
            </svg>

            <CodapSliderThumb sliderContainer={sliderRef.current} sliderModel={sliderModel} />

          </div>
        </div>
      </AxisLayoutContext.Provider>
    </InstanceIdContext.Provider>
  )
})
