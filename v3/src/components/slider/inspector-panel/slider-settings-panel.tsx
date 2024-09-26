import React, { useCallback, useEffect, useRef, useState } from "react"
import { observer } from "mobx-react-lite"
import {
  Button, Flex, FormControl, FormLabel, Menu, MenuButton, MenuItem, MenuList, NumberInput, NumberInputField
} from "@chakra-ui/react"
import { InspectorPalette } from "../../inspector-panel"
import { ISliderModel } from "../slider-model"
import {AnimationDirection, AnimationDirections, AnimationMode, AnimationModes, kDefaultAnimationRate}
  from "../slider-types"
import { t } from "../../../utilities/translation/translate"
import ScaleIcon from "../../../assets/icons/icon-stopwatch.svg"
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

    const numberInputRef = useRef<HTMLInputElement>(null)

    const scaleType = sliderModel.scaleType
    const [isEditing, setIsEditing] = useState(false)

    const handleMultiplesOfFocus = () => {
      setIsEditing(true)
    }

    const handleMultiplesOfBlur = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
      const value = event.target.value,
        multipleOf = value ? parseFloat(value) : undefined
      if (!multipleOf || isFinite(multipleOf)) {
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

    const handleDateMultipleOfUnitChange = (value: string) => {
      sliderModel.applyModelChange(() => {
        // @ts-expect-error types are not compatible
        sliderModel.setDateMultipleOfUnit(value)
      }, {
        undoStringKey: "DG.Undo.slider.changeDateMultipleOfUnit",
        redoStringKey: "DG.Redo.slider.changeDateMultipleOfUnit",
        log: logStringifiedObjectMessage("sliderDateMultipleOfUnit: %@",
          {name: sliderModel.name, dateMultipleOfUnit: value})
      })
    }

    const handleAnimationRateChange = (value: string) => {
      const animationRate = value ? parseFloat(value) : kDefaultAnimationRate
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

    const renderMultiplesOfField = () => {
      if (scaleType === "numeric") {
        return (
          <NumberInput className="slider-input multiples" size="xs" defaultValue={sliderModel.multipleOf}
                       onBlur={handleMultiplesOfBlur} onFocus={handleMultiplesOfFocus}
                       data-testid="slider-restrict-multiples">
            <NumberInputField ref={numberInputRef}/>
          </NumberInput>
        )
      } else {
        const datePrecisionOptions = t("DG.CaseTable.attributeEditor.datePrecisionOptions").split(" ")
        return (
          <>
            <NumberInput className="slider-input multiples-input" size="xs" defaultValue={sliderModel.multipleOf}
                         onBlur={handleMultiplesOfBlur} onFocus={handleMultiplesOfFocus}
                         data-testid="slider-restrict-multiples">
              <NumberInputField ref={numberInputRef}/>
            </NumberInput>
            <Menu>
              <MenuButton as={Button} className="slider-select direction" sx={{height: "20px"}}>
                {sliderModel.dateMultipleOfUnit}
              </MenuButton>
              <MenuList>
                {datePrecisionOptions.map(aPrecision => (
                  <MenuItem key={aPrecision} onClick={() => handleDateMultipleOfUnitChange(aPrecision)}>
                    {aPrecision}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
          </>
        )

      }
    }

    useEffect(() => {
      const currentNumberInputRef = numberInputRef.current
      return () => {
        if (isEditing && currentNumberInputRef) {
          handleMultiplesOfBlur({target: currentNumberInputRef} as React.FocusEvent<HTMLInputElement>)
        }
      }
    }, [isEditing, handleMultiplesOfBlur])

    return (
      <InspectorPalette
        title={t("V3.Inspector.animation")}
        Icon={<ScaleIcon/>}
        setShowPalette={setShowPalette}
        panelRect={panelRect}
        buttonRect={buttonRect}
      >
        <Flex className="palette-form" direction="column">
          <FormControl size="xs">
            <Flex className="palette-row">
              <FormLabel className="form-label">{t("DG.Slider.multiples")}
                {renderMultiplesOfField()}
              </FormLabel>
            </Flex>
          </FormControl>
          <FormControl>
            <Flex className="palette-row">
              <FormLabel className="form-label">{t("DG.Slider.maxPerSecond")}
                <NumberInput className="slider-input animation-rate" size="xs"
                             defaultValue={sliderModel._animationRate}
                             onChange={handleAnimationRateChange} data-testid="slider-animation-rate">
                  <NumberInputField/>
                </NumberInput>
              </FormLabel>
            </Flex>
          </FormControl>
          <FormControl>
            <Flex className="palette-row">
              <FormLabel className="form-label">{t("DG.Slider.direction")}
                <Menu>
                  <MenuButton as={Button} className="slider-select direction" sx={{height: "20px"}}>
                    {sliderModel.animationDirection}
                  </MenuButton>
                  <MenuList>
                    {AnimationDirections.map(aDirection => (
                      <MenuItem key={aDirection} onClick={() => handleAnimationDirectionChange(aDirection)}>
                        {aDirection}
                      </MenuItem>
                    ))}
                  </MenuList>
                </Menu>
              </FormLabel>
            </Flex>
          </FormControl>
          <FormControl>
            <Flex className="palette-row">
              <FormLabel className="form-label">{t("DG.Slider.mode")}
                <Menu>
                  <MenuButton as={Button} className="slider-select mode" sx={{height: "20px"}}>
                    {sliderModel.animationMode}
                  </MenuButton>
                  <MenuList>
                    {AnimationModes.map(aMode => (
                      <MenuItem key={aMode} onClick={() => handleSliderAnimationModeChange(aMode)}>
                        {aMode}
                      </MenuItem>
                    ))}
                  </MenuList>
                </Menu>
              </FormLabel>
            </Flex>
          </FormControl>
        </Flex>
      </InspectorPalette>
    )
  })
