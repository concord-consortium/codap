import { clsx } from "clsx"
import { colord } from "colord"
import React, { useState } from "react"
import { Radio, RadioGroup } from "react-aria-components"
import { ColorPicker } from "./color-picker"
import { If } from "./if"
import { t } from "../../utilities/translation/translate"

import "./color-picker-palette.scss"

interface IColorPickerPaletteProps {
  swatchBackgroundColor: string
  inputValue: string
  isPaletteOpen: boolean
  onColorChange: (color: string) => void
  onAccept: (color: string) => void
  onReject: () => void
  onUpdateValue: (value: string) => void
}

export const ColorPickerPalette = ({ swatchBackgroundColor, inputValue, isPaletteOpen,
                onColorChange, onAccept, onReject, onUpdateValue }: IColorPickerPaletteProps) => {
  const paletteColors = ["#000000", "#a9a9a9", "#d3d3d3", "#FFFFFF", "#ad2323", "#ff9632", "#ffee33", "#1d6914",
    "#2a4bd7", "#814a19", "#8126c0", "#29d0d0", "#e9debb", "#ffcdf3", "#9dafff", "#81c57a"]
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [selectedColor, setSelectedColor] = useState(swatchBackgroundColor)
  const nonStandardColorSelected = inputValue !== "" && !paletteColors.includes(swatchBackgroundColor)

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

  return (
    <div className={clsx("color-picker-palette", {"with-color-picker": showColorPicker})}>
      <div className="color-swatch-palette">
        <RadioGroup
          className="color-swatch-grid"
          aria-label={t("DG.Inspector.colorPicker.swatchGrid")}
          value={selectedColor}
          onChange={handleColorSelection}
        >
          {paletteColors.map((pColor) => (
            <Radio
              key={pColor}
              value={pColor}
              aria-label={pColor}
              className={clsx("color-swatch-cell", {"light": colord(pColor).isLight()})}
              style={{ backgroundColor: pColor }}
            />
          ))}
          <If condition={nonStandardColorSelected}>
            <Radio
              value={inputValue}
              aria-label={inputValue}
              className={clsx("color-swatch-cell", {"light": inputValue && colord(inputValue).isLight()})}
              style={{ backgroundColor: inputValue }}
            />
          </If>
        </RadioGroup>
        <div className="color-swatch-footer">
          <button
            className="color-picker-more-button"
            onClick={handleShowColorPicker}
            data-testid="toggle-show-color-picker-button"
          >
            {t(showColorPicker ? "DG.Inspector.colorPicker.less" : "DG.Inspector.colorPicker.more")}
          </button>
        </div>
      </div>
      <If condition={showColorPicker}>
        <div className="color-picker-container">
          <div className="color-picker">
            <ColorPicker color={swatchBackgroundColor} onChange={handleUpdate} />
          </div>
          <div className="color-picker-footer">
            <div className="color-picker-actions">
              <button className="color-picker-action-button" onClick={handleReject}>
                {t("V3.CaseTable.colorPalette.cancel")}
              </button>
              <button className="color-picker-action-button" onClick={handleAccept}>
                {t("V3.CaseTable.colorPalette.setColor")}
              </button>
            </div>
          </div>
        </div>
      </If>
    </div>
  )
}
