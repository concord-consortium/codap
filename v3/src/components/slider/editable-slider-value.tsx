import { NumberInput, NumberInputField } from "@chakra-ui/react"
import { format } from "d3"
import { observer } from "mobx-react-lite"
import React, {useState, useEffect} from "react"
import { ISliderModel } from "./slider-model"

import './slider.scss'
import { MultiScale } from "../axis/models/multi-scale"

interface IProps {
  sliderModel: ISliderModel
  sigFig: number
  domain: any
  multiScale: MultiScale
  setSigFig: (sigFig: number) => void
}



// const formatValue = (model: ISliderModel) => d3Format(model.globalValue.value)

export const EditableSliderValue = observer(function EditableSliderValue({sliderModel, sigFig, domain, multiScale, setSigFig} : IProps) {
  const [candidate, setCandidate] = useState("")
  const d3Format = format(`.${sigFig}~s`)
  const formatValue = (model: ISliderModel) => d3Format(model.globalValue.value)
  console.log("sigFig", sigFig)

  useEffect(() => {
    console.log(multiScale)
    if (sliderModel) {
      setSigFig(multiScale.numericSignificantDigits)
      setCandidate(formatValue(sliderModel))
    }
  }, [domain, multiScale, sliderModel, sliderModel.axis])

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
