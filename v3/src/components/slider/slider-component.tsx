import React, {CSSProperties, useEffect, useMemo, useRef, useState} from "react"
import { useResizeDetector } from "react-resize-detector"
import { Flex, Center } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import PlayIcon from "../../assets/icons/icon-play.svg"
import PauseIcon from "../../assets/icons/icon-pause.svg"
import { SliderAxisLayout } from "./slider-layout"
import { ISliderModel } from "./slider-model"
import { kSliderClass, kSliderClassSelector } from "./slider-types"
import { measureText } from "../../hooks/use-measure-text"
import { Axis } from "../axis/components/axis"
import { AxisLayoutContext } from "../axis/models/axis-layout-context"
import { InstanceIdContext, useNextInstanceId } from "../../hooks/use-instance-id-context"
import { V3SliderThumb } from "./slider-thumb"
import { EditableSliderValue } from "./editable-slider-value"

import './slider.scss'

interface IProps {
  sliderModel: ISliderModel
}

export const SliderComponent = observer(({sliderModel} : IProps) => {
  const instanceId = useNextInstanceId("slider")
  const layout = useMemo(() => new SliderAxisLayout(), [])
  const {width, height, ref: sliderRef} = useResizeDetector()
  const [multiplesOf, setMultiplesOf] = useState(0.5) // TODO move this to model?
  const [running, setRunning] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const intervalRef = useRef<any>()
  const tickTime = 60
  const animationRef = useRef(false)

  // width and positioning
  useEffect(() => {
    if ((width != null) && (height != null)) {
      layout.setParentExtent(width, height)
    }
  }, [width, height, layout])

  const componentStyle = { top: 100, right: 80 }

  const axisStyle: CSSProperties = {
    position: "absolute",
    left: 0,
    top: 70,
    width,
    height: 30
  }

  // set increment size
  const handleMultiplesOfChange = (e: React.BaseSyntheticEvent) => {
    resetSliderValue()
    if (typeof e === "number"){
      setMultiplesOf(e)
    } else {
      setMultiplesOf(parseFloat(e.target.value))
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
    sliderModel.setValue(sliderModel.globalValue.value + multiplesOf)
  }

  const resetSliderValue = () => {
    clearInterval(intervalRef.current)
    sliderModel.setValue(0)
  }

  const titleM = measureText(sliderModel.name)

  const handleSliderNameInput = (e: React.BaseSyntheticEvent) => {
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

  return (
    <InstanceIdContext.Provider value={instanceId}>
      <AxisLayoutContext.Provider value={layout}>
        <div className={kSliderClass} style={componentStyle} ref={sliderRef}>
          <div className="titlebar">
            <input type="text"
              value={sliderModel.name}
              onChange={handleSliderNameInput}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="slider">
            <div className="inspector-temporary">
              <input
                type="number"
                value={multiplesOf}
                onChange={handleMultiplesOfChange}
                onKeyDown={handleKeyDown}
              />
            </div>

            <Flex>
              <Center w="40px">
                <button className={`play-pause ${ running ? "running" : "paused"}`} onClick={toggleRunning}>
                  { running ? <PauseIcon /> : <PlayIcon /> }
                </button>
              </Center>
              <Center>
                {/* TODO - editing looks better than before, but still needs a bit of polish */}
                <div className="slider-inputs">
                  { isEditingName ?
                    <input
                      type="text"
                      className="name-input"
                      value={sliderModel.name}
                      onChange={handleSliderNameInput}
                      onBlur={() => setIsEditingName(false)}
                      style={{width: `${titleM + 2 + (titleM * .25)}px`, paddingLeft: "3px"}}
                    /> :
                    <div onClick={() => setIsEditingName(true)}>
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
                showGridLines={false}
              />
            </svg>

            <V3SliderThumb
              layout={layout}
              sliderModel={sliderModel}
              sliderVal={sliderModel.globalValue.value} //TODO - destructure both on the other side?
              scaleDomain={sliderModel.axis.domain}
            />

          </div>
        </div>
      </AxisLayoutContext.Provider>
    </InstanceIdContext.Provider>
  )
})
