import React, { useEffect, useRef } from "react"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { FValue } from "../../models/formula/formula-types"

export const isBoolean = (value: FValue | undefined) => {
  let v = value
  if (typeof v === "string") {
    v = v.toLowerCase()
  }
  return v === undefined || ["", "false", "true", false, true, null].includes(v as string | boolean | null)
}

interface ICheckboxCellProps {
  rowId: string
  attrId: string
}

export default function CheckboxCell ({ rowId, attrId }: ICheckboxCellProps) {
  const data = useDataSetContext()
  // We need checkRef to show indeterminate state
  const checkRef = useRef<HTMLInputElement>(null)
  const cellValue = data?.getValue(rowId, attrId)

  useEffect(() => {
    if (checkRef.current) {
      const isBool = isBoolean(cellValue)
      const isTrue = typeof cellValue === "string" && cellValue.toLowerCase() === "true"
      checkRef.current.checked = isBool && isTrue
      checkRef.current.indeterminate = !isBool || cellValue === ""
    }
  }, [cellValue])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked
    data?.applyModelChange(() => {
      data.setCaseValues([{ __id__: rowId, [attrId]: newValue }])
    }, {
      log: `update checkbox state: ${attrId} to ${newValue ? "checked" : "unchecked"}`
    })
  }
  // title is used to show the value of the cell when hovering over the checkbox
  // When checkbox is in the indeterminate state, we want the tooltip to show "undefined"
  return (
    <span className="cell-checkbox">
      <input type="checkbox" ref={checkRef}  onChange={handleChange}
              title={String(cellValue) === "" ? "undefined" : String(cellValue)}/>
    </span>
  )
}
