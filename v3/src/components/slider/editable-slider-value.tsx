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
  const [isEditing, setIsEditing] = useState(false)
  const [candidate, setCandidate] = useState("")

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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

  const handleDisplayClick = () => {
    setIsEditing(true)
  }

  const handleBlur = () => {
    const myFloat = parseFloat(candidate)
    if (isFinite(myFloat)) {
      sliderModel.setValue(myFloat)
    } else {
      setCandidate(formatValue(sliderModel))
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCandidate(e.target.value)
  }

  // keep display up-to-date
  useEffect(()=> {
    setCandidate(formatValue(sliderModel))
  }, [sliderModel, sliderModel.globalValue.value])

  return (
    <div className={`editable-slider-value ${isEditing ? 'editing' : 'display'}`}>
      { isEditing
        ? <input
            type="text"
            className="number-input"
            value={candidate}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onChange={handleChange}
          />
        : <div onClick={handleDisplayClick}>{formatValue(sliderModel)}</div>
      }
    </div>
  )
})
