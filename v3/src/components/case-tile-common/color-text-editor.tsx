import {
  forwardRef, Popover, PopoverAnchor, PopoverTrigger, Portal, useDisclosure, useMergeRefs
} from "@chakra-ui/react"
import React, { ChangeEvent, RefObject, useCallback, useEffect, useRef, useState } from "react"
import { textEditorClassname } from "react-data-grid"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { parseColor, parseColorToHex } from "../../utilities/color-utils"
import { ColorPickerPalette } from "../common/color-picker-palette"
import { IValueType } from "../../models/data/attribute-types"
import { useOutsidePointerDown } from "../../hooks/use-outside-pointer-down"

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
  acceptValue: (newValue: string) => void
  updateValue: (newValue: string) => void
  cancelChanges: () => void
  renderInput?: (value: string) => JSX.Element
}

export default function ColorTextEditor({attributeId, caseId, value, acceptValue, updateValue, cancelChanges}: IProps) {
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
  const colorEditorRef = useRef<HTMLDivElement>(null)
  useOutsidePointerDown({
    ref: colorEditorRef as unknown as RefObject<HTMLElement>,
    handler: ()=> handleSubmit(inputValue as string),
    info: { name: "ColorTextEditor", attributeId, attributeName: attribute?.name }
  })

  const { isOpen: isPaletteOpen, onToggle: setOpenPopover, onClose } = useDisclosure()

  function handleSubmit(newValue: string) {
    acceptValue(newValue)
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

  function handleColorKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      handleSubmit(inputValue as string)
    } else if (event.key === "Escape") {
      handleCancel()
      cancelChanges()
    }
  }

  const swatchStyle: React.CSSProperties | undefined = showColorSwatch.current ? { background: color } : undefined
  const inputElt = <InputElt value={String(inputValue)} onChange={handleInputColorChange}
                    onKeyDown={handleColorKeyDown}/>

  return swatchStyle
    ? (
        <div className={"color-cell-text-editor"} ref={colorEditorRef}>
          <Popover
            isLazy={true}
            isOpen={isPaletteOpen}
            placement={placement}
            closeOnBlur={true}
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
