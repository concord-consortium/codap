// PROTOTYPE: Configuration palette from the Visibility/Selection slider spec (figure 2).
// Uses the graph's Configuration title and icon so the two tiles match.
import { observer } from "mobx-react-lite"
import { Key, KeyboardEvent, useEffect, useRef, useState } from "react"
import { ListBox, ListBoxItem, Popover, Select } from "react-aria-components"
import ConfigurationIcon from "../../../assets/icons/inspector-panel/configuration-icon.svg"
import { t } from "../../../utilities/translation/translate"
import { InspectorPalette } from "../../inspector-panel"
import { ISliderModel } from "../slider-model"
import { ISliderType, kSliderTypeLabels, SliderTypes } from "../slider-types"
import {
  allWidthUnitLabels, getWidthUnitChoices, kWidthUnitSeconds, WidthUnit, widthUnitLabel
} from "../width-units"
import { kAttachedUnitListClass, kSpecDropdownListClass, SpecDropdownButton } from "./spec-dropdown"

import "./slider-settings-panel.scss"

interface IProps {
  id?: string
  sliderModel: ISliderModel
  panelRect?: DOMRect
  buttonRect?: DOMRect
  setShowPalette: (palette: string | undefined) => void
}

export const SliderConfigPalette =
  observer(function SliderConfigPalette({ id, sliderModel, panelRect, buttonRect, setShowPalette }: IProps) {
    // range width, per the doc: for visibility/selection sliders. A date width is set in one of three units chosen
    // from the span of the attribute's values (or of the axis, with no attribute): CODAP-1513. A unit chosen from
    // the menu lasts while the menu still offers it.
    const isDate = sliderModel.scaleType === "date"
    // as in the published build (mapping-time-sliders): Range width is disabled and empty until an attribute is
    // linked -- before that the range does nothing, and its width would be of the empty slider's placeholder axis
    const isBound = sliderModel.hasAttribute
    const [lower, upper] = sliderModel.range
    const values = sliderModel.hasAttribute ? sliderModel.sortedValues : []
    const span = values.length > 1 ? values[values.length - 1] - values[0] : sliderModel.axis.max - sliderModel.axis.min
    const unitChoices = getWidthUnitChoices(span)
    const [chosenUnit, setChosenUnit] = useState<WidthUnit>()
    const unit = chosenUnit && unitChoices.includes(chosenUnit) ? chosenUnit : unitChoices[0]
    const unitSeconds = isDate ? kWidthUnitSeconds[unit] : 1
    const widthInUnits = (upper - lower) / unitSeconds
    const formatWidth = (w: number) => String(Math.round(w * 1000) / 1000)
    const [widthText, setWidthText] = useState(formatWidth(widthInUnits))
    useEffect(() => setWidthText(formatWidth(widthInUnits)), [widthInUnits])

    // bad input is announced, as the range end fields in the tile do (WCAG 3.3.1, ship-check #14). The palette
    // isn't inside the tile, so it has its own status region; the message clears after a second, as the tile's does.
    const [statusMessage, setStatusMessage] = useState("")
    const statusTimerRef = useRef<number>()
    useEffect(() => () => window.clearTimeout(statusTimerRef.current), [])
    const announceInvalid = (kept: string) => {
      window.clearTimeout(statusTimerRef.current)
      setStatusMessage(t("DG.SliderView.invalidValue", { vars: [kept] }))
      statusTimerRef.current = window.setTimeout(() => setStatusMessage(""), 1000)
    }

    const commitWidth = () => {
      const parsed = parseFloat(widthText)
      if (!isFinite(parsed) || parsed < 0) {
        // "Invalid value, keeping <the width it keeps>"
        announceInvalid(formatWidth(widthInUnits))
        setWidthText(formatWidth(widthInUnits))
        return
      }
      const { min, max } = sliderModel.axis
      const width = Math.min(parsed * unitSeconds, max - min)
      // keep the lower end where it is unless the new width would run off the end of the axis
      const lo = Math.min(lower, max - width)
      sliderModel.applyModelChange(() => sliderModel.setRange(lo, lo + width), {
        undoStringKey: "V3.Undo.slider.changeRangeWidth",
        redoStringKey: "V3.Redo.slider.changeRangeWidth"
      })
    }

    const handleWidthKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") e.currentTarget.blur()
      if (e.key === "Escape") {
        setWidthText(formatWidth(widthInUnits))
        e.currentTarget.blur()
      }
    }

    const handleSliderTypeChange = (key: Key | null) => {
      if (key == null) return
      sliderModel.applyModelChange(() => {
        sliderModel.setSliderType(key as ISliderType)
      }, {
        undoStringKey: "V3.Undo.slider.changeType",
        redoStringKey: "V3.Redo.slider.changeType"
      })
    }

    return (
      <InspectorPalette
        id={id}
        title={t("DG.Inspector.configuration")}
        Icon={<ConfigurationIcon/>}
        setShowPalette={setShowPalette}
        panelRect={panelRect}
        buttonRect={buttonRect}
        tileType="slider-new"
      >
        <div className="palette-form slider-config">
          <div className="palette-row">
            <label className="form-label" id="slider-type-label">Slider Type</label>
            <Select
              aria-labelledby="slider-type-label"
              value={sliderModel.sliderType}
              onChange={handleSliderTypeChange}
              className="slider-select-container"
            >
              <SpecDropdownButton testId="slider-type" labels={SliderTypes.map(aType => kSliderTypeLabels[aType])} />
              <Popover offset={0} className={kSpecDropdownListClass} data-testid="slider-type-popover">
                <ListBox>
                  {SliderTypes.map(aType => (
                    <ListBoxItem key={aType} id={aType}>
                      {kSliderTypeLabels[aType]}
                    </ListBoxItem>
                  ))}
                </ListBox>
              </Popover>
            </Select>
          </div>
          {sliderModel.isRangeSlider &&
            <div className={`palette-row${isBound ? "" : " disabled"}`} data-testid="slider-range-width-row">
              <label className="form-label" htmlFor="slider-range-width-input">Range width</label>
              <span className={`slider-new-input range-width${isDate ? " has-unit" : ""}`}
                    data-testid="slider-range-width">
                <input
                  id="slider-range-width-input"
                  data-testid="slider-range-width-input"
                  size={Math.max(3, widthText.length)}
                  value={isBound ? widthText : ""}
                  disabled={!isBound}
                  onChange={e => setWidthText(e.target.value)}
                  onFocus={e => e.target.select()}
                  onBlur={commitWidth}
                  onKeyDown={handleWidthKeyDown}
                />
              </span>
              {isDate &&
                <Select
                  // named after its visible label, Range width (WCAG 2.5.3, ship-check #12; Mike) -- CODAP-1632
                  // calls it "Thumb width unit". The current unit is read with it.
                  aria-label="Range width unit"
                  value={unit}
                  onChange={key => key != null && setChosenUnit(key as WidthUnit)}
                  isDisabled={!isBound}
                  className="slider-select-container attached-unit"
                >
                  <SpecDropdownButton testId="slider-range-width-unit" labels={allWidthUnitLabels(unitChoices)} />
                  <Popover offset={0} className={kAttachedUnitListClass} data-testid="slider-range-width-unit-popover">
                    <ListBox>
                      {unitChoices.map(aUnit => (
                        <ListBoxItem key={aUnit} id={aUnit} textValue={widthUnitLabel(aUnit, 2)}>
                          {widthUnitLabel(aUnit, aUnit === unit ? Number(widthText) : 2)}
                        </ListBoxItem>
                      ))}
                    </ListBox>
                  </Popover>
                </Select>
              }
            </div>
          }
        </div>
        <div aria-live="polite" className="codap-visually-hidden" role="status">
          {statusMessage}
        </div>
      </InspectorPalette>
    )
  })
