import React, { useEffect, useRef } from "react"
import { textEditorClassname } from "react-data-grid"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { useLoggingContext } from "../../hooks/use-log-context"
import { logStringifiedObjectMessage } from "../../lib/log-message"
import { selectAllCases } from "../../models/data/data-set-utils"
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

export default function CellTextEditor({ row, column, onRowChange, onClose }: TRenderEditCellProps) {
  const data = useDataSetContext()
  const initialValueRef = useRef(data?.getStrValue(row.__id__, column.key))
  const valueRef = useRef(initialValueRef.current)
  const { setPendingLogMessage } = useLoggingContext()

  useEffect(()=>{
    selectAllCases(data, false)
  }, [data])

  const handleChange = (value: string) => {
    valueRef.current = value
    onRowChange({ ...row, [column.key]: value })
    setPendingLogMessage("editCellValue", logStringifiedObjectMessage("editCellValue: %@",
      {attrId: column.key, caseId: row.__id__, from: initialValueRef.current, to: valueRef.current }))
  }

  return (
    <input
      data-testid="cell-text-editor"
      className={textEditorClassname}
      ref={autoFocusAndSelect}
      value={valueRef.current}
      onChange={(event) => handleChange(event.target.value)}
    />
  )
}
