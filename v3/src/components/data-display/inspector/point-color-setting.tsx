import React, {useCallback, useEffect, useRef, useState} from "react"
import {observer} from "mobx-react-lite"
import { clsx } from "clsx"
import {Button, ButtonGroup, Flex, FormLabel, Popover, PopoverBody, PopoverContent, PopoverTrigger,
  Portal} from "@chakra-ui/react"
import {IDataConfigurationModel} from "../models/data-configuration-model"
import {missingColor, kellyColors} from "../../../utilities/color-utils"
import {t} from "../../../utilities/translation/translate"
import { ColorPicker } from "../../case-tile-common/color-picker"
import styles from "./point-color-setting-shared.scss"

import "./point-color-setting.scss"

interface ColorPickerIProps {
  dataConfiguration: IDataConfigurationModel
  category: string
}

export const PointColorSetting = ({category, dataConfiguration}: ColorPickerIProps) => {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [inputValue, setInputValue] = useState(missingColor)
  const nonStandardColorSelected = false
  const popoverRef = useRef<HTMLDivElement>(null)
  const popoverContainerRef = useRef<HTMLDivElement>(null)
  const popoverContainerRect = popoverContainerRef.current?.getBoundingClientRect()
  const [openPopover, setOpenPopover] = useState<string | null>(null)
  const catPointColorSettingButtonRef = useRef<HTMLButtonElement>(null)

  const handleSwatchClick = (cat: string) => {
    console.log("handleSwatchClick", cat)
    setOpenPopover(openPopover === cat ? null : cat)
  }

  const updateValue = useCallback((value: string) => {
    setInputValue(value)
    console.log("ColorPicker: updateValue", value)
    // dataConfiguration.applyModelChange(() => {
    //   // CategorySet.setColorForCategory(props.cat, value)
    // })
  }, [])

  const rejectValue = useCallback(() => {
    setShowColorPicker(false)
  }, [])

  const acceptValue = useCallback(() => {
    setShowColorPicker(false)
    console.log("ColorPicker: acceptValue", inputValue)
  }, [])

  const handleShowColorPicker = (evt: React.MouseEvent) => {
    evt.preventDefault()
    evt.stopPropagation()
    setShowColorPicker(!showColorPicker)
  }

  const baseColors = ["#000000", "#a9a9a9", "#d3d3d3", "#FFFFFF"]
  const swatchColors = [...baseColors, ...kellyColors.slice(0, 12)]

  useEffect(() => {
    const adjustPosition = () => {
      const popover = popoverRef.current
      const triggerButton = catPointColorSettingButtonRef.current

      if (popover && triggerButton) {
        const rect = popover.getBoundingClientRect()
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        let top = 0
        let left = 0

        if (rect.right > viewportWidth) {
          left = viewportWidth - rect.right - 10 // 10px padding from the edge
        }
        if (rect.bottom > viewportHeight) {
          top = viewportHeight - rect.bottom - 10 // 10px padding from the edge
        }
        if (rect.left < 0) {
          left = 10 // 10px padding from the edge
        }
        if (rect.top < 0) {
          top = 10 // 10px padding from the edge
        }
        if (!showColorPicker) {
          top = +styles.colorPickerPopoverTop
          left = +styles.colorPickerPopoverLeft
        }

        popover.style.top = `${top}px`
        popover.style.left = `${left}px`
      }
    }

    adjustPosition()
    window.addEventListener('resize', adjustPosition)
    return () => {
      window.removeEventListener('resize', adjustPosition)
    }
  }, [showColorPicker])

  return (
    <Flex direction="row" key={category} className="palette-row color-picker-row cat-color-picker">
      <FormLabel className="form-label color-picker">{category}</FormLabel>
      <Popover isLazy={true} isOpen={openPopover === category} closeOnBlur={false}>
        <PopoverTrigger>
          <button className="color-picker-thumb" onClick={()=>handleSwatchClick(category)}
                  ref={catPointColorSettingButtonRef}>
            <div className="color-picker-thumb-swatch"
                  style={{backgroundColor: dataConfiguration.getLegendColorForCategory(category) || missingColor}}/>
          </button>
        </PopoverTrigger>
        <Portal>
          <PopoverContent ref={popoverContainerRef}
              className={clsx("color-picker-palette-container", {"with-color-picker": showColorPicker})}>
            <PopoverBody className="color-picker-palette" ref={popoverRef}>
              <div className="color-swatch-palette">
                <div className="color-swatch-grid">
                  {swatchColors.map((color, index) => (
                    <div className="color-swatch-cell" style={{ backgroundColor: color }} key={index} />
                  ))}
                  {nonStandardColorSelected &&
                    <div className="color-swatch-row">
                      <div className="color-swatch-cell" style={{backgroundColor: "#FFFF00"}}/>
                    </div>}
                </div>
                <div className="color-swatch-footer">
                  <Button size="xs" onClick={handleShowColorPicker}>
                    {showColorPicker ? "Less" : "More"}
                  </Button>
                </div>
              </div>
              {showColorPicker &&
                <div className="color-picker-container">
                  <div className="color-picker">
                    <ColorPicker color={inputValue} onChange={updateValue} />
                  </div>
                  <Flex className="color-picker-footer">
                    <ButtonGroup>
                      <Button className="cancel-button" size="xs" fontWeight="normal" onClick={rejectValue}>
                        {t("V3.CaseTable.colorPalette.cancel")}
                      </Button>
                      <Button className="set-color-button" size="xs" fontWeight="normal" onClick={acceptValue}>
                        {t("V3.CaseTable.colorPalette.setColor")}
                      </Button>
                    </ButtonGroup>
                  </Flex>
                </div>
              }
            </PopoverBody>
          </PopoverContent>
        </Portal>
      </Popover>
    </Flex>
  )
}
