import { observer } from "mobx-react-lite"
import React, { useEffect, useState } from "react"
import {
  ListBox, ListBoxItem, Popover, Select
} from "react-aria-components"
import ScaleIcon from "../../../assets/icons/inspector-panel/data-icon.svg"
import { logStringifiedObjectMessage } from "../../../lib/log-message"
import { convertToDate, createDateFromEpochSeconds, formatDateForInput } from "../../../utilities/date-utils"
import { t } from "../../../utilities/translation/translate"
import { InspectorPalette } from "../../inspector-panel"
import { ISliderModel } from "../slider-model"
import { ISliderScaleType, SliderScaleTypes } from "../slider-types"
import { kSpecDropdownListClass, SpecDropdownButton } from "./spec-dropdown"
import { withHyphen, withMinusSign } from "../minus-sign"

// PROTOTYPE: the spec's labels have no colons; CODAP's shared strings for these do, so drop a trailing one
const noColon = (label: string) => label.replace(/\s*:\s*$/, "")

import "./slider-settings-panel.scss"

interface IProps {
  id?: string
  sliderModel: ISliderModel
  panelRect?: DOMRect
  buttonRect?: DOMRect
  setShowPalette: (palette: string | undefined) => void
}

export const SliderScalesPalette =
  observer(function SliderScalesPalette({id, sliderModel, panelRect, buttonRect, setShowPalette}: IProps) {
    const scaleType = sliderModel.scaleType
    const attributeScaleType = sliderModel.isRangeSlider && sliderModel.hasAttribute
      ? (sliderModel.attribute?.type === "date" ? "date" : "numeric")
      : undefined
    const disabledScaleTypes = attributeScaleType
      ? SliderScaleTypes.filter(aScaleType => aScaleType !== attributeScaleType)
      : []
    const [minInputValue, setMinInputValue] = useState(sliderModel.axis.minDisplay)
    const [maxInputValue, setMaxInputValue] = useState(sliderModel.axis.maxDisplay)

    useEffect(() => {
      setMinInputValue(sliderModel.axis.minDisplay)
      setMaxInputValue(sliderModel.axis.maxDisplay)
    }, [sliderModel.axis.minDisplay, sliderModel.axis.maxDisplay])

    const parseValue = (value: string) => {
      if (scaleType === 'numeric') {
        return parseFloat(withHyphen(value))
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
          : withMinusSign(value)
    }

    const handleSelectOnFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (scaleType === "numeric") e.target.select()
    }

    const minimumInput = () => {
      const displayValue = getValueForInput(minInputValue)
      return <input
              id="slider-minimum-input" className="slider-new-input minimum"
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
              id="slider-maximum-input" className="slider-new-input maximum"
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
        id={id}
        title={t("V3.Inspector.scale")}
        Icon={<ScaleIcon/>}
        setShowPalette={setShowPalette}
        panelRect={panelRect}
        buttonRect={buttonRect}
        tileType="slider-new"
      >
        <div className="palette-form scale-settings">
          <div className="palette-row">
            <label className="form-label" id="slider-scale-type-label">{noColon(t("V3.Slider.scaleType"))}</label>
            <Select
              aria-labelledby="slider-scale-type-label"
              className="slider-select-container"
              // PROTOTYPE (CODAP-1631): once a visibility/selection slider has an attribute, the attribute sets
              // the scale type; the other type stays listed but disabled (Mike)
              disabledKeys={disabledScaleTypes}
              value={scaleType}
              onChange={handleScaleTypeChange}
            >
              <SpecDropdownButton testId="slider-scale-type-button"
                labels={SliderScaleTypes.map(aScaleType => t(`V3.Slider.scaleType.${aScaleType}`))} />
              <Popover offset={0} className={kSpecDropdownListClass} data-testid="slider-scale-type-popover">
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
            <label className="form-label" htmlFor="slider-minimum-input">{noColon(t("V3.Slider.minimum"))}</label>
            {minimumInput()}
          </div>
          <div className="palette-row">
            <label className="form-label" htmlFor="slider-maximum-input">{noColon(t("V3.Slider.maximum"))}</label>
            {maximumInput()}
          </div>
        </div>
      </InspectorPalette>
    )
  })
