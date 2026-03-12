import { observer } from "mobx-react-lite"
import React, { useEffect, useState } from "react"
import {
  Button, ListBox, ListBoxItem, Popover, Select, SelectValue
} from "react-aria-components"
import ScaleIcon from "../../../assets/icons/inspector-panel/data-icon.svg"
import { useFocusTrap } from "../../../hooks/use-focus-trap"
import { logStringifiedObjectMessage } from "../../../lib/log-message"
import { convertToDate, createDateFromEpochSeconds, formatDateForInput } from "../../../utilities/date-utils"
import { t } from "../../../utilities/translation/translate"
import { InspectorPalette } from "../../inspector-panel"
import { ISliderModel } from "../slider-model"
import { ISliderScaleType, SliderScaleTypes } from "../slider-types"

import "./slider-settings-panel.scss"

interface IProps {
  sliderModel: ISliderModel
  panelRect?: DOMRect
  buttonRect?: DOMRect
  setShowPalette: (palette: string | undefined) => void
}

export const SliderScalesPalette =
  observer(function SliderScalesPalette({sliderModel, panelRect, buttonRect, setShowPalette}: IProps) {
    const scaleType = sliderModel.scaleType
    const [minInputValue, setMinInputValue] = useState(sliderModel.axis.minDisplay)
    const [maxInputValue, setMaxInputValue] = useState(sliderModel.axis.maxDisplay)
    const { formRef, handleFormKeyDown } = useFocusTrap()

    useEffect(() => {
      setMinInputValue(sliderModel.axis.minDisplay)
      setMaxInputValue(sliderModel.axis.maxDisplay)
    }, [sliderModel.axis.minDisplay, sliderModel.axis.maxDisplay])

    const parseValue = (value: string) => {
      if (scaleType === 'numeric') {
        return parseFloat(value)
      }
      const dateValue = convertToDate(value)
      return dateValue == null ? null
        : (dateValue?.valueOf() ?? 0) / 1000
    }

    const handleScaleTypeChange = (key: React.Key | null) => {
      if (key == null) return
      const value = key as ISliderScaleType
      sliderModel.applyModelChange(() => {
        sliderModel.setScaleType(value)
      }, {
        undoStringKey: "V3.Undo.slider.changeScaleType",
        redoStringKey: "V3.Redo.slider.changeScaleType",
        log: logStringifiedObjectMessage("sliderScaleType: %@",
          {name: sliderModel.name, scaleType: value})
      })
    }

    const handleAcceptMinValue = (minValue: string) => {
      const value = parseValue(minValue)
      if (value == null) return
      sliderModel.axis.applyModelChange(() => {
        sliderModel.axis.setMinimum(value)
      }, {
        undoStringKey: "V3.Undo.slider.changeMinimum",
        redoStringKey: "V3.Redo.slider.changeMinimum",
        log: logStringifiedObjectMessage("sliderChangeMinimum: %@",
          {name: sliderModel.name, min: value})
      })
    }

    const handleMinimumBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      handleAcceptMinValue(event.target.value)
    }

    const handleMinimumKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        handleAcceptMinValue(minInputValue)
      }
    }

    const handleAcceptMaxValue = (maxValue: string) => {
      const value = parseValue(maxValue)
      if (value == null) return
      sliderModel.axis.applyModelChange(() => {
        sliderModel.axis.setMaximum(value)
      }, {
        undoStringKey: "V3.Undo.slider.changeMaximum",
        redoStringKey: "V3.Redo.slider.changeMaximum",
        log: logStringifiedObjectMessage("sliderChangeMaximum: %@",
          {name: sliderModel.name, max: value})
      })
    }

    const handleMaximumBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      handleAcceptMaxValue(event.target.value)
    }

    const handleMaximumKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        handleAcceptMaxValue(maxInputValue)
      }
    }

    const getValueForInput = (value: string) => {
      const parsedValue = value ? parseValue(value) : null
      return scaleType === "date"
          ? parsedValue !== null
            ? formatDateForInput(createDateFromEpochSeconds(parsedValue))
            : ""
          : value
    }

    const handleSelectOnFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (scaleType === "numeric") e.target.select()
    }

    const minimumInput = () => {
      const displayValue = getValueForInput(minInputValue)
      return <input
              id="slider-minimum-input" className="slider-input minimum"
              value={displayValue}
              size={scaleType === "numeric" ? Math.max(1, displayValue.length) : undefined}
              type={scaleType === "date" ? "date" : "text"}
              onChange={(e) => setMinInputValue(e.target.value)}
              onFocus={handleSelectOnFocus}
              onBlur={handleMinimumBlur} onKeyDown={handleMinimumKeyDown} data-testid="slider-minimum"
             />
    }

    const maximumInput = () => {
      const displayValue = getValueForInput(maxInputValue)
      return <input
              id="slider-maximum-input" className="slider-input maximum"
              value={displayValue}
              size={scaleType === "numeric" ? Math.max(1, displayValue.length) : undefined}
              type={scaleType === "date" ? "date" : "text"}
              onChange={(e) => setMaxInputValue(e.target.value)}
              onFocus={handleSelectOnFocus}
              onBlur={handleMaximumBlur} onKeyDown={handleMaximumKeyDown} data-testid="slider-maximum"
             />
    }

    return (
      <InspectorPalette
        title={t("V3.Inspector.scale")}
        Icon={<ScaleIcon/>}
        setShowPalette={setShowPalette}
        panelRect={panelRect}
        buttonRect={buttonRect}
      >
        <div ref={formRef} className="palette-form scale-settings" onKeyDown={handleFormKeyDown}>
          <div className="palette-row">
            <label className="form-label" id="slider-scale-type-label">{t("V3.Slider.scaleType")}</label>
            <Select
              aria-labelledby="slider-scale-type-label"
              className="slider-select-container"
              value={scaleType}
              onChange={handleScaleTypeChange}
            >
              <Button className="slider-select scaleType" data-testid="slider-scale-type-button">
                <SelectValue />
                <span aria-hidden="true" className="select-arrow">▾</span>
              </Button>
              <Popover>
                <ListBox>
                  {SliderScaleTypes.map(aScaleType => (
                    <ListBoxItem key={aScaleType} id={aScaleType}
                      data-testid={`slider-scale-${aScaleType.toLowerCase()}`}>
                      {t(`V3.Slider.scaleType.${aScaleType}`)}
                    </ListBoxItem>
                  ))}
                </ListBox>
              </Popover>
            </Select>
          </div>
          <div className="palette-row">
            <label className="form-label" htmlFor="slider-minimum-input">{t("V3.Slider.minimum")}</label>
            {minimumInput()}
          </div>
          <div className="palette-row">
            <label className="form-label" htmlFor="slider-maximum-input">{t("V3.Slider.maximum")}</label>
            {maximumInput()}
          </div>
        </div>
      </InspectorPalette>
    )
  })
