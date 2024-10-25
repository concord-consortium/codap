import React, {useCallback, useEffect, useRef, useState} from "react"
import {observer} from "mobx-react-lite"
import { clsx } from "clsx"
import {Button, ButtonGroup, Flex, Popover, PopoverBody, PopoverContent, PopoverTrigger,
  Portal} from "@chakra-ui/react"
import {missingColor} from "../../../utilities/color-utils"
import {t} from "../../../utilities/translation/translate"
import { ColorPicker } from "../../case-tile-common/color-picker"
import { useOutsidePointerDown } from "../../../hooks/use-outside-pointer-down"
import { IDataConfigurationModel } from "../models/data-configuration-model"

import styles from "./point-color-setting-shared.scss"
import "./point-color-setting.scss"

interface ColorPickerIProps {
  onColorChange: (color: string) => void | ((color: string, cat: string) => void) |
                    ((color: string, quantile: number) => void)
  propertyLabel: string
  swatchBackgroundColor: string
  attrType?: string
  quantile?: number
  dataConfiguration?: IDataConfigurationModel
}

export const PointColorSetting = observer(function PointColorSetting({onColorChange,
      propertyLabel, swatchBackgroundColor, attrType, dataConfiguration, quantile=0}: ColorPickerIProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [inputValue, setInputValue] = useState(missingColor)
  const popoverRef = useRef<HTMLDivElement>(null)
  const popoverContainerRef = useRef<HTMLDivElement>(null)
  const [openPopover, setOpenPopover] = useState<string | null>(null)
  const pointColorSettingButtonRef = useRef<HTMLButtonElement>(null)
  const kGapSize = 10
  const [nonStandardColorSelected, setNonStandardColorSelected] = useState(false)
  const prevColorSelected = useRef("")
  useOutsidePointerDown({ref: popoverContainerRef, handler: () => setOpenPopover?.(null)})

  const handleSwatchClick = (cat: string) => {
    prevColorSelected.current = swatchBackgroundColor
    setOpenPopover(openPopover === cat ? null : cat)
  }

  const updateValue = useCallback((value: string) => {
    setInputValue(value)
    dataConfiguration?.setProvisionalColorForCategory(propertyLabel, value)
    if (attrType === "categorical") {
      dataConfiguration?.setProvisionalColorForCategory(propertyLabel, value)
      // } else if (attrType === "numeric") {
    //   (onColorChange as (color: string, quantile: number) => void)(value, quantile)
    } else {
      (onColorChange as (color: string) => void)(value)
    }
  }, [attrType, dataConfiguration, onColorChange, propertyLabel])

  const rejectValue = useCallback(() => {
    setShowColorPicker(false)
    setOpenPopover(null)
    setInputValue(prevColorSelected.current || missingColor)
    dataConfiguration?.setProvisionalColorForCategory(propertyLabel, prevColorSelected.current || missingColor)
  }, [])

  const acceptValue = useCallback(() => {
    setShowColorPicker(false)
    setOpenPopover(null)
    setNonStandardColorSelected(true)
    prevColorSelected.current = inputValue
    if (attrType === "categorical") {
      (onColorChange as (color: string, cat: string) => void)(inputValue, propertyLabel)
    } else if (attrType === "numeric") {
      (onColorChange as (color: string, quantile: number) => void)(inputValue, quantile)
    } else {
      (onColorChange as (color: string) => void)(inputValue)
    }
  }, [attrType, inputValue, onColorChange, propertyLabel, quantile])

  const handleShowColorPicker = (evt: React.MouseEvent) => {
    evt.preventDefault()
    evt.stopPropagation()
    setShowColorPicker(!showColorPicker)
  }

  const paletteColors = ["#000000", "#a9a9a9", "#d3d3d3", "#FFFFFF", "#ad2323", "#ff9632", "#ffee33", "#1d6914",
                          "#2a4bd7", "#814a19", "#8126c0", "#29d0d0", "#e9debb", "#ffcdf3", "#9dafff", "#81c57a"]

  useEffect(() => {
    const adjustPosition = () => {
      const popover = popoverRef.current
      const triggerButton = pointColorSettingButtonRef.current

      if (popover && triggerButton) {
        const rect = popover.getBoundingClientRect()
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        let top = 0
        let left = 0

        if (rect.right > viewportWidth) {
          left = viewportWidth - rect.right - kGapSize
        }
        if (rect.bottom > viewportHeight) {
          top = viewportHeight - rect.bottom - kGapSize
        }
        if (rect.left < 0) {
          left = kGapSize
        }
        if (rect.top < 0) {
          top = kGapSize
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
    <Popover isLazy={true} isOpen={openPopover === propertyLabel} closeOnBlur={true}
              onClose={()=>acceptValue()}>
      <PopoverTrigger>
        <button className="color-picker-thumb" onClick={()=>handleSwatchClick(propertyLabel)}
                ref={pointColorSettingButtonRef}>
          <div className="color-picker-thumb-swatch"
                style={{backgroundColor: swatchBackgroundColor}}/>
        </button>
      </PopoverTrigger>
      <Portal>
        <PopoverContent ref={popoverContainerRef}
            className={clsx("color-picker-palette-container", {"with-color-picker": showColorPicker})}>
          <PopoverBody className="color-picker-palette" ref={popoverRef}>
            <div className="color-swatch-palette">
              <div className="color-swatch-grid">
                {paletteColors.map((color, index) => (
                  <div className={clsx("color-swatch-cell", {"selected": color === inputValue})}
                        style={{ backgroundColor: color }} key={index} onClick={()=>updateValue(color)}/>
                ))}
                {nonStandardColorSelected &&
                  <div className="color-swatch-row">
                    <div className={clsx("color-swatch-cell", {"selected": swatchBackgroundColor === inputValue})}
                          style={{backgroundColor: inputValue}}/>
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
                  <ColorPicker color={swatchBackgroundColor} onChange={updateValue} />
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
  )
})

PointColorSetting.displayName = "PointColorSetting"
