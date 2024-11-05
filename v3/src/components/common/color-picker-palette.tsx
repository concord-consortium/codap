import { Button, ButtonGroup, Flex, PopoverArrow, PopoverBody, PopoverContent } from "@chakra-ui/react"
import { clsx } from "clsx"
import { colord } from "colord"
import React, { useEffect, useRef, useState } from "react"
import { ColorPicker } from "./color-picker"
import { t } from "../../utilities/translation/translate"

import styles from "./color-picker-palette.scss"

interface IProps {
  initialColor: string
  inputValue: string
  swatchBackgroundColor: string
  buttonRef: React.RefObject<HTMLButtonElement>
  showArrow?: boolean
  onColorChange: (newColor: string) => void
  onAccept: () => void
  onReject: () => void
  onUpdateValue: (value: string) => void
}

export const ColorPickerPalette = ({ swatchBackgroundColor, inputValue, buttonRef, showArrow,
                onColorChange, onAccept, onReject, onUpdateValue }: IProps) => {
  const paletteColors = ["#000000", "#a9a9a9", "#d3d3d3", "#FFFFFF", "#ad2323", "#ff9632", "#ffee33", "#1d6914",
    "#2a4bd7", "#814a19", "#8126c0", "#29d0d0", "#e9debb", "#ffcdf3", "#9dafff", "#81c57a"]
  const [showColorPicker, setShowColorPicker] = useState(false)
  const nonStandardColorSelected = !paletteColors.includes(swatchBackgroundColor)
  const popoverRef = useRef<HTMLDivElement>(null)
  const popoverContainerRef = useRef<HTMLDivElement>(null)
  const kGapSize = 10

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
          left = viewportWidth - rect.right + (rect.width/2) - kGapSize
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

  const handleAccept = () => {
    onAccept()
    setShowColorPicker(false)
  }

  const handleReject = () => {
    onReject()
    setShowColorPicker(false)
  }

  const handleShowColorPicker = (evt: React.MouseEvent) => {
    evt.preventDefault()
    evt.stopPropagation()
    setShowColorPicker(!showColorPicker)
  }

  const handleKeyDown = (evt: React.KeyboardEvent) => {
    if (evt.key === "Escape") {
      setShowColorPicker(false)
      onReject()
    }
  }

  return (
    <PopoverContent ref={popoverContainerRef}
                    className={clsx("color-picker-palette-container", {"with-color-picker": showColorPicker})}>
      {showArrow && <PopoverArrow />}
      <PopoverBody ref={popoverRef}
            className={clsx("color-picker-palette",
                            {"with-color-picker": showColorPicker, "without-arrow": !showArrow})}>
        <div className="color-swatch-palette" onKeyDown={handleKeyDown}>
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
            <Button size="xs" onClick={handleShowColorPicker} data-testid="toggle-show-color-picker-button">
              {t(showColorPicker ? "DG.Inspector.colorPicker.less" : "DG.Inspector.colorPicker.more")}
            </Button>
          </div>
        </div>
        {showColorPicker &&
          <div className="color-picker-container">
            <div className="color-picker">
              <ColorPicker color={swatchBackgroundColor} onChange={onUpdateValue} />
            </div>
            <Flex className="color-picker-footer">
              <ButtonGroup>
                <Button className="cancel-button" size="xs" fontWeight="normal" onClick={handleReject}>
                  {t("V3.CaseTable.colorPalette.cancel")}
                </Button>
                <Button className="set-color-button" size="xs" fontWeight="normal" onClick={handleAccept}>
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
