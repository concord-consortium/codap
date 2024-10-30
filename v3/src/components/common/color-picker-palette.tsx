import { Button, ButtonGroup, Flex, PopoverBody, PopoverContent } from "@chakra-ui/react"
import { clsx } from "clsx"
import { colord } from "colord"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { ColorPicker } from "./color-picker"
import { t } from "../../utilities/translation/translate"

import styles from "./point-color-setting-shared.scss"
import "./point-color-setting.scss"

interface IProps {
  swatchBackgroundColor: string
  initialColor: string
  onColorChange: (newColor: string) => void
  setOpenPopover: (value: string | null) => void
  setInitialColor: (value: string) => void
  buttonRef: React.RefObject<HTMLButtonElement>
}

export const ColorPickerPalette = ({ swatchBackgroundColor, initialColor, onColorChange,
                  setOpenPopover, setInitialColor, buttonRef }: IProps) => {
  const paletteColors = ["#000000", "#a9a9a9", "#d3d3d3", "#FFFFFF", "#ad2323", "#ff9632", "#ffee33", "#1d6914",
    "#2a4bd7", "#814a19", "#8126c0", "#29d0d0", "#e9debb", "#ffcdf3", "#9dafff", "#81c57a"]
  const [nonStandardColorSelected, setNonStandardColorSelected] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [inputValue, setInputValue] = useState(swatchBackgroundColor)
  const popoverRef = useRef<HTMLDivElement>(null)
  const popoverContainerRef = useRef<HTMLDivElement>(null)
  const kGapSize = 10

  const updateValue = useCallback((value: string) => {
    setInputValue(value)
    setNonStandardColorSelected(true)
    onColorChange(value)
  }, [onColorChange])

  const rejectValue = useCallback(() => {
    setShowColorPicker(false)
    setOpenPopover(null)
    setNonStandardColorSelected(false)
    onColorChange(initialColor)
  }, [initialColor, onColorChange, setOpenPopover])

  const acceptValue = useCallback(() => {
    setShowColorPicker(false)
    setNonStandardColorSelected(true)
    updateValue(inputValue)
    // onColorChange(inputValue)
    setInitialColor(inputValue)
  }, [inputValue, onColorChange, updateValue])

  const handleShowColorPicker = (evt: React.MouseEvent) => {
    evt.preventDefault()
    evt.stopPropagation()
    setShowColorPicker(!showColorPicker)
  }

  useEffect(() => {
    const adjustPosition = () => {
      const popover = popoverRef.current
      const triggerButton = buttonRef.current

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
  }, [showColorPicker, buttonRef])

  return (
    <PopoverContent ref={popoverContainerRef}
                    className={clsx("color-picker-palette-container", {"with-color-picker": showColorPicker})}>
      <PopoverBody className="color-picker-palette" ref={popoverRef}>
        <div className="color-swatch-palette">
          <div className="color-swatch-grid">
            {paletteColors.map((pColor, index) => (
              <div className={clsx("color-swatch-cell",
                              {"selected": swatchBackgroundColor === pColor, "light": colord(pColor).isLight()})}
                    style={{ backgroundColor: pColor }} key={index} onClick={()=>onColorChange(pColor)}/>
            ))}
            {nonStandardColorSelected &&
              <div className="color-swatch-row">
                <div className={clsx("color-swatch-cell",
                                      {"selected": swatchBackgroundColor === inputValue,
                                          "light": inputValue && colord(inputValue).isLight()})}
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
  )
}
