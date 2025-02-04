import React, { useEffect, useRef, useState } from "react"
import { useLoggingContext } from "../../hooks/use-log-context"
import { logStringifiedObjectMessage } from "../../lib/log-message"
import { TColumn, TRow } from "./case-table-types"
import { useDataSetContext } from "../../hooks/use-data-set-context"

interface ICheckboxCellProps {
  row: TRow
  column: TColumn
  onRowChange?: (row: TRow, commitChanges?: boolean) => void
}

export default function CheckboxCell ({ row, column, onRowChange }: ICheckboxCellProps) {
  const checkRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState<"indeterminate" | "true" | "false">("indeterminate")
  const { setPendingLogMessage } = useLoggingContext()
  const dataset = useDataSetContext()

  useEffect(() => {
    if (row[column.key] === "true") {
      setValue("true")
    } else if (row[column.key] === "false") {
      setValue("false")
    } else {
      setValue("indeterminate")
    }
  }, [row, column.key])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let newValue: "true" | "false" | "indeterminate" = "indeterminate"
    if (value === "indeterminate" || value === "false") {
      newValue = "true"
    } else if (value === "true") {
      newValue = "false"
    } else {
      newValue = "indeterminate"
    }
    console.log("CheckboxCell handleChange onRowChange", onRowChange)
    onRowChange && onRowChange({ ...row, [column.key]: newValue }, true)
    setPendingLogMessage("editCellValue", logStringifiedObjectMessage("update checkbox state: %@",
      {attrId: column.key, caseId: row.__id__, to: newValue }))
    setValue(newValue)
  }

  useEffect(() => {
    if (checkRef.current) {
      checkRef.current.indeterminate = value === "indeterminate"
      checkRef.current.checked = value === "true"
    }
  }, [value])

  return (
    <span className="checkbox-cell">
      <input
        type="checkbox"
        onChange={handleChange}
        ref={checkRef}
        title={value}
      />
    </span>
  )
}
