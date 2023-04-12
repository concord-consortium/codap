import { NumberInput, NumberInputField } from "@chakra-ui/react"
import { format } from "d3"
import { observer } from "mobx-react-lite"
import React, {useState, useEffect} from "react"
import { ISliderModel } from "./slider-model"

import './slider.scss'

interface IProps {
  sliderModel: ISliderModel
}

const kDecimalPlaces = 2
const d3Format = format(`.${kDecimalPlaces}~f`)

const formatValue = (model: ISliderModel) => d3Format(model.globalValue.value)

export const EditableSliderValue = observer(function EditableSliderValue({sliderModel} : IProps) {
  const [candidate, setCandidate] = useState("")

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { key } = e
    if (key === "Escape"  || key === "Enter") {
      e.currentTarget.blur()
    }
  }

  const handleValueChange = (value: string) => {
    setCandidate(value)
  }

  // keep display up-to-date
  useEffect(()=> {
    setCandidate(formatValue(sliderModel))
  }, [sliderModel, sliderModel.globalValue.value])

  return (
    <NumberInput value={candidate} className="value-input"
        onChange={handleValueChange} data-testid="slider-variable-value">
      <NumberInputField className="value-text-input text-input" maxLength={15} onKeyDown={handleKeyDown} />
    </NumberInput>
  )
})
