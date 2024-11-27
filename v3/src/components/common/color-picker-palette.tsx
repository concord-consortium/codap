import { Button, ButtonGroup, Flex, PopoverArrow, PopoverBody, PopoverContent } from "@chakra-ui/react"
import { clsx } from "clsx"
import { colord } from "colord"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { ColorPicker } from "./color-picker"
import { t } from "../../utilities/translation/translate"

import styles from "./color-picker-palette.scss"

interface IProps {
  initialColor: string
  inputValue: string
  swatchBackgroundColor: string
  isPaletteOpen?: boolean
  buttonRef: React.RefObject<HTMLButtonElement>
  showArrow?: boolean
  placement?: "right" | "left"
  onColorChange: (newColor: string) => void
  onAccept: (value: string) => void
  onReject: () => void
  onUpdateValue: (value: string) => void
  setPlacement?: (placement: "right" | "left") => void
}

export const ColorPickerPalette = ({ swatchBackgroundColor, inputValue, buttonRef, showArrow, isPaletteOpen,
                placement, onColorChange, onAccept, onReject, onUpdateValue, setPlacement }: IProps) => {
  const paletteColors = ["#000000", "#a9a9a9", "#d3d3d3", "#FFFFFF", "#ad2323", "#ff9632", "#ffee33", "#1d6914",
    "#2a4bd7", "#814a19", "#8126c0", "#29d0d0", "#e9debb", "#ffcdf3", "#9dafff", "#81c57a"]
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [selectedColor, setSelectedColor] = useState(swatchBackgroundColor)
  const nonStandardColorSelected = !paletteColors.includes(swatchBackgroundColor)
  const popoverRef = useRef<HTMLDivElement>(null)
  const popoverContainerRef = useRef<HTMLDivElement>(null)
  const kGapSize = 10

  const adjustPosition = useCallback(() => {
    const popoverContainer = popoverContainerRef.current
    const popover = popoverRef.current

    if (popoverContainer && popover) {
      const rect = popover.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      let top = +styles.colorPickerPopoverTop

      let left = placement === "left" ? +styles.leftColorPickerPopoverLeft
                                      : showArrow ? 0
                                                  : +styles.colorPickerPopoverLeft
      if (rect.right > viewportWidth) {
        if (setPlacement) {
          setPlacement("left")
        } else {
          left = +styles.colorPickerPopoverLeft - (rect.width/2) - kGapSize
        }
      } else if (rect.left < 0) {
        left = kGapSize
      }

      if (rect.bottom > viewportHeight) {
        top = viewportHeight - rect.bottom - kGapSize
      } else if (rect.top < 0) {
        top = kGapSize
      }

      popover.style.top = `${top}px`
      popover.style.left = `${left}px`
    }
  }, [placement, setPlacement, showArrow])

  useEffect(() => {
    adjustPosition()
    window.addEventListener('resize', adjustPosition)
    return () => {
      window.removeEventListener('resize', adjustPosition)
    }
  }, [setPlacement, placement, showArrow, showColorPicker, adjustPosition])

  useEffect(() => {
    if (isPaletteOpen) {
      adjustPosition()
    }
  }, [adjustPosition, isPaletteOpen])

  const handleColorSelection = (color: string) => {
    setSelectedColor(color)
    onColorChange(color)
  }

  const handleAccept = () => {
    onAccept(selectedColor)
    setShowColorPicker(false)
  }

  const handleReject = () => {
    onReject()
    setShowColorPicker(false)
  }

  const handleUpdate = (color: string) => {
    setSelectedColor(color)
    onUpdateValue(color)
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
                    className={clsx("color-picker-palette-container",
                                    {"with-color-picker": showColorPicker, "with-arrow": showArrow})}>
      {showArrow && <PopoverArrow className={clsx("palette-arrow", `${placement}`)}/>}
      <PopoverBody ref={popoverRef}
            className={clsx("color-picker-palette", `${placement}`,
                            {"with-color-picker": showColorPicker, "without-arrow": !showArrow})}>
        <div className="color-swatch-palette" onKeyDown={handleKeyDown}>
          <div className="color-swatch-grid">
            {paletteColors.map((pColor, index) => (
              <div className={clsx("color-swatch-cell",
                              {"selected": swatchBackgroundColor === pColor, "light": colord(pColor).isLight()})}
                    style={{ backgroundColor: pColor }} key={index} onClick={()=>handleColorSelection(pColor)}/>
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
              <ColorPicker color={swatchBackgroundColor} onChange={handleUpdate} />
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
