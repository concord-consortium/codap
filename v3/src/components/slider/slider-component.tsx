import React, {useEffect, useRef, useState} from "react"
import { Slider, SliderTrack, SliderThumb, Flex, Center } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import { select, scaleLinear, axisBottom } from "d3"
import PlayIcon from "../../assets/icons/icon-play.svg"
import PauseIcon from "../../assets/icons/icon-pause.svg"
import ThumbIcon from "../../assets/icons/icon-thumb.svg"
import './slider.scss'
import { ISliderModel, kSliderPadding } from "./slider-model"
import { measureText } from "../../hooks/use-measure-text"
import { Axis } from "../graph/components/axis"

const SliderIconComponent: Record<string, any> = {
  "play": PlayIcon,
  "pause": PauseIcon,
  "thumb": ThumbIcon
}

const SliderIcon = (icon: string) => {
  const IconComponent = SliderIconComponent[icon]
  return (<IconComponent />)
}

interface IProps {
  sliderModel: ISliderModel,
  widthFromApp: number
}

export const SliderComponent = observer(({sliderModel, widthFromApp} : IProps) => {
  const sliderAxisWrapRef = useRef<any>()
  const sliderAxisRef = useRef<any>()
  const [sliderValueCandidate, setSliderValueCandidate] = useState<number>(0)
  const [multiplesOf, setMultiplesOf] = useState<number>(0.5) // move this to model
  const [running, setRunning] = useState<boolean>(false)
  const [isManuallyEditing, setIsManuallyEditing] = useState<boolean>(false)
  const intervalRef = useRef<any>()
  const tickTime = 60
  const decimalPlaces = 2

  const sliderAxis = axisBottom(scaleLinear()
    .domain(sliderModel.getDomain())
    .range([0, widthFromApp]))

  useEffect(() => {
    select(sliderAxisRef.current).call(sliderAxis)
  })

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

  // temporary functions for layout debugging
  const handleDomainUp = () => {
    sliderModel.axis.setDomain(sliderModel.axis.min, sliderModel.axis.max + 10)
  }

  const handleDomainDown = () => {
    sliderModel.axis.setDomain(sliderModel.axis.min, sliderModel.axis.max - 10)
  }

  const translationString = `translate(${kSliderPadding * .5}, 0)`

  return (
    <>
      <div className="slider" style={{top: 100, right: 80, height: "150px"}}>

        <div className="inspector-temporary">
          <input
            type="number"
            value={multiplesOf}
            onChange={handleMultiplesOfChange}
          />
        </div>

        <div className="titlebar">
          <input type="text"
            value={sliderModel.name}
            onChange={handleSliderNameChange}
          />
        </div>

        <Flex>
          <Center w="40px">
            <button className={`play-pause ${ running ? "running" : "paused"}`} onClick={toggleRunning}>
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
          width={widthFromApp  + (kSliderPadding * .5)}
          marginLeft={`${kSliderPadding * .5}px`}
        >
          <SliderTrack bg='transparent' />
          <SliderThumb w="18px" h="0px" background="transparent" boxShadow="none">
            <ThumbIcon />
          </SliderThumb>
        </Slider>

        <svg width={widthFromApp + (kSliderPadding * .5)}  height="50" style={{ marginRight: "0px"}}>
          <Axis
            getAxisModel={() => sliderModel.axis}
            attributeID={''} // make optional in Axis
            transform={translationString}
            showGridLines={false}
            onDropAttribute={()=> console.log("make optional")} // make optional in Axis
            onTreatAttributeAs={() => console.log("make optional")} // make optional in Axis
            inGraph={false}
          />
        </svg>

      </div>
    </>
  )
})
