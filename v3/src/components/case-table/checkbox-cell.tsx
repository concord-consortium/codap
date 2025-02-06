import React, { useEffect, useRef, useState } from "react"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { IValueType } from "../../models/data/attribute-types"
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
  const checkRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState<IValueType>(data?.getValue(rowId, attrId))

  useEffect(() => {
    if (checkRef.current) {
      if (isBoolean(value) && value !== "") {
        if (typeof value === "string") {
          if (value.toLowerCase() === "true") {
            checkRef.current.checked = true
            checkRef.current.indeterminate = false }
          else {
            checkRef.current.checked = false
            checkRef.current.indeterminate = false
          }
        }
      } else {
        checkRef.current.checked = false
        checkRef.current.indeterminate = true
      }
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked
    data?.applyModelChange(() => {
      data.setCaseValues([{ __id__: rowId, [attrId]: newValue }])
    }, {
      log: `update checkbox state: ${attrId} to ${newValue ? "checked" : "unchecked"}`
    })
    setValue(newValue)
  }

  return (
    <span className="cell-checkbox">
      <input type="checkbox" ref={checkRef} title={String(value)} onChange={handleChange}/>
    </span>
  )
}
