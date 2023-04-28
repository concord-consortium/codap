import {NumberInput, NumberInputField} from "@chakra-ui/react"
import {observer} from "mobx-react-lite"
import React, {useState, useEffect} from "react"
import {ISliderModel} from "./slider-model"
import {MultiScale} from "../axis/models/multi-scale"

import './slider.scss'

interface IProps {
  sliderModel: ISliderModel
  multiScale: MultiScale
}

export const EditableSliderValue = observer(function EditableSliderValue({ sliderModel, multiScale}: IProps) {
  const [candidate, setCandidate] = useState("")
  const axisModel = sliderModel.axis
  const axisMin = axisModel?.min
  const axisMax = axisModel?.max

  // when `multiScale.cellLength` is not included in the dependency, slider value shows NaN
  useEffect(() => {
    if (sliderModel) {
      setCandidate(multiScale.formatValueForScale(sliderModel.value))
    }
  }, [axisMin, axisMax, multiScale.cellLength, multiScale, sliderModel, sliderModel.value])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const {key} = e
    if (key === "Escape" || key === "Enter") {
      e.currentTarget.blur()
    }
  }

  const handleValueChange = (value: string) => {
    setCandidate(value)
  }

  const handleSubmitValue = (e: React.FocusEvent<HTMLInputElement>) => {
    const inputValue = parseFloat(e.target.value)
    if (isFinite(inputValue)) {
      sliderModel.encompassValue(inputValue)
      sliderModel.setValue(inputValue)
      setCandidate(multiScale.formatValueForScale(sliderModel.value))
    }
  }

  return (
    <NumberInput value={candidate} className="value-input"
        onChange={handleValueChange} data-testid="slider-variable-value">
      <NumberInputField className="value-text-input text-input" maxLength={15}
        onKeyDown={handleKeyDown} onBlur={handleSubmitValue} />
    </NumberInput>
  )
})
