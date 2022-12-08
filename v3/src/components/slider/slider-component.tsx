import React, {CSSProperties, useEffect, useMemo, useRef, useState} from "react"
import { useResizeDetector } from "react-resize-detector"
import { Flex, Center } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import PlayIcon from "../../assets/icons/icon-play.svg"
import PauseIcon from "../../assets/icons/icon-pause.svg"
import ThumbIcon from "../../assets/icons/icon-thumb.svg"
import { SliderAxisLayout } from "./slider-layout"
import { ISliderModel } from "./slider-model"
import { kSliderClass, kSliderClassSelector } from "./slider-types"
import { measureText } from "../../hooks/use-measure-text"
import { Axis } from "../axis/components/axis"
import { AxisLayoutContext } from "../axis/models/axis-layout-context"
import { InstanceIdContext, useNextInstanceId } from "../../hooks/use-instance-id-context"

import './slider.scss'

interface IProps {
  sliderModel: ISliderModel
}

export const SliderComponent = observer(({sliderModel} : IProps) => {
  const instanceId = useNextInstanceId("slider")
  const layout = useMemo(() => new SliderAxisLayout(), [])
  const {width, height, ref: sliderRef} = useResizeDetector()
  const [thumbPos, setThumbPos] = useState(0)
  const [sliderValueCandidate, setSliderValueCandidate] = useState<number>(0)
  const [multiplesOf, setMultiplesOf] = useState(0.5) // move this to model
  const [running, setRunning] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const intervalRef = useRef<any>()
  const tickTime = 60
  const decimalPlaces = 3
  const animationRef = useRef(false)

  useEffect(() => {
    if ((width != null) && (height != null)) {
      layout.setParentExtent(width, height)
    }
  }, [width, height, layout])

  useEffect(() => {
    const kThumbOffset = 8
    const thumbValue = layout.axisScale(sliderModel.globalValue.value) - kThumbOffset
    setThumbPos(thumbValue)
  }, [layout, layout.sliderWidth, sliderModel.axis.domain, sliderModel.globalValue.value])

  function inLocalDecimals(x: number | string ){
    if (typeof x === "number") return parseFloat(x.toFixed(decimalPlaces))
    if (typeof x === "string") return parseFloat(parseFloat(x).toFixed(decimalPlaces))
    else return 0
  }

  const sliderExpression = () => {
    return `${sliderModel.name} = ${sliderModel.globalValue.value}`
  }

  const titleM = measureText(sliderModel.name)
  const valueM = measureText(sliderModel.globalValue.value.toString())

  useEffect(() => {
    const id = setInterval(() => { running && incrementSliderValue() }, tickTime)
    intervalRef.current = id
    return () => clearInterval(intervalRef.current)
  })

  useEffect(() => {
    setSliderValueCandidate(inLocalDecimals(sliderModel.globalValue.value))
  },[sliderModel.globalValue.value])

  const resetSliderValue = () => {
    clearInterval(intervalRef.current)
    sliderModel.setValue(0)
  }

  const incrementSliderValue = () => {
    sliderModel.setValue(inLocalDecimals(sliderModel.globalValue.value + multiplesOf))
  }

  const toggleRunning = () => {
    setRunning(!running)
  }

  const handleSliderNameChange = (e: React.BaseSyntheticEvent) => {
    sliderModel.setName(e.target.value)
  }

  const handleMultiplesOfChange = (e: React.BaseSyntheticEvent) => {
    resetSliderValue()
    if (typeof e === "number"){
      setMultiplesOf(e)
    } else {
      setMultiplesOf(parseFloat(e.target.value))
    }
  }

  const handleSliderValueInput = (e: React.BaseSyntheticEvent) => {
    setSliderValueCandidate(inLocalDecimals(e.target.value))
  }

  const handleSliderValueInputBlur = () => {
    sliderModel.setValue(sliderValueCandidate)
    setIsEditing(false)
  }

  const componentStyle = { top: 100, right: 80 }
  const axisStyle: CSSProperties = {
    position: "absolute",
    left: 0,
    top: 70,
    width,
    height: 30
  }
  const thumbStyle: CSSProperties = {
    position: "absolute",
    left: thumbPos,
    top: 60
  }

  return (
    <InstanceIdContext.Provider value={instanceId}>
      <AxisLayoutContext.Provider value={layout}>
        <div className={kSliderClass} style={componentStyle} ref={sliderRef}>
          <div className="titlebar">
            <input type="text"
              value={sliderModel.name}
              onChange={handleSliderNameChange}
            />
          </div>
          <div className="slider">
            <div className="inspector-temporary">
              <input
                type="number"
                value={multiplesOf}
                onChange={handleMultiplesOfChange}
              />
            </div>

            <Flex>
              <Center w="40px">
                <button
                  className={`play-pause ${ running ? "running" : "paused"}`}
                  onClick={toggleRunning}
                >
                  { running ? <PauseIcon /> : <PlayIcon /> }
                </button>
              </Center>
              <Center>
                <div className="value">
                  { isEditing
                    ? <div className="slider-inputs">
                        <input type="text"
                          className="name-input"
                          value={sliderModel.name}
                          onChange={handleSliderNameChange}
                          style={{width: `${titleM + 40}px`}}
                        />
                        <span className="equals-sign">&nbsp;=&nbsp;</span>
                        <input
                          className="number-input"
                          type="number"
                          value={sliderValueCandidate}
                          onChange={handleSliderValueInput}
                          onBlur={handleSliderValueInputBlur}
                          style={{width: `${valueM + 20}px`}}
                        />
                      </div>
                    : <div className="slider-display" onClick={() => setIsEditing(true)}>
                        {sliderExpression()}
                      </div>
                  }
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

            <ThumbIcon style={thumbStyle}/>

          </div>
        </div>
      </AxisLayoutContext.Provider>
    </InstanceIdContext.Provider>
  )
})
