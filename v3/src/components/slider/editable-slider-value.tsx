import React, {useState, useEffect} from "react"
import { ISliderModel } from "./slider-model"

import './slider.scss'

interface IProps {
  sliderModel: ISliderModel
}

const kDecimalPlaces = 2

export const EditableSliderValue = ({sliderModel} : IProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [candidate, setCandidate] = useState("")

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const { key } = e
    switch (key) {
      case "Escape":
        break
      case "Enter":
        e.currentTarget.blur()
        break
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
    if (isNaN(myFloat)){
      setCandidate(sliderModel.globalValue.value.toString())
    } else {
      const rounded = myFloat.toFixed(2)
      const asString = rounded.toString()
      sliderModel.setValue(myFloat)
      setCandidate(asString)
    }
  }

  const handleChange = (e: React.BaseSyntheticEvent) => {
    setCandidate(e.target.value)
  }

  // keep display up-to-date
  useEffect(()=> {
    const rounded = sliderModel.globalValue.value.toFixed(kDecimalPlaces)
    setCandidate(rounded.toString())
  },[sliderModel.globalValue.value])

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
        : <div onClick={handleDisplayClick}>{sliderModel.globalValue.value}</div>
      }
    </div>
  )
}

