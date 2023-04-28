import {NumberInput, NumberInputField} from "@chakra-ui/react"
import {observer} from "mobx-react-lite"
import React, {useState, useEffect} from "react"
import {ISliderModel} from "./slider-model"
import {MultiScale} from "../axis/models/multi-scale"

import './slider.scss'
import { autorun } from "mobx"

interface IProps {
  sliderModel: ISliderModel
  multiScale: MultiScale
}

export const EditableSliderValue = observer(function EditableSliderValue({ sliderModel, multiScale}: IProps) {
  const [candidate, setCandidate] = useState("")

  useEffect(() => {
    return autorun(() => {
      // trigger update on domain change
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const domain = sliderModel.domain
      if (sliderModel) {
        setCandidate(multiScale.formatValueForScale(sliderModel.value))
      }
    })
  }, [multiScale, sliderModel])

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
