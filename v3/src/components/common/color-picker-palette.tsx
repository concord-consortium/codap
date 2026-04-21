import { clsx } from "clsx"
import { colord } from "colord"
import React, { useRef, useState } from "react"
import { ListBox, ListBoxItem } from "react-aria-components"
import { ColorPicker } from "./color-picker"
import { If } from "./if"
import { t } from "../../utilities/translation/translate"

import "./color-picker-palette.scss"

interface IColorPickerPaletteProps {
  swatchBackgroundColor: string
  inputValue: string
  onColorChange: (color: string) => void
  onAccept: (color: string) => void
  onCommitColor?: (color: string) => void
  onExpandedChange?: (expanded: boolean) => void
  onReject: () => void
  onUpdateValue: (value: string) => void
}

const paletteColorNames: Record<string, string> = {
  "#000000": "V3.Inspector.colorPicker.color.black",
  "#a9a9a9": "V3.Inspector.colorPicker.color.darkGray",
  "#d3d3d3": "V3.Inspector.colorPicker.color.lightGray",
  "#ffffff": "V3.Inspector.colorPicker.color.white",
  "#ad2323": "V3.Inspector.colorPicker.color.red",
  "#ff9632": "V3.Inspector.colorPicker.color.orange",
  "#ffee33": "V3.Inspector.colorPicker.color.yellow",
  "#1d6914": "V3.Inspector.colorPicker.color.green",
  "#2a4bd7": "V3.Inspector.colorPicker.color.blue",
  "#814a19": "V3.Inspector.colorPicker.color.brown",
  "#8126c0": "V3.Inspector.colorPicker.color.purple",
  "#29d0d0": "V3.Inspector.colorPicker.color.cyan",
  "#e9debb": "V3.Inspector.colorPicker.color.cream",
  "#ffcdf3": "V3.Inspector.colorPicker.color.pink",
  "#9dafff": "V3.Inspector.colorPicker.color.lightBlue",
  "#81c57a": "V3.Inspector.colorPicker.color.lightGreen",
}

export const ColorPickerPalette = ({ swatchBackgroundColor: rawSwatchBgColor, inputValue: rawInputValue,
                onColorChange, onAccept, onCommitColor, onExpandedChange,
                onReject, onUpdateValue }: IColorPickerPaletteProps) => {
  const swatchBackgroundColor = rawSwatchBgColor.toLowerCase()
  const inputValue = rawInputValue.toLowerCase()
  const paletteColors = Object.keys(paletteColorNames)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [selectedColor, setSelectedColor] = useState(swatchBackgroundColor)
  // Stable ID for the non-standard (17th) swatch. Set once at mount or on the first
  // custom color pick; never changes after that because React Aria ListBox doesn't
  // allow changing a ListBoxItem's id between renders.
  const nonStandardIdRef = useRef(
    inputValue !== "" && !paletteColors.includes(swatchBackgroundColor) && !paletteColors.includes(inputValue)
      ? inputValue : null
  )
  // Display color for the non-standard swatch. Updates as the expanded picker changes.
  const [nonStandardDisplayColor, setNonStandardDisplayColor] = useState<string | null>(
    nonStandardIdRef.current
  )

  const handleSelectionChange = (keys: "all" | Set<React.Key>) => {
    if (keys === "all" || keys.size === 0) return
    const color = [...keys][0] as string
    setSelectedColor(color)
    onColorChange(color)
    onCommitColor?.(color)
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
    // When the expanded color picker first produces a non-palette color, add the
    // 17th swatch. Only set once. React Aria doesn't allow changing a ListBoxItem's
    // id, so the ref must remain stable after initial assignment.
    if (!paletteColors.includes(color)) {
      if (nonStandardIdRef.current == null) {
        nonStandardIdRef.current = color
      }
      setNonStandardDisplayColor(color)
    }
  }

  const handleShowColorPicker = (evt: React.MouseEvent) => {
    evt.preventDefault()
    evt.stopPropagation()
    const newValue = !showColorPicker
    setShowColorPicker(newValue)
    onExpandedChange?.(newValue)
  }

  // Escape must be caught in the capture phase so it fires before any other handler.
  const handleKeyDownCapture = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation()
      onReject()
    }
  }

  // React synthetic events bubble through the component tree (not the DOM tree),
  // so keydown events from this portal-rendered popover reach parent components
  // like RDG's EditCell, which interprets Enter/Arrow as cell navigation. We stop
  // propagation in the bubble phase so the ListBox handles these keys first, then
  // we prevent them from reaching parent components. Arrow keys are scoped to the
  // swatch grid area only so react-colorful sliders still receive them.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.stopPropagation()
    }
  }

  const handleSwatchKeyDown = (e: React.KeyboardEvent) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.stopPropagation()
    }
  }

  return (
    <div className="color-picker-palette" onKeyDownCapture={handleKeyDownCapture} onKeyDown={handleKeyDown}>
      <div className="color-swatch-palette" onKeyDown={handleSwatchKeyDown}>
        <ListBox
          className="color-swatch-grid"
          aria-label={t("DG.Inspector.colorPicker.swatchGrid")}
          layout="grid"
          selectionMode="single"
          autoFocus
          selectedKeys={[selectedColor]}
          onSelectionChange={handleSelectionChange}
        >
          {paletteColors.map((pColor) => (
            <ListBoxItem
              key={pColor}
              id={pColor}
              aria-label={t(paletteColorNames[pColor])}
              className={clsx("color-swatch-cell", {"light": colord(pColor).isLight()})}
              style={{ backgroundColor: pColor }}
            />
          ))}
          <If condition={nonStandardDisplayColor != null}>
            <ListBoxItem
              id={nonStandardIdRef.current!}
              aria-label={nonStandardDisplayColor!}
              className={clsx("color-swatch-cell",
                {"light": nonStandardDisplayColor && colord(nonStandardDisplayColor).isLight()})}
              style={{ backgroundColor: nonStandardDisplayColor! }}
            />
          </If>
        </ListBox>
        <div className="color-swatch-footer">
          <button
            aria-expanded={showColorPicker}
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
            <ColorPicker color={selectedColor} onChange={handleUpdate} />
          </div>
          <div className="color-picker-footer">
            <div className="color-picker-actions">
              <button className="color-picker-action-button cancel" onClick={handleReject}>
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
