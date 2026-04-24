import React, { ChangeEvent, useCallback, useEffect, useRef, useState } from "react"
import { Button, DialogTrigger, Popover } from "react-aria-components"
import { textEditorClassname } from "react-data-grid"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { useOutsidePointerDown } from "../../hooks/use-outside-pointer-down"
import { IValueType } from "../../models/data/attribute-types"
import { parseColor, parseColorToHex } from "../../utilities/color-utils"
import { t } from "../../utilities/translation/translate"
import { ColorPickerPalette } from "../common/color-picker-palette"
import { useColorPickerPopoverOffset } from "../common/use-color-picker-popover-offset"

import "./color-text-editor.scss"

/* This component was refactored out of the case table ColorCellTextEditor to work with the case card.
    At some point we should refactor the ColorCellTextEditor to use this component as well. Currently,
    the code is duplicated in both components because there were problems with duplicating cell entries
    when entering a new case in the case table.
*/
function autoFocusAndSelect(input: HTMLInputElement | null) {
  input?.focus()
  input?.select()
}

const InputElt = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const mergeRefs = useCallback((node: HTMLInputElement | null) => {
    inputRef.current = node
    if (typeof ref === "function") {
      ref(node)
    } else if (ref) {
      ref.current = node
    }
  }, [ref])

  useEffect(() => {
    autoFocusAndSelect(inputRef.current)
  }, [])

  return (
    <input data-testid="cell-text-editor" className={textEditorClassname} ref={mergeRefs} {...props} />
  )
})
InputElt.displayName = "InputElt"

interface IProps {
  attributeId: string
  caseId: string
  value: IValueType
  acceptValue: (newValue: string) => void
  updateValue: (newValue: string) => void
  cancelChanges: () => void
  renderInput?: (value: string) => JSX.Element
}

export default function ColorTextEditor({attributeId, caseId, value, acceptValue, updateValue, cancelChanges}: IProps) {
  const data = useDataSetContext()
  const attribute = data?.getAttribute(attributeId)
  const [inputValue, setInputValue] = useState(value)
  // support colors if user hasn't assigned a non-color type
  const supportColors = attribute?.userType == null || attribute?.userType === "color"
  // support color names if the color type is user-assigned
  const colorNames = attribute?.userType === "color"
  const color = supportColors && value ? parseColor(String(value), { colorNames }) : undefined
  const hexColor = color ? parseColorToHex(color, { colorNames }) : undefined
  const showColorSwatch = useRef(!!hexColor || attribute?.userType === "color")
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const { popoverRef, popoverOffset, handleExpandedChange, resetPopoverOffset } = useColorPickerPopoverOffset()
  const isCancellingRef = useRef(false)
  const isSubmittingRef = useRef(false)
  const colorEditorRef = useRef<HTMLDivElement>(null)
  useOutsidePointerDown({
    ref: colorEditorRef,
    handler: () => handleSubmit(inputValue as string),
    info: { name: "ColorTextEditor", attributeId, attributeName: attribute?.name }
  })

  const handleUpdateValue = useCallback((newValue: string) => {
    setInputValue(newValue)
    updateValue(newValue)
  }, [updateValue])

  const handlePaletteOpenChange = useCallback((open: boolean) => {
    if (!open && isPaletteOpen) {
      if (!isCancellingRef.current && !isSubmittingRef.current) {
        acceptValue(inputValue as string)
      }
      isCancellingRef.current = false
      isSubmittingRef.current = false
    }
    if (!open) {
      resetPopoverOffset()
    }
    setIsPaletteOpen(open)
  }, [acceptValue, inputValue, isPaletteOpen, resetPopoverOffset])

  function handleSubmit(newValue: string) {
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    acceptValue(newValue)
    handlePaletteOpenChange(false)
  }

  function handleCancel() {
    isCancellingRef.current = true
    setInputValue(data?.getStrValue(caseId, attributeId) || "")
    handlePaletteOpenChange(false)
  }

  function handleInputColorChange(event: ChangeEvent<HTMLInputElement>) {
    setInputValue(event.target.value)
    handleUpdateValue(event.target.value)
  }

  function handleColorKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      handleSubmit(inputValue as string)
    } else if (event.key === "Escape") {
      handleCancel()
      cancelChanges()
    }
  }

  const handlePaletteReject = useCallback(() => {
    isCancellingRef.current = true
    setInputValue(data?.getStrValue(caseId, attributeId) || "")
    handlePaletteOpenChange(false)
  }, [attributeId, caseId, data, handlePaletteOpenChange])

  const swatchStyle: React.CSSProperties | undefined = showColorSwatch.current ? { background: color } : undefined
  const attrName = attribute?.name ?? ""
  const inputElt = <InputElt value={String(inputValue)} onChange={handleInputColorChange}
                    onKeyDown={handleColorKeyDown}
                    aria-label={t("V3.CaseTable.cellEditorAriaLabel", { vars: [attrName] })}/>

  return swatchStyle
    ? (
        <div className={"color-cell-text-editor"} ref={colorEditorRef}>
          <DialogTrigger isOpen={isPaletteOpen} onOpenChange={handlePaletteOpenChange}>
            <Button className="cell-edit-color-swatch"
              aria-label={t("V3.CaseTable.colorSwatchButtonAriaLabel", { vars: [attrName] })}>
              <div className="cell-edit-color-swatch-interior" style={swatchStyle}/>
            </Button>
            <Popover ref={popoverRef} shouldFlip={false} offset={popoverOffset}
              className={({defaultClassName}) => `${defaultClassName} color-picker-popover`}
              aria-label={t("V3.Inspector.colorPicker.dialogLabel")}>
              <ColorPickerPalette inputValue={String(inputValue) || "#ffffff"}
                swatchBackgroundColor={color || "#ffffff"} onColorChange={handleUpdateValue}
                onAccept={handleSubmit} onExpandedChange={handleExpandedChange}
                onReject={handlePaletteReject} onUpdateValue={handleUpdateValue}/>
            </Popover>
          </DialogTrigger>
          { inputElt }
        </div>
      )
    // if we don't have a valid color, just a simple text editor
    : inputElt
}
