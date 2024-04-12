import React, { useEffect, useRef, useState } from "react"
import { textEditorClassname } from "react-data-grid"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { parseColor } from "../../utilities/color-utils"
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

export default function ColorCellTextEditor({ row, column, onRowChange, onClose }: TRenderEditCellProps) {
  const data = useDataSetContext()
  const attributeId = column.key
  const attribute = data?.getAttribute(attributeId)
  const initialValueRef = useRef(data?.getStrValue(row.__id__, attributeId))
  const [inputValue, setInputValue] = useState(initialValueRef.current)
  // support colors if user hasn't assigned a non-color type
  const supportColors = attribute?.userType == null || attribute?.userType === "color"
  // support color names if the color type is user-assigned
  const colorNames = attribute?.userType === "color"
  const color = supportColors && inputValue ? parseColor(inputValue, { colorNames }) : undefined
  // show the color swatch if the initial value appears to be a color (no change mid-edit)
  const showColorSwatch = useRef(!!color)

  useEffect(() => {
    data?.setSelectedCases([])
  }, [data])

  function handleAccept() {
    // commits the change and closes the editor
    onRowChange({ ...row, [column.key]: inputValue }, true)
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter") handleAccept()
    if (event.key === "Escape") onClose()
  }

  const swatchStyle: React.CSSProperties | undefined = showColorSwatch.current ? { background: color } : undefined
  const inputElt = <input
                    data-testid="cell-text-editor"
                    className={textEditorClassname}
                    ref={autoFocusAndSelect}
                    value={inputValue}
                    onKeyDown={handleKeyDown}
                    onChange={event => setInputValue(event.target.value)}
                    onBlur={() => handleAccept()}
                  />

  return swatchStyle
    ? (
        <div className={"color-cell-text-editor"}>
          <div className="color-swatch">
            <div className="color-swatch-interior" style={swatchStyle}/>
          </div>
          { inputElt }
        </div>
      )
    // if we don't have a valid color, just a simple text editor
    : inputElt
}
