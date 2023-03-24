import React from "react"
import {observer} from "mobx-react-lite"
import {Flex, FormControl, FormLabel, NumberDecrementStepper, NumberIncrementStepper, NumberInput,
        NumberInputField, NumberInputStepper, Select} from "@chakra-ui/react"
import {InspectorPalette} from "../../inspector-panel"
import {ISliderModel} from "../slider-model"
import {AnimationDirection, AnimationDirections, AnimationMode, AnimationModes} from "../slider-types"
import t from "../../../utilities/translation/translate"
import ValuesIcon from "../../../assets/icons/icon-values.svg"

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
      sliderModel.setMultipleOf(multipleOf)
    }
  }

  const handleAnimationRateChange = (value: string) => {
    const animationRate = parseFloat(value)
    if (isFinite(animationRate)) {
      sliderModel.setAnimationRate(animationRate)
    }
  }
  return (
    <InspectorPalette
      title={t("DG.Inspector.values")}
      Icon={<ValuesIcon/>}
      paletteTop={-50} //temporary setting until paletteTop can be dynamically set depending on component placement
      setShowPalette={setShowPalette}
      panelRect={panelRect}
      buttonRect={buttonRect}
    >
      <Flex className="palette-form" direction="column">
        <FormControl size="xs">
          <Flex className="palette-row">
            <FormLabel className="form-label">{t("DG.Slider.multiples")}
              <NumberInput className="slider-input multiples" size="xs" defaultValue={sliderModel.multipleOf || 1}
                  min={0.1} precision={2} step={1} onChange={handleMultiplesOfChange}>
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
              <NumberInput className="slider-input animation-rate" size="xs" min={0.1} precision={2} step={1}
                  defaultValue={sliderModel.animationRate || 1} onChange={handleAnimationRateChange}>
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
                      onChange={e => sliderModel.setAnimationDirection(e.target.value as AnimationDirection)}>
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
                      onChange={e => sliderModel.setAnimationMode(e.target.value as AnimationMode)}>
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
