import { observer } from "mobx-react-lite"
import React, { useState } from "react"
import {
  Button, ListBox, ListBoxItem, Popover, Select, SelectValue
} from "react-aria-components"
import ScaleIcon from "../../../assets/icons/inspector-panel/data-icon.svg"
import { logStringifiedObjectMessage } from "../../../lib/log-message"
import { convertToDate, createDateFromEpochSeconds, formatDateForInput } from "../../../utilities/date-utils"
import { t } from "../../../utilities/translation/translate"
import { If } from "../../common/if"
import { InspectorPalette } from "../../inspector-panel"
import { ISliderModel } from "../slider-model"
import { ISliderScaleType, SliderScaleTypes } from "../slider-types"

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
    // Each field shows the user's edit until it's committed (on Enter or blur), and otherwise the boundary: exactly,
    // for a date (to the day, which a date field holds), rather than as rounded for display. Only an edit is
    // committed, so leaving a field doesn't move its boundary to what the field shows.
    const [editedMin, setEditedMin] = useState<string>()
    const [editedMax, setEditedMax] = useState<string>()
    const boundaryForInput = (value: number, display: string) =>
      scaleType === "date" ? formatDateForInput(createDateFromEpochSeconds(value)) : display
    const minInputValue = editedMin ?? boundaryForInput(sliderModel.axis.min, sliderModel.axis.minDisplay)
    const maxInputValue = editedMax ?? boundaryForInput(sliderModel.axis.max, sliderModel.axis.maxDisplay)

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

    const handleAcceptMinValue = () => {
      if (editedMin == null) return
      setEditedMin(undefined)
      const value = parseValue(editedMin)
      if (value == null || !isFinite(value)) return
      sliderModel.axis.applyModelChange(() => {
        sliderModel.axis.setMinimum(value)
      }, {
        undoStringKey: "V3.Undo.slider.changeMinimum",
        redoStringKey: "V3.Redo.slider.changeMinimum",
        log: logStringifiedObjectMessage("sliderChangeMinimum: %@",
          {name: sliderModel.name, min: value})
      })
    }

    const handleMinimumKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        handleAcceptMinValue()
      }
    }

    const handleAcceptMaxValue = () => {
      if (editedMax == null) return
      setEditedMax(undefined)
      const value = parseValue(editedMax)
      if (value == null || !isFinite(value)) return
      sliderModel.axis.applyModelChange(() => {
        sliderModel.axis.setMaximum(value)
      }, {
        undoStringKey: "V3.Undo.slider.changeMaximum",
        redoStringKey: "V3.Redo.slider.changeMaximum",
        log: logStringifiedObjectMessage("sliderChangeMaximum: %@",
          {name: sliderModel.name, max: value})
      })
    }

    const handleMaximumKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        handleAcceptMaxValue()
      }
    }

    const handleSelectOnFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (scaleType === "numeric") e.target.select()
    }

    const units = sliderModel.numericUnits

    const minimumInput = () => {
      const displayValue = minInputValue
      return <input
              id="slider-minimum-input" className="slider-input minimum"
              value={displayValue}
              size={scaleType === "numeric" ? Math.max(1, displayValue.length) : undefined}
              type={scaleType === "date" ? "date" : "text"}
              onChange={(e) => setEditedMin(e.target.value)}
              onFocus={handleSelectOnFocus}
              onBlur={handleAcceptMinValue} onKeyDown={handleMinimumKeyDown} data-testid="slider-minimum"
              // the units, if any, read with the value
              aria-describedby={units ? "slider-minimum-units" : undefined}
             />
    }

    const maximumInput = () => {
      const displayValue = maxInputValue
      return <input
              id="slider-maximum-input" className="slider-input maximum"
              value={displayValue}
              size={scaleType === "numeric" ? Math.max(1, displayValue.length) : undefined}
              type={scaleType === "date" ? "date" : "text"}
              onChange={(e) => setEditedMax(e.target.value)}
              onFocus={handleSelectOnFocus}
              onBlur={handleAcceptMaxValue} onKeyDown={handleMaximumKeyDown} data-testid="slider-maximum"
              // the units, if any, read with the value
              aria-describedby={units ? "slider-maximum-units" : undefined}
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
      >
        <div className="palette-form scale-settings">
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
              <Popover offset={0}>
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
            <If condition={!!units}>
              <span id="slider-minimum-units" className="form-label-suffix" data-testid="slider-minimum-units">
                {units}
              </span>
            </If>
          </div>
          <div className="palette-row">
            <label className="form-label" htmlFor="slider-maximum-input">{t("V3.Slider.maximum")}</label>
            {maximumInput()}
            <If condition={!!units}>
              <span id="slider-maximum-units" className="form-label-suffix" data-testid="slider-maximum-units">
                {units}
              </span>
            </If>
          </div>
        </div>
      </InspectorPalette>
    )
  })
