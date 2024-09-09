import {
  Button, ButtonGroup, Flex, forwardRef, Popover, PopoverAnchor, PopoverArrow, PopoverBody,
  PopoverContent, PopoverFooter, PopoverTrigger, Portal, Spacer, useDisclosure, useMergeRefs
} from "@chakra-ui/react"
import React, { ChangeEvent, FormEventHandler, useCallback, useEffect, useRef, useState } from "react"
import { textEditorClassname } from "react-data-grid"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { useLoggingContext } from "../../hooks/use-log-context"
import { logStringifiedObjectMessage } from "../../lib/log-message"
import { selectAllCases } from "../../models/data/data-set-utils"
import { uiState } from "../../models/ui-state"
import { parseColor, parseColorToHex } from "../../utilities/color-utils"
import { blockAPIRequestsWhileEditing } from "../../utilities/plugin-utils"
import { t } from "../../utilities/translation/translate"
import { TRenderEditCellProps } from "./case-table-types"
import { ColorPicker } from "./color-picker"

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

  useEffect(() => {
    selectAllCases(data, false)
  }, [data])

  // Inform the ui that we're editing a table while this component exists.
  useEffect(() => {
    if (blockAPIRequests) {
      uiState.setIsEditingCell(true)
      return () => uiState.setIsEditingBlockingCell(false)
    }
  }, [])

  const handleInput: FormEventHandler<HTMLInputElement> = event => {
    const { target } = event
    if (blockAPIRequests && target instanceof HTMLInputElement) {
      // Only block API requests if the user has actually entered a value.
      uiState.setIsEditingBlockingCell(!!target.value)
    }
  }

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
  }, [column.key, onRowChange, row, setPendingLogMessage])

  // rejects any local changes and closes the editor
  const rejectValue = useCallback(() => {
    onClose()
  }, [onClose])

  const { isOpen: isPaletteOpen, onToggle: togglePalette } = useDisclosure()

  function handleSwatchClick(event: React.MouseEvent) {
    togglePalette()
  }

  function handleInputColorChange(event: ChangeEvent<HTMLInputElement>) {
    updateValue(event.target.value)
  }

  function handleBlur() {
    if (blockAPIRequests) uiState.setIsEditingCell(false)
  }

  const swatchStyle: React.CSSProperties | undefined = showColorSwatch.current ? { background: color } : undefined
  const inputElt =
    <InputElt value={inputValue} onBlur={handleBlur} onChange={handleInputColorChange} onInput={handleInput} />

  return swatchStyle
    ? (
        <div className={"color-cell-text-editor"}>
          <Popover
            isLazy={true}
            isOpen={isPaletteOpen}
            placement="right"
            closeOnBlur={false}
          >
            <PopoverTrigger>
              <button className="cell-edit-color-swatch"
                onClick={handleSwatchClick}>
                <div className="cell-edit-color-swatch-interior" style={swatchStyle}/>
              </button>
            </PopoverTrigger>
            <PopoverAnchor>
              { inputElt }
            </PopoverAnchor>
            <Portal>
              <PopoverContent className="text-editor-color-picker" width={"inherit"}>
                <PopoverArrow />
                <PopoverBody>
                  <ColorPicker color={hexColor} onChange={updateValue} />
                </PopoverBody>
                <PopoverFooter>
                  <Flex>
                    <Spacer/>
                    <ButtonGroup>
                      <Button className="cancel-button" size="xs" fontWeight="normal" onClick={rejectValue}>
                        {t("V3.CaseTable.colorPalette.cancel")}
                      </Button>
                      <Button className="set-color-button" size="xs" fontWeight="normal" onClick={acceptValue}>
                        {t("V3.CaseTable.colorPalette.setColor")}
                      </Button>
                    </ButtonGroup>
                  </Flex>
                </PopoverFooter>
              </PopoverContent>
            </Portal>
          </Popover>
        </div>
      )
    // if we don't have a valid color, just a simple text editor
    : inputElt
}
