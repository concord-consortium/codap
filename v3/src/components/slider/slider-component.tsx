import React, {useEffect, useMemo, useRef, useState} from "react"
import { useResizeDetector } from "react-resize-detector"
import { Slider, SliderTrack, SliderThumb, Flex, Center } from "@chakra-ui/react"
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
// import { useCodapSlider } from "./use-slider"
import { InstanceIdContext, useNextInstanceId } from "../../hooks/use-instance-id-context"

import './slider.scss'

interface IProps {
  sliderModel: ISliderModel
}

export const SliderComponent = observer(({sliderModel} : IProps) => {
  const instanceId = useNextInstanceId("slider")
  const layout = useMemo(() => new SliderAxisLayout(), [])
  const {width, height, ref: sliderRef} = useResizeDetector({refreshMode: "debounce", refreshRate: 15})
  const [sliderValueCandidate, setSliderValueCandidate] = useState<number>(0)
  const [multiplesOf, setMultiplesOf] = useState<number>(0.5) // move this to model
  const [running, setRunning] = useState<boolean>(false)
  const [isManuallyEditing, setIsManuallyEditing] = useState<boolean>(false)
  const intervalRef = useRef<any>()
  const tickTime = 60
  const decimalPlaces = 3
  const animationRef = useRef(false)
  // const codapSlider = useCodapSlider()

  useEffect(() => {
    (width != null) && (height != null) && layout.setParentExtent(width, height)
  }, [width, height, layout])

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

  const handleSliderValueChange = (e: number | React.BaseSyntheticEvent ) => {
    if (typeof e === "number"){
      sliderModel.setValue(inLocalDecimals(e))
    } else {
      sliderModel.setValue(inLocalDecimals(e.target.value))
    }
  }

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
    setIsManuallyEditing(false)
  }

  const styleFromApp = { top: 100, right: 80 } // TODO WIDTH-ISSUE

  return (
    <InstanceIdContext.Provider value={instanceId}>
      <AxisLayoutContext.Provider value={layout}>
        <div className={kSliderClass} style={styleFromApp} ref={sliderRef}>
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
                  { isManuallyEditing
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
                    : <div className="slider-display" onClick={() => setIsManuallyEditing(true)}>
                        {sliderExpression()}
                      </div>
                  }
                </div>
              </Center>
            </Flex>

            <Slider
              name={sliderModel.name}
              id={sliderModel.id}
              aria-label={`slider-${sliderModel.id}`}
              defaultValue={sliderModel.globalValue.value}
              value={sliderModel.globalValue.value}
              onChange={handleSliderValueChange}
              step={multiplesOf}
              max={sliderModel.axis.max}
              min={sliderModel.axis.min}
              width={layout.sliderWidth}
            >
              <SliderTrack bg='transparent' />
              <SliderThumb w="18px" h="0px" background="transparent" boxShadow="none">
                <ThumbIcon />
              </SliderThumb>
            </Slider>

            {/* WIDTH-ISSUE */}
            <svg height="50">
              <Axis
                parentSelector={kSliderClassSelector}
                getAxisModel={() => sliderModel.axis}
                enableAnimation={animationRef}
                showGridLines={false}
              />
            </svg>

          </div>
        </div>
      </AxisLayoutContext.Provider>
    </InstanceIdContext.Provider>
  )
})
