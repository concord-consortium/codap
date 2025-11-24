import { Flex, FormControl, FormLabel, Input, Menu, MenuButton, MenuList, MenuItem, Button } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import React, { useEffect, useState } from "react"
import { logStringifiedObjectMessage } from "../../../lib/log-message"
import { convertToDate, formatDateForInput } from "../../../utilities/date-utils"
import { t } from "../../../utilities/translation/translate"
import { InspectorPalette } from "../../inspector-panel"
import { ISliderModel } from "../slider-model"
import { ISliderScaleType, SliderScaleTypes } from "../slider-types"
import ScaleIcon from "../../../assets/icons/icon-values.svg"

import "./slider-settings-panel.scss"

interface IProps {
  sliderModel: ISliderModel
  panelRect?: DOMRect
  buttonRect?: DOMRect
  setShowPalette: (palette: string | undefined) => void
}

export const SliderScalesPalette =
  observer(function SliderScalesPalette({sliderModel, panelRect, buttonRect, setShowPalette}: IProps) {
    const scaleType = sliderModel.scaleType
    const [minInputValue, setMinInputValue] = useState(sliderModel.axis.minDisplay)
    const [maxInputValue, setMaxInputValue] = useState(sliderModel.axis.maxDisplay)

    useEffect(() => {
      setMinInputValue(sliderModel.axis.minDisplay)
      setMaxInputValue(sliderModel.axis.maxDisplay)
    }, [sliderModel.axis.minDisplay, sliderModel.axis.maxDisplay])

    const parseValue = (value: string) => {
      if (scaleType === 'numeric') {
        return parseFloat(value)
      }
      const dateValue = convertToDate(value)
      return dateValue == null ? null
        : (dateValue?.valueOf() ?? 0) / 1000
    }

    const handleScaleTypeChange = (value: string) => {
      sliderModel.applyModelChange(() => {
        sliderModel.setScaleType(value as ISliderScaleType)
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
            ? formatDateForInput(new Date(parsedValue * 1000))
            : ""
          : value
    }

    const minimumInput = () => {
      return <Input className="slider-input minimum" size="xs" value={getValueForInput(minInputValue)}
             type = { scaleType === 'date' ? 'date' : 'text' }
             onChange={(e) => setMinInputValue(e.target.value)}
             onBlur={handleMinimumBlur} onKeyDown={handleMinimumKeyDown} data-testid="slider-minimum" flex="1"/>
    }

    const maximumInput = () => {
      return <Input className="slider-input maximum" size="xs" value={getValueForInput(maxInputValue)}
             type = { scaleType === 'date' ? 'date' : 'text' }
             onChange={(e) => setMaxInputValue(e.target.value)}
             onBlur={handleMaximumBlur} onKeyDown={handleMaximumKeyDown} data-testid="slider-maximum" flex="1"/>
    }

    return (
      <InspectorPalette
        title={t("V3.Inspector.scale")}
        Icon={<ScaleIcon/>}
        setShowPalette={setShowPalette}
        panelRect={panelRect}
        buttonRect={buttonRect}
      >
        <Flex className="palette-form" direction="column">
          <FormControl>
            <Flex className="palette-row">
              <FormLabel className="form-label">{t("V3.Slider.scaleType")}
                <Menu>
                  <MenuButton as={Button} className="slider-select scaleType" sx={{ height: "20px" }}
                    data-testid="slider-scale-type-button">
                    {t(`V3.Slider.scaleType.${scaleType}`)}
                  </MenuButton>
                  <MenuList>
                    {SliderScaleTypes.map(aScaleType => (
                      <MenuItem key={aScaleType} onClick={() => handleScaleTypeChange(aScaleType)}
                        data-testid={`slider-scale-${aScaleType.toLowerCase()}`}>
                        {t(`V3.Slider.scaleType.${aScaleType}`)}
                      </MenuItem>
                    ))}
                  </MenuList>
                </Menu>
              </FormLabel>
            </Flex>
          </FormControl>
          <FormControl size="xs">
            <Flex className="palette-row" width="100%">
              <FormLabel className="form-label" flex="0 0 auto">{t("V3.Slider.minimum")}</FormLabel>
              { minimumInput() }
            </Flex>
          </FormControl>
          <FormControl size="xs">
            <Flex className="palette-row" width="100%">
              <FormLabel className="form-label" flex="0 0 auto">{t("V3.Slider.maximum")}</FormLabel>
              { maximumInput() }
            </Flex>
          </FormControl>
        </Flex>
      </InspectorPalette>
    )
  })
