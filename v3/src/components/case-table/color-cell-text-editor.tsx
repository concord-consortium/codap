import {
  forwardRef, Popover, PopoverAnchor, PopoverTrigger, Portal, useDisclosure, useMergeRefs
} from "@chakra-ui/react"
import React, { ChangeEvent, useCallback, useEffect, useRef, useState } from "react"
import { textEditorClassname } from "react-data-grid"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { useLoggingContext } from "../../hooks/use-log-context"
import { logStringifiedObjectMessage } from "../../lib/log-message"
import { selectAllCases } from "../../models/data/data-set-utils"
import { uiState } from "../../models/ui-state"
import { parseColor, parseColorToHex } from "../../utilities/color-utils"
import { blockAPIRequestsWhileEditing } from "../../utilities/plugin-utils"
import { ColorPickerPalette } from "../common/color-picker-palette"
import { TRenderEditCellProps } from "./case-table-types"

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
  To enable this, react-data-grid has been patched to export the `textEditorClassname` string.
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

export default function ColorCellTextEditor({ row, column, onRowChange, onClose }: TRenderEditCellProps) {
  const data = useDataSetContext()
  const attributeId = column.key
  const attribute = data?.getAttribute(attributeId)
  const [inputValue, setInputValue] = useState(() => data?.getStrValue(row.__id__, attributeId))
  const initialInputValue = useRef(inputValue)
  const [placement, setPlacement ]= useState<"right" | "left">("right")
  // support colors if user hasn't assigned a non-color type
  const supportColors = attribute?.userType == null || attribute?.userType === "color"
  // support color names if the color type is user-assigned
  const colorNames = attribute?.userType === "color"
  const color = supportColors && inputValue ? parseColor(inputValue, { colorNames }) : undefined
  const hexColor = color ? parseColorToHex(color, { colorNames }) : undefined
  // show the color swatch if the initial value appears to be a color (no change mid-edit)
  const showColorSwatch = useRef(!!hexColor || attribute?.userType === "color")
  const { setPendingLogMessage } = useLoggingContext()
  const blockAPIRequests = blockAPIRequestsWhileEditing(data)
  const triggerButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    selectAllCases(data, false)
  }, [data])

  // Inform the ui that we're editing a table while this component exists.
  useEffect(() => {
    uiState.setIsEditingCell(true)
    return () => uiState.setIsEditingCell(false)
  }, [])

  // commits the change and closes the editor
  const acceptValue = useCallback(() => {
    onRowChange({ ...row, [column.key]: inputValue }, true)
  }, [column.key, inputValue, onRowChange, row])

  // updates the value locally without committing the changes
  const updateValue = useCallback((value: string) => {
    setInputValue(value)
    onRowChange({ ...row, [column.key]: value })
    setPendingLogMessage("editCellValue", logStringifiedObjectMessage("editCellValue: %@",
      {attrId: column.key, caseId: row.__id__, from: initialInputValue.current, to: value }))
    if (blockAPIRequests && value !== initialInputValue.current) {
      // Only block API requests if the user has actually changed the value.
      uiState.setIsEditingBlockingCell()
    }
  }, [blockAPIRequests, column.key, onRowChange, row, setPendingLogMessage])

  // rejects any local changes and closes the editor
  const rejectValue = useCallback(() => {
    onClose()
  }, [onClose])

  const { isOpen: isPaletteOpen, onToggle: setOpenPopover } = useDisclosure()

  function handleSwatchClick(event: React.MouseEvent) {
    setOpenPopover()
  }

  function handleInputColorChange(event: ChangeEvent<HTMLInputElement>) {
    updateValue(event.target.value)
  }

  /* The ColorTextEditor component was refactored out of this component to work with the case card.
    At some point we should refactor this component to use the ColorTextEditor as well. Currently,
    the code is duplicated in both components because there were problems with duplicating cell entries
    when entering a new case in the case table.
*/
  const swatchStyle: React.CSSProperties | undefined = showColorSwatch.current ? { background: color } : undefined
  const inputElt = <InputElt value={inputValue} onChange={handleInputColorChange} />

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
              <ColorPickerPalette initialColor={initialInputValue.current || "#ffffff"} isPaletteOpen={isPaletteOpen}
                inputValue={inputValue || "#ffffff"} swatchBackgroundColor={color || "#ffffff"}
                buttonRef={triggerButtonRef} showArrow={true} setPlacement={setPlacement} placement={placement}
                onColorChange={updateValue} onAccept={acceptValue} onReject={rejectValue} onUpdateValue={updateValue}/>
            </Portal>
          </Popover>
        </div>
      )
    // if we don't have a valid color, just a simple text editor
    : inputElt
}
