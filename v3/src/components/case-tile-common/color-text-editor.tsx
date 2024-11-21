import {
  forwardRef, Popover, PopoverAnchor, PopoverTrigger, Portal, useDisclosure, useMergeRefs
} from "@chakra-ui/react"
import React, { ChangeEvent, useCallback, useEffect, useRef, useState } from "react"
import { textEditorClassname } from "react-data-grid"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { uiState } from "../../models/ui-state"
import { parseColor, parseColorToHex } from "../../utilities/color-utils"
import { ColorPickerPalette } from "../common/color-picker-palette"
import { IValueType } from "../../models/data/attribute-types"
import { ICase } from "../../models/data/data-set-types"
import { applyCaseValueChanges } from "./case-tile-utils"

import "./color-text-editor.scss"
/*
  ReactDataGrid uses Linaria CSS-in-JS for its internal styling. As with CSS Modules and other
  CSS-in-JS solutions, this involves dynamically generating class names on the fly. The
  `CellTextEditor` class below is a modified version of RDG's internal `TextEditor` class which
  pulls its data from the DataSet, among other customizations. For the `CellTextEditor` component
  to take advantage of the CSS of the `TextEditor` class, we must use the same classes.
  Unfortunately, instead of tying their internal CSS to the public class names (e.g.
  `rdg-text-editor`), RDG ties its internal CSS to the dynamically generated class names.
  Therefore, to preserve the prior behavior we must give our instances of these components the
  same classes as the components they're replacing, including the dynamically generated classes.
  To enable this, patch-package has been used to export the `textEditorClassname` string.
 */

function autoFocusAndSelect(input: HTMLInputElement | null) {
  input?.focus()
  input?.select()
}

const InputElt = forwardRef<React.InputHTMLAttributes<HTMLInputElement>, 'input'>((props, ref) => {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const mergeRefs = useMergeRefs(ref, inputRef)

  // useEffect(() => {
  //   autoFocusAndSelect(inputRef.current)
  // }, [])

  return (
    <input data-testid="cell-text-editor" className={textEditorClassname} ref={mergeRefs} {...props} />
  )
})

interface IProps {
  attributeId: string
  caseId: string
  value: IValueType
  acceptValue: (newValue: string) => void
  updateValue: (newValue: string) => void
  renderInput?: (value: string) => JSX.Element
}

export default function ColorTextEditor({attributeId, caseId, value, acceptValue, updateValue, renderInput}: IProps) {
  const data = useDataSetContext()
  const attribute = data?.getAttribute(attributeId)
  const [inputValue, setInputValue] = useState(value)
  const initialInputValue = useRef(inputValue)
  // support colors if user hasn't assigned a non-color type
  const supportColors = attribute?.userType == null || attribute?.userType === "color"
  // support color names if the color type is user-assigned
  const colorNames = attribute?.userType === "color"
  const color = supportColors && value ? parseColor(String(value), { colorNames }) : undefined
  const hexColor = color ? parseColorToHex(color, { colorNames }) : undefined
  const showColorSwatch = useRef(!!hexColor || attribute?.userType === "color")
  const [placement, setPlacement ]= useState<"right" | "left">("right")
  const triggerButtonRef = useRef<HTMLButtonElement>(null)

  const { isOpen: isPaletteOpen, onToggle: setOpenPopover, onClose } = useDisclosure()

  function handleSubmit(newValue?: string) {
    if (newValue) {
      acceptValue(newValue)
      const casesToUpdate: ICase[] = [{ __id__: caseId, [attributeId]: newValue }]
      data && applyCaseValueChanges(data, casesToUpdate)
    }
    onClose()
  }

  const handleUpdateValue = useCallback((newValue: string) => {
    setInputValue(newValue)
    updateValue(newValue)
  }, [updateValue])

  function handleCancel() {
    setInputValue(data?.getStrValue(caseId, attributeId) || "")
    onClose()
  }

  function handleSwatchClick(event: React.MouseEvent) {
    setOpenPopover()
  }

  function handleInputColorChange(event: ChangeEvent<HTMLInputElement>) {
    setInputValue(event.target.value)
    handleUpdateValue(event.target.value)
  }

  const swatchStyle: React.CSSProperties | undefined = showColorSwatch.current ? { background: color } : undefined
  const inputElt = renderInput ? renderInput(String(inputValue || ""))
                                : <InputElt value={String(inputValue)} onChange={handleInputColorChange} />

  return swatchStyle
    ? (
        <div className={"color-cell-text-editor"}>
          <Popover
            isLazy={true}
            isOpen={isPaletteOpen}
            placement={placement}
            closeOnBlur={false}
          >
            <PopoverTrigger>
              <button className="cell-edit-color-swatch" ref={triggerButtonRef}
                onClick={handleSwatchClick}>
                <div className="cell-edit-color-swatch-interior" style={swatchStyle}/>
              </button>
            </PopoverTrigger>
            <PopoverAnchor>
              { inputElt }
            </PopoverAnchor>
            <Portal>
              <ColorPickerPalette initialColor={String(initialInputValue.current) || "#ffffff"}
                isPaletteOpen={isPaletteOpen} inputValue={String(inputValue) || "#ffffff"}
                swatchBackgroundColor={color || "#ffffff"} setPlacement={setPlacement} placement={placement}
                buttonRef={triggerButtonRef} showArrow={true} onColorChange={handleUpdateValue} 
                onAccept={handleSubmit} onReject={handleCancel} onUpdateValue={handleUpdateValue}/>
            </Portal>
          </Popover>
        </div>
      )
    // if we don't have a valid color, just a simple text editor
    : inputElt
}
