import React from "react"
import {observer} from "mobx-react-lite"
import {Flex, FormControl, FormLabel, NumberDecrementStepper, NumberIncrementStepper, NumberInput,
        NumberInputField, NumberInputStepper, Select} from "@chakra-ui/react"
import {InspectorPalette} from "../../inspector-panel"
import {ISliderModel} from "../slider-model"
import {AnimationDirection, AnimationDirections, AnimationMode, AnimationModes} from "../slider-types"
import {t} from "../../../utilities/translation/translate"
import ValuesIcon from "../../../assets/icons/icon-values.svg"
import { logStringifiedObjectMessage } from "../../../lib/log-message"

import "./slider-settings-panel.scss"

interface IProps {
  sliderModel: ISliderModel
  panelRect?: DOMRect
  buttonRect?: DOMRect
  setShowPalette: (palette: string | undefined) => void
}

export const SliderSettingsPalette =
    observer(function SliderSettingsPalette({sliderModel, panelRect, buttonRect, setShowPalette}: IProps) {

  const handleMultiplesOfChange = (value: string) => {
    const multipleOf = parseFloat(value)
    if (isFinite(multipleOf)) {
      sliderModel.applyModelChange(() => {
        sliderModel.setMultipleOf(multipleOf)
      }, {
        undoStringKey: "DG.Undo.slider.changeMultiples",
        redoStringKey: "DG.Redo.slider.changeMultiples",
        log: logStringifiedObjectMessage("sliderMaxPerSecond: %@",
              {name: sliderModel.name, restrictMultiplesOf: multipleOf})
      })
    }
  }

  const handleAnimationRateChange = (value: string) => {
    const animationRate = parseFloat(value)
    if (isFinite(animationRate)) {
      sliderModel.applyModelChange(() => {
        sliderModel.setAnimationRate(animationRate)
      }, {
        undoStringKey: "DG.Undo.slider.changeSpeed",
        redoStringKey: "DG.Redo.slider.changeSpeed",
        log: logStringifiedObjectMessage("sliderMaxPerSecond: %@",
              {name: sliderModel.name, maxPerSecond: animationRate})
      })
    }
  }

  const handleAnimationDirectionChange = (value: string) => {
    sliderModel.applyModelChange(() => {
      sliderModel.setAnimationDirection(value as AnimationDirection)
    }, {
      undoStringKey: "DG.Undo.slider.changeDirection",
      redoStringKey: "DG.Redo.slider.changeDirection",
      log: logStringifiedObjectMessage("sliderAnimationDirection: %@",
            {name: sliderModel.name, direction: value})
    })
  }

  const handleSliderAnimationModeChange = (value: string) => {
    sliderModel.applyModelChange(() => {
      sliderModel.setAnimationMode(value as AnimationMode)
    }, {
      undoStringKey: "DG.Undo.slider.changeRepetition",
      redoStringKey: "DG.Redo.slider.changeRepetition",
      log: logStringifiedObjectMessage("sliderRepetitionMode: %@",
            {name: sliderModel.name, mode: value})
    })
  }

  return (
    <InspectorPalette
      title={t("DG.Inspector.values")}
      Icon={<ValuesIcon/>}
      setShowPalette={setShowPalette}
      panelRect={panelRect}
      buttonRect={buttonRect}
    >
      <Flex className="palette-form" direction="column">
        <FormControl size="xs">
          <Flex className="palette-row">
            <FormLabel className="form-label">{t("DG.Slider.multiples")}
              <NumberInput className="slider-input multiples" size="xs" defaultValue={sliderModel.multipleOf}
                  step={0.5} onChange={handleMultiplesOfChange} data-testid="slider-restrict-multiples">
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormLabel>
          </Flex>
        </FormControl>
        <FormControl>
          <Flex className="palette-row">
            <FormLabel className="form-label">{t("DG.Slider.maxPerSecond")}
              <NumberInput className="slider-input animation-rate" size="xs"
                  step={0.1} defaultValue={sliderModel._animationRate}
                  onChange={handleAnimationRateChange} data-testid="slider-animation-rate">
                <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
              </NumberInput>
            </FormLabel>
          </Flex>
        </FormControl>
        <FormControl>
          <Flex className="palette-row">
            <FormLabel className="form-label">{t("DG.Slider.direction")}
              <Select className="slider-select direction" value={sliderModel.animationDirection}
                      onChange={(e) => handleAnimationDirectionChange(e.target.value)}
                      data-testid="slider-animation-direction">
                {AnimationDirections.map(direction => (
                  <option key={direction} value={direction}>{t(`DG.Slider.${direction}`)}</option>
                ))}
              </Select>
            </FormLabel>
          </Flex>
        </FormControl>
        <FormControl>
          <Flex className="palette-row">
            <FormLabel className="form-label">{t("DG.Slider.mode")}
              <Select className="slider-select mode" value={sliderModel.animationMode}
                      onChange={(e) => handleSliderAnimationModeChange(e.target.value)}
                      data-testid="slider-animation-repetition">
                {AnimationModes.map(mode => (
                  <option key={mode} value={mode}>{t(`DG.Slider.${mode}`)}</option>
                ))}
              </Select>
            </FormLabel>
          </Flex>
        </FormControl>
      </Flex>
    </InspectorPalette>
  )
})
