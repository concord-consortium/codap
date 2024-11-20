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

  useEffect(() => {
    autoFocusAndSelect(inputRef.current)
  }, [])

  return (
    <input data-testid="cell-text-editor" className={textEditorClassname} ref={mergeRefs} {...props} />
  )
})

interface IProps {
  attributeId: string
  caseId: string
  value: IValueType
}

export default function ColorTextEditor({attributeId, caseId, value}: IProps) {
  const data = useDataSetContext()
  const attribute = data?.getAttribute(attributeId)
  const [inputValue, setInputValue] = useState(() => data?.getValue(attributeId, caseId))
  // const [inputValue, setInputValue] = useState("")
  const initialInputValue = useRef(value)
  const [placement, setPlacement ]= useState<"right" | "left">("right")
  // support colors if user hasn't assigned a non-color type
  const supportColors = attribute?.userType == null || attribute?.userType === "color"
  // support color names if the color type is user-assigned
  const colorNames = attribute?.userType === "color"
  const color = supportColors && inputValue ? parseColor(inputValue as string, { colorNames }) : undefined
  const hexColor = color ? parseColorToHex(color, { colorNames }) : undefined
  // show the color swatch if the initial value appears to be a color (no change mid-edit)
  const showColorSwatch = useRef(!!hexColor || attribute?.userType === "color")
  const triggerButtonRef = useRef<HTMLButtonElement>(null)
  const displayStrValue = value ? String(value) : ""
  const displayNumValue = value ? Number(value) : NaN
  const { isOpen: isPaletteOpen, onToggle: setOpenPopover, onClose } = useDisclosure()
  const [isEditing, setIsEditing] = useState(false)
  const [editingValue, setEditingValue] = useState(value)


  // Inform the ui that we're editing a table while this component exists.
  useEffect(() => {
    uiState.setIsEditingCell(true)
    return () => uiState.setIsEditingCell(false)
  }, [])

  const handleChangeValue = (newValue: string) => {
    setEditingValue(newValue)
  }

  const handleCancel = (_previousName?: string) => {
    setIsEditing(false)
    setEditingValue(displayStrValue)
  }

  const handleSubmit = (newValue?: string) => {
    setIsEditing(false)
    if (newValue) {
      const casesToUpdate: ICase[] = [{ __id__: caseId, [attributeId]: newValue }]

      if (data) {
        applyCaseValueChanges(data, casesToUpdate)
        return
      }

      setEditingValue(newValue)
    } else {
      setEditingValue(displayStrValue)
    }
  }


  function handleSwatchClick(event: React.MouseEvent) {
    setOpenPopover()
  }

  function handleInputColorChange(event: ChangeEvent<HTMLInputElement>) {
    handleChangeValue(event.target.value)
  }

  const swatchStyle: React.CSSProperties | undefined = showColorSwatch.current ? { background: color } : undefined
  const inputElt = <InputElt value={value as string} onChange={handleInputColorChange} />

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
              <ColorPickerPalette initialColor={initialInputValue.current as string || "#ffffff"} isPaletteOpen={isPaletteOpen}
                inputValue={value as string || "#ffffff"} swatchBackgroundColor={color || "#ffffff"}
                buttonRef={triggerButtonRef} showArrow={true} setPlacement={setPlacement} placement={placement}
                onColorChange={handleChangeValue} onAccept={handleSubmit} onReject={handleCancel} onUpdateValue={handleChangeValue}/>
            </Portal>
          </Popover>
        </div>
      )
    // if we don't have a valid color, just a simple text editor
    : inputElt
}
