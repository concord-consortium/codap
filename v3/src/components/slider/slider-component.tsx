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
import { NumericAxisModel } from "../graph/models/axis-model"

// TODO you will need an instance like this to be created, but's it's going to happen
// on creation of the Slider model
const numericAxis = NumericAxisModel.create({
  place: "bottom",
  type: "numeric",
  scale:"linear",
  min: 0,
  max: 15
})

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
  sliderModel: ISliderModel
}

export const SliderComponent = observer(({sliderModel} : IProps) => {
  const sliderAxisRef = useRef<any>()
  const [sliderValueCandidate, setSliderValueCandidate] = useState<number>(0)
  const [multiplesOf, setMultiplesOf] = useState<number>(0.5) // move this to model
  const [running, setRunning] = useState<boolean>(false)
  const [isManuallyEditing, setIsManuallyEditing] = useState<boolean>(false)
  const intervalRef = useRef<any>()
  const tickSize = 60
  const decimalPlaces = 2

  const translationString = `translate(${kSliderPadding * .25}, 0)`

  const rangeMax = sliderModel.axis.max
  const rangeMin = sliderModel.axis.min

  const sliderAxis = axisBottom(scaleLinear()
    .domain(sliderModel.getDomain())
    .range([0, 400])) //TODO real calc - here we must know required pixels for current layout situation

  useEffect(() => {
    select(sliderAxisRef.current).call(sliderAxis)
  })

  function inLocalDecimals(x: number | string ){
    if (typeof x === "number") return parseFloat(x.toFixed(decimalPlaces))
    if (typeof x === "string") return parseFloat(parseFloat(x).toFixed(decimalPlaces))
    else return 0
  }

  const sliderExpression = () => {
    return `${sliderModel.name} = ${sliderModel.value}`
  }

  const titleM = measureText(sliderModel.name)
  const valueM = measureText(sliderModel.value.toString())

  useEffect(() => {
    const id = setInterval(() => { running && incrementSliderValue() }, tickSize)
    intervalRef.current = id
    return () => clearInterval(intervalRef.current)
  })

  useEffect(() => {
    setSliderValueCandidate(inLocalDecimals(sliderModel.value))
  },[sliderModel.value])

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
    sliderModel.setValue(inLocalDecimals(sliderModel.value + multiplesOf))
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

  return (
    <>
      <div className="slider" style={{top: 100, right: 80}}>

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
          defaultValue={sliderModel.value}
          value={sliderModel.value}
          onChange={handleSliderValueChange}
          step={multiplesOf}
          max={rangeMax}
          min={rangeMin}
          width={400} //TODO real calc
          marginLeft={`${kSliderPadding * .25}px`}
        >
          <SliderTrack bg='transparent' />
          <SliderThumb w="18px" h="0px" background="transparent" boxShadow="none">
            <ThumbIcon />
          </SliderThumb>
        </Slider>

        {/* TODO: real calc */}
        <svg width={400}  height="20">
          <g ref={sliderAxisRef} transform={translationString}></g>
        </svg>

      </div>
    </>
  )
})
