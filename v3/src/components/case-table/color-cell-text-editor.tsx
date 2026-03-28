import React, { ChangeEvent, useCallback, useEffect, useRef, useState } from "react"
import { Button, DialogTrigger, Popover } from "react-aria-components"
import { textEditorClassname } from "react-data-grid"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { useLoggingContext } from "../../hooks/use-log-context"
import { logStringifiedObjectMessage } from "../../lib/log-message"
import { selectAllCases } from "../../models/data/data-set-utils"
import { uiState } from "../../models/ui-state"
import { parseColor, parseColorToHex } from "../../utilities/color-utils"
import { blockAPIRequestsWhileEditing } from "../../utilities/plugin-utils"
import { t } from "../../utilities/translation/translate"
import { ColorPickerPalette } from "../common/color-picker-palette"
import { useColorPickerPopoverOffset } from "../common/use-color-picker-popover-offset"
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
  To enable this, patch-package has been used to export the `textEditorClassname` string.
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

export default function ColorCellTextEditor({ row, column, onRowChange, onClose }: TRenderEditCellProps) {
  const data = useDataSetContext()
  const attributeId = column.key
  const attribute = data?.getAttribute(attributeId)
  const [inputValue, setInputValue] = useState(() => data?.getStrValue(row.__id__, attributeId))
  const initialInputValue = useRef(inputValue)
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
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const { popoverRef, popoverOffset, handleExpandedChange, resetPopoverOffset } = useColorPickerPopoverOffset()

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

  function handleInputColorChange(event: ChangeEvent<HTMLInputElement>) {
    updateValue(event.target.value)
  }

  const handlePaletteOpenChange = useCallback((open: boolean) => {
    if (!open) {
      resetPopoverOffset()
    }
    setIsPaletteOpen(open)
  }, [resetPopoverOffset])

  /* The ColorTextEditor component was refactored out of this component to work with the case card.
    At some point we should refactor this component to use the ColorTextEditor as well. Currently,
    the code is duplicated in both components because there were problems with duplicating cell entries
    when entering a new case in the case table.
*/
  const attrName = attribute?.name ?? ""
  const swatchStyle: React.CSSProperties | undefined = showColorSwatch.current ? { background: color } : undefined
  const inputElt = <InputElt value={inputValue} onChange={handleInputColorChange}
    aria-label={t("V3.CaseTable.cellEditorAriaLabel", { vars: [attrName] })} />

  return swatchStyle
    ? (
        <div className={"color-cell-text-editor"}>
          <DialogTrigger isOpen={isPaletteOpen} onOpenChange={handlePaletteOpenChange}>
            <Button className="cell-edit-color-swatch"
              aria-label={t("V3.CaseTable.colorSwatchButtonAriaLabel", { vars: [attrName] })}>
              <div className="cell-edit-color-swatch-interior" style={swatchStyle}/>
            </Button>
            <Popover ref={popoverRef} shouldFlip={false} offset={popoverOffset}
              className={({defaultClassName}) => `${defaultClassName} color-picker-popover`}
              aria-label={t("DG.Inspector.colorPicker.dialogLabel")}>
              <ColorPickerPalette inputValue={inputValue || "#ffffff"}
                swatchBackgroundColor={color || "#ffffff"} onColorChange={updateValue}
                onAccept={acceptValue} onExpandedChange={handleExpandedChange}
                onReject={rejectValue} onUpdateValue={updateValue}/>
            </Popover>
          </DialogTrigger>
          { inputElt }
        </div>
      )
    // if we don't have a valid color, just a simple text editor
    : inputElt
}
