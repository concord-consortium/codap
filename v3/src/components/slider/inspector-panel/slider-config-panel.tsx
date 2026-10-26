import { observer } from "mobx-react-lite"
import React, { useEffect, useRef, useState } from "react"
import {
  Button, ListBox, ListBoxItem, Popover, Select, SelectValue
} from "react-aria-components"
import ConfigurationIcon from "../../../assets/icons/inspector-panel/configuration-icon.svg"
import { logStringifiedObjectMessage } from "../../../lib/log-message"
import { getTileModel } from "../../../models/tiles/tile-model"
import { durationUnitSeconds, getDateUnitLabel } from "../../../utilities/date-utils"
import { t } from "../../../utilities/translation/translate"
import { If } from "../../common/if"
import { InspectorPalette } from "../../inspector-panel"
import { ISliderModel } from "../slider-model"
import { rangeChangeOptions } from "../slider-range-change"
import { SliderType, SliderTypes } from "../slider-types"
import {
  formatSliderWidth, getSliderWidthUnitChoices, isSliderTypeAvailable, SliderWidthUnit
} from "../slider-utils"

import "./slider-settings-panel.scss"

const kMaxWidthInputSize = 12

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
    // The unit is derived from the span rather than saved; a choice of another lasts while the palette is open and
    // the menu still offers it.
    const unitChoices = getSliderWidthUnitChoices(sliderModel.widthUnitSpan)
    const [chosenUnit, setChosenUnit] = useState<SliderWidthUnit>()
    const unit = chosenUnit && unitChoices.includes(chosenUnit) ? chosenUnit : unitChoices[0]
    const unitSeconds = isDate ? durationUnitSeconds(unit) : 1
    const displayWidth = sliderModel.width / unitSeconds
    // The field shows the user's edit until it's committed (on Enter, blur, or the palette's dismissal), and
    // otherwise the width, rounded for display. Only an edit is committed, so the rounding never replaces the width.
    const [editedWidth, setEditedWidth] = useState<string>()
    const widthInput = editedWidth ?? formatSliderWidth(displayWidth)
    // the unit agrees in number with the width as shown, so a width of 1.04 days reads "1 day"
    const shownWidth = Number(widthInput)
    const unitLabel = getDateUnitLabel(unit, isFinite(shownWidth) ? shownWidth : displayWidth)

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

    // commits a pending edit, in the given unit (by default the one shown)
    const handleAcceptWidth = (editUnitSeconds = unitSeconds) => {
      if (editedWidth == null) return
      setEditedWidth(undefined)
      const parsed = editedWidth.trim() ? Number(editedWidth) : NaN
      // checked after converting to seconds, which can overflow a finite entry
      const rangeWidth = parsed * editUnitSeconds
      if (!isFinite(rangeWidth) || rangeWidth < 0 || rangeWidth === sliderModel.rangeWidth) return
      sliderModel.applyModelChange(() => {
        sliderModel.setRangeWidth(rangeWidth)
      }, {
        // the slider's value can change: a width of zero snaps the range to the data, and a wider width can move the
        // range to keep it on the axis
        ...rangeChangeOptions(sliderModel, getTileModel(sliderModel)),
        log: logStringifiedObjectMessage("sliderRangeWidth: %@", {name: sliderModel.name, rangeWidth})
      })
    }

    // Dismissing the palette removes the field without a blur (React sends none when it removes a focused element),
    // so a pending edit is committed when the palette unmounts.
    const acceptWidthRef = useRef(handleAcceptWidth)
    acceptWidthRef.current = handleAcceptWidth
    useEffect(() => () => acceptWidthRef.current(), [])

    const handleWidthKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleAcceptWidth()
      // Escape also dismisses the palette, which must then discard the edit rather than commit it
      if (e.key === "Escape") {
        setEditedWidth(undefined)
        acceptWidthRef.current = () => undefined
      }
    }

    // A unit chosen while an edit is pending applies to the edit, so typing "2" and choosing days means 2 days. So the
    // field and its unit menu act as one control: an edit stays pending while focus moves between them (including
    // into the menu's popover), and is committed when focus leaves both.
    const handleUnitChange = (key: React.Key | null) => {
      if (key == null) return
      const newUnit = key as SliderWidthUnit
      setChosenUnit(newUnit)
      handleAcceptWidth(durationUnitSeconds(newUnit))
    }

    const widthInputRef = useRef<HTMLInputElement>(null)
    const unitButtonRef = useRef<HTMLButtonElement>(null)
    const unitPopoverRef = useRef<HTMLElement>(null)
    const isWithinWidthControl = (elt: Element | null) =>
      !!elt && [widthInputRef, unitButtonRef, unitPopoverRef].some(ref => ref.current?.contains(elt))
    const handleWidthControlBlur = (e: React.FocusEvent) => {
      if (!isWithinWidthControl(e.relatedTarget)) handleAcceptWidth()
    }

    return (
      <InspectorPalette
        id={id}
        title={t("DG.Inspector.configuration")}
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
                  size={Math.min(kMaxWidthInputSize, Math.max(1, widthInput.length))}
                  value={widthInput}
                  onChange={e => setEditedWidth(e.target.value)}
                  onFocus={e => e.target.select()}
                  ref={widthInputRef}
                  onBlur={handleWidthControlBlur}
                  onKeyDown={handleWidthKeyDown}
                  data-testid="slider-range-width-input"
                />
              </span>
              <If condition={isDate}>
                <Select
                  aria-label={t("V3.Slider.rangeWidthUnit")}
                  className="slider-select-container slider-date-unit-select"
                  value={unit}
                  onChange={handleUnitChange}
                >
                  <Button ref={unitButtonRef} className="slider-select slider-date-unit"
                          onBlur={handleWidthControlBlur} data-testid="slider-range-width-unit">
                    {/* a SelectValue, so the unit is part of the button's accessible name */}
                    <SelectValue>{unitLabel}</SelectValue>
                    <span aria-hidden="true" className="select-arrow">▾</span>
                  </Button>
                  <Popover ref={unitPopoverRef} offset={0}>
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
