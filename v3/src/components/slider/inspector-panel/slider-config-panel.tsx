import { observer } from "mobx-react-lite"
import React, { useEffect, useRef, useState } from "react"
import {
  Button, ListBox, ListBoxItem, Popover, Select, SelectValue
} from "react-aria-components"
import ConfigurationIcon from "../../../assets/icons/inspector-panel/configuration-icon.svg"
import { logStringifiedObjectMessage } from "../../../lib/log-message"
import { isFeatureEnabled } from "../../../models/feature-flags/feature-flag-manager"
import { durationUnitSeconds, getDateUnitLabel } from "../../../utilities/date-utils"
import { t } from "../../../utilities/translation/translate"
import { If } from "../../common/if"
import { InspectorPalette } from "../../inspector-panel"
import { ISliderModel } from "../slider-model"
import { SliderType, SliderTypes } from "../slider-types"
import {
  formatSliderWidth, getSliderWidthUnitChoices, SliderWidthUnit
} from "../slider-utils"

import "./slider-settings-panel.scss"

// whether the type can be offered: variable always, the range types only while their flags are on
export function isSliderTypeAvailable(sliderType: SliderType) {
  switch (sliderType) {
    case "visibility": return isFeatureEnabled("visibilitySlider")
    case "selection": return isFeatureEnabled("selectionSlider")
    default: return true
  }
}

interface IProps {
  id?: string
  sliderModel: ISliderModel
  panelRect?: DOMRect
  buttonRect?: DOMRect
  setShowPalette: (palette: string | undefined) => void
}

export const SliderConfigPalette =
  observer(function SliderConfigPalette({id, sliderModel, panelRect, buttonRect, setShowPalette}: IProps) {
    const { sliderType, isRangeSlider } = sliderModel
    const isDate = sliderModel.scaleType === "date"
    // The unit is derived from the span rather than saved; a choice of another lasts while the palette is open.
    const unitChoices = getSliderWidthUnitChoices(sliderModel.widthUnitSpan)
    const [chosenUnit, setChosenUnit] = useState<SliderWidthUnit>()
    const unit = chosenUnit && unitChoices.includes(chosenUnit) ? chosenUnit : unitChoices[0]
    const unitSeconds = isDate ? durationUnitSeconds(unit) : 1
    const displayWidth = sliderModel.width / unitSeconds
    // The field shows the user's edit until it's committed (on Enter, blur, or the palette's dismissal), and
    // otherwise the width, rounded for display. Only an edit is committed, so the rounding never replaces the width.
    const [editedWidth, setEditedWidth] = useState<string>()
    const widthInput = editedWidth ?? formatSliderWidth(displayWidth)

    // a slider whose type's flag is off still shows that type, so the menu can describe it
    const typeChoices = SliderTypes.filter(type => type === sliderType || isSliderTypeAvailable(type))

    const handleTypeChange = (key: React.Key | null) => {
      if (key == null) return
      const newType = key as SliderType
      sliderModel.applyModelChange(() => {
        sliderModel.setSliderType(newType)
      }, {
        undoStringKey: "V3.Undo.slider.changeType",
        redoStringKey: "V3.Redo.slider.changeType",
        log: logStringifiedObjectMessage("sliderType: %@", {name: sliderModel.name, sliderType: newType})
      })
    }

    const handleAcceptWidth = () => {
      if (editedWidth == null) return
      setEditedWidth(undefined)
      const parsed = editedWidth.trim() ? Number(editedWidth) : NaN
      if (!isFinite(parsed) || parsed < 0) return
      const rangeWidth = parsed * unitSeconds
      if (rangeWidth === sliderModel.rangeWidth) return
      sliderModel.applyModelChange(() => {
        sliderModel.setRangeWidth(rangeWidth)
      }, {
        undoStringKey: "V3.Undo.slider.changeRange",
        redoStringKey: "V3.Redo.slider.changeRange",
        log: logStringifiedObjectMessage("sliderRangeWidth: %@", {name: sliderModel.name, rangeWidth})
      })
    }

    // the palette can be dismissed (and the field removed) before the field's blur commits an edit
    const acceptWidthRef = useRef(handleAcceptWidth)
    acceptWidthRef.current = handleAcceptWidth
    useEffect(() => () => acceptWidthRef.current(), [])

    const handleUnitChange = (key: React.Key | null) => {
      if (key != null) setChosenUnit(key as SliderWidthUnit)
    }

    return (
      <InspectorPalette
        id={id}
        title={t("V3.Inspector.sliderConfig")}
        Icon={<ConfigurationIcon/>}
        setShowPalette={setShowPalette}
        panelRect={panelRect}
        buttonRect={buttonRect}
      >
        <div className="palette-form config-settings">
          <div className="palette-row">
            <label className="form-label" id="slider-type-label">{t("V3.Slider.type")}</label>
            <Select
              aria-labelledby="slider-type-label"
              className="slider-select-container"
              value={sliderType}
              onChange={handleTypeChange}
            >
              <Button className="slider-select slider-type" data-testid="slider-type-button">
                <SelectValue />
                <span aria-hidden="true" className="select-arrow">▾</span>
              </Button>
              <Popover offset={0}>
                <ListBox>
                  {typeChoices.map(type => (
                    <ListBoxItem key={type} id={type} data-testid={`slider-type-${type}`}>
                      {t(`V3.Slider.type.${type}`)}
                    </ListBoxItem>
                  ))}
                </ListBox>
              </Popover>
            </Select>
          </div>
          <If condition={isRangeSlider}>
            <div className="palette-row">
              <label className="form-label" id="slider-range-width-label" htmlFor="slider-range-width-input">
                {t("V3.Slider.rangeWidth")}
              </label>
              <span className="slider-input multiples-input">
                <input
                  id="slider-range-width-input"
                  size={Math.max(1, widthInput.length)}
                  value={widthInput}
                  onChange={e => setEditedWidth(e.target.value)}
                  onFocus={e => e.target.select()}
                  onBlur={handleAcceptWidth}
                  onKeyDown={e => { if (e.key === "Enter") handleAcceptWidth() }}
                  data-testid="slider-range-width-input"
                />
              </span>
              <If condition={isDate}>
                <Select
                  aria-labelledby="slider-range-width-label"
                  className="slider-select-container slider-date-unit-select"
                  value={unit}
                  onChange={handleUnitChange}
                >
                  <Button className="slider-select direction" data-testid="slider-range-width-unit">
                    {getDateUnitLabel(unit, displayWidth)}
                    <span aria-hidden="true" className="select-arrow">▾</span>
                  </Button>
                  <Popover offset={0}>
                    <ListBox>
                      {unitChoices.map(choice => (
                        <ListBoxItem key={choice} id={choice}>
                          {getDateUnitLabel(choice, 2)}
                        </ListBoxItem>
                      ))}
                    </ListBox>
                  </Popover>
                </Select>
              </If>
            </div>
          </If>
        </div>
      </InspectorPalette>
    )
  })
