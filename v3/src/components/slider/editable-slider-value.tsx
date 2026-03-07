import { autorun } from "mobx"
import { observer } from "mobx-react-lite"
import { isAlive } from "mobx-state-tree"
import React, { useState, useEffect } from "react"
import { convertToDate } from "../../utilities/date-utils"
import { logMessageWithReplacement } from "../../lib/log-message"
import { t } from "../../utilities/translation/translate"
import { MultiScale } from "../axis/models/multi-scale"
import { ISliderModel } from "./slider-model"
import { valueChangeNotification } from "./slider-utils"
import { useSliderAxisAnimation } from "./use-slider-axis-animation"

import './slider.scss'

interface IProps {
  sliderModel: ISliderModel
  multiScale: MultiScale
}

export const EditableSliderValue = observer(function EditableSliderValue({sliderModel, multiScale}: IProps) {
  const [candidate, setCandidate] = useState("")
  const { animateAxisToEncompass } = useSliderAxisAnimation(sliderModel)

  useEffect(() => {
    return autorun(() => {
      if (!isAlive(sliderModel)) return
      // trigger update on domain change
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const domain = sliderModel.domain
      setCandidate(multiScale.formatValueForScale(sliderModel.value, sliderModel.scaleType === "date",
                                    sliderModel.multipleOf !== undefined ? sliderModel.dateMultipleOfUnit : undefined))
    })
  }, [multiScale, sliderModel])

  const parseValue = (value: string) => {
    if (sliderModel.scaleType === 'numeric') {
      return parseFloat(value)
    }
    const dateValue = convertToDate(value)
    return (dateValue?.valueOf() ?? 0) / 1000
  }

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
    const inputValue = parseValue(e.target.value)
    if (isFinite(inputValue)) {
      animateAxisToEncompass(inputValue, {
        notify: () => valueChangeNotification(sliderModel.value, sliderModel.name),
        undoStringKey: "DG.Undo.slider.change",
        redoStringKey: "DG.Redo.slider.change",
        log: logMessageWithReplacement("sliderEdit: { expression: %@ = %@ }",
          {name: sliderModel.name, value: inputValue})
      })
    }
  }

  const renderValueInputField = () => {
    return (
      <input
        aria-label={t("DG.SliderView.sliderValue", { vars: [sliderModel.name] })}
        className="value-text-input text-input value-input"
        data-testid="slider-variable-value-text-input"
        maxLength={sliderModel.scaleType === "numeric" ? 15 : 30}
        type="text"
        value={candidate}
        onBlur={handleSubmitValue}
        onChange={(e) => handleValueChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    )
  }

  return (
    <>
      {renderValueInputField()}
    </>
  )
})
