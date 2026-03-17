import React, { useCallback, useEffect, useRef, useState } from "react"
import { observer } from "mobx-react-lite"
import {
  Button, ListBox, ListBoxItem, Popover, Select, SelectValue
} from "react-aria-components"
import { InspectorPalette } from "../../inspector-panel"
import { ISliderModel } from "../slider-model"
import {AnimationDirection, AnimationDirections, AnimationMode, AnimationModes, kDefaultAnimationRate}
  from "../slider-types"
import PlaybackIcon from "../../../assets/icons/inspector-panel/playback-settings-icon.svg"
import { logStringifiedObjectMessage } from "../../../lib/log-message"
import { DateUnit, dateUnits, getDateUnitLabel } from "../../../utilities/date-utils"
import { t } from "../../../utilities/translation/translate"

import "./slider-settings-panel.scss"

interface IProps {
  id?: string
  sliderModel: ISliderModel
  panelRect?: DOMRect
  buttonRect?: DOMRect
  setShowPalette: (palette: string | undefined) => void
}

export const SliderSettingsPalette =
  observer(function SliderSettingsPalette({id, sliderModel, panelRect, buttonRect, setShowPalette}: IProps) {
    const scaleType = sliderModel.scaleType
    const initialMultiples = sliderModel.multipleOf != null ? String(sliderModel.multipleOf) : ""
    const [multiplesValue, setMultiplesValue] = useState(initialMultiples)
    const multiplesRef = useRef(multiplesValue)
    multiplesRef.current = multiplesValue
    const [isEditing, setIsEditing] = useState(false)
    const [animationRateValue, setAnimationRateValue] = useState(String(sliderModel.animationRate))

    useEffect(() => {
      setMultiplesValue(sliderModel.multipleOf != null ? String(sliderModel.multipleOf) : "")
    }, [sliderModel.multipleOf])

    useEffect(() => {
      setAnimationRateValue(String(sliderModel.animationRate))
    }, [sliderModel.animationRate])

    const handleSelectOnFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.select()
    }

    const handleAcceptMultiplesOf = useCallback((value: string) => {
      const parsed = value ? parseFloat(value) : undefined
      const multipleOf = parsed === undefined || isFinite(parsed) ? parsed : undefined
      if (multipleOf === undefined || isFinite(multipleOf)) {
        sliderModel.applyModelChange(() => {
          sliderModel.setMultipleOf(multipleOf)
        }, {
          undoStringKey: "DG.Undo.slider.changeMultiples",
          redoStringKey: "DG.Redo.slider.changeMultiples",
          log: logStringifiedObjectMessage("sliderMultiplesOf: %@",
            {name: sliderModel.name, restrictMultiplesOf: multipleOf})
        })
      }
      setIsEditing(false)
    }, [sliderModel])

    const handleMultiplesOfFocus = () => {
      setIsEditing(true)
    }

    const handleMultiplesOfBlur = useCallback(() => {
      handleAcceptMultiplesOf(multiplesRef.current)
    }, [handleAcceptMultiplesOf])

    const handleDateMultipleOfUnitChange = (key: React.Key | null) => {
      if (key == null) return
      const precision = key as DateUnit
      sliderModel.applyModelChange(() => {
        sliderModel.setDateMultipleOfUnit(precision)
      }, {
        undoStringKey: "DG.Undo.slider.changeDateMultipleOfUnit",
        redoStringKey: "DG.Redo.slider.changeDateMultipleOfUnit",
        log: logStringifiedObjectMessage("sliderDateMultipleOfUnit: %@",
          {name: sliderModel.name, dateMultipleOfUnit: precision})
      })
    }

    const handleAnimationRateBlur = () => {
      const animationRate = animationRateValue ? parseFloat(animationRateValue) : kDefaultAnimationRate
      if (isFinite(animationRate)) {
        sliderModel.applyModelChange(() => {
          sliderModel.setAnimationRate(animationRate)
        }, {
          undoStringKey: "DG.Undo.slider.changeSpeed",
          redoStringKey: "DG.Redo.slider.changeSpeed",
          log: logStringifiedObjectMessage("sliderMaxPerSecond: %@",
            {name: sliderModel.name, maxPerSecond: animationRate})
        })
      } else {
        setAnimationRateValue(String(sliderModel.animationRate))
      }
    }

    const handleAnimationDirectionChange = (key: React.Key | null) => {
      if (key == null) return
      const direction = key as AnimationDirection
      sliderModel.applyModelChange(() => {
        sliderModel.setAnimationDirection(direction)
      }, {
        undoStringKey: "DG.Undo.slider.changeDirection",
        redoStringKey: "DG.Redo.slider.changeDirection",
        log: logStringifiedObjectMessage("sliderAnimationDirection: %@",
          {name: sliderModel.name, direction})
      })
    }

    const handleSliderAnimationModeChange = (key: React.Key | null) => {
      if (key == null) return
      const mode = key as AnimationMode
      sliderModel.applyModelChange(() => {
        sliderModel.setAnimationMode(mode)
      }, {
        undoStringKey: "DG.Undo.slider.changeRepetition",
        redoStringKey: "DG.Redo.slider.changeRepetition",
        log: logStringifiedObjectMessage("sliderRepetitionMode: %@",
          {name: sliderModel.name, mode})
      })
    }

    const handleInputKeyDown = (commitFn: () => void) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") commitFn()
    }

    const multiplesCount = multiplesValue ? parseFloat(multiplesValue) : 1

    const renderMultiplesOfField = () => {
      const isDate = scaleType !== "numeric"
      const inputClass = `slider-input ${isDate ? "multiples-input" : "multiples"}`
      return (
        <>
          <span className={inputClass} data-testid="slider-restrict-multiples">
            <input
              id="slider-multiples-input"
              size={Math.max(1, multiplesValue.length)}
              value={multiplesValue}
              onChange={e => setMultiplesValue(e.target.value)}
              onFocus={e => { handleSelectOnFocus(e); handleMultiplesOfFocus() }}
              onBlur={handleMultiplesOfBlur}
              onKeyDown={handleInputKeyDown(handleMultiplesOfBlur)}
              data-testid="slider-multiples-value-input"
            />
          </span>
          {isDate && (() => {
            const langDatePrecisionOptions =
              t("DG.CaseTable.attributeEditor.datePrecisionOptions").split(" ")
            return (
              <Select
                aria-labelledby="slider-multiples-label"
                className="slider-select-container slider-date-unit-select"
                value={sliderModel.dateMultipleOfUnit}
                onChange={handleDateMultipleOfUnitChange}
              >
                <Button className="slider-select direction" data-testid="slider-date-unit">
                  {getDateUnitLabel(sliderModel.dateMultipleOfUnit, multiplesCount)}
                  <span aria-hidden="true" className="select-arrow">▾</span>
                </Button>
                <Popover>
                  <ListBox>
                    {dateUnits.map((aPrecision, index) => (
                      <ListBoxItem key={aPrecision} id={aPrecision}>
                        {langDatePrecisionOptions[index]}
                      </ListBoxItem>
                    ))}
                  </ListBox>
                </Popover>
              </Select>
            )
          })()}
        </>
      )
    }

    useEffect(() => {
      return () => {
        if (isEditing) {
          handleAcceptMultiplesOf(multiplesRef.current)
        }
      }
    }, [isEditing, handleAcceptMultiplesOf])

    const paletteFormClass = `palette-form playback-settings${scaleType === "date" ? " date-mode" : ""}`

    return (
      <InspectorPalette
        id={id}
        title={t("V3.Inspector.animation")}
        Icon={<PlaybackIcon/>}
        setShowPalette={setShowPalette}
        panelRect={panelRect}
        buttonRect={buttonRect}
      >
        <div className={paletteFormClass}>
          <div className="palette-row">
            <label className="form-label" id="slider-multiples-label" htmlFor="slider-multiples-input">
              {t("DG.Slider.multiples")}
            </label>
            {renderMultiplesOfField()}
          </div>
          <div className="palette-row">
            <label className="form-label" htmlFor="slider-animation-rate-input">{t("DG.Slider.maxPerSecond")}</label>
            <span className="slider-input animation-rate" data-testid="slider-animation-rate">
              <input
                id="slider-animation-rate-input"
                size={Math.max(1, animationRateValue.length)}
                value={animationRateValue}
                onChange={e => setAnimationRateValue(e.target.value)}
                onFocus={handleSelectOnFocus}
                onBlur={handleAnimationRateBlur}
                onKeyDown={handleInputKeyDown(handleAnimationRateBlur)}
              />
            </span>
            <span className="form-label-suffix">{t("V3.Slider.framesPerSec")}</span>
          </div>
          <div className="palette-row">
            <label className="form-label" id="slider-direction-label">{t("DG.Slider.direction")}</label>
            <Select
              aria-labelledby="slider-direction-label"
              value={sliderModel.animationDirection}
              onChange={handleAnimationDirectionChange}
              className="slider-select-container"
            >
              <Button className="slider-select direction" data-testid="slider-animation-direction">
                <SelectValue />
                <span aria-hidden="true" className="select-arrow">▾</span>
              </Button>
              <Popover>
                <ListBox>
                  {AnimationDirections.map(aDirection => (
                    <ListBoxItem key={aDirection} id={aDirection}>
                      {t(`DG.Slider.${aDirection}`)}
                    </ListBoxItem>
                  ))}
                </ListBox>
              </Popover>
            </Select>
          </div>
          <div className="palette-row">
            <label className="form-label" id="slider-mode-label">{t("DG.Slider.mode")}</label>
            <Select
              aria-labelledby="slider-mode-label"
              value={sliderModel.animationMode}
              onChange={handleSliderAnimationModeChange}
              className="slider-select-container"
            >
              <Button className="slider-select mode" data-testid="slider-animation-repetition">
                <SelectValue />
                <span aria-hidden="true" className="select-arrow">▾</span>
              </Button>
              <Popover>
                <ListBox>
                  {AnimationModes.map(aMode => (
                    <ListBoxItem key={aMode} id={aMode}>
                      {t(`DG.Slider.${aMode}`)}
                    </ListBoxItem>
                  ))}
                </ListBox>
              </Popover>
            </Select>
          </div>
        </div>
      </InspectorPalette>
    )
  })
