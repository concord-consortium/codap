import React from "react"
import {observer} from "mobx-react-lite"
import {Flex, FormControl, FormLabel, NumberDecrementStepper, NumberIncrementStepper, NumberInput, NumberInputField, NumberInputStepper, Select} from "@chakra-ui/react"
import t from "../../../utilities/translation/translate"
import {ISliderModel} from "../slider-model"
import {InspectorPalette} from "../../inspector-panel"
import ValuesIcon from "../../../assets/icons/icon-values.svg"

import "./slider-settings-panel.scss"

interface IProps {
  sliderModel: ISliderModel
  setShowPalette: (palette: string | undefined) => void
}

export const SliderSettingsPalette =
    observer(function SliderSettingsPalette({sliderModel, setShowPalette}: IProps) {

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const { key } = e
    switch (key) {
      case "Escape":
        break
      case "Enter":
      case "Tab":
        e.currentTarget.blur()
        break
    }
  }

  const handleMultiplesOfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const multipleOf = parseFloat(e.target.value)
    if (isFinite(multipleOf)) {
      sliderModel.setMultipleOf(multipleOf)
      sliderModel.setValue(sliderModel.value)
    }
  }

  const handleAnimationRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const animationRate = parseFloat(e.target.value)
    if (isFinite(animationRate)) {
      sliderModel.setAnimationRate(animationRate)
      sliderModel.setValue(sliderModel.value)
    }
  }

  return (
    <InspectorPalette
      title={t("DG.Inspector.values")}
      Icon={<ValuesIcon/>}
      button={"slider-values-button"}
      paletteTop={-50}
    >
      <Flex className="palette-form" direction="column">
        <FormControl size="xs">
          <Flex className="palette-row">
            <FormLabel className="form-label">{t("DG.Slider.multiples")}
              <NumberInput className="slider-input multiples" size="xs">
                  <NumberInputField onChange={handleMultiplesOfChange}/>
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
              </NumberInput>
            </FormLabel>
          </Flex>
          <Flex className="palette-row">
            <FormLabel className="form-label">{t("DG.Slider.maxPerSecond")}
              <NumberInput className="slider-input animation-rate" size="xs">
                <NumberInputField onChange={handleAnimationRateChange}/>
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
              </NumberInput>
            </FormLabel>
          </Flex>
          <Flex className="palette-row">
            <FormLabel className="form-label">{t("DG.Slider.direction")}
              <Select className="slider-select direction" value={sliderModel.direction}
                      onChange={e => sliderModel.setDirection(e.target.value)}>
                <option value={"lowToHigh"}>{t("DG.Slider.lowToHigh")}</option>
                <option value={"backAndForth"}>{t("DG.Slider.backAndForth")}</option>
                <option value={"hightToLow"}>{t("DG.Slider.highToLow")}</option>
              </Select>
            </FormLabel>
          </Flex>
          <Flex className="palette-row">
            <FormLabel className="form-label">{t("DG.Slider.mode")}
              <Select className="slider-select mode" value={sliderModel.direction}
                      onChange={e => sliderModel.setRepetition(e.target.value)}>
                <option value={"nonStop"}>{t("DG.Slider.nonStop")}</option>
                <option value={"onceOnly"}>{t("DG.Slider.onceOnly")}</option>
              </Select>
            </FormLabel>
          </Flex>
        </FormControl>
      </Flex>
    </InspectorPalette>
  )
})
