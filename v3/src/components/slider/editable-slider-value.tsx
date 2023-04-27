import {NumberInput, NumberInputField} from "@chakra-ui/react"
import {observer} from "mobx-react-lite"
import React, {useState, useEffect} from "react"
import {ISliderModel} from "./slider-model"
import {MultiScale} from "../axis/models/multi-scale"
import { AxisBounds } from "../axis/axis-types"

import './slider.scss'

interface IProps {
  sliderModel: ISliderModel
  domain: AxisBounds | undefined
  multiScale: MultiScale
}

export const EditableSliderValue = observer(function EditableSliderValue({ sliderModel, domain, multiScale}: IProps) {
  const [candidate, setCandidate] = useState("")

  // when `domain` and `multiScale.cellLength` are not included in the dependency, slider value shows NaN
  useEffect(() => {
    if (sliderModel) {
      setCandidate(multiScale.formatValueForScale(sliderModel.value))
    }
  }, [domain, multiScale.cellLength, multiScale, sliderModel, sliderModel.axis, sliderModel.value])

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
